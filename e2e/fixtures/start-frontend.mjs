import { spawn } from "node:child_process";

const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--port", "3101"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      API_URL: process.env.API_URL ?? "http://127.0.0.1:3100/api/v1",
      PORT: "3101",
    },
  },
);

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("exit", (code) => process.exit(code ?? 0));
