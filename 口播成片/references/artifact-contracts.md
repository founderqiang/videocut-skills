# Artifact Contracts

## Storyboard Markdown

Use this structure for each segment:

```markdown
## 4. 旧问题：跨软件搬运

**时间**：00:31.5-00:50.8
**字幕**：17-27
**画面任务**：让观众看见旧流程为什么麻烦。
**画面**：HTML 字卡
**类型**：旧流程图
**素材来源**：无现成图，重新画 HTML

**镜头动作**：
1. 00:31 先承接“同一条工作流”。
2. 00:38 再进入“以前：要绕出去”。

**逐字稿**：
```text
...
```
```

## Cue Table

Each cue is one semantic trigger:

```markdown
| Cue | 字幕 | 时间 | 口播句子 | 画面动作 |
|---|---:|---:|---|---|
| 4-3 | 21 | 00:38.7 | 以前没有 Codex 的话 | 画面切到“以前：要绕出去” |
```

Do not use "step 1 / step 2 / step 3" without the spoken sentence.

## HTML Module

Minimum module shape:

```html
<section class="screen step-0" id="screen">
  ...
</section>

<div class="hud">...</div>
<script src="render-mode.js"></script>
<script>
  const screen = document.getElementById("screen");

  function setStep(step) {
    screen.className = `screen step-${Math.max(0, Math.min(step, MAX_STEP))}`;
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type !== "set-step") return;
    setStep(Number(event.data.step || 0));
  });
</script>
```

Preview HUD is allowed for manual inspection, but final rendering must hide it through `render-mode.js`.

## Final Player

Scene list shape:

```js
const scenes = [
  { id: "1", kind: "video", start: 0, end: 7.62 },
  {
    id: "2",
    kind: "html",
    src: "module-02-reader-comment-proof.html",
    start: 7.62,
    end: 10.82,
    maxStep: 1,
    cueSteps: [
      { at: 7.62, step: 0 },
      { at: 9.00, step: 1 }
    ]
  }
];
```

Required globals:

```js
window.seekTo = async function seekTo(time) {
  // Load the active scene, seek video or post set-step to iframe.
  return { scene: currentScene.id, kind: currentScene.kind, time, step };
};

window.finalVideo = { scenes, totalDuration };
```

Required CSS:

```css
html,
body,
#stage {
  width: 1080px;
  height: 1440px;
  margin: 0;
  overflow: hidden;
  background: #f3ecdd;
}

#stage video,
#stage iframe {
  position: absolute;
  inset: 0;
  width: 1080px;
  height: 1440px;
  border: 0;
  background: #f3ecdd;
}
```

HTML modules must be loaded with `?render=1`.

## Review Player

Use two players when debugging timing:

- `integrated-review.html`: one continuous timeline for broad review.
- `desktop-review.html`: original video beside replacement visuals.

The review player may have controls. The final player must not.
