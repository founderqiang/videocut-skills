# chengfeng-videocut Codex Plugin

公开入口只有两个：

```text
剪口播      -> source_cut.mp4 + subtitles.srt
口播成片    -> final.mp4 + verification.json
```

两个 Skill 共用 `scripts/ensure-runtime.cjs`，Runtime 缺失时从固定版本的官方 GitHub 安装器进入 Release 安装并在 doctor 通过后继续当前任务。Studio 只在人工审核状态打开。

`show_workflow_confirmation` 是同一插件中的 MCP App 工具，不是第三个 Skill；它只把 action、projectId 与 revision 交回当前 Codex 对话。

## 开发验证

```bash
npm install
npm run build
npm test
```

发布目录需要 `dist/server.mjs` 与 `public/`，不包含 `node_modules/`。
