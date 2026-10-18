"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserApi } from "@/lib/api/client";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30;

// Stripe's webhook usually lands within seconds of the redirect, but not always before it. While the
// order is still pending, ask again every two seconds for a minute, then re-render the page once the
// status has moved on.
export function OrderStatusPoller({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;

    async function poll() {
      polls += 1;
      try {
        const latest = await browserApi.getOrder(orderId, controller.signal);
        if (latest.ok && latest.data.order.status !== "pending_payment") {
          router.refresh();
          return;
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        throw error;
      }
      if (polls >= MAX_POLLS) {
        setGaveUp(true);
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orderId, router]);

  return (
    <p role="status" className="mt-4 max-w-[65ch] text-ink-muted">
      {gaveUp
        ? "Still waiting. Confirmation can occasionally take a few minutes; reload this page later."
        : "This page updates by itself once Stripe confirms the payment, usually within a few seconds."}
    </p>
  );
}
