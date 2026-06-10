# FW10 "Excellent manners" (formerly "The knee and the shrug") — media assets

Status: installed 2026-06-10. Generated via Gemini / Veo 3 using the Mr. Ed prompt below (third concept, second take — the stepping-stones and galloping-stallion concepts were abandoned; see Formula).

- `header.mp4` — 7s silent loop (audio stripped), 1280×720, h264. A grinning ruby horse head in profile (Mr. Ed lineage); a carrot on a string swings just out of reach; as it passes, the mouth opens into the full toothy grin, then settles back to a sly smile. Swing arcs drawn as printed motion marks. Loop-treated: final source second crossfaded into the first (xfade 1s), wrap point lands on the same source frame — seamless by construction.
- `poster.jpg` — clean frame at 0.3s — the sly closed smile, pre-grin, so the grin is a surprise when autoplay kicks in.

Wired in `content/fieldwork/10-excellent-manners.mdx` frontmatter:

    media:
      readMinutes: 3
      headerVideo: "/media/fw10/header.mp4"
      posterFrame: "/media/fw10/poster.jpg"

## THE FROG FORMULA (keep this around — Maria, 10 Jun 2026)

Reverse-engineered from FW07's poison-dart frog (the benchmark) after two failed abstract concepts. What makes these heroes work:

1. **One literal creature/object from the piece's own text** — not an abstract concept-translation. (FW07: the dart frog from the Costa Rica essay. FW10: the colleague literally called the model "a stallion"; the carrot is the dangled next tier.)
2. **One small EVENT with a beat, not ambient motion** — the frog: drop falls → ripples → blink. The horse: carrot swings in → grin opens → swings out → sly smile. A tiny story, not a wiggle.
3. **The creature REACTS** — the blink, the grin. That's what makes it feel alive rather than animated.
4. **All motion drawn as PRINT IDIOMS** — ripples as flat concentric rings, swings as thin arc marks. Motion the way a printmaker would stamp it. This is the single biggest tell between "hand-made" and "AI cartoon."
5. **Flat matte ink, thin cream keylines between shapes, paper grain through everything** — and say "no highlights, no white marks inside the shapes" or you get steak marbling.
6. **Paper fills the frame edge to edge** — lead the prompt with the camera/framing block or Veo builds a 3D scene (tabletop product shot, parchment card on white, invented stamping machines — all happened).
7. **STRICTLY block at the end** (move it to the top if Veo invents text): no parchment/deckled edges, no people/hands, no text/numbers, no photorealism, no realistic teeth/gums, no 3D/cinematic lighting.
8. **Veo outputs 8s regardless** — trim/loop-treat after. The xfade-wrap (tail second dissolved into head second) gives a constructionally seamless loop; a palindrome works for breathe-in/breathe-out motion.

Full prompt history for this piece: `~/Downloads/fun with claude/bines-hero-prompts/` (stones v1/v2, stallion v1/v2, Mr. Ed v1/v2).

## Gemini / Veo 3 prompt (the winner — Mr. Ed v2)

> Generate a 3-second silent video, 16:9 widescreen, for the header of a personal essay called "The knee and the shrug."
>
> CAMERA AND FRAMING: perfectly flat and straight-on. The textured cream paper IS the entire frame — it extends past every edge of the shot, edge to edge, corner to corner, like a close crop into the middle of a large screenprint. There is NO parchment card, NO deckled or torn outer edges, NO mat, NO white background behind the paper, NO border around the composition. No table, no wall, no room, no perspective, no tilt. Just the printed artwork filling 100 percent of the frame.
>
> The image: the head and neck of one horse, large in the right two-thirds of the frame, in profile facing left — flat and stylised in the lineage of Charley Harper, Saul Bass, and Sister Corita Kent. The head and neck are one bold flat field of deep ruby red matte ink; the mane is charcoal in simple flat shapes; the eye is a single round charcoal dot on a small cream patch, bright and amused. All shapes are separated by thin lines of bare cream paper, like a hand-cut print. In the upper-left: a single carrot — flat ochre-orange with a small emerald-green leafy top — hangs from a thin charcoal string entering from the top edge, just beyond the horse's muzzle. Beside the string, two thin charcoal arc lines indicate its swing — motion marks drawn the way a printmaker stamps movement, like the curved lines around a ringing bell in a vintage poster. Everything else is bare textured cream paper with generous empty space. Each colour is a single flat field of matte ink — no highlights, no white marks inside the shapes, no gloss, no shading; the only texture is the subtle grain of the paper showing evenly through the ink.
>
> Motion — one small story, told in print shapes, everything else perfectly still: the carrot swings gently toward the horse's muzzle on its string. As it swings close, the horse's mouth opens into a wide, comic, friendly grin, showing a row of big flat rectangular teeth — charming and knowing, like the grinning talking horse from 1950s American television (Mr. Ed); the teeth are simple bare-cream-paper shapes separated by thin keylines. The carrot swings back out of reach, and the mouth closes again into a sly, contented smile. The head does not turn, the eye does not move, the camera does not move. The mouth opening and closing is the only change on the horse, the way a frog blinks in a vintage print.
>
> Loop: seamless. The carrot's swing and the grin's open-and-close form one perfectly regular cycle, so the final frame matches the first frame exactly and the print appears alive forever without a visible cut.
>
> Aspect ratio: 16:9 widescreen. Duration: 3 seconds. Silent — no audio of any kind.
>
> STRICTLY no parchment, no deckled edges, no visible outer paper edges, no frames or borders around the artwork. No person, no hands, no human figures. No text, no letters, no numbers, no logos. No photorealism, no realistic anatomy, no fur, no realistic teeth or gums, no glossy 3D rendering, no cinematic lighting, no dramatic shadows, no blue gradients, no particle effects. The reference is a flat hand-printed mid-century editorial illustration — a vintage Charley Harper wildlife print — cropped so the paper fills the frame completely.
