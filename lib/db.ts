import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { SqlDatabase } from "@/lib/store/database";

export async function getDb(): Promise<SqlDatabase> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}
