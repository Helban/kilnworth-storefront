import { execFile } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { STRIPE_MOCK_IMAGE, STRIPE_MOCK_URL } from "./stripe-mock";

const run = promisify(execFile);
const STARTUP_ATTEMPTS = 30;
let startedContainer: string | null = null;

// Payment tests need stripe-mock. Use one that is already running (CI service, `npm run
// stripe-mock`), or start the pinned image with Docker for this run and stop it afterwards.
export async function setup() {
  if (await isReachable(STRIPE_MOCK_URL)) return;
  const port = new URL(STRIPE_MOCK_URL).port;
  try {
    const { stdout } = await run("docker", ["run", "-d", "--rm", "-p", `${port}:12111`, STRIPE_MOCK_IMAGE]);
    startedContainer = stdout.trim();
  } catch (error) {
    throw new Error(
      `The payment tests need stripe-mock at ${STRIPE_MOCK_URL}, and starting it with Docker failed. ` +
        "Start Docker, or run `npm run stripe-mock` in another terminal.",
      { cause: error },
    );
  }
  for (let attempt = 0; attempt < STARTUP_ATTEMPTS; attempt += 1) {
    if (await isReachable(STRIPE_MOCK_URL)) return;
    await sleep(500);
  }
  throw new Error(`stripe-mock did not answer at ${STRIPE_MOCK_URL} after starting.`);
}

export async function teardown() {
  if (startedContainer) await run("docker", ["stop", startedContainer]);
}

async function isReachable(url: string): Promise<boolean> {
  try {
    await fetch(url);
    return true;
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}
