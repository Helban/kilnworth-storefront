import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { stripeFromEnv, type StripeSetup } from "./stripe";

export async function getStripe(): Promise<StripeSetup> {
  const { env } = await getCloudflareContext({ async: true });
  return stripeFromEnv(env);
}
