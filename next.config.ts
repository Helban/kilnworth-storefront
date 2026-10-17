import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Off on purpose: see "Platform check" in NOTES.md.
  cacheComponents: false,
  agentRules: false,
  // No image resizing service is bound yet (Cloudflare Images would be the one), so each image
  // ships at its own size. See public/products/.
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Local D1 data for `next dev`, `npm run db:migrate` and `npm run preview`. Not wrangler's default
// .wrangler/state: Turbopack watches the project tree, every D1 query creates or touches SQLite
// -wal/-shm files, and an open tab then reloads in a loop. Turbopack ignores its own .next folder.
const LOCAL_STATE_DIR = ".next/cache/wrangler-state";

export default async function config(phase: string): Promise<NextConfig> {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    // Awaited so the dev server cannot take a request first: getCloudflareContext() would then
    // start a second local runtime with wrangler's default state directory and an empty database.
    await initOpenNextCloudflareForDev({ persist: { path: `${LOCAL_STATE_DIR}/v3` } });
  }
  return nextConfig;
}
