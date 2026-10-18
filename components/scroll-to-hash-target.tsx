"use client";

import { useEffect } from "react";

// A link like /#category-bowl from another page lands on the loading placeholder first. Next.js
// looks for the #hash target then, finds nothing yet, and stays at the top. Rendered after the
// targets, this finishes the jump once they exist.
export function ScrollToHashTarget() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
  return null;
}
