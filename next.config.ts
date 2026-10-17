import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Off on purpose: see "Platform check" in NOTES.md.
  cacheComponents: false,
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Gives `next dev` the same D1 binding that `wrangler dev` uses, backed by .wrangler/state.
initOpenNextCloudflareForDev();

export default nextConfig;
