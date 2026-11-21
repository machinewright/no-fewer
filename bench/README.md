# Solve vs prove: a pilot

Question: a language model can often *find* a short solution to a puzzle. Can it also *prove* that no shorter one
exists? No Fewer gives both tasks an exact checker on the same boards:

- **solve**: list at most par mirrors to flip so every target lights (checked by tracing the light).
- **prove**: list claims ("flip"/"stay") in order; each must pass No Fewer's rule at that point (the opposite choice
  leaves some target dark in ghost light, given earlier claims); par accepted flips prove the bound.

Prompts: `node tasks.mjs prompt <solve|prove> <level>` (text board with a legend and the full rule; no pictures).
Runs: `[AGENT=plain] ./run.sh <model> <task> <level>...` through OpenCode Go models, each in an empty folder so the
model can't read the levels or the solver. Results append to `results.jsonl`; transcripts in `out/` (not committed).

Two conditions:
- `build` (OpenCode's default agent): the model has a shell and usually writes a search program.
- `plain` (agent defined in ~/work/tmp/bench-plain/opencode.json): no tools, reasoning only. Caveat found 2026-11-21:
  if a model tries a disabled tool, the headless run hangs until the timeout; those count as failures ("exit 124").

Status 2026-11-21: pilot with deepseek-v4-pro on levels 3, 5, 9. Decide after the pilot whether a full run (more
models, all levels) is worth it and whether the result is worth writing up.
