import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const isDev = process.env.NODE_ENV === "development";

// The "without nonces" policy from the Next.js CSP guide. Inline scripts stay allowed because the App
// Router bootstraps through them; a nonce-based policy needs a proxy.ts on every request, which was
// not tried on OpenNext (see NOTES.md). React needs eval in development only.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Off on purpose: see "Platform check" in NOTES.md.
  cacheComponents: false,
  agentRules: false,
  // No image resizing service is bound yet (Cloudflare Images would be the one), so each image
  // ships at its own size. See public/products/.
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
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
