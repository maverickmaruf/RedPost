# Decisions

One line of reasoning each. Newest at the bottom.

- **D-001 (2026-11-12) Pivot from "Earth→ISS→Mars journey" to a Mars outpost survival trainer.** The official 2026 statement (read live) asks kids 7-12 to *manage a lunar or Martian outpost* trading life support, radiation shielding, power, food and comms delay, using DONKI/OSDR/Mars data. The build prompt's docking/EPIC missions don't answer it, and the prompt says the statement wins. Team lead said "choose the best one".
- **D-002 Audience is 7-12, not 10-14.** The statement says 7-12; text is short, icons back up words, and three core resources plus a dose meter (the statement warns against 5-6 systems).
- **D-003 Cut: ISS rendezvous (CW equations), EPIC Earth images, Life Aboard schedule, EDL timing task, capstone certificate, Sky Watch.** They were in the original prompt's mission list; none is part of the outpost objective. The CW rendezvous could come back as a "resupply" mini-game after submission.
- **D-004 Storms come from real DONKI WSA-ENLIL Mars arrival forecasts.** It's the only NASA feed that gives *forecast* CME arrival times at Mars, and it lets the radio trade-off (power vs warnings) be real.
- **D-005 Storm dose levels are simplified.** DONKI forecasts a CME shock, not a surface dose. We map glancing / direct <1000 km/s / direct ≥1000 km/s to 0.5 / 1.5 / 4.0 mSv, anchored to the measured 8.1 mGy May 2024 record. Labelled "simplified" in the model card.
- **D-006 Mission dose budget = 600 mSv career limit / 20 missions = 30 mSv.** A game rule that keeps the real 600 mSv number visible.
- **D-007 2D DOM and canvas, no Three.js.** The outpost is a decision game; 3D adds 150+ KB and risk on 2 GB phones for no teaching value.
- **D-008 Solar power uses the sol-averaged top-of-atmosphere insolation × exp(−0.4 τ).** A standard formula, cited inputs (Mars24 declination and distance); the dust term is simplified.
- **D-009 Dust opacity is simulated (seeded).** No compact NASA dust-τ feed was verified in Phase 0. Labelled "simulated" wherever shown.
- **D-010 InSight weather is an archived 7-sol loop.** The API is frozen at Oct 2020. We show "archived 2020", never "live".
- **D-011 Array 75 m², science goal 45, 2★ at 80% of goal, 3★ also needs dose ≤ 90% budget.** Tuned so pressing "End sol" passively in the easy month earns 1★, the Flight Director plan survives every real month at Jezero, and ignoring the radio fails in May 2024.
- **D-012 Some site and month pairs are deliberately very hard** (Gusev or Gale in June 2025 = southern winter). Real seasonal physics, as Spirit experienced; the site picker shows expected kWh per sol so the choice is informed, and the review says when even the Flight Director couldn't survive.
- **D-013 Forecasts heard while the radio is off are queued, not lost.** Kinder for 7-year-olds; the cost is still real because a warning delivered after the storm is useless.
- **D-014 Saves store setup and plans only, then replay.** Deterministic compute makes this exact and tiny, and corrupt saves are dropped instead of crashing.
- **D-015 Fonts: Atkinson Hyperlegible + Noto Sans Bengali (Fontsource, OFL), bundled locally.** No remote fonts, legible for young readers, Bangla renders offline.
- **D-016 Reference files supplied by the team (participants guide PDF, build guide HTML, prompt) are git-ignored.** Not ours to publish in a public repo; the prompt text will be summarised in docs/prompts_used.md instead.
- **D-017 Service worker uses "prompt" updates.** A new version never reloads mid-mission; the title screen offers Update.
