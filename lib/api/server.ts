import "server-only";
import { connection } from "next/server";
import { GET as getProductRoute } from "@/app/api/products/[slug]/route";
import { GET as listProductsRoute } from "@/app/api/products/route";
import { createApiClient, type ApiClient } from "./client";

// Server components use the same client and contract as the browser, but call the route handlers
// as functions instead of over HTTP. The Next.js docs advise against a server component fetching
// its own route handlers, and a Worker cannot fetch its own public URL. The response still goes
// through JSON and the zod contract, exactly as it does in the browser.
export async function getServerApi(): Promise<ApiClient> {
  // Stock changes with every sale, so pages that read through this must never be prerendered.
  await connection();
  return createApiClient(sendInProcess);
}

const PRODUCT_PATH = /^\/api\/products\/([^/]+)$/;

// Matched by hand: fine for the few GET routes server components read. If this grows past a
// handful, have server components call lib/store directly instead.
async function sendInProcess(path: string): Promise<Response> {
  const { pathname } = new URL(path, "http://in-process.invalid");
  try {
    if (pathname === "/api/products") return await listProductsRoute();
    const productMatch = PRODUCT_PATH.exec(pathname);
    if (productMatch) {
      const params = Promise.resolve({ slug: decodeURIComponent(productMatch[1]) });
      return await getProductRoute(new Request(new URL(path, "http://in-process.invalid")), { params });
    }
  } catch (error) {
    // Over HTTP an unhandled error in a route handler becomes a bare 500; mirror that here.
    console.error("Route handler failed", pathname, error);
    return new Response(null, { status: 500, statusText: "Internal Server Error" });
  }
  throw new Error(`No in-process route for ${pathname}`);
}
