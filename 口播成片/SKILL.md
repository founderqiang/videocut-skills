---
name: videocut:口播成片
description: 口播视频成片 Skill。把文章/口播稿/SRT、剪后视频和 HTML/图片素材串成分镜稿、时间线预览和最终 1080x1440 竖版 MP4。触发词：口播成片、做分镜稿、时间线预览、合成口播视频、导出竖屏MP4
author: chengfeng / AI产品自由
source: https://github.com/Agentchengfeng/videocut-skills
official_accounts: GitHub @Agentchengfeng；X @chengfeng240928；小红书/公众号/B站/抖音/视频号 @AI产品自由
---

# 口播成片

## Goal

Produce a complete vertical video from two tracks:

- **Original footage track**: real screen recordings,操作录屏, article result pages, or proof clips that should not be redrawn.
- **HTML visual track**: logic diagrams, information-card pages, image-focus pages, and step animations that replace weak or missing footage.

Do not treat this as only "make PPT". The user-facing workflow has exactly three steps:

```text
分镜稿 -> 时间线预览 -> 合成
```

All technical work must be grouped under these three steps. Do not present cue tables, modules, review players, final players, or exporters as separate user-facing workflow stages.

## Source Truth

Start by locating these files:

- Article or口播稿, usually `docs/04-*`, `docs/06-*`, or a confirmed script.
- Subtitle file, usually `video.srt` or `subtitles_with_time.json`.
- Edited source video, usually `_cut.mp4`.
- Existing article images/screenshots, usually `assets/` or `hyperframes-*/assets/from-article/`.
- Existing project rules: read local `AGENTS.md` and project `README.md` when present.

If the user gives a prior session log, use it only to find source paths and decisions; verify with real files.

When an edited source video and final SRT exist, the SRT / actual spoken audio is the source of truth for displayed口播 in storyboard and timeline review pages. The article or draft script can provide intent and cleaner wording, but do not assume it still matches the recorded口播. If the speaker deleted lines during recording, remove those lines from the review transcript and cue alignment.

## Workflow

### 1. 生成分镜稿

The first artifact is the storyboard page. It maps each spoken segment to the material page/asset and the spoken content.

When the minimum input is ready, especially `视频 + 字幕/SRT`, do not create a Markdown storyboard as the default first artifact.

Create an HTML storyboard page directly, usually:

```text
review/storyboard-audit-vN.html
```

This page is still a 分镜稿, not the final timeline preview. It must let the user quickly answer:

> At this second, what does the viewer see?

Each segment in the HTML page must include:

- Time range
- Subtitle numbers
- Visual task
- Visual type: `原视频`, `页面录屏`, `评论截图`, `信息图聚焦`, `HTML 字卡`, `操作录屏`
- Source asset
- Camera/action notes
- Complete transcript for that segment

Layout requirements:

- Left side: use the existing material page or asset directly when the segment maps to one, such as a project `可视化/*.html` page, article screenshot, generated diagram, or proof frame.
- The visual preview for each segment must represent the final video frame: a fixed 3:4 vertical canvas, not a scrollable webpage. The storyboard audit page itself may scroll between segments, but the left-side visual frame for a segment must not scroll.
- When using an existing HTML page as material, lock it to the intended viewport state, usually the first screen or a named screenshot/fixed frame. Do not embed a free-scrolling iframe as the visual track. If the first screen cannot be captured or the referenced screenshot is missing, mark it as a material gap instead of substituting a different-looking page.
- Design inside the 3:4 canvas from the start. Do not draw a taller/wider page and rely on scrolling, browser clipping, or `overflow: hidden` to hide the excess. If content does not fit, split it into multiple fixed frames, use a deliberate crop, or create a timed pan/zoom step.
- Each fixed visual page should use only one source image, screenshot, video, or HTML material as its main visual. If multiple images/screenshots need to appear, split them into separate fixed frames or timed steps instead of stacking them on one page. Lightweight labels, outlines, arrows, or callouts on top of that single source visual are allowed.
- Use ASCII storyboard sketches only for segments that do not yet have a suitable material page or asset.
- Right side: time,字幕编号, visual task, source, motion, and transcript.
- Transcript / 完整口播 must be visible by default in the audit page. Do not hide it behind a collapsed accordion; if using `<details>`, add the `open` attribute.
- Existing material pages/images should be embedded as the review visual when practical, with a clickable source link. Do not redraw an existing information graphic unless the user asks.
- Do not show image filenames, module names, or visible figcaptions directly under the left-side visual media. Put source attribution and links in the right-side source/detail fields or hidden audit metadata instead.
- The page should be openable as a standalone local HTML file. Do not require a dev server.

Only create a Markdown storyboard such as `docs/07-口播分镜-vN.md` when the user explicitly asks for a document version or when another downstream tool requires Markdown.

Decision rules:

- Use original footage for real operations, proof, article result pages, and moments where authenticity matters.
- Use HTML for abstract relationships, old/new workflow comparisons, mechanism diagrams, and missing visual material.
- Reuse existing images. Do not redraw an existing information graphic unless the user asks.
- If the same image appears twice, each use must have a different task: full view, local focus, contrast, or result review.

### 2. 生成时间线预览

After the user accepts the 分镜稿 direction, build a 时间线预览.

时间线预览 means: original video/audio and replacement visuals are placed on the same timeline, so the user can watch whether the material changes match the spoken line.

This step includes the old technical tasks:

- cue table: bind each visual action to a spoken sentence and timestamp.
- visual modules: prepare one HTML/material scene per replacement segment when needed.
- preview player: create a timeline page that plays original footage/audio and material visuals together.

Create preview artifacts usually under:

```text
docs/08-动画cue表-vN.md
html-modules/module-*.html
review/timeline-preview.html
```

Use `templates/timeline-preview.html` as the default base when creating `review/timeline-preview.html`.

Default timeline preview controls:

- Play / pause.
- Scrubber synced to the original video/audio timeline.
- Volume control.
- Speed controls: `1x`, `1.25x`, `1.5x`, `2x`.

The speed controls must update the hidden original video clock and any visible original-video segment in the stage, so audio and visual playback stay in sync.

Do not distribute animation steps evenly across a page. Bind every movement to the spoken sentence:

> The picture moves only when the spoken sentence reaches that meaning.

Module contract:

- One `.screen` root.
- 3:4 vertical canvas; final output must support 1080x1440.
- No scrolling inside `.screen`. The rendered frame must be a fixed state at that timestamp. Long pages must be represented by a captured viewport, crop, pan/zoom animation, or explicit step state, not by a scrollable document.
- Every visible element must fit within the 3:4 `.screen` at every step. Avoid off-canvas layout, oversized long panels, or content that only becomes acceptable after browser clipping.
- Internal state controlled by `.step-N` classes.
- Listen for `postMessage({ type: "set-step", step })`.
- Include a local preview HUD if useful, but it must be hidden in final render mode.
- Prefer existing images for information-graphic pages.
- When an existing information graphic already explains the logic, create an HTML module that uses the original image as the base layer and adds spoken-line highlights, masks, zooms, or callouts on top. Do not redraw the graphic unless the original is unreadable or logically wrong.
- If the user needs to inspect the original image details, do not dim the whole image with a gray spotlight overlay. Prefer outline-only highlights, small labels, arrows, or gentle glow so the base image stays readable.
- HTML modules should not add a bottom "画面动作" or explanatory footer inside the visual frame. Motion notes belong in the storyboard detail panel or the timeline cue table, not on the viewer-facing visual.
- For newly drawn relationship maps, logic diagrams, workflow diagrams, or concept diagrams in HTML modules, prefer Rough.js by default so the visual reads as a purposeful diagram rather than generic CSS cards.
- Plain CSS cards are acceptable only for simple labels, lists, or wrappers around existing assets. They should not be the default for a new relation graph or mechanism diagram.
- For animation overlays, use Rough.js as the drawing layer by default: focus boxes, arrows, path lines, result badges, and flow-step flashes should be Rough.js canvas drawings over the single source visual. CSS may position static text or layout wrappers, but CSS borders, CSS arrows, or pulse animations should not be the animation body.
- Do not redraw a Rough.js overlay on every timeline tick. Cache the current step and redraw only when the step, viewport size, or source image size changes; otherwise the hand-drawn randomization will make the linework flicker.
- If Rough.js is unavailable or would add fragility to final rendering, use inline SVG as the fallback and keep the diagram explicit: nodes, arrows, grouping, and step states must be visible without relying on long explanatory text.
- For text-heavy relation diagrams, prefer a line-free numbered-step layout: Rough.js draws one clear box per step, and animation highlights steps in sequence. Avoid connector lines or arrows that cross through labels, paragraphs, or footer notes.
- If connector lines are required, do not hand-position Rough.js lines. Use a mature graph layout renderer instead:
  - Mermaid for simple flowcharts and relationship diagrams in standalone HTML modules.
  - Dagre / dagre-d3 or ELK.js for complex node-link layouts that need more control.
  - Rough.js can still be used for hand-drawn styling, but not as the layout engine.

Add the render-mode helper after modules exist:

```bash
node ~/.claude/skills/videocut/口播成片/scripts/write_render_mode.cjs \
  --project-dir /absolute/path/to/hyperframes-project
```

This writes `render-mode.js` and injects it into `module-*.html`. Final players should load modules with `?render=1`.

The 时间线预览 can include two review surfaces when useful:

- `integrated-review.html`: one timeline, original audio/video + HTML modules.
- `desktop-review.html`: left side original video, right side replacement visuals, same time axis.

Use the 时间线预览 to catch:

- A spoken phrase triggering the wrong visual.
- A page starting with the wrong logical state.
- Review transcript still showing draft-script lines that were deleted from the actual口播.
- Repeated tail words across scene boundaries.
- HTML modules that look fine alone but fail inside the full timeline.
- Segments that should remain original footage instead of HTML.

### 3. 合成

Only start 合成 after the 时间线预览 is accepted.

Create `final-player.html` only after review passes.

Final player contract:

- The viewport and `#stage` are exactly `1080x1440`.
- `window.finalVideo.totalDuration` exposes the total duration.
- `window.seekTo(time)` switches scene and returns the active state.
- Video scenes seek the original `_cut.mp4`.
- HTML scenes load `module-*.html?render=1` and send `set-step`.
- The final player contains no review UI outside `#stage`.

Read [references/artifact-contracts.md](references/artifact-contracts.md) before implementing a new final player.

Run the bundled exporter:

```bash
node ~/.claude/skills/videocut/口播成片/scripts/export_final_video.cjs \
  --project-dir /absolute/path/to/hyperframes-project \
  --input-video /absolute/path/to/source_cut.mp4 \
  --duration 173.03 \
  --output renders/final-1080x1440.mp4
```

The script:

- Opens `final-player.html` in Playwright.
- Seeks the timeline at 30fps.
- Screenshots `#stage` into `renders/final-video-frames/`.
- Builds a video-only MP4 with ffmpeg.
- Muxes the original audio into the final MP4.

Use `--fps`, `--player`, `--stage`, `--frames-dir`, `--width`, and `--height` when the project differs from the default.

Always validate the final MP4:

```bash
ffprobe -v error \
  -show_entries format=duration,size:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels \
  -of json /absolute/path/to/final.mp4
```

Expected default:

- `1080x1440`
- `30fps`
- Duration matches the source edit
- Has an audio stream

Extract check frames:

```bash
ffmpeg -y -ss 00:00:09.10 -i final.mp4 -frames:v 1 renders/final-check-009s.jpg
ffmpeg -y -ss 00:01:31.70 -i final.mp4 -frames:v 1 renders/final-check-092s.jpg
ffmpeg -y -ss 00:02:51.50 -i final.mp4 -frames:v 1 renders/final-check-172s.jpg
```

View the frames before reporting success.

## Visual Rules

- The screen is a visual track, not subtitles. Do not copy long transcript text onto slides.
- Use one visual anchor per segment.
- Existing information graphics should be shown cleanly, then focused or highlighted.
- Avoid repeated decorative cards. Use cards only for real repeated items or framed tools.
- Do not add bottom explanation text that competes with the spoken line.
- In final render mode, no HUD, buttons, review timeline, or browser chrome should appear.

## Common Failures

- **Animation not aligned**: rebuild the cue table; do not tune timing by feeling.
- **HUD appears in export**: ensure modules load with `?render=1` and `render-mode.js` is injected.
- **Iframe crop is wrong**: avoid CSS cropping; make modules render full-size through render mode.
- **Original footage missing**: mark that segment as needing re-recording, do not fake a proof page with HTML.
- **Same visual repeats**: split the page or assign different focus tasks.
- **Export succeeds but video is wrong**: trust ffprobe plus extracted frames, not the command exit code alone.

## Project Hygiene

If working under the user's writing workspace, update the project README index after adding or changing files. Do not add a README inside this skill folder.
