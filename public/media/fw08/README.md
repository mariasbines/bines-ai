# FW08 "Both desks" — media assets

Status: installed 2026-05-26. Generated via Gemini / Veo 3 using the rip-and-fly prompt below.

- `header.mp4` — 8s silent video (audio track stripped), 1280×720, h264. A single hand-printed paper pinned to a textured wall; wind picks up; paper tears free and flies out of frame; brass push pin stays embedded.
- `poster.jpg` — frame at 0.5s — the paper intact on the wall before the wind arrives.

Wired in `content/fieldwork/08-both-desks.mdx` frontmatter:

    media:
      readMinutes: 5
      headerVideo: "/media/fw08/header.mp4"
      posterFrame: "/media/fw08/poster.jpg"

## Gemini / Veo 3 prompt

> Generate a 3-second silent video, 16:9 widescreen, for the header of a personal essay called "Both desks."
>
> The image: a single editorial-maximalist composition on a textured cream paper substrate that looks like aged screen-printed cardstock. Bold flat geometric shapes — rectangles, semicircles, and one prominent bordered box framing the lower-right quadrant — arranged in a hand-printed style, in the lineage of Sister Corita Kent, Saul Bass, and Charley Harper. Limited saturated palette: a deep forest emerald green as the dominant colour, with warm coral and muted ochre as secondaries. The composition feels printed by hand: visible paint texture, slight registration imperfection at the edges of the shapes, the natural grain of the paper showing through. The bordered box is the focal element — slightly larger than the other shapes, drawn with a clean rectangular outline, empty inside except for the paper texture.
>
> Motion: the camera holds completely still. The shapes themselves do not move. Soft indirect afternoon window light falls from the upper-left and moves slowly across the paper over the 3 seconds, casting a faint, gradually lengthening warm shadow that slides from the upper-left edge toward the lower-right. The shadow is subtle — like late-afternoon sunlight crossing a wall. The paper grain catches the light and shows micro-variation as it moves.
>
> Loop: seamless. The final frame must match the first frame exactly so the shadow appears to slide indefinitely without a visible cut.
>
> Aspect ratio: 16:9 widescreen. Duration: 3 seconds. Silent — no audio of any kind.
>
> STRICTLY no text of any kind, no letters, no numbers, no scribbles that could resemble writing, no logos, no signatures, no symbols that look like characters. No hands, no people, no fingers, no faces, no body parts. No glowing screens, no robots, no abstract digital effects, no particle swirls, no blue gradients, no glossy 3D rendering, no minimalist-AI-default vector look. The reference is hand-printed editorial illustration from the 1950s-60s American design canon, on textured paper, lit by natural window light.

## Tool notes

- **Veo 3 in Gemini Pro/Ultra** outputs 8s by default. Generate, then trim to a 3s segment with the cleanest loop point. If the UI allows, request a single 3s shot.
- If Veo invents text inside the bordered box, regenerate with the "STRICTLY no text" sentence moved to the top of the prompt — it complies better when the prohibition is first.
- For `poster.jpg`, export frame 1 of whichever take is picked. The shadow position at frame 1 will visually anchor the still that loads before autoplay kicks in.
