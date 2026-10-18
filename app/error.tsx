"use client";

import { useEffect } from "react";

export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert">
      <h1 className="text-4xl">This page failed to load</h1>
      <p className="mt-4 max-w-[65ch] text-ink-muted">
        Something went wrong on our side. Trying again usually works.
      </p>
      <button
        type="button"
        onClick={retry}
        className="button-primary mt-6"
      >
        Try again
      </button>
    </div>
  );
}
