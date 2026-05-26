# FW08 "Both desks" — media assets

Drop two files here and uncomment the lines in `content/fieldwork/08-both-desks.mdx` frontmatter to wire them up:

- `header.mp4` — 3s atmospheric loop, silent, 16:9, seamless (last frame == first frame). Generated via Veo / Sora / Runway. Prompt is in the PR description.
- `poster.jpg` — single still frame used before the video loads. Can be the video's first frame exported, or a separate render.

Frontmatter once assets are in:

```yaml
media:
  readMinutes: 5
  headerVideo: "/media/fw08/header.mp4"
  posterFrame: "/media/fw08/poster.jpg"
```
