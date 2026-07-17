# chengfeng-videocut

给 Codex 用的中文口播剪辑 Marketplace 插件。

公开业务入口只有两个：

```text
剪口播      -> source_cut.mp4 + subtitles.srt
口播成片    -> final.mp4 + verification.json
```

插件不复制剪辑产品本体。两个 Skill 负责判断和编排，确定性动作由 `chengfeng-videocut` Runtime 的 CLI / API 执行；只有进入人工审核阶段才打开同一个 Studio。

## 安装

直接把 GitHub 仓库添加为 Codex Marketplace：

```bash
codex plugin marketplace add Agentchengfeng/chengfeng-videocut-skills --ref main
codex plugin add chengfeng-videocut@chengfeng-videocut
```

不需要 npm、`npx`、`bunx`、DMG 或手工复制 Skill。

安装插件后，第一次使用任一业务 Skill 时会先检测产品 Runtime：

```text
doctor
  |
  +-- ready --------------------> 继续当前 Skill
  |
  +-- missing
  |      |
  |      +--> 提示一句安装状态
  |      +--> GitHub Release
  |      +--> SHA-256 校验
  |      +--> 安装后 doctor
  |      +--> 继续当前 Skill
  |
  +-- unhealthy / failed -------> 停止；不覆盖；不打开 Studio
```

Runtime 默认安装到：

```text
~/.chengfeng-videocut
```

## 使用

剪口播：

```text
使用“剪口播”处理这条视频。识别口误，等我审核后再物理剪切，并生成剪后字幕。
```

技术 ID：`chengfeng-videocut:cut-talking-head`。

口播成片：

```text
使用“口播成片”把这个项目的剪后视频和字幕做成完整成片。分镜、动画和时间线分别给我审核。
```

技术 ID：`chengfeng-videocut:finish-talking-head`。

直接要求“口播成片”但缺少基础素材包时，Codex 会在同一个任务和 `projectId` 内先补完剪口播，不需要第三个“口播工作台”入口。

## 架构

```text
Codex
  |
  +-- cut-talking-head
  +-- finish-talking-head
  +-- show_workflow_confirmation (MCP App)
  |
  v
shared ensure-runtime
  |
  v
GitHub Release Runtime
  |
  +-- CLI / API
  +-- project truth + revision / CAS
  +-- media cut / render / verify
  +-- Studio（只在 review-ready 时打开）
```

确认卡不是第三个 Skill。它只把白名单 action、`projectId` 与 revision 交回当前 Codex 对话；卡片本身不执行剪切或导出。

## 仓库结构

```text
chengfeng-videocut-skills/
├── .agents/plugins/marketplace.json
├── plugins/chengfeng-videocut/
│   ├── .codex-plugin/plugin.json
│   ├── .mcp.json
│   ├── dist/server.mjs
│   ├── public/review-confirm.html
│   ├── scripts/
│   ├── references/
│   └── skills/
│       ├── cut-talking-head/
│       └── finish-talking-head/
├── LICENSE
├── NOTICE.md
└── CITATION.cff
```

发布插件包含约 1.1MB 的预打包 MCP Server，不包含 `node_modules`。

## 当前边界

产品 Runtime v0.1.1 仍有两个明确缺口：

- 没有正式的原视频 transcribe/import CLI；没有可用 ASR 时，剪口播会停止并报告缺失能力。
- `render run` 仍可能要求外部 renderer；新 Skill 不会把旧 renderer 偷偷打包回来。

在 Runtime 补齐这两项并完成真实项目 E2E 前，不把“插件可安装”描述为“两条工作流已经完全自动化”。

## 开发验证

```bash
cd plugins/chengfeng-videocut
npm install
npm run build
npm test
```

另外运行 Skill validator、Plugin validator，并在隔离 Codex 任务中确认只发现两个业务 Skill。

## 官方来源

本项目由 **chengfeng / AI产品自由** 原创并维护。

```text
GitHub: Agentchengfeng
X: chengfeng240928
小红书 / 公众号 / B站 / 抖音 / 视频号: AI产品自由
```

原始仓库：<https://github.com/Agentchengfeng/chengfeng-videocut-skills>

## 协议

本项目使用 Apache License 2.0。转载、翻译、二次发布或改造时，请保留原作者、原始仓库链接、`LICENSE` 和 `NOTICE.md`。
