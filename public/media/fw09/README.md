# FW09 "The meter" — media assets

Status: installed 2026-06-10. Generated via Gemini / Veo 3 using the v3 prompt below — and improved by a happy accident Veo introduced on its own (see The Accident).

- `header.mp4` — 7s silent loop (audio stripped), 1280×720, h264. A topaz parking meter with a blank tick-marked dial; a coral paper sun rises from the hairline horizon, crosses the sky, and sets; the needle climbs and falls in sync. The coin-slot panel reads as a mouth — the meter frowns at dawn and wavers through the day. Loop-treated: final source second crossfaded into the first (xfade 1s), wrap lands on the same source frame — seamless by construction, dusk dissolving into dawn.
- `poster.jpg` — frame at 0.2s — sun half-risen, needle low, the meter at its grumpiest.

Wired in `content/fieldwork/09-the-meter.mdx` frontmatter:

    media:
      readMinutes: 5
      headerVideo: "/media/fw09/header.mp4"
      posterFrame: "/media/fw09/poster.jpg"

## The Accident (better than the brief)

The v3 prompt asked for: a coin gliding in from the left, the needle jumping on payment, then easing down as the sun crossed the sky. Veo instead **dropped the coin entirely**, synced the needle to the sun, and gave the coin slot an expressive mouth. The result reads as a meter trying to bill the sunrise — money simply being eaten (Maria's read) — which is closer to the essay's kicker ("the haiku, of course, stays free") than the transactional version we asked for. Kept. Lesson for the Frog Formula (see `../fw10/README.md`): when the model's accident is more on-thesis than the brief, take the accident.

## Gemini / Veo 3 prompt (v3, the take that produced the keeper)

> Generate a 3-second silent video, 16:9 widescreen, for the header of a personal essay called "The meter."
>
> CAMERA AND FRAMING: perfectly flat and straight-on. The textured cream paper IS the entire frame — it extends past every edge of the shot, edge to edge, corner to corner, like a close crop into the middle of a large screenprint. There is NO parchment card, NO deckled or torn outer edges, NO mat, NO white background behind the paper, NO border around the composition. No table, no wall, no room, no perspective, no tilt. Just the printed artwork filling 100 percent of the frame.
>
> The image: one vintage parking meter, right of centre — flat and stylised in the lineage of Charley Harper, Saul Bass, and Sister Corita Kent. The meter's rounded square head and thick pole are one bold flat field of warm topaz amber matte ink; the pole runs all the way down and off the bottom edge of the frame, anchoring the composition the way a printed figure bleeds off a poster's edge. Inside the head, a cream dial window with a single charcoal needle and a fan of simple short tick marks around the dial's arc — tick marks only, absolutely no numerals or letters. Below the dial, a small rounded cream coin-slot panel. Two thin ochre hairline rules cross the composition like a vintage poster grid: one horizontal rule running the full width at the meter's mid-height — this is the horizon — and one vertical rule behind the meter. In the left half of the frame: a flat coral paper-cutout sun with simple triangular rays, Matisse-style. Everything else is bare textured cream paper with generous empty space. Each colour is a single flat field of matte ink — no highlights, no gloss, no shading; the only texture is the subtle grain of the paper showing evenly through the ink.
>
> Motion — one small story, one full day, told in print shapes: a single flat charcoal coin — a plain blank disc, no markings — glides in from the LEFT edge of the frame, trailed by two thin charcoal arc lines drawn the way a printmaker stamps movement, and slips into the meter's slot. There is only ever ONE coin in the entire video; no coin ever appears from the top. The instant the coin lands, the needle swings to the top of the dial. Then, over the remainder of the video, two things happen together, slowly and steadily: the coral sun rises from below the horizontal horizon rule on the left, arcs gently up across the upper-left sky, and settles back down below the horizon — one complete day — while the needle eases steadily down the dial, the meter spending its credit as the day passes, reaching its starting low position at the exact moment the sun sets. The camera does not move. Nothing else moves.
>
> Loop: seamless. The video begins and ends in the same state — sun just below the horizon, needle low — so the day, the coin, and the meter repeat forever without a visible cut.
>
> Aspect ratio: 16:9 widescreen. Duration: 3 seconds. Silent — no audio of any kind.
>
> STRICTLY only one coin in the whole video, entering from the left — never from the top, never a second coin. No person, no hands, no fingers — the coin glides in by itself. No text, no letters, no numerals on the dial or the coin, no currency symbols. No parchment, no deckled edges, no visible outer paper edges, no frames or borders around the artwork. No photorealism, no realistic metal or chrome, no glossy 3D rendering, no cinematic lighting, no dramatic shadows, no blue gradients, no particle effects. The reference is a flat hand-printed mid-century editorial illustration — a vintage Charley Harper print — cropped so the paper fills the frame completely.
