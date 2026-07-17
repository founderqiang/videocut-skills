#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");

const PRODUCT = "chengfeng-videocut";
const INSTALLER_URL =
  "https://raw.githubusercontent.com/Agentchengfeng/chengfeng-videocut/8ad2bdb352fd09574d421b99049487ca333a63dc/install.sh";
const INSTALL_NOTICE =
  "未检测到 chengfeng-videocut，正在从 GitHub Release 安装；完成后继续当前任务。";

function isExecutable(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && (process.platform === "win32" || (stat.mode & 0o111) !== 0);
  } catch {
    return false;
  }
}

function findCommand(name) {
  const extensions = process.platform === "win32"
    ? String(process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];
  for (const directory of String(process.env.PATH || "").split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.join(directory, `${name}${extension}`);
      if (isExecutable(candidate)) return candidate;
    }
  }
  return null;
}

function managedHome() {
  return path.resolve(
    process.env.CHENGFENG_VIDEOCUT_HOME || path.join(os.homedir(), ".chengfeng-videocut"),
  );
}

function sourceInvocation(args) {
  const directory = process.env.CHENGFENG_VIDEOCUT_DIR;
  if (!directory) return null;
  const root = path.resolve(directory);
  const entry = path.join(root, "apps", "cli", "src", "cli.ts");
  if (!fs.existsSync(entry)) {
    throw new Error(`CHENGFENG_VIDEOCUT_DIR 不是产品源码目录: ${root}`);
  }
  const bun = findCommand("bun");
  if (!bun) throw new Error("本地源码模式需要 Bun；当前 PATH 中找不到 bun");
  return { command: bun, args: [entry, ...args], cwd: root, kind: "source" };
}

function resolveRuntimeInvocation(args = []) {
  const explicit = process.env.CHENGFENG_VIDEOCUT_BIN;
  if (explicit) {
    const candidate = path.resolve(explicit);
    return isExecutable(candidate)
      ? { command: candidate, args, cwd: process.cwd(), kind: "explicit" }
      : null;
  }

  const installed = findCommand(PRODUCT);
  if (installed) return { command: installed, args, cwd: process.cwd(), kind: "path" };

  const managed = path.join(managedHome(), "bin", PRODUCT);
  if (isExecutable(managed)) {
    return { command: managed, args, cwd: process.cwd(), kind: "managed" };
  }

  return sourceInvocation(args);
}

function run(invocation) {
  return spawnSync(invocation.command, invocation.args, {
    cwd: invocation.cwd,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

function parseJson(stdout) {
  const lines = String(stdout || "").trim().split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // The CLI may write a human-readable line before its JSON envelope.
    }
  }
  return null;
}

function inspectRuntime() {
  const base = resolveRuntimeInvocation([]);
  if (!base) return { state: "missing" };

  const versionResult = run({ ...base, args: base.kind === "source" ? [...base.args, "--version"] : ["--version"] });
  const doctorResult = run({ ...base, args: base.kind === "source" ? [...base.args, "doctor", "--json"] : ["doctor", "--json"] });
  const doctor = parseJson(doctorResult.stdout);
  const healthy = versionResult.status === 0 && doctorResult.status === 0 &&
    doctor?.ok === true && doctor?.data?.healthy === true;

  return {
    state: healthy ? "ready" : "unhealthy",
    kind: base.kind,
    command: base.command,
    version: String(versionResult.stdout || versionResult.stderr || "").trim(),
    doctor,
    diagnostics: healthy ? undefined : {
      versionExitCode: versionResult.status,
      doctorExitCode: doctorResult.status,
      stderr: String(doctorResult.stderr || versionResult.stderr || "").trim(),
    },
  };
}

function installRuntime() {
  const directory = mkdtempSync(path.join(os.tmpdir(), "chengfeng-videocut-installer-"));
  const installer = path.join(directory, "install.sh");
  try {
    const localInstaller = process.env.CHENGFENG_VIDEOCUT_INSTALLER_FILE;
    if (localInstaller) {
      writeFileSync(installer, readFileSync(path.resolve(localInstaller)));
    } else {
      const download = spawnSync("curl", [
        "-fsSL", "--retry", "3", "--connect-timeout", "15",
        process.env.CHENGFENG_VIDEOCUT_INSTALLER_URL || INSTALLER_URL,
        "-o", installer,
      ], { encoding: "utf8" });
      if (download.status !== 0) {
        throw new Error(String(download.stderr || "无法下载官方安装器").trim());
      }
    }

    const result = spawnSync("/bin/sh", [installer], {
      env: process.env,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) {
      throw new Error(`官方安装器退出码 ${String(result.status)}`);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function output(payload, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }
  if (payload.ok) {
    process.stdout.write(`${PRODUCT} ready: ${payload.runtime.command}\n`);
  } else {
    process.stderr.write(`${payload.error.message}\n`);
  }
}

function main(argv = process.argv.slice(2)) {
  const json = argv.includes("--json");
  const installIfMissing = argv.includes("--install-if-missing");
  const unknown = argv.filter((arg) => !["--json", "--install-if-missing"].includes(arg));
  if (unknown.length > 0) {
    output({ ok: false, error: { code: "invalid_argument", message: `未知参数: ${unknown.join(" ")}` } }, json);
    return 2;
  }

  let runtime = inspectRuntime();
  if (runtime.state === "ready") {
    output({ ok: true, installed: false, runtime }, json);
    return 0;
  }
  if (runtime.state === "unhealthy") {
    output({
      ok: false,
      error: {
        code: "runtime_unhealthy",
        message: "chengfeng-videocut 已存在但 doctor 未通过；为避免覆盖现有安装，本次不会自动重装。",
        details: runtime,
      },
    }, json);
    return 11;
  }
  if (!installIfMissing) {
    output({
      ok: false,
      error: { code: "runtime_missing", message: "未检测到 chengfeng-videocut。" },
    }, json);
    return 10;
  }

  process.stderr.write(`${INSTALL_NOTICE}\n`);
  try {
    installRuntime();
  } catch (error) {
    output({
      ok: false,
      error: {
        code: "install_failed",
        message: error instanceof Error ? error.message : String(error),
      },
    }, json);
    return 12;
  }

  runtime = inspectRuntime();
  if (runtime.state !== "ready") {
    output({
      ok: false,
      error: {
        code: "post_install_doctor_failed",
        message: "安装完成，但 doctor 未通过；当前任务已停止，Studio 未打开。",
        details: runtime,
      },
    }, json);
    return 13;
  }

  output({ ok: true, installed: true, runtime }, json);
  return 0;
}

module.exports = {
  INSTALL_NOTICE,
  inspectRuntime,
  main,
  managedHome,
  resolveRuntimeInvocation,
};

if (require.main === module) process.exitCode = main();
