// Level analysis for Prove it: per deduction round, how many flips/stays become provable.
import { generateWith, paramsFor } from './src/generator.js';
import { traceGhost } from './src/ghost.js';
import { targets } from './src/engine.js';
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
export const enc = (g) => { const r = []; for (let y = 0; y < g.h; y++) r.push(g.cells.slice(y * g.w, (y + 1) * g.w).map((c) => c.type === 'empty' ? '.' : c.type === 'wall' ? '#' : c.type === 'target' ? 'o' : c.type === 'mirror' ? (c.rot ? '\\' : '/') : '^>v<'[c.dir]).join('')); return r; };
if (import.meta.url === `file://${process.argv[1]}`) {
  const L = +process.argv[2], N = +(process.argv[3] || 60);
  for (let s = 1; s <= N; s++) {
    const p = { ...paramsFor(L), colors: 1, filters: 0, splitters: 0 };
    let r; try { r = generateWith(s * 13 + L, p); } catch { continue; }
    const x = deduceRounds(r.puzzle);
    if (x.flips !== r.par) continue;
    console.log(JSON.stringify({ seed: s * 13 + L, par: r.par, m: x.mirrors, R: x.rounds.map((q) => `${q.flips}f${q.stays}s`).join(' '), rows: enc(r.puzzle) }));
  }
}
