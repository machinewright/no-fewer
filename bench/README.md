# Solve vs prove: a pilot

Question: a language model can often *find* a short solution to a puzzle. Can it also *prove* that no shorter one
exists? No Fewer gives both tasks an exact checker on the same boards:

- **solve**: list at most par mirrors to flip so every target lights (checked by tracing the light).
- **prove**: list claims ("flip"/"stay") in order; each must pass No Fewer's rule at that point (the opposite choice
  leaves some target dark in ghost light, given earlier claims); par accepted flips prove the bound.
- **cases** (levels 23 to 28, added 2026-11-23): boards where claims alone stop short of par. The model may split
  once on a mirror: claims before the split, then claims inside each case. A case closes when the relaxation leaves a
  target dark (the case is impossible) or when its flips (before + split mirror + case claims) reach par. This is the
  game's "Suppose" step. The checker accepts the game's own reference proofs and rejects splits that don't close.

Prompts: `node tasks.mjs prompt <solve|prove|cases> <level>` (text board with a legend and the full rule; no pictures).
Runs: `[AGENT=plain] ./run.sh <model> <task> <level>...` through OpenCode Go models, each in an empty folder so the
model can't read the levels or the solver. Results append to `results.jsonl`; transcripts in `out/` (not committed).

Two conditions:
- `build` (OpenCode's default agent): the model has a shell and usually writes a search program.
- `plain` (agent defined in ~/work/tmp/bench-plain/opencode.json): no tools, reasoning only. Caveat found 2026-11-21:
  if a model tries a disabled tool, the headless run hangs until the timeout; those count as failures ("exit 124").

Claude models run through `./run-claude.sh <model> <task> <level>...` (Claude Code CLI, every tool off, no settings
or memory, empty folder): the same `plain` condition.

Levels 1 to 28 are the game's. Levels 101 to 106 are a harder ladder (`ladder.json`, found by `ladder-search.mjs`):
one-colour boards from 10x10 to 14x14 with 28 to 53 mirrors and par 12 to 18, each one still provable by the claim
rule alone.

## Results so far (updated 2026-11-23)

One run per cell, no tools, so read these as a pilot, not a measurement. "Game" is levels 3, 5, 9, 12, 14, 17;
"big" is the ladder. Cells are passed / scored.

| model | solve, game | prove, game | solve, big | prove, big |
|---|---|---|---|---|
| claude-opus-5-5 | 6/6 | 6/6 | 5/5 | 3/3 |
| claude-sonnet-5-5 | 5/6 | 6/6 | 6/6 | 5/6 |
| claude-haiku-5-5 | 6/6 | 5/6 | 2/6 | 1/6 |
| grok-4.7 | 6/6 | 3/3 | | |
| qwen4-max | 6/6 | 5/6 | | |
| kimi-k3.1-pro | 6/6 | 4/6 | 1/3 | 1/1 |
| deepseek-v4-pro (also level 18 from its pilot) | 5/7 | 6/7 | 1/2 | |
| glm-5.3 | 3/4 | 1/1 | | |
| gpt-6-luna | 2/6 | 1/6 | | |
| gemini-4-argon | | | | |

gemini-4-argon: every run returned the provider's "monthly spending cap" error (infrastructure, not scored).

What it shows, and what it doesn't:

- **The question's premise didn't hold up.** I expected proving to be much harder than solving. For the models that
  answered, it isn't, on these boards: Sonnet and Opus prove an 18-flip minimum on a 12x12 board about as reliably as
  they find the 18 flips. Proofs take longer (Sonnet: 4 to 14 minutes per passed ladder proof against 2 to 6 for solving).
  The likely reason is the rule itself: a claim-rule proof is a list of local facts, each checked by tracing light,
  and finding a solution already means tracing the same paths. The boards that need a proof by cases (levels 23 to
  28) are not in the bench yet, and that is where a gap would be expected.
- **An early reading was wrong.** On 2026-11-21 most OpenCode "timeouts" on the prove task looked like models failing
  to prove. They were the plan's weekly usage limit: the runs hung with no answer. Those are unscored (blank cells and
  short denominators above) and wait for a rerun.
- **Haiku fails differently on the two tasks.** On big boards its wrong solutions are confident (one target left
  dark); its failed proofs mostly say so ("I have not verified any claim, so I am not submitting any") and return an
  empty list.
- **Four Opus runs on the ladder are unscored.** The API ended them with a safety stop partway through the reasoning
  (nothing to do with the puzzle). I did not rephrase or retry around it.

Next: rerun the unanswered OpenCode cells; add the proof-by-cases levels as a third task; repeat runs before
claiming anything about a single model.
