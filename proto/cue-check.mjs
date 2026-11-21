import { LEVELS } from '../src/puzzles.js';
import { parseBoard } from '../src/boards.js';
import { splits } from '../src/suppose.js';
import { feedEdges } from '../src/feed.js';
import { targets } from '../src/engine.js';
LEVELS.forEach((l, k) => { if (!l.cases) return;
  const g = parseBoard(l.rows), sp = splits(g, l.par), good = new Set(sp.good.map((x) => x.m)), at = (i) => `c${i % g.w + 1}r${Math.floor(i / g.w) + 1}`;
  for (const [name, d] of [['start', new Int8Array(g.cells.length).fill(-1)], ['after base', sp.base.d]]) {
    const feeds = targets(g).map((t) => new Set([...feedEdges(g, d, t)].map((e) => e >> 2)));
    const open = g.cells.map((c, i) => i).filter((i) => g.cells[i].type === 'mirror' && d[i] === -1);
    const all = open.filter((m) => feeds.every((f) => f.has(m)));
    console.log(k + 1, name, 'targets', feeds.length, 'on all feeds:', all.map((m) => at(m) + (good.has(m) ? '✓' : '✗')).join(' '), '| good:', [...good].map(at).join(' '));
  } });
