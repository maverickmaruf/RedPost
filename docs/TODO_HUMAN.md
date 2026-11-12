# Tasks for the human team

## Before the hackathon starts

- [ ] **Read the challenge Resources tab.** It said "Resources will be available on Friday, November 13" when checked on 12 Nov. When it opens, compare its datasets against `docs/DATA_PLAN.md` and tell the build agent about anything new (especially any Artemis surface data or OSDR radiation datasets they name).
- [ ] **Register a free api.nasa.gov key** at https://api.nasa.gov (name + email). Then run `NASA_API_KEY=yourkey npm run acquire` to add the March 2023 window that DEMO_KEY's rate limit skipped. Never commit the key.
- [ ] **Fill in the team section** of README.md: team name and roles (the prompt's `[[TEAM NAME]]` placeholder was empty).
- [ ] **Confirm the time budget.** The `[[time budget]]` placeholder was empty; the plan assumes feature freeze 12:00 on 14 Nov.

## Bangla review (native speaker)

- [ ] Every string in `content/strings.bn.json` and every `bn` field in `content/facts.json` is a machine draft (`needs_native_review: true`). Read them aloud as if to a 9-year-old. Priority: `app.tagline`, `why.*`, `fc.*`, `crew.*`.
- [ ] Decide the Bangla game name ("লাল ঘাঁটি" is a literal draft of "Red Outpost").
- [ ] The model card table in About (constant notes) is English-only for now.

## Testing with people

- [ ] Hand the phone to someone who has never seen it (an adult; see the filming rule below). Note where they hesitate in the first 15 seconds.
- [ ] Try it on a real mid-range Android in sunlight, with flight mode on after the first load.

## Video and submission

- [ ] **No minors on camera, in voice or by name.** Film hands (an adult's) or a screen capture only.
- [ ] Record the 30 s and 240 s videos from `docs/DEMO_SCRIPT.md` (to be written in Phase 5).
- [ ] Make the GitHub repository public, and check the Apache-2.0 LICENSE and NOTICE are present.
- [ ] Paste the text from `docs/SUBMISSION.md` into the NASA project page.

## NEEDS_NETWORK

None right now: all shipped data is cached in `public/data/` and pinned in `demo_fixtures/`.
