// Iterated single-mirror ghost deduction, as the player does it: each round claims every mirror whose opposite choice
// would leave some target dark in ghost light, then repeats with those claims settled. Pure; runs in node and browsers.
import { traceGhost } from './ghost.js';
import { targets } from './engine.js';
export function deduceRounds(g) {
  const goal = targets(g), d = new Int8Array(g.cells.length).fill(-1);
  const mirrors = g.cells.map((c, i) => (c.type === 'mirror' ? i : -1)).filter((i) => i >= 0);
  const dark = (dd) => { const t = traceGhost(g, dd); return goal.some((k) => !t.lit.has(k)); };
  const rounds = [];
  for (;;) {
    const found = [];
    for (const i of mirrors) if (d[i] === -1) for (const v of [g.cells[i].rot, g.cells[i].rot ^ 1]) {
      const dd = d.slice(); dd[i] = v; if (dark(dd)) found.push([i, v ^ 1]);
    }
    if (!found.length) break;
    rounds.push({ flips: found.filter(([i, v]) => v !== g.cells[i].rot).length, stays: found.filter(([i, v]) => v === g.cells[i].rot).length });
    for (const [i, v] of found) d[i] = v;
  }
  const flips = mirrors.filter((i) => d[i] !== -1 && d[i] !== g.cells[i].rot).length;
  return { rounds, flips, mirrors: mirrors.length };
}
