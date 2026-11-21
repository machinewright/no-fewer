// Picks one-split boards where the teachable cue works: among open mirrors on the feed of the most targets, many
// give a working split (both cases closing, each with real deduction or a contradiction).
import { generateWith, paramsFor } from '../src/generator.js';
import { parseBoard } from '../src/boards.js';
import { enc } from '../src/encode.js';
import { solve } from '../src/solver.js';
import { splits } from '../src/suppose.js';
import { feedEdges } from '../src/feed.js';
import { targets } from '../src/engine.js';
const [L0, L1, N, colors = 1, filters = 0] = process.argv.slice(2).map(Number); const rows = [];
for (let L = L0; L <= L1; L++) for (let s = 1; s <= N; s++) {
  let r; try { r = generateWith(s, { ...paramsFor(L), colors, filters, splitters: 0 }); } catch { continue; }
  const g = parseBoard(enc(r.puzzle)), par = solve(g).moves; if (par < 3 || par > 10) continue;
  const sp = splits(g, par); if (sp.provable || !sp.good.length) continue;
  const good = new Set(sp.good.filter((x) => x.cases.every((c) => c.rounds >= 1 || c.dead)).map((x) => x.m));
  const feeds = targets(g).map((t) => new Set([...feedEdges(g, sp.base.d, t)].map((e) => e >> 2)));
  const open = g.cells.map((c, i) => i).filter((i) => g.cells[i].type === 'mirror' && sp.base.d[i] === -1);
  const score = (m) => feeds.filter((f) => f.has(m)).length, best = Math.max(...open.map(score));
  const top = open.filter((m) => score(m) === best), hit = top.filter((m) => good.has(m)).length;
  if (!hit) continue;
  const baseflips = g.cells.filter((c, i) => c.type === 'mirror' && sp.base.d[i] !== -1 && sp.base.d[i] !== c.rot).length;
  rows.push({ txt: `L${L} seed ${s} ${g.w}x${g.h} par ${par} base ${baseflips}f/${sp.base.rounds}r targets ${feeds.length} top ${hit}/${top.length} good ${good.size}/${open.length}`, p: hit / top.length });
}
rows.sort((a, b) => b.p - a.p); rows.slice(0, 8).forEach((r) => console.log(r.txt));
