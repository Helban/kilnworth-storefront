import type { z } from "zod";
import type { ApiErrorBody } from "./contract";
import { firstErrorPerField } from "./field-errors";
import { apiError } from "./responses";

type BodyResult<T> = { ok: true; body: T } | { ok: false; response: Response };

// State-changing routes accept JSON only. A cross-site form cannot send that content type without a
// CORS preflight, which this API never grants.
export async function readJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<BodyResult<T>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return { ok: false, response: apiError(415, "unsupported_media_type", "Send the request body as JSON.") };
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return { ok: false, response: apiError(400, "invalid_json", "The request body is not valid JSON.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: apiError(400, "invalid_request", "The request body is not valid.") };
  }
  return { ok: true, body: parsed.data };
}

// Second line of CSRF defence after SameSite=Lax cookies: browsers always send Origin on
// cross-origin POST and PUT, so a mismatch with the host is refused. Requests without an Origin
// header come from non-browser clients, which cannot carry a shopper's cookies by accident.
export function isCrossOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch (error) {
    if (error instanceof TypeError) return true;
    throw error;
  }
}

export function crossOriginRefused(): Response {
  return apiError(403, "cross_origin", "This request must come from the shop's own pages.");
}

// 422 with one message per invalid field, for forms the shopper can correct.
export function validationFailed(error: z.ZodError): Response {
  const body: ApiErrorBody = {
    error: { code: "invalid_details", message: "Some details are missing or not valid.", fields: firstErrorPerField(error) },
  };
  return Response.json(body, { status: 422 });
}
