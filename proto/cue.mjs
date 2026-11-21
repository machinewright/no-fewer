// Is there an explainable cue for good split mirrors? Feature: how many targets' feed (light that could still reach
// that target, after the base rounds) passes through the mirror.
import { generateWith, paramsFor } from '../src/generator.js';
import { parseBoard } from '../src/boards.js';
import { enc } from '../src/encode.js';
import { solve } from '../src/solver.js';
import { splits } from '../src/suppose.js';
import { feedEdges } from '../src/feed.js';
import { targets } from '../src/engine.js';
const tally = {}; let boards = 0, topHit = 0;
for (const [L, N] of [[6, 80], [9, 60], [12, 60]]) for (let s = 1; s <= N; s++) {
  let r; try { r = generateWith(s, { ...paramsFor(L), colors: 1, filters: 0, splitters: 0 }); } catch { continue; }
  const g = parseBoard(enc(r.puzzle)), par = solve(g).moves; if (par < 3 || par > 10) continue;
  const sp = splits(g, par); if (sp.provable || !sp.good.length) continue; boards++;
  const good = new Set(sp.good.map((x) => x.m)), ts = targets(g);
  const feeds = ts.map((t) => new Set([...feedEdges(g, sp.base.d, t)].map((e) => e >> 2)));
  const score = (m) => feeds.filter((f) => f.has(m)).length;
  const open = g.cells.map((c, i) => i).filter((i) => g.cells[i].type === 'mirror' && sp.base.d[i] === -1);
  const best = Math.max(...open.map(score));
  for (const m of open) { const k = `${score(m) === best ? 'max' : 'less'}`; (tally[k] ??= { good: 0, all: 0 }); tally[k].all++; if (good.has(m)) tally[k].good++; }
}
console.log({ boards, tally });
