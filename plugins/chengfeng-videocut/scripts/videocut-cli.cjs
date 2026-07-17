#!/usr/bin/env node

"use strict";

const { spawn } = require("node:child_process");
const { resolveRuntimeInvocation } = require("./ensure-runtime.cjs");

let invocation;
try {
  invocation = resolveRuntimeInvocation(process.argv.slice(2));
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (!invocation) {
  console.error(
    "ERROR: 找不到 chengfeng-videocut。请先运行 ensure-runtime.cjs --install-if-missing --json。",
  );
  process.exit(10);
}

const child = spawn(invocation.command, invocation.args, {
  cwd: invocation.cwd,
  env: process.env,
  stdio: "inherit",
});

child.once("error", (error) => {
  console.error(`ERROR: 无法启动 chengfeng-videocut: ${error.message}`);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
