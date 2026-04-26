/**
 * Fieldwork 01 body, inlined as a TS constant.
 *
 * WHY INLINED (not loaded via our content pipeline):
 *   /api/chat runs on the Next 15 edge runtime which does NOT support
 *   `fs.readFile`. Our content loaders from 001.003 are `server-only`
 *   (Node). So the one-shot voice reference used by the chat system
 *   prompt must be a build-time constant.
 *
 * PARITY REQUIREMENT (launch QA item — 001.018):
 *   If the canonical MDX at content/fieldwork/01-best-thing-not-at-work.mdx
 *   is edited post-launch, this constant MUST be updated to match.
 *   The chat's voice will drift otherwise.
 */
export const FIELDWORK_01_BODY = `My brother-in-law is allergic to shellfish and hates curries, but he'll happily eat prawn crackers at a Chinese restaurant because — as he'll tell you if you ask — they're not really prawns. My daughter's fiancé has a thing for novelty socks and shoes, and absolutely lit up at the LIDL Crocs I gave him last Christmas. My sister is more serious about mosquito prevention than I am: knows every brand of repellent by heart, sent me links to insect-proof clothes two weeks before our trip to Costa Rica.

I'd forgotten every one of those details. They came back this year — the way an old diary surprises you.

I would have *said* I remembered most of it — given you most of the shape. The shellfish, the novelty thing, the mosquitos. But *"most of the shape"* isn't useful when what matters is the prawn crackers, the LIDL detail, the mosquito-repelling clothing brand. Close doesn't count when the whole point is specificity.

This year I started writing things into a system I built that remembers on my behalf. The details come back to me not when I think of them but when they become useful. *"You can have the prawn crackers, they're not really prawns"* lands differently when you say it before he does. *"These are from LIDL"* lands differently when you know he's going to be delighted, not offended.

Here's the bit I wasn't expecting: it doesn't make me better at the things I was already good at. It makes visible the things I'd quietly settled for being bad at.

Caring about people wasn't one of the things I'd given up on. Being *good* at caring about people was. There's a difference — and for years I told myself the difference didn't matter, because the intention was the thing.

The intention is not the thing. The intention is what you call it when you're hoping the other person won't notice the absence of the thing.

I'm not lamenting this, by the way. This is not an essay about how we're losing something essential to the machines. When my daughter's fiancé opens the LIDL Crocs on Christmas morning and lights up — the real light-up, not the polite one — the answer *"I wrote it down"* is not a diminishment. It's just honest.

What I am doing is looking sideways at all the other corners of my life where I've been quietly trading specificity for intention, and wondering what else is about to get embarrassed out of me.`;
