// Draws game level 23 as an SVG with the light route Sonnet missed (its first claim said (5,4) must flip because
// light could only reach the target at (5,5) through (5,4) turning down). The route is checked here, not typed in:
// each step must follow the board under the claim rule's relaxation, with (5,4) fixed as "/". Writes between
// <!--fig:23--> markers in index.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { LEVELS } from '../src/puzzles.js';
import { parseBoard } from '../src/boards.js';
import { DX, DY, reflect } from '../src/engine.js';
const g = parseBoard(LEVELS[22].rows), S = 56, P = 22; // P leaves room for the row and column numbers
// The route: the lamp at (2,4), then cells the light enters with the direction it is moving (0 up 1 right 2 down 3 left).
export const ROUTE = [[2, 4], [3, 4], [4, 4], [5, 4], [5, 3], [4, 3], [4, 4], [4, 5], [5, 5]];
export function checkRoute() {
  const c0 = g.cells[ROUTE[0][1] * g.w + ROUTE[0][0]]; if (c0.type !== 'emitter') return 'route must start at a lamp';
  let d = c0.dir;
  for (let k = 1; k < ROUTE.length; k++) {
    const [px, py] = ROUTE[k - 1], [x, y] = ROUTE[k];
    if (x !== px + DX[d] || y !== py + DY[d]) return `step ${k} doesn't follow the light`;
    const c = g.cells[y * g.w + x];
    if (k === ROUTE.length - 1) return c.type === 'target' && x === 5 && y === 5 ? '' : 'route must end at (5,5)';
    if (c.type === 'mirror') {
      const next = ROUTE[k + 1], fixed = x === 5 && y === 4 ? [0] : [0, 1];
      const r = fixed.find((r) => x + DX[reflect(r, d)] === next[0] && y + DY[reflect(r, d)] === next[1]);
      if (r === undefined) return `mirror (${x},${y}) can't turn the light that way`;
      d = reflect(r, d);
    } else if (c.type !== 'empty') return `(${x},${y}) blocks the light`;
  }
  return 'route too short';
}
function svg() {
  const why = checkRoute(); if (why) throw new Error(why);
  const cx = (x) => P + x * S + S / 2, cy = (y) => P + y * S + S / 2, W = P * 2 + g.w * S, H = P * 2 + g.h * S;
  const o = [`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="fig23t"><title id="fig23t">Level 23: the four-mirror route from the lamp at column 2, row 4 into the target at column 5, row 5, entering it from the left</title>`];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const c = g.cells[y * g.w + x], X = P + x * S, Y = P + y * S;
    o.push(`<rect x="${X}" y="${Y}" width="${S}" height="${S}" class="${c.type === 'wall' ? 'wall' : 'cell'}"/>`);
    if (c.type === 'mirror') {
      const q = S * 0.36, [a, b] = c.rot === 0 ? [[-q, q], [q, -q]] : [[-q, -q], [q, q]];
      o.push(`<line x1="${cx(x) + a[0]}" y1="${cy(y) + a[1]}" x2="${cx(x) + b[0]}" y2="${cy(y) + b[1]}" class="mirror"/>`);
    }
    if (c.type === 'target') o.push(`<circle cx="${cx(x)}" cy="${cy(y)}" r="${S * 0.2}" class="target"/>`);
    if (c.type === 'emitter') { const r = S * 0.22; o.push(`<path d="M${cx(x) - r} ${cy(y) - r} L${cx(x) + r} ${cy(y)} L${cx(x) - r} ${cy(y) + r}Z" class="lamp" transform="rotate(${(c.dir - 1) * 90} ${cx(x)} ${cy(y)})"/>`); }
  }
  o.push(`<rect x="${P + 5 * S + 3}" y="${P + 4 * S + 3}" width="${S - 6}" height="${S - 6}" class="claimed"/>`);
  const pts = ROUTE.map(([x, y], k) => k === 0 ? `${cx(x) + S * 0.25},${cy(y)}` : k === ROUTE.length - 1 ? `${cx(x) - S * 0.2},${cy(y)}` : `${cx(x)},${cy(y)}`);
  o.push(`<polyline points="${pts.join(' ')}" class="route"/>`);
  for (let x = 0; x < g.w; x++) o.push(`<text x="${cx(x)}" y="${H - 6}" class="ax">${x}</text>`);
  for (let y = 0; y < g.h; y++) o.push(`<text x="${P / 2}" y="${cy(y) + 5}" class="ax">${y}</text>`);
  o.push('</svg>'); return o.join('\n');
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const html = readFileSync('index.html', 'utf8');
  writeFileSync('index.html', html.replace(/(<!--fig:23-->)[\s\S]*?(<!--\/fig:23-->)/, `$1\n${svg()}\n$2`));
  console.log('ok');
}
