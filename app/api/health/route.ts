import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  const { env } = await getCloudflareContext({ async: true });
  const probe = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
  return Response.json({ status: "ok", db: probe?.ok === 1 ? "ok" : "unexpected" });
}
