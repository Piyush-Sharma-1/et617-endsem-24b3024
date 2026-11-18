# DESIGN — Pendulum Lab (ET 617 End-Sem)

## Identity card
| Field | Choice |
|---|---|
| ID | 24B3024 (Aditya Koli) |
| P | P5 — Inquiry-based virtual laboratory |
| T | P5-T1 — Simple pendulum: length, mass, amplitude vs period (Cl. 9–11) |
| L | L1 — Class 6–8/9 student, rural government school, regional-language medium, parent's Android phone ~30 min in the evening |
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
- Device: father's Android phone (~360 px wide), slow 2G/3G, usually holding a younger sibling, so she uses one hand.
- Time: ~30 min after 7 PM. Motivation: wants to do well in the Class 9 science test and likes "seeing it happen".

## Content plan
- Concept card: what one oscillation and the period are, with Marathi glosses for key words (आवर्तकाल = period, लांबी = length, वस्तुमान = mass, विस्तार = amplitude).
- Inquiry loop (5 states): Choose question → Make hypothesis → Run experiment (sliders + built-in stopwatch counting 10 swings) → Compare with prediction → Revise / conclude.
- Unsuccessful-experiment support (design challenge): if two variables change between runs → "fair test" nudge; if the result contradicts the hypothesis → hint ladder of questions pointing at the data table, never the answer.
- Check-up: 5 questions in 3 formats (MCQ, numeric, explain-in-your-words). Feedback for the correct answer, M1 and M2.
- Adaptivity: a wrong answer showing M1/M2 sends the learner back to a targeted experiment.
- C3: single column at 360 px, primary action in a bottom bar, big touch targets, no hover. Roll no. 24B3024 in every footer.

## Tech
Plain HTML/CSS/JS (no framework, no template), Vercel static hosting + one serverless function for AI feedback on explanations, with a rule-based fallback.
