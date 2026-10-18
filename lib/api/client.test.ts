import { describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiTransport } from "./client";

const validProduct = {
  slug: "moon-jar",
  name: "Moon jar",
  description: "A 30 cm moon jar.",
  category: "one-off",
  priceCents: 34000,
  stockLeft: 1,
  image: { src: "/products/moon-jar.webp", width: 800, height: 800 },
};

function respondWith(body: string, status = 200): ApiTransport {
  return () => Promise.resolve(new Response(body, { status, headers: { "content-type": "application/json" } }));
}

describe("API client", () => {
  it("returns the parsed body when the response matches the contract", async () => {
    const api = createApiClient(respondWith(JSON.stringify({ products: [validProduct] })));

    expect(await api.listProducts()).toEqual({ ok: true, data: { products: [validProduct] } });
  });

  it("reports a contract failure, with the offending field, when a field has the wrong type", async () => {
    const broken = { ...validProduct, priceCents: "340.00" };
    const api = createApiClient(respondWith(JSON.stringify({ products: [broken] })));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const listing = await api.listProducts();

    expect(listing).toEqual({
      ok: false,
      failure: {
        kind: "contract",
        path: "/api/products",
        issues: [expect.stringMatching(/^products\.0\.priceCents: /)],
      },
    });
    expect(log).toHaveBeenCalledWith("API response broke the contract", "/api/products", expect.any(Array));
  });

  it("reports a contract failure when the body is not JSON at all", async () => {
    const api = createApiClient(respondWith("<html>Gateway timeout</html>"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const listing = await api.listProducts();

    expect(listing.ok === false && listing.failure.kind).toBe("contract");
  });

  it("passes on the error code from an error response", async () => {
    const errorBody = { error: { code: "product_not_found", message: "Nothing here." } };
    const api = createApiClient(respondWith(JSON.stringify(errorBody), 404));

    expect(await api.getProduct("teapot")).toEqual({
      ok: false,
      failure: { kind: "http", status: 404, code: "product_not_found", message: "Nothing here." },
    });
  });

  it("reports a network failure when the request never gets a response", async () => {
    const api = createApiClient(() => Promise.reject(new TypeError("fetch failed")));

    expect(await api.listProducts()).toEqual({ ok: false, failure: { kind: "network" } });
  });
});
