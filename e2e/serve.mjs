// Starts the app for the end-to-end tests the way it runs in production: the OpenNext build inside
// workerd, with a fresh local D1 database of its own and Stripe pointed at stripe-mock.
import { execFileSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { E2E_PORT, E2E_STATE_DIR, E2E_STRIPE } from "./settings.mjs";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

rmSync(E2E_STATE_DIR, { recursive: true, force: true });
execFileSync(npx, ["wrangler", "d1", "migrations", "apply", "DB", "--local", "--persist-to", E2E_STATE_DIR], {
  stdio: "inherit",
});
execFileSync(npx, ["opennextjs-cloudflare", "build"], { stdio: "inherit" });

const preview = spawn(
  npx,
  [
    "opennextjs-cloudflare",
    "preview",
    "--port",
    String(E2E_PORT),
    "--persist-to",
    E2E_STATE_DIR,
    ...Object.entries(E2E_STRIPE).flatMap(([name, value]) => ["--var", `${name}:${value}`]),
  ],
  { stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => preview.kill(signal));
preview.on("exit", (code) => process.exit(code ?? 0));
