import type { NextConfig } from "next";
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

// Gives `next dev` the same local D1 database that wrangler uses. It lives under node_modules/.cache
// rather than wrangler's default .wrangler/state: Turbopack watches the project root, every D1 read
// touches the SQLite WAL file, and under .wrangler/state that kept an open tab in a Fast Refresh
// reload loop. package.json passes the same directory to `db:migrate` and `preview`.
initOpenNextCloudflareForDev({ persist: { path: "node_modules/.cache/wrangler-state/v3" } });

export default nextConfig;
