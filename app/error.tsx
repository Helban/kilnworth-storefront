"use client";

import { useEffect } from "react";

export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert">
      <h1 className="font-serif text-2xl font-semibold">This page failed to load</h1>
      <p className="mt-2 text-stone-600">
        Something went wrong on our side. Trying again usually works.
      </p>
      <button
        type="button"
        onClick={retry}
        className="mt-4 rounded-md bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-700"
      >
        Try again
      </button>
    </div>
  );
}
