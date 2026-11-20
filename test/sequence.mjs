// For each level, a valid proof as a list of claims [cell, 'flip'|'stay'], found by greedy ghost deduction.
import { LEVELS } from '../src/puzzles.js';
import { parseBoard } from '../src/boards.js';
import { traceGhost } from '../src/ghost.js';
import { targets } from '../src/engine.js';
export function proofFor(rows) {
  const g = parseBoard(rows), goal = targets(g), d = new Int8Array(g.cells.length).fill(-1), out = [];
  const mirrors = g.cells.map((c, i) => (c.type === 'mirror' ? i : -1)).filter((i) => i >= 0);
  const dark = (dd) => { const t = traceGhost(g, dd); return goal.some((k) => !t.lit.has(k)); };
  for (let progress = true; progress;) {
    progress = false;
    for (const i of mirrors) if (d[i] === -1) for (const v of [g.cells[i].rot, g.cells[i].rot ^ 1]) {
      const dd = d.slice(); dd[i] = v;
      if (d[i] === -1 && dark(dd)) { d[i] = v ^ 1; out.push([i, d[i] === g.cells[i].rot ? 'stay' : 'flip']); progress = true; }
    }
  }
  return { w: g.w, h: g.h, claims: out };
}
if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(LEVELS.map((l) => proofFor(l.rows))));
