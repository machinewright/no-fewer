// Pilot: can a language model SOLVE a board in par flips, and can it PROVE that par can't be beaten (with No Fewer's
// claim rule)? Builds prompts and checks answers exactly. Usage:
//   node tasks.mjs prompt <solve|prove> <level>      prints the prompt
//   node tasks.mjs check <solve|prove> <level> <file> checks the last JSON array in the file
import { readFileSync } from 'node:fs';
import { LEVELS } from '../src/puzzles.js';
import { parseBoard } from '../src/boards.js';
import { traceGhost, UNDECIDED } from '../src/ghost.js';
import { targets } from '../src/engine.js';

const LEGEND = `Board legend (one character per cell; columns are numbered from 0 left to right, rows from 0 top to bottom):
  .  empty          #  wall (stops light)
  /  mirror tilted like "/"     \\  mirror tilted like "\\"
  ^ > v <  amber lamp shining up / right / down / left
  U R D L  cyan lamp shining up / right / down / left
  o  amber target   O  cyan target    f  amber filter   F  cyan filter
Light travels in straight lines from each lamp. A "/" mirror turns light moving right to up, up to right, left to down,
and down to left. A "\\" mirror turns right to down, down to right, left to up, and up to left. Light stops at walls,
lamps, targets and the board edge. A target is lit only by light of its own color. A filter lets light of its own color
pass straight through and stops the other color. Flipping a mirror changes "/" to "\\" or back.`;

const show = (rows) => rows.map((r, y) => `${String(y).padStart(2)} ${r}`).join('\n')
  + '\n   ' + [...rows[0]].map((_, x) => x % 10).join('');

export function prompt(task, k) {
  const l = LEVELS[k];
  const head = `${LEGEND}\n\nThe board (row number, then the row; column digits underneath):\n${show(l.rows)}\n\n`;
  if (task === 'solve') return head + `Goal: light every target at the same time by flipping exactly ${l.par} mirrors.
Answer with your reasoning, then on the LAST line a JSON array of the mirrors to flip as [column,row] pairs, e.g.
[[3,0],[2,4]].`;
  return head + `The fewest flips that light every target at the same time is ${l.par}. Your task is to PROVE that no solution
uses fewer than ${l.par} flips, with this rule.
Make claims one at a time. A claim says a mirror "flip" (every solution must flip it) or "stay" (every solution must
keep it). A claim is accepted only if the OPPOSITE choice makes some target impossible to light, under this
relaxation: every mirror you have not claimed yet may send light BOTH ways (as if it were "/" and "\\" at once),
mirrors you already claimed are fixed in their claimed tilt, and walls, filters and colors work as usual. If, under
that relaxation, some target can receive no light of its color at all, the claim is accepted. Accepted claims can make
later claims provable. You have proven the bound when you have ${l.par} accepted "flip" claims.
Answer with your reasoning, then on the LAST line a JSON array of claims in order as [column,row,"flip"|"stay"], e.g.
[[3,0,"stay"],[3,2,"flip"]].`;
}

function lastJson(text) {
  const m = [...text.matchAll(/\[\s*\[[\s\S]*?\]\s*\]/g)];
  if (!m.length) return null;
  try { return JSON.parse(m[m.length - 1][0]); } catch { return null; }
}

export function check(task, k, text) {
  const l = LEVELS[k], g = parseBoard(l.rows), goal = targets(g), ans = lastJson(text);
  if (!Array.isArray(ans)) return { ok: false, why: 'no JSON answer' };
  const at = (x, y) => (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < g.w && y < g.h ? y * g.w + x : -1);
  if (task === 'solve') {
    const d = Int8Array.from(g.cells, (c) => (c.type === 'mirror' ? c.rot : UNDECIDED));
    const seen = new Set();
    for (const [x, y] of ans) {
      const i = at(x, y);
      if (i < 0 || g.cells[i].type !== 'mirror') return { ok: false, why: `[${x},${y}] is not a mirror` };
      if (seen.has(i)) return { ok: false, why: `[${x},${y}] listed twice` };
      seen.add(i); d[i] ^= 1;
    }
    const lit = traceGhost(g, d).litReal, dark = goal.filter((t) => !lit.has(t)).length;
    return { ok: dark === 0 && seen.size <= l.par, flips: seen.size, dark, why: dark ? `${dark} target(s) dark` : seen.size > l.par ? 'too many flips' : '' };
  }
  const d = new Int8Array(g.cells.length).fill(UNDECIDED);
  let flips = 0, accepted = 0;
  for (const [x, y, t] of ans) {
    const i = at(x, y);
    if (i < 0 || g.cells[i].type !== 'mirror') return { ok: false, accepted, why: `claim ${accepted + 1}: [${x},${y}] is not a mirror` };
    if (d[i] !== UNDECIDED) return { ok: false, accepted, why: `claim ${accepted + 1}: [${x},${y}] already claimed` };
    if (t !== 'flip' && t !== 'stay') return { ok: false, accepted, why: `claim ${accepted + 1}: bad kind ${t}` };
    const want = t === 'flip' ? g.cells[i].rot ^ 1 : g.cells[i].rot;
    const test = d.slice(); test[i] = want ^ 1;
    const lit = traceGhost(g, test).lit;
    if (goal.every((tg) => lit.has(tg))) return { ok: false, accepted, flips, why: `claim ${accepted + 1} [${x},${y},"${t}"] not provable at that point` };
    d[i] = want; accepted++; if (t === 'flip') flips++;
  }
  return { ok: flips >= l.par, accepted, flips, why: flips >= l.par ? '' : `only ${flips} of ${l.par} flips proven` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, task, lv, file] = process.argv.slice(2), k = +lv - 1;
  if (cmd === 'prompt') console.log(prompt(task, k));
  else console.log(JSON.stringify(check(task, k, readFileSync(file, 'utf8'))));
}
