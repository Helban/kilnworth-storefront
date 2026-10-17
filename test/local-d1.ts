import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { getPlatformProxy } from "wrangler";
import type { SqlDatabase } from "@/lib/store/database";

const REPO_ROOT = join(import.meta.dirname, "..");
const WRANGLER = join(REPO_ROOT, "node_modules", ".bin", "wrangler");

// A real local D1 database (workerd, through wrangler), migrated with `wrangler d1 migrations
// apply` in a throwaway directory. Slower than test/sqlite-database.ts; use it to check that SQL
// behaves the same on D1.
export async function createLocalD1(): Promise<{ db: SqlDatabase; dispose: () => Promise<void> }> {
  const stateDir = await mkdtemp(join(tmpdir(), "kilnworth-d1-"));
  await promisify(execFile)(WRANGLER, ["d1", "migrations", "apply", "DB", "--local", "--persist-to", stateDir], {
    cwd: REPO_ROOT,
  });
  const proxy = await getPlatformProxy<CloudflareEnv>({ persist: { path: join(stateDir, "v3") } });
  return {
    db: proxy.env.DB,
    dispose: async () => {
      await proxy.dispose();
      await rm(stateDir, { recursive: true, force: true });
    },
  };
}
