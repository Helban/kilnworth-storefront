import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FetchFailure } from "./fetch-failure";

describe("FetchFailure", () => {
  it("tells the shopper a contract failure is our bug, not their connection", () => {
    const markup = renderToStaticMarkup(
      <FetchFailure
        failure={{ kind: "contract", path: "/api/products", issues: ["products.0.priceCents: Invalid input"] }}
        subject="the catalog"
        retryHref="/"
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Could not load the catalog");
    expect(markup).toContain("not in the format this page expects");
    expect(markup).toContain("bug on our side");
    // Field-level details are for the logs, not the shopper.
    expect(markup).not.toContain("priceCents");
  });
});
