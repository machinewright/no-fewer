# Prove it (prototype)

A puzzle where you don't solve the board: you prove that its best solution can't be beaten, by claiming mirrors
that must flip or must stay. A claim is accepted only if the opposite choice leaves a target unreachable even in
"ghost light" (every unclaimed mirror sends light both ways). Follow-up idea to the essay in ../proving-par.

Status: v0.2 prototype (14 levels) to test whether the core loop is fun. Not published.
- v0.2: graded levels from build-levels.mjs (lesson hints on 1-4; levels 4, 7, 10, 13 can only start with
  "must stay" claims), possible light shown by default (toggle), wrong claims shown as evidence, stars by mistakes.
- Play: `python3 -m http.server 8772`, then open http://localhost:8772/
- `analyze.mjs <level> [n]` lists generated boards with their deduction rounds (flips/stays per round).
- `build-levels.mjs` writes src/puzzles.js and checks every level. `node --test test/` re-checks par and provability.
- src/ engine, solver, ghost tracer, renderer: copied from proving-par.
