# Prompts used

## 1. Build prompt (team-authored, 12 Nov 2026)

The team wrote a long build prompt titled "OPUS BUILD PROMPT: NASA Space Apps 2026, Build a Junior Astronaut Mission Trainer". The full file is kept out of the public repo (local reference), but this is its substance:

- **Role:** lead engineer and game designer. Every number is computed by tested code or traced to a cited source; never invent NASA URLs or constants; mark anything unverified.
- **Non-negotiables:** offline-first PWA; deterministic science in `src/compute/`; every fact has a `source_id` checked by `npm run verify:claims`; child safety and privacy (no accounts, no tracking); honest `live | cache | fixture` badges; Apache-2.0; keep `docs/AI_USE.md`; record decisions instead of blocking.
- **Judging lens:** the Space Apps rubric (Impact, Creativity, Validity, Relevance, Presentation, Teamwork, UX, NASA data usage).
- **Product vision (superseded):** five missions Earth → ISS → Mars (checklist, EPIC imagery, ISS docking with Clohessy-Wiltshire physics, life aboard, Mars landing), plus a capstone.
- **Process:** Phase 0 verification spike → vertical slice → core → completion → hardening → submission kit, with quality gates (typecheck, lint, tests, verify:claims, offline e2e, Lighthouse, budgets).
- It said the official challenge statement wins if it conflicts with the prompt.

## 2. Clarification during Phase 0

The agent found the official statement asks for a lunar/Martian *outpost* management game for ages 7-12, and asked: pivot to the Mars outpost (recommended), outpost plus docking, or the original prompt. Answer: **"Choose the best one"**, which led to the pivot (DECISIONS.md D-001).
