# No Fewer (repo folder: prove-it)

Play: https://machinewright.github.io/no-fewer/ (once published).

A puzzle where you don't solve the board: you prove that its best solution can't be beaten, by claiming mirrors
that must flip or must stay. A claim is accepted only if the opposite choice leaves a target unreachable even in
"ghost light" (every unclaimed mirror sends light both ways). Follow-up idea to the essay in ../proving-par.

Status: v1.0 candidate (2026-11-21): 22 levels (17-22 with two colors, 21-22 with filters); tap a target to see only the light that could reach it
(src/feed.js, tested against brute force). v0.3 (2026-11-21): the essays' look (fonts, art, light page), select a mirror then claim it, phone layout. Not published.
- v0.2: graded levels from build-levels.mjs (lesson hints on 1-4; levels 4, 7, 10, 13 can only start with
  "must stay" claims), possible light shown by default (toggle), wrong claims shown as evidence, stars by mistakes.
- Play: `python3 -m http.server 8772`, then open http://localhost:8772/
- `analyze.mjs <level> [n]` lists generated boards with their deduction rounds (flips/stays per round).
- `build-levels.mjs` writes src/puzzles.js and checks every level. `node --test test/` re-checks par and provability.
- src/ engine, solver, ghost tracer, renderer: copied from proving-par.

Name: "Prove it" was taken (ProveIT, an inference-rules game on itch.io; Prove It! Detective), so the game is
**No Fewer** (searched 2026-11-21: no game by that name). Closest related game found: Proofdoku (itch.io, in development),
where you prove the cell values of a solved sudoku with evidence cells. No Fewer differs in what is proven: that no
solution is shorter than par (a lower bound), not what a solution is.

Publishing: `bash scripts/publish.sh` (gh: creates machinewright/no-fewer, pushes, makes it public, turns on Pages;
`PRIVATE=1` only pushes). `scripts/og.py` renders og.png (needs the local server on 8772).
