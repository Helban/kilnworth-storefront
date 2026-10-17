import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { SqlDatabase } from "@/lib/store/database";
import { releaseExpiredReservations } from "@/lib/store/reservations";

export async function getDb(): Promise<SqlDatabase> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

// For any route that reads or changes stock. Holds that ran out are released first, so an
// abandoned checkout never makes a piece look sold out for longer than its ten minutes.
// Lazy: one extra UPDATE per request, fine at this traffic. A Cron Trigger calling the same
// function would take it off the request path.
export async function getDbWithExpiredHoldsReleased(): Promise<SqlDatabase> {
  const db = await getDb();
  await releaseExpiredReservations(db, Date.now());
  return db;
}
