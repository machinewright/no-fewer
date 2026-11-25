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
  Until 2026-11-25 the agent left the `task` tool (helper agents, which have tools) switched on; see Results.

Claude models run through `./run-claude.sh <model> <task> <level>...` (Claude Code CLI, every tool off, no settings
or memory, empty folder): the same `plain` condition.

Levels 1 to 28 are the game's. Levels 101 to 106 are a harder ladder (`ladder.json`, found by `ladder-search.mjs`):
one-colour boards from 10x10 to 14x14 with 29 to 53 mirrors and par 12 to 18, each one still provable by the claim
rule alone.

## Results

The write-up with the current tables is [index.html](https://machinewright.github.io/no-fewer/bench/) (tables generated
from the transcripts by `node rescore.mjs && node table.mjs`). Not scored: runs with no answer (usage limits), runs the
API ended with a safety stop, and 10 OpenCode runs in which the model started a helper agent that had tools (the
`plain` agent didn't switch off `task` until 2026-11-25; it does now). An earlier version of this README counted
five of those runs as passes.
