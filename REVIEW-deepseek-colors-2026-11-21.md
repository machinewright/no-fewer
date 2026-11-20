# Review — two beam colors + filters

## What I checked and found correct

- **feedEdges vs traceGhost (ghost.js):** I traced `feedEdges` against `traceGhost`
  for every case listed, and they agree.
  - *Filters:* `traceGhost` passes a filter only when `colorOf(filter) === beam color`;
    `feedEdges`'s `blocks` uses `colorOf(c) !== tc` where `tc = colorOf(cells[t])`, and since
    it seeds only `tc` emitters, this is the same test. Same color passes, other color stops. OK.
  - *Target colors:* `tc = colorOf(cells[t])`; forward seeds only emitters of color `tc`; backward
    accepts an emitter only when `c.dir === d && colorOf(c) === tc`. OK.
  - *Other-color emitters:* `blocks` includes every `EMITTER`, and `traceGhost` line 31 also stops
    at every emitter regardless of color. A non-`tc` emitter neither emits (not seeded) nor passes. OK.
  - *Light hitting an emitter/target of another color:* both absorb in `traceGhost`
    (`WALL || EMITTER`, and `TARGET` at line 33/77) and in `feedEdges` (`blocks`). OK.
  - The forward/backward intersection matches `traceGhost.lit`; `test/feed.test.mjs` already
    asserts `f.size>0 === tr.lit.has(t)` plus per-edge reachability, and it passes.
- **Parse (`boards.js`):** `'URDL'` maps to dir 0–3 = up/right/down/left, matching `'^>v<'`
  and `DX`/`DY`; `'O'` = cyan target; `'f'`/`'F'` = amber/cyan filter. `test/boards.test.mjs`
  round-trips it. OK.
- **Color/shape mapping:** amber = circle, cyan = square consistently in `BEAMS`/`SHAPES` (view.js:14,17),
  the emitter lens/marker (view.js:86,93), the filter (view.js:95,98), the target (view.js:105), and
  `describeCell` (game.js:165–167). OK.
- **`globalAlpha` / `lineDash` / `strokeStyle`:** every cell branch sets the state it uses before
  stroking/filling and restores `globalAlpha` (filter ends at 1; target core is inside save/restore).
  No leak of these three.

## Bug found

**1. `lineDashOffset` leaks into later dashed strokes** — `src/view.js:48`

`line()` now sets `ctx.lineDashOffset = x1 === x2 ? cy(y1) : cx(x1)` to anchor beam dashes, but it is
never reset. The beam passes leave it at some non-zero value (the last segment's anchor coordinate),
and it carries into the next dashed drawings that do *not* set it:

- the "maybe" target ring, `view.js:111` (`setLineDash([cell*0.08, cell*0.06])`),
- the focus ring, `view.js:148` (`setLineDash([cell*0.1, cell*0.06])`).

Reproduction: any board where a target is only "maybe" lit (ghost light reaches it, not certain) while a
beam was just drawn — e.g. two mirrors undecided so `ghosts` is on and a target's ring is dashed. The
dash phase on that ring (and on the rectangle focus ring) is shifted by a random pixel offset. For a
square (cyan) target the ring is a `rect`, so the shift is visible at the corners; for a circle target it
is only a rotation of the pattern.

Fix: reset it with the dash reset after the beam passes, e.g. add `ctx.lineDashOffset = 0;` next to
`ctx.setLineDash([])` at `view.js:63` (and/or set it explicitly in the ring code at 111/148).
