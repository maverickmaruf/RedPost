# Use of AI

NASA Space Apps asks teams to disclose AI use. This is ours.

## Tools

- **Claude (Anthropic), in Claude Code**, used as a coding agent from 12 Nov 2026. It worked from a build prompt written by the team (summarised in `docs/prompts_used.md`).

## What the AI did

- Ran the Phase 0 data-verification spike (live HTTP requests to NASA APIs, reading NASA pages and the BVAD PDF) and wrote `docs/DATA_PLAN.md`.
- Spotted that the build prompt didn't match the published 2026 challenge, asked the team lead, and redesigned the game around the official statement.
- Wrote the code: acquisition scripts, the compute core and its tests, the UI, styles, the service worker config and CI.
- Drafted all English and Bangla text. The Bangla is flagged for native review.
- Drafted these docs.

## What the AI did not do

- **No AI runs inside the game.** There is no LLM call at runtime; every number a player sees is computed by deterministic code in `src/compute/` or quoted from a cited NASA source.
- No images were generated. The only artwork is a hand-written SVG icon and CSS shapes.

## Human decisions and review

- The team lead chose the direction ("choose the best one") when the conflict with the official statement came up.
- The team will review the Bangla, test with users, record the videos and submit (see `docs/TODO_HUMAN.md`).
