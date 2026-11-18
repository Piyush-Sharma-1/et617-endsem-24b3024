# DESIGN — Pendulum Lab (ET 617 End-Sem)

Live: https://et617-24b3024.vercel.app · Repo: https://github.com/Piyush-Sharma-1/et617-endsem-24b3024

## Identity card
| Field | Choice |
|---|---|
| ID | 24B3024 (Aditya Koli) |
| P | P5 — Inquiry-based virtual laboratory |
| T | P5-T1 — Simple pendulum: length, mass, amplitude vs period (Cl. 9–11) |
| L | L1 — Rural government school, regional-language (Marathi) medium, parent's Android phone ~30 min in the evening |
| C | C3 — Mobile-first, one-handed (360 px, thumb-reach actions, no hover) |

## Problem
Rural Marathi-medium Class 9 students meet the pendulum only as a formula (T = 2π√(L/g)) in the textbook, with no lab time to test it. Many believe a heavier bob or a bigger swing changes the time of one swing. They also change several things at once, so they cannot tell which variable matters. The app gives a phone-sized lab where the learner predicts, tests one variable at a time, and revises the prediction.

## Learning outcomes
1. **Predict** how the period changes when the string length is made 4× longer (period doubles).
2. **Explain**, using their own run data, why changing the bob's mass does not change the period.
3. **Design** a fair test that changes only one variable and **compare** periods from two runs.

## Persona — Sunita Pawar
- 14, Class 9, Zilla Parishad school near Satara, Maharashtra. Marathi medium; reads simple English slowly.
- Prior knowledge: can use a stopwatch, knows length in cm and mass in g, has seen a swing (झोका). Has not done a timing experiment.
- Misconception M1: "A heavier bob swings faster" (shorter period).
- Misconception M2: "A bigger swing (amplitude) takes more time per swing."
- Device: father's Android phone (~360 px wide), slow 2G/3G, often holding a younger sibling, so she uses one hand.
- Time: ~30 min after 7 PM. Motivation: wants to do well in the Class 9 science test and likes "seeing it happen".

## Screen map (final app)
1. **Home** — hook (jhoka), resume saved progress.
2. **Warm-up** — one diagnostic question; correct → may skip to experiments, wrong → Learn.
3. **Learn** — animated pendulum, "show me ONE oscillation", L/m/A vocabulary with Marathi glosses.
4. **Choose** — pick a variable to test (mass, angle, length), progress bar.
5. **Hypothesis** — "if we make X bigger, one swing takes less / same / more time".
6. **Lab** — RK4 simulation, drag the bob to set angle, ruler + protractor, stopwatch counting 10 swings, predict each run, live period-vs-variable graph, results table with changes highlighted.
7. **Compare** — fair-test check; confirmed → explain in own words + model answer; contradicted → 3-step hint ladder, "change my guess"; unfair → explanation and "help me set up a fair test".
8. **Check-up** — 5 tasks in 3 formats (MCQ ×3, numeric, explanation), feedback for correct, M1, M2; wrong answer → detour to the matching experiment, then answer again.
9. **Summary** — findings, score, guesses changed, misconceptions overcome.
10. **About** — card, roll number, learning-log counts.

## Design challenge (P5)
An unsuccessful experiment is never answered with the rule. (a) Two variables changed → "not a fair test", yellow cells show what changed, and after a struggle a "set up a fair test for me" helper. (b) Result contradicts the guess → hints that point at the learner's own Period column, then "change my guess". The app only confirms when the learner's own guess matches their own data.

## Adaptivity
- Profile: warm-up question decides whether to show the basics.
- Performance: misconception answers in the check-up send the learner back to the matching experiment.
- Interaction: after an unfair test or 2+ hints, the fair-test helper appears.

## AI decision
P5 does not require AI. Explanation feedback uses a rule-based checker (works offline on 2G, same feedback every time). `api/feedback.js` can call Claude if `ANTHROPIC_API_KEY` is set in Vercel; its output is validated (verdict, length, no formula) before display, with the rule-based checker as fallback.

## Tech
Plain HTML/CSS/JS (no framework, no template), pixel-art theme with Pixelify Sans (Google Fonts), Vercel static hosting + one serverless function. Progress saved in localStorage.
