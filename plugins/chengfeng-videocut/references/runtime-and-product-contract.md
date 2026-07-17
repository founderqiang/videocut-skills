# Runtime 与产品契约

两个业务 Skill 共用本文件；它不是用户可触发的第三个 Skill。

## 预检状态

```text
ensure-runtime
      |
      +-- ready ------------------------> 继续当前 Skill
      |
      +-- missing --一句提示--> install --> doctor --> 继续当前 Skill
      |
      +-- unhealthy / install failed ---> 停止，不打开 Studio
```

- 缺失时从 v0.1.1 标签对应的固定 commit 获取官方安装器，再进入 Release 下载；Release 资产由安装器执行 SHA-256 校验。
- 安装位置是 `CHENGFENG_VIDEOCUT_HOME` 或 `~/.chengfeng-videocut`。
- CLI 已存在但 doctor 失败时不自动覆盖或循环重装。
- 查找顺序：显式 `CHENGFENG_VIDEOCUT_BIN`、PATH、托管安装目录、显式开发目录 `CHENGFENG_VIDEOCUT_DIR`。
- 不使用 npm、bunx、DMG 或源码 clone 作为普通用户安装流程。

## 单写者

```text
Skill proposal + expected revision
               |
               v
        Product CLI / API
               |
        validate + CAS + atomic write
               |
               v
          project artifacts
               |
               v
        Studio / Player / Timeline
```

- Skill 只写临时候选文件；规范产物必须用 `cuts set` 或 `artifact put` 发布。
- `project.json`、Cuts、artifact revision 与 workflow 只能由 Product 写入。
- Studio 是同一项目的审核界面，不是任务启动器，也不是第二份事实源。
- 物理剪切、阶段确认和最终导出都要求用户明确确认与最新 revision。

## 当前 Runtime 兼容门禁

- Runtime v0.1.1 尚无正式原视频转录命令；缺少获准 ASR 时，剪口播必须以 `missing_transcription_adapter` 停止。
- Runtime v0.1.1 的 `render run` 仍可能返回 `missing_renderer`；新版 Skill 不得把旧 renderer 重新打包，必须等待 Runtime 内置实现。
- 这两个缺口不允许通过旧 8898/8899 页面、直接文件写入或 Skill 私有导出器绕过。
