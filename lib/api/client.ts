import type { z } from "zod";
import {
  apiErrorSchema,
  cartBodySchema,
  checkoutBodySchema,
  paymentBodySchema,
  productDetailSchema,
  productListSchema,
  type CheckoutDetails,
} from "./contract";

// The one module the UI uses to talk to the API. Every response is checked against the contract
// before the UI sees it, and every failure comes back as a value the caller has to handle.

export type ApiFailure =
  | { kind: "network" }
  | { kind: "http"; status: number; code: string; message: string; fields?: Record<string, string> }
  | { kind: "contract"; path: string; issues: string[] };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; failure: ApiFailure };

export type ApiTransport = (path: string, init?: RequestInit) => Promise<Response>;

export function createApiClient(send: ApiTransport) {
  return {
    listProducts: () => request(send, "/api/products", productListSchema),
    getProduct: (slug: string) =>
      request(send, `/api/products/${encodeURIComponent(slug)}`, productDetailSchema),
    getCart: () => request(send, "/api/cart", cartBodySchema),
    addToCart: (slug: string, quantity: number) =>
      request(send, "/api/cart/lines", cartBodySchema, jsonBody("POST", { slug, quantity })),
    setCartQuantity: (slug: string, quantity: number) =>
      request(send, `/api/cart/lines/${encodeURIComponent(slug)}`, cartBodySchema, jsonBody("PUT", { quantity })),
    getCheckout: () => request(send, "/api/checkout", checkoutBodySchema),
    holdCart: () =>
      request(send, "/api/checkout/reservation", checkoutBodySchema, { method: "POST" }),
    startPayment: (details: CheckoutDetails) =>
      request(send, "/api/checkout", paymentBodySchema, jsonBody("POST", details)),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const browserApi = createApiClient((path, init) => fetch(path, init));

async function request<T>(
  send: ApiTransport,
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await send(path, init);
  } catch (error) {
    // fetch() rejects with a TypeError when the request never got a response.
    if (error instanceof TypeError) return { ok: false, failure: { kind: "network" } };
    throw error;
  }

  const body = await readJson(response);
  if (!response.ok) {
    const errorBody = apiErrorSchema.safeParse(body);
    return {
      ok: false,
      failure: {
        kind: "http",
        status: response.status,
        code: errorBody.success ? errorBody.data.error.code : "unknown",
        message: errorBody.success ? errorBody.data.error.message : response.statusText,
        fields: errorBody.success ? errorBody.data.error.fields : undefined,
      },
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    console.error("API response broke the contract", path, issues);
    return { ok: false, failure: { kind: "contract", path, issues } };
  }
  return { ok: true, data: parsed.data };
}

function jsonBody(method: "POST" | "PUT", payload: unknown): RequestInit {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    // A body that is not JSON at all fails the contract the same way a wrong shape does.
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}
