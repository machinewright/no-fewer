import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/puzzles.js';
import { parseBoard } from '../src/boards.js';
import { traceGhost, UNDECIDED } from '../src/ghost.js';
import { targets, reflect, DX, DY, MIRROR, WALL, EMITTER, TARGET } from '../src/engine.js';
import { feedEdges, segEdge } from '../src/feed.js';

// Independent check: from edge (i, d), does light (ghost rules) reach t?
function reaches(g, dec, i0, d0, t) {
  const seen = new Set(), q = [[i0, d0]];
  while (q.length) {
    const [i, d] = q.pop(); if (seen.has(i * 4 + d)) continue; seen.add(i * 4 + d);
    const x = (i % g.w) + DX[d], y = Math.floor(i / g.w) + DY[d];
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) continue;
    const n = y * g.w + x, c = g.cells[n];
    if (n === t) return true;
    if (c.type === WALL || c.type === EMITTER || c.type === TARGET) continue;
    if (c.type === MIRROR) for (const r of c.fixed ? [c.rot] : dec[n] === UNDECIDED ? [0, 1] : [dec[n]]) q.push([n, reflect(r, d)]);
    else q.push([n, d]);
  }
  return false;
}

test('feedEdges = forward-reachable edges from which the target is reachable', () => {
  let rnd = 12345; const rand = () => ((rnd = (rnd * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  let checked = 0;
  for (const l of LEVELS) {
    const g = parseBoard(l.rows), goal = targets(g);
    for (let trial = 0; trial < 30; trial++) {
      const dec = Int8Array.from(g.cells, (c) => (c.type === MIRROR && rand() < 0.4 ? (rand() < 0.5 ? 0 : 1) : UNDECIDED));
      const tr = traceGhost(g, dec);
      const fwdEdges = new Set(tr.segments.map((s) => segEdge(g, s)).filter((k) => k >= 0));
      for (const t of goal) {
        const f = feedEdges(g, dec, t);
        assert.equal(f.size > 0, tr.lit.has(t), 'non-empty iff the target is lit in ghost light');
        for (const k of fwdEdges) {
          assert.equal(f.has(k), reaches(g, dec, k >> 2, k & 3, t) || false, `edge ${k}`);
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 1000);
});
