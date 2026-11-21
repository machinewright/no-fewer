import { generateWith, paramsFor } from '../src/generator.js';
import { parseBoard } from '../src/boards.js';
import { enc } from '../src/encode.js';
import { solve } from '../src/solver.js';
import { splits } from '../src/suppose.js';
import { feedEdges } from '../src/feed.js';
import { targets } from '../src/engine.js';
const [L, colors, filters, N] = process.argv.slice(2).map(Number);
for (let s = 1; s <= N; s++) {
  let r; try { r = generateWith(s, { ...paramsFor(L), colors, filters, splitters: 0 }); } catch { continue; }
  const g = parseBoard(enc(r.puzzle)), par = solve(g).moves; if (par < 4 || par > 10) continue;
  const sp = splits(g, par); if (sp.provable || !sp.good.length) continue;
  const good = new Set(sp.good.filter((x) => x.cases.every((c) => c.rounds >= 1 || c.dead)).map((x) => x.m));
  const feeds = targets(g).map((t) => new Set([...feedEdges(g, sp.base.d, t)].map((e) => e >> 2)));
  const all = g.cells.map((c, i) => i).filter((i) => g.cells[i].type === 'mirror' && sp.base.d[i] === -1 && feeds.every((f) => f.has(i)));
  if (all.length && all.every((m) => good.has(m))) console.log(`L${L} seed ${s} ${g.w}x${g.h} par ${par} targets ${feeds.length} cue ${all.length} good ${good.size}`);
}
