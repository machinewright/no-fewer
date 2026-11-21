// Ranks one-split boards by how many open mirrors give a working split (higher = fairer to find).
import { generateWith, paramsFor } from '../src/generator.js';
import { parseBoard } from '../src/boards.js';
import { enc } from '../src/encode.js';
import { solve } from '../src/solver.js';
import { splits } from '../src/suppose.js';
const [L0, L1, N, colors = 1] = process.argv.slice(2).map(Number);
const rows = [];
for (let L = L0; L <= L1; L++) for (let s = 1; s <= N; s++) {
  let r; try { r = generateWith(s, { ...paramsFor(L), colors, filters: 0, splitters: 0 }); } catch { continue; }
  const g = parseBoard(enc(r.puzzle)), par = solve(g).moves; if (par < 3 || par > 10) continue;
  const sp = splits(g, par); if (sp.provable || !sp.good.length) continue;
  const open = g.cells.filter((c, i) => c.type === 'mirror' && sp.base.d[i] === -1).length;
  const real = sp.good.filter((x) => x.cases.every((c) => c.rounds >= 1 || c.dead));
  rows.push({ L, s, size: g.w, par, base: g.cells.filter((c, i) => c.type === 'mirror' && sp.base.d[i] !== -1 && sp.base.d[i] !== c.rot).length, good: real.length, open, ratio: real.length / open });
}
rows.sort((a, b) => b.ratio - a.ratio);
for (const r of rows.slice(0, 10)) console.log(`L${r.L} seed ${r.s} ${r.size}x${r.size} par ${r.par} baseflips ${r.base} good ${r.good}/${r.open} (${(100 * r.ratio).toFixed(0)}%)`);
