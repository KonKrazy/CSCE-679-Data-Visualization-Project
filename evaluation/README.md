# User Study Protocol

A short task-based usability study of the Intra-Country Disparity Divergence Tool.
Everything needed to run it is in this folder; **all result files are empty templates
for the team to fill in after the sessions.**

| File | Purpose |
|---|---|
| `README.md` | This protocol (goals, design, procedure, metrics) |
| `tasks.md` | Participant-facing task sheet (print or share on screen) |
| `answer_key.md` | Correct answers, generated from the data by `answer_key.py` |
| `sus.md` | System Usability Scale questionnaire |
| `results/task_results.csv` | One row per participant × task (fill in) |
| `results/sus_responses.csv` | One row per participant (fill in) |
| `results/comments.md` | Observations and interview notes (fill in) |
| `analyze_results.py` | Turns the filled CSVs into `results/summary.md` |

## Goals

Check whether the tool supports the three design tasks from the proposal:

- **T1 Spotting the Gap:** find regions behind their national baseline.
- **T2 Connecting the Dots:** relate a gap on one indicator to other indicators.
- **T3 Watching the Journey:** judge whether a gap is closing over time.

## Design

- Within-subjects, single condition (the tool), think-aloud.
- Participants: _[N = __ ; e.g., graduate students in CSCE 679 or related programs; record
  background and familiarity with maps/dashboards in `task_results.csv`]_.
- Session length: about 15–20 minutes.
- Setup: production build (`npm run build && npm run start`), Chrome, laptop screen at
  ≥1280 px width, starting state = Cambodia, Household wealth, 2010.

## Procedure

1. **Consent and intro (2 min).** Explain the purpose, that the tool is being tested,
   not the participant, and that they may stop at any time. No personal data beyond
   background questions is recorded.
2. **Tutorial (3 min).** Facilitator demonstrates: switching metric and country, hovering,
   clicking to pin a region, dragging on a parallel-coordinates axis to filter, the year
   slider and Play. Explain that z = 0 is the national baseline and negative = behind.
3. **Tasks (8–10 min).** Hand over `tasks.md`. For each task: start a timer when the
   participant finishes reading, stop it when they state a final answer. Reset the tool
   to the starting state between tasks. Do not help; if stuck after 2 minutes, record as
   "gave up" and move on. After each task ask the Single Ease Question (SEQ, 1–7).
4. **SUS questionnaire (2 min).** `sus.md`.
5. **Debrief (3 min).** Ask: (a) What was most useful? (b) What was confusing?
   (c) Would you trust this to decide where to send resources? Why or why not?
   Record in `results/comments.md`.

## Metrics

| Metric | How it is measured |
|---|---|
| Accuracy | Answer matches `answer_key.md` (1 / 0; T1b and T2b: exact count) |
| Time on task | Seconds from finishing reading to stated answer |
| Perceived ease | SEQ, 1 (very difficult) – 7 (very easy), after each task |
| Overall usability | SUS score 0–100 (standard scoring; 68 ≈ average) |
| Qualitative | Think-aloud observations and debrief answers, grouped into themes |

Run `uv run python evaluation/analyze_results.py` after filling in the CSVs to produce
per-task accuracy, median time, mean SEQ and the mean SUS score.
