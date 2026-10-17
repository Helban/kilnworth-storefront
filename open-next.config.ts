import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Read-only cache over the build output. The shop has no ISR, so prerendered pages never change
// after a deploy, and this needs no KV or R2 bucket.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
