// Which ghost light can still reach one target? Returns the set of directed edges (cell * 4 + dir: light leaving
// `cell` heading `dir`) that lie on some emitter-to-target path in ghost light, where open mirrors send light both
// ways. A segment from traceGhost is on such a path exactly when its first edge is (segments only change direction at
// mirrors, so a straight run is all on a path or not at all).
// Only light of the target's color counts; a filter passes its own color and blocks the rest. Splitters are not
// supported (no level uses them); feedEdges throws on boards that have them.
import { reflect, colorOf, DX, DY, WALL, EMITTER, TARGET, MIRROR, FILTER, SPLITTER } from './engine.js';
import { UNDECIDED } from './ghost.js';

const options = (c, i, decided) => (c.fixed || decided[i] === UNDECIDED ? (c.fixed ? [c.rot] : [0, 1]) : [decided[i]]);

export function feedEdges(g, decided, t) {
  const { w, h, cells } = g;
  if (cells.some((c) => c.type === SPLITTER)) throw new Error('feedEdges: no splitters');
  const tc = colorOf(cells[t]);
  const blocks = (c) => c.type === WALL || c.type === EMITTER || c.type === TARGET || (c.type === FILTER && colorOf(c) !== tc);
  const step = (i, d) => { const x = (i % w) + DX[d], y = Math.floor(i / w) + DY[d]; return x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x; };
  // Forward: every edge light can take from an emitter.
  const fwd = new Set(), q = [];
  cells.forEach((c, i) => { if (c.type === EMITTER && colorOf(c) === tc) q.push([i, c.dir]); });
  while (q.length) {
    const [i, d] = q.pop(), k = i * 4 + d;
    if (fwd.has(k)) continue;
    fwd.add(k);
    const n = step(i, d);
    if (n < 0) continue;
    const c = cells[n];
    if (blocks(c)) continue;
    if (c.type === MIRROR) for (const r of options(c, n, decided)) q.push([n, reflect(r, d)]);
    else q.push([n, d]);
  }
  // Backward from the target: every edge from which light can still get there.
  const back = new Set(), b = [];
  for (let d = 0; d < 4; d++) { const p = step(t, (d + 2) % 4); if (p >= 0) b.push([p, d]); }
  while (b.length) {
    const [i, d] = b.pop(), k = i * 4 + d;
    if (back.has(k)) continue;
    const c = cells[i];
    if (c.type === EMITTER) { if (c.dir === d && colorOf(c) === tc) back.add(k); continue; }
    if (blocks(c)) continue;
    back.add(k);
    // light left cell i heading d: it came in heading e, from the neighbour behind
    const ins = c.type === MIRROR ? [0, 1, 2, 3].filter((e) => options(c, i, decided).some((r) => reflect(r, e) === d)) : [d];
    for (const e of ins) { const p = step(i, (e + 2) % 4); if (p >= 0) b.push([p, e]); }
  }
  return new Set([...fwd].filter((k) => back.has(k)));
}

// The edge key of a traceGhost segment (its first step), or -1 for a zero-length one. Callers also check that the
// segment's color is the target's.
export function segEdge(g, s) {
  const dx = Math.sign(s.x2 - s.x1), dy = Math.sign(s.y2 - s.y1);
  const d = DX.findIndex((v, j) => v === dx && DY[j] === dy);
  return d < 0 ? -1 : (s.y1 * g.w + s.x1) * 4 + d;
}
