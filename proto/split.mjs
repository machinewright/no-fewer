// Feasibility: boards the round rule can't prove; does one case split ("suppose mirror m stays / flips") close them?
import { generateWith, paramsFor } from '../src/generator.js';
import { traceGhost } from '../src/ghost.js';
import { targets } from '../src/engine.js';
function closure(g, d0, mirrors, goal) { // returns null if contradiction (target dark), else settled array
  const d = d0.slice(); const dark = (dd) => goal.some((k) => !traceGhost(g, dd).lit.has(k));
  if (dark(d)) return null;
  let rounds = 0;
  for (;;) { const found = [];
    for (const i of mirrors) if (d[i] === -1) for (const v of [0, 1]) { const dd = d.slice(); dd[i] = v; if (dark(dd)) found.push([i, v ^ 1]); }
    if (!found.length) return { d, rounds };
    for (const [i, v] of found) { if (d[i] !== -1 && d[i] !== v) return null; d[i] = v; } rounds++;
  }
}
const flipsOf = (g, d, mirrors) => mirrors.filter((i) => d[i] !== -1 && d[i] !== g.cells[i].rot).length;
const stats = {}; 
for (const L of [6, 8, 10, 12, 14]) for (let s = 1; s <= 60; s++) {
  let r; try { r = generateWith(s * 101 + L, { ...paramsFor(L), colors: 1, filters: 0, splitters: 0 }); } catch { continue; }
  const g = r.puzzle, goal = targets(g), mirrors = g.cells.map((c, i) => (c.type === 'mirror' ? i : -1)).filter((i) => i >= 0);
  const base = closure(g, new Int8Array(g.cells.length).fill(-1), mirrors, goal);
  const st = (stats[L] ??= { n: 0, rule: 0, split1: 0, none: 0, splitRounds: [] }); st.n++;
  const f0 = flipsOf(g, base.d, mirrors);
  if (f0 >= r.par) { st.rule++; continue; }
  let ok = false;
  for (const m of mirrors) { if (base.d[m] !== -1) continue;
    let lb = Infinity;
    for (const v of [0, 1]) { const dd = base.d.slice(); dd[m] = v; const c = closure(g, dd, mirrors, goal); if (c) lb = Math.min(lb, flipsOf(g, c.d, mirrors)); }
    if (lb >= r.par) { ok = true; break; }
  }
  ok ? st.split1++ : st.none++;
}
console.log(stats);
