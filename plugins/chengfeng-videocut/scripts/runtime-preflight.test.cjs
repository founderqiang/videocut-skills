"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const ensure = path.join(root, "scripts", "ensure-runtime.cjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "videocut-preflight-test-"));

function writeExecutable(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, { mode: 0o755 });
}

function fakeRuntime(file, healthy = true) {
  writeExecutable(file, `#!/bin/sh
if [ "$1" = "--version" ]; then echo "chengfeng-videocut 0.1.1"; exit 0; fi
if [ "$1" = "doctor" ]; then echo '${JSON.stringify({ schemaVersion: 1, product: "chengfeng-videocut", command: "doctor", ok: true, data: { healthy } })}'; exit 0; fi
exit 2
`);
}

function run(args, env = {}) {
  return spawnSync(process.execPath, [ensure, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      CHENGFENG_VIDEOCUT_DIR: "",
      CHENGFENG_VIDEOCUT_HOME: path.join(tmp, "managed-default"),
      ...env,
    },
  });
}

try {
  const readyBin = path.join(tmp, "ready", "chengfeng-videocut");
  fakeRuntime(readyBin, true);
  const ready = run(["--json"], { CHENGFENG_VIDEOCUT_BIN: readyBin });
  assert.equal(ready.status, 0);
  assert.equal(JSON.parse(ready.stdout).runtime.state, "ready");

  const missing = run(["--json"], { CHENGFENG_VIDEOCUT_BIN: path.join(tmp, "missing") });
  assert.equal(missing.status, 10);
  assert.equal(JSON.parse(missing.stdout).error.code, "runtime_missing");

  const unhealthyBin = path.join(tmp, "unhealthy", "chengfeng-videocut");
  fakeRuntime(unhealthyBin, false);
  const unhealthy = run(["--json"], { CHENGFENG_VIDEOCUT_BIN: unhealthyBin });
  assert.equal(unhealthy.status, 11);
  assert.equal(JSON.parse(unhealthy.stdout).error.code, "runtime_unhealthy");

  const installHome = path.join(tmp, "installed-home");
  const installer = path.join(tmp, "fake-installer.sh");
  writeExecutable(installer, `#!/bin/sh
set -eu
target="$CHENGFENG_VIDEOCUT_HOME/bin/chengfeng-videocut"
mkdir -p "$(dirname "$target")"
cat > "$target" <<'EOF'
#!/bin/sh
if [ "$1" = "--version" ]; then echo "chengfeng-videocut 0.1.1"; exit 0; fi
if [ "$1" = "doctor" ]; then echo '{"schemaVersion":1,"product":"chengfeng-videocut","command":"doctor","ok":true,"data":{"healthy":true}}'; exit 0; fi
exit 2
EOF
chmod +x "$target"
`);
  const installed = run(["--install-if-missing", "--json"], {
    CHENGFENG_VIDEOCUT_BIN: "",
    CHENGFENG_VIDEOCUT_HOME: installHome,
    CHENGFENG_VIDEOCUT_INSTALLER_FILE: installer,
  });
  assert.equal(installed.status, 0, installed.stderr);
  assert.equal(JSON.parse(installed.stdout).installed, true);
  assert.match(installed.stderr, /完成后继续当前任务/);

  const failedInstaller = path.join(tmp, "failed-installer.sh");
  writeExecutable(failedInstaller, "#!/bin/sh\nexit 9\n");
  const failed = run(["--install-if-missing", "--json"], {
    CHENGFENG_VIDEOCUT_BIN: "",
    CHENGFENG_VIDEOCUT_HOME: path.join(tmp, "failed-home"),
    CHENGFENG_VIDEOCUT_INSTALLER_FILE: failedInstaller,
  });
  assert.equal(failed.status, 12);
  assert.equal(JSON.parse(failed.stdout).error.code, "install_failed");

  console.log(JSON.stringify({ ready: 0, missing: 10, unhealthy: 11, installed: true, installFailed: 12 }));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
