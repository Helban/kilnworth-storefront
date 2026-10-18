import { setup, teardown } from "../test/global-setup";

// The same stripe-mock as the unit tests: reuse a running one, or start the pinned image.
export default async function globalSetup(): Promise<() => Promise<void>> {
  await setup();
  return teardown;
}
