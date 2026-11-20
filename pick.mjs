// Picks prototype levels: mirror-only boards whose par is proven by iterated ghost deduction,
// with an increasing number of deduction rounds. Prints them in boards.js row format.
import { generateWith, paramsFor } from './src/generator.js';
import { traceGhost } from './src/ghost.js';
import { targets } from './src/engine.js';
export function deduce(g) {
  const goal = targets(g), d = new Int8Array(g.cells.length).fill(-1);
  const mirrors = g.cells.map((c, i) => (c.type === 'mirror' ? i : -1)).filter((i) => i >= 0);
  const dark = (dd) => { const t = traceGhost(g, dd); return goal.some((k) => !t.lit.has(k)); };
  let rounds = 0, changed = true;
  while (changed) {
    changed = false; const found = [];
    for (const i of mirrors) if (d[i] === -1) for (const v of [g.cells[i].rot, g.cells[i].rot ^ 1]) {
      const dd = d.slice(); dd[i] = v; if (dark(dd)) found.push([i, v ^ 1]);
    }
    if (found.length) { rounds++; changed = true; for (const [i, v] of found) d[i] = v; }
  }
  return { rounds, flips: mirrors.filter((i) => d[i] !== -1 && d[i] !== g.cells[i].rot).length, n: mirrors.length };
}
const enc = (g) => { const r = []; for (let y = 0; y < g.h; y++) r.push(g.cells.slice(y * g.w, (y + 1) * g.w).map((c) => c.type === 'empty' ? '.' : c.type === 'wall' ? '#' : c.type === 'target' ? 'o' : c.type === 'mirror' ? (c.rot ? '\\' : '/') : '^>v<'[c.dir]).join('')); return r; };
const want = [[4, 1, 3], [4, 2, 3], [5, 2, 4], [6, 3, 4], [8, 3, 5]]; // [level, rounds, min par]
for (const [L, rounds, minPar] of want) {
  for (let s = 1; s < 500; s++) {
    const p = { ...paramsFor(L), colors: 1, filters: 0, splitters: 0 };
    let r; try { r = generateWith(s * 13 + L, p); } catch { continue; }
    const x = deduce(r.puzzle);
    if (x.flips === r.par && x.rounds === rounds && r.par >= minPar) { console.log(JSON.stringify({ par: r.par, rounds, rows: enc(r.puzzle) })); break; }
  }
}
