// Finds "Suppose" levels: the round rule alone can't prove par, one case split (after the base rounds) can,
// and both cases need their own deduction. Prints candidates with how many mirrors make a working split.
import { generateWith, paramsFor } from '../src/generator.js';
import { traceGhost } from '../src/ghost.js';
import { targets } from '../src/engine.js';
import { solve } from '../src/solver.js';
import { parseBoard } from '../src/boards.js';
import { enc } from '../src/encode.js';
export function closure(g, d0, mirrors, goal) {
  const d = d0.slice(); const dark = (dd) => goal.some((k) => !traceGhost(g, dd).lit.has(k));
  if (dark(d)) return null;
  let rounds = 0;
  for (;;) { const found = [];
    for (const i of mirrors) if (d[i] === -1) for (const v of [0, 1]) { const dd = d.slice(); dd[i] = v; if (dark(dd)) found.push([i, v ^ 1]); }
    if (!found.length) return { d, rounds };
    for (const [i, v] of found) { if (d[i] !== -1 && d[i] !== v) return null; d[i] = v; } rounds++;
  }
}
export const flipsOf = (g, d, mirrors) => mirrors.filter((i) => d[i] !== -1 && d[i] !== g.cells[i].rot).length;
export function analyzeSplit(g, par) {
  const goal = targets(g), mirrors = g.cells.map((c, i) => (c.type === 'mirror' ? i : -1)).filter((i) => i >= 0);
  const base = closure(g, new Int8Array(g.cells.length).fill(-1), mirrors, goal);
  const f0 = flipsOf(g, base.d, mirrors);
  if (f0 >= par) return { rule: true };
  const good = [];
  for (const m of mirrors) { if (base.d[m] !== -1) continue;
    const cs = [0, 1].map((v) => { const dd = base.d.slice(); dd[m] = v; const c = closure(g, dd, mirrors, goal);
      return c ? { flips: flipsOf(g, c.d, mirrors), rounds: c.rounds } : { flips: Infinity, rounds: 0, impossible: true }; });
    if (Math.min(cs[0].flips, cs[1].flips) >= par) good.push({ m, cs });
  }
  return { rule: false, f0, baseRounds: base.rounds, good, mirrors: mirrors.length };
}
if (process.argv[1].endsWith('pick-split.mjs')) {
  const [L0, L1, N, colors = 1, filters = 0] = process.argv.slice(2).map(Number);
  for (let L = L0; L <= L1; L++) for (let s = 1; s <= N; s++) {
    let r; try { r = generateWith(s, { ...paramsFor(L), colors, filters, splitters: 0 }); } catch { continue; }
    const g = parseBoard(enc(r.puzzle)), par = solve(g).moves;
    if (par < 3 || par > 12) continue;
    const a = analyzeSplit(g, par);
    if (a.rule || !a.good.length) continue;
    const both = a.good.filter((x) => x.cs.every((c) => c.impossible || c.rounds >= 1));
    if (!both.length) continue;
    console.log(`L${L} seed ${s} ${g.w}x${g.h} par ${par} mirrors ${a.mirrors} base ${a.f0}f/${a.baseRounds}r splits ${both.length}/${a.good.length} `
      + both.slice(0, 3).map((x) => `[${x.m}: ${x.cs.map((c) => c.impossible ? 'X' : `${c.flips}f${c.rounds}r`).join(' ')}]`).join(''));
  }
}
