import Link from "next/link";
import type { ApiFailure } from "@/lib/api/client";

interface FetchFailureProps {
  failure: ApiFailure;
  // What we were trying to load, for example "the catalog".
  subject: string;
  retryHref: string;
}

export function FetchFailure({ failure, subject, retryHref }: FetchFailureProps) {
  return (
    <div role="alert" className="max-w-[65ch] rounded-xs border border-error bg-surface p-6">
      <h2 className="text-2xl text-error">Could not load {subject}</h2>
      <p className="mt-2">{describeFailure(failure)}</p>
      <Link href={retryHref} className="text-link mt-4 inline-block">
        Try again
      </Link>
    </div>
  );
}

export function describeFailure(failure: ApiFailure): string {
  switch (failure.kind) {
    case "network":
      return "The shop's server did not answer. Check your connection and try again.";
    case "http":
      // 4xx messages are written for shoppers ("Only 2 left."); 5xx details are not.
      if (failure.status < 500 && failure.code !== "unknown") return failure.message;
      return `The shop's server returned an error (HTTP ${failure.status}). It is probably temporary.`;
    case "contract":
      return (
        "The server answered, but not in the format this page expects, so nothing is shown " +
        "rather than something wrong. This is a bug on our side, not a problem with your connection."
      );
  }
}
