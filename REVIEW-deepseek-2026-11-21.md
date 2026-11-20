# Review — Prove it (index.html, style.css, game.js, src/view.js)

Scope: state bugs, accessibility, first-time UX. Ranked by severity.

## High

1. **F/S/U fire while focus is on a button or the level nav** — game.js:148-152.
   The document keydown handler only bails on `input, textarea` and modifier keys; it does not
   ignore `<button>` (level nav, Undo, Restart, Must flip/stay) or `<summary>`.
   Repro: click a level button (it keeps focus), then press `S` — `claim(false)` runs against the
   current selection. Press `U` while Undo is focused — undo fires (and Enter would fire it again).
   Fix: `if (e.target.closest('button, summary, [role=button]')) return;` before the hotkeys, or gate
   claims/undo on `document.activeElement === canvas`.

2. **Unguarded `localStorage` reads crash the whole game when storage is unavailable** — game.js:14.
   `localStorage.getItem(KEY + '-ghosts')` runs at module top level with no try/catch; in private
   browsing / blocked storage this throws and nothing loads. `setItem` in win() (game.js:87) and the
   ghost toggle (game.js:164) are also unguarded, so a win can throw after the message is set.
   Fix: wrap all storage access in a small safe `get/set` helper (like `loadBest` already does).

## Medium

3. **Keyboard cursor movement is silent for screen readers** — game.js:140-147, 112.
   Arrow/Enter update the cursor and call `draw()`, which rewrites the canvas `aria-label`, but an
   `aria-label` change on a focused `role="application"` element is not a live-region announcement
   (and `makeCanvas`'s `announce()` in view.js:157 is unused by game.js).
   Repro: Tab to the board, press ArrowRight — a sighted user sees the white cursor move, an SR user
   hears nothing and cannot locate mirrors. Fix: announce cursor/selection through `#msg` (already
   `aria-live=polite`) or a dedicated `role=status` node on each move/select.

4. **First arrow starts the cursor at cell 0, and Enter/Space do nothing before it** — game.js:143,146.
   `cursor` begins at `-1`; the first arrow snaps it to 0 (which may be empty/wall), and
   `Enter`/`Space` are no-ops until an arrow is pressed. Keyboard-only play is slower and
   non-obvious. Fix: initialize the cursor to the first mirror on canvas focus (as `makeCanvas` does),
   and step between mirrors rather than over every cell.

5. **Undo is never disabled, and silently no-ops after a win** — game.js:154, update():98.
   After winning, `won` blocks `undo()` but the Undo button stays enabled and looks clickable;
   it is also enabled with an empty history. Fix: in `update()`, `$('undo').disabled = won || !history.length`.

6. **Level nav star glyphs are low contrast** — style.css:26.
   `--accent #a8650f` on panel `#f3efe6` = 4.04:1 at 11px (below WCAG AA 4.5:1). The stars also carry
   info (best score) though a matching `aria-label` exists. Fix: darken to ~`#8a5208` (≈4.9:1) or treat
   as decorative only.

## Low

7. **Evidence view draws a "settled" dot on a mirror shown in the opposite tilt** — game.js:67,110 + view.js:92.
   After a proven claim, `show.d` is the *opposite* choice, but `settled` is the real `claims`, so the
   just-claimed mirror renders its opposite orientation yet shows a settled dot. Slightly contradictory;
   skip the dot for the `show.focus` cell, or label it "tested".

8. **First-time wording** — game.js:95, 22/99, index.html:59.
   - "best solution N flips" (game.js:95) is ambiguous; "minimum: N flips" is clearer.
   - "leaning \\ at the start" (game.js:22,99) is jargon; "starts as \\" matches the legend.
   - The crucial legend (open mirror / dashed / crossed-out) sits inside a collapsed `<details>`
     (index.html:59). Open it by default or surface the open-mirror rule in the `.rules` list.
   - Level 1 hint (puzzles.js:3) is a long embedded-HTML paragraph; trim to the one required action.

## Checked — fine

- **Undo after evidence view**: correct. `undo()` pops `claims` (a real `.slice()` copy, no aliasing)
  and clears `show`; state never diverges (game.js:65,154-156).
- **Selection after win**: correct. `select`/`claim` early-return on `won`, `sel` is reset and the
  selection text cleared (game.js:41,53,76,99).
- **Resize**: fine. `ResizeObserver` -> `draw()` keeps a constant aspect ratio (`g.h/g.w`), so no
  resize loop; DPR handled.
- **Evidence rule correctness**: `darkTargets` uses ghost light and `want^1` for the opposite choice
  (game.js:55-57,36) — matches the stated rule.
- **Focus order**: levels → status → board → claims → undo/restart/next → toggle is logical; the only
  jump is `next.focus()` after a win, which is acceptable.
