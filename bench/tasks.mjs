// Pilot: can a language model SOLVE a board in par flips, and can it PROVE that par can't be beaten (with No Fewer's
// claim rule)? Builds prompts and checks answers exactly. Usage:
//   node tasks.mjs prompt <solve|prove> <level>      prints the prompt
//   node tasks.mjs check <solve|prove> <level> <file> checks the last JSON array in the file
import { readFileSync } from 'node:fs';
import { LEVELS } from '../src/puzzles.js';
import { parseBoard } from '../src/boards.js';
import { traceGhost, UNDECIDED } from '../src/ghost.js';
import { targets } from '../src/engine.js';

// Levels 1..28 are the game's; 101.. are the bigger ladder boards in ladder.json (see ladder-search.mjs).
const LADDER = JSON.parse(readFileSync(new URL('./ladder.json', import.meta.url), 'utf8'));
const levelAt = (k) => (k >= 100 ? LADDER[k - 100] : LEVELS[k]);

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

const RULE = `Make claims one at a time. A claim says a mirror "flip" (every solution must flip it) or "stay" (every solution must
keep it). A claim is accepted only if the OPPOSITE choice makes some target impossible to light, under this
relaxation: every mirror you have not claimed yet may send light BOTH ways (as if it were "/" and "\\" at once),
mirrors you already claimed are fixed in their claimed tilt, and walls, filters and colors work as usual. If, under
that relaxation, some target can receive no light of its color at all, the claim is accepted. Accepted claims can make
later claims provable.`;

export function prompt(task, k) {
  const l = levelAt(k);
  const head = `${LEGEND}\n\nThe board (row number, then the row; column digits underneath):\n${show(l.rows)}\n\n`;
  if (task === 'solve') return head + `Goal: light every target at the same time by flipping exactly ${l.par} mirrors.
Answer with your reasoning, then on the LAST line a JSON array of the mirrors to flip as [column,row] pairs, e.g.
[[3,0],[2,4]].`;
  if (task === 'prove') return head + `The fewest flips that light every target at the same time is ${l.par}. Your task is to PROVE that no solution
uses fewer than ${l.par} flips, with this rule.
${RULE} You have proven the bound when you have ${l.par} accepted "flip" claims.
Answer with your reasoning, then on the LAST line a JSON array of claims in order as [column,row,"flip"|"stay"], e.g.
[[3,0,"stay"],[3,2,"flip"]].`;
  return head + `The fewest flips that light every target at the same time is ${l.par}. Your task is to PROVE that no solution
uses fewer than ${l.par} flips, with this rule.
${RULE}
On this board, claims alone cannot reach ${l.par} flips, so you may split into two cases ONCE. First make any claims you
can. Then pick one mirror you have not claimed (the split mirror) and handle both cases: in case "stay" that mirror
keeps its tilt, in case "flip" it is flipped; in each case it counts as claimed that way (and as a flip in case "flip").
Inside each case, continue making claims with the same rule, starting from the claims made before the split plus the
split mirror. A case is closed if either (a) under the relaxation some target can receive no light of its color at all
(that case is impossible), or (b) its accepted "flip" claims, counting the ones before the split and the split mirror
itself, reach ${l.par}. You have proven the bound when both cases are closed.
Answer with your reasoning, then on the LAST line one JSON object with the claims before the split, the split mirror,
and the claims in each case, all as [column,row,"flip"|"stay"] (a case may have an empty list), e.g.
{"before":[[3,0,"stay"]],"split":[2,4],"ifStay":[[1,1,"flip"]],"ifFlip":[]}`;
}

function lastJson(text) {
  const m = [...text.matchAll(/\[\s*\[[\s\S]*?\]\s*\]|\[\s*\]/g)]; // a list of lists, or an empty list
  if (!m.length) return null;
  try { return JSON.parse(m[m.length - 1][0]); } catch { return null; }
}

export function check(task, k, text) {
  const l = levelAt(k), g = parseBoard(l.rows), goal = targets(g), ans = lastJson(text);
  if (!Array.isArray(ans)) return { ok: false, why: 'no JSON answer' };
  if (!ans.length) return { ok: false, empty: true, why: task === 'solve' ? 'answered: no solution exists' : 'answered: no claim is provable' };
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
  if (task === 'prove') {
    const r = claimsFrom(g, goal, at, new Int8Array(g.cells.length).fill(UNDECIDED), ans, '');
    if (r.why) return { ok: false, accepted: r.accepted, flips: r.flips, why: r.why };
    return { ok: r.flips >= l.par, accepted: r.accepted, flips: r.flips, why: r.flips >= l.par ? '' : `only ${r.flips} of ${l.par} flips proven` };
  }
  return { ok: false, why: 'cases answers are JSON objects' };
}

// Applies claims in order from assignment d0 (each must pass the claim rule at its point). Returns { d, flips,
// accepted, why } where why is '' when every claim was accepted.
function claimsFrom(g, goal, at, d0, list, where) {
  const d = d0.slice(); let flips = 0, accepted = 0;
  if (!Array.isArray(list)) return { d, flips, accepted, why: `${where}claims are not a list` };
  for (const c of list) {
    const [x, y, t] = Array.isArray(c) ? c : [];
    const i = at(x, y), n = `${where}claim ${accepted + 1}`;
    if (i < 0 || g.cells[i].type !== 'mirror') return { d, flips, accepted, why: `${n}: [${x},${y}] is not a mirror` };
    if (d[i] !== UNDECIDED) return { d, flips, accepted, why: `${n}: [${x},${y}] already claimed` };
    if (t !== 'flip' && t !== 'stay') return { d, flips, accepted, why: `${n}: bad kind ${t}` };
    const want = t === 'flip' ? g.cells[i].rot ^ 1 : g.cells[i].rot;
    const test = d.slice(); test[i] = want ^ 1;
    const lit = traceGhost(g, test).lit;
    if (goal.every((tg) => lit.has(tg))) return { d, flips, accepted, why: `${n} [${x},${y},"${t}"] not provable at that point` };
    d[i] = want; accepted++; if (t === 'flip') flips++;
  }
  return { d, flips, accepted, why: '' };
}

// The last {"before":...} object in the text (balanced braces), or null.
function lastObject(text) {
  const starts = [...text.matchAll(/\{\s*"before"/g)].map((m) => m.index);
  for (const s of starts.reverse()) {
    let depth = 0;
    for (let j = s; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}' && --depth === 0) { try { return JSON.parse(text.slice(s, j + 1)); } catch { break; } }
    }
  }
  return null;
}

// Proof with one case split: claims before the split, then each case closes by an impossible relaxation (a target
// dark) or by reaching par flips (before + split mirror + case claims).
export function checkCases(k, text) {
  const l = levelAt(k), g = parseBoard(l.rows), goal = targets(g), o = lastObject(text);
  if (!o) return { ok: false, why: 'no JSON answer' };
  const at = (x, y) => (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < g.w && y < g.h ? y * g.w + x : -1);
  const base = claimsFrom(g, goal, at, new Int8Array(g.cells.length).fill(UNDECIDED), o.before ?? [], 'before: ');
  if (base.why) return { ok: false, why: base.why };
  const [sx, sy] = Array.isArray(o.split) ? o.split : [], m = at(sx, sy);
  if (m < 0 || g.cells[m].type !== 'mirror') return { ok: false, why: `split [${sx},${sy}] is not a mirror` };
  if (base.d[m] !== UNDECIDED) return { ok: false, why: `split [${sx},${sy}] was already claimed` };
  const cases = {};
  for (const [name, flip] of [['ifStay', 0], ['ifFlip', 1]]) {
    const d0 = base.d.slice(); d0[m] = g.cells[m].rot ^ flip;
    const r = claimsFrom(g, goal, at, d0, o[name] ?? [], `${name}: `);
    if (r.why) return { ok: false, why: r.why };
    const lit = traceGhost(g, r.d).lit, impossible = !goal.every((tg) => lit.has(tg));
    const flips = base.flips + flip + r.flips;
    cases[name] = impossible ? 'impossible' : `${flips} flips`;
    if (!impossible && flips < l.par) return { ok: false, cases, why: `${name} not closed: ${flips} of ${l.par} flips, every target still reachable` };
  }
  return { ok: true, cases, why: '' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, task, lv, file] = process.argv.slice(2), k = +lv - 1;
  if (cmd === 'prompt') console.log(prompt(task, k));
  else console.log(JSON.stringify(task === 'cases' ? checkCases(k, readFileSync(file, 'utf8')) : check(task, k, readFileSync(file, 'utf8'))));
}
