import { z } from "zod";

// The first message for each invalid field. Used by the server's 422 response and by the checkout
// form's own check, so both speak the same words.
export function firstErrorPerField(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string[] | undefined> = z.flattenError(error).fieldErrors;
  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([field, messages]) => (messages?.length ? [[field, messages[0]]] : [])),
  );
}
