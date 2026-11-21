// "No Fewer" (formerly "Prove it"): prove a mirror puzzle's par is a lower bound by claiming forced mirrors.
// Select a mirror, then claim it must flip or must stay. A claim is accepted when the opposite choice leaves some target
// unreachable even in ghost light (every open mirror sends light both ways).
import { parseBoard } from './src/boards.js';
import { drawBoard, isMirror } from './src/view.js';
import { traceGhost, UNDECIDED } from './src/ghost.js';
import { targets } from './src/engine.js';
import { LEVELS } from './src/puzzles.js';
import { daily } from './src/daily.js';
import { streak, dateKey } from './src/generator.js';

const $ = (id) => document.getElementById(id);
const canvas = $('c');
const KEY = 'prove-it-v2';
const DAILY = -1; // lv for the daily puzzle
let shareText = '';
let lv, today = null, g, goal, claims, history, show = null, wrong = 0, won = false, cursor = -1, sel = -1, ft = -1; // ft: the target whose light is shown alone
// Proof by cases (levels marked cases: true). sup = { m, base, baseHistory, active, cases: [{ claims, history, closed }] };
// case 0: mirror m stays, case 1: it flips. While supposing, `claims`/`history` are the active case's.
let sup = null;
const CASE_NAME = ['it stays', 'it flips'];
// Storage can be missing or blocked (private modes, sandboxed frames): the game must still run.
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* progress just isn't saved */ } },
};
let ghostsOn = store.get(KEY + '-ghosts') !== '0';

function loadBest() {
  try { const b = JSON.parse(store.get(KEY) || '{}'); return b && typeof b === 'object' ? b : {}; } catch { return {}; }
}
export const starsFor = (w) => (w === 0 ? 3 : w <= 2 ? 2 : 1);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const where = (i) => `column ${i % g.w + 1}, row ${Math.floor(i / g.w) + 1}`;
const tilt = (r) => (r ? 'starts as \\' : 'starts as /');

const level = () => (lv === DAILY ? today : LEVELS[lv]);
function dailyBest() { try { const b = JSON.parse(store.get(KEY + '-daily') || '{}'); return b && typeof b === 'object' ? b : {}; } catch { return {}; } }
const dayName = (key) => new Date(key + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

function load(k) {
  if (k === DAILY) today = daily(new Date()); // recomputed on every load, so a page left open past midnight moves on
  if (k === DAILY && !today) k = 0;
  lv = k; g = parseBoard(level().rows); goal = targets(g);
  claims = new Int8Array(g.cells.length).fill(UNDECIDED); history = [];
  show = null; wrong = 0; won = false; cursor = -1; sel = -1; ft = -1; sup = null;
  $('c-sup').hidden = !level().cases;
  $('hint').innerHTML = level().hint || '';
  $('hint').hidden = !level().hint;
  $('next').hidden = true; $('share').hidden = true;
  msg(k === 0 ? 'Select the mirror you think must flip.' : 'Select a mirror you can prove must flip or must stay.');
  levelButtons(); update();
}

// Claimed mirrors are fixed; unclaimed ones are open (light goes both ways).
const darkTargets = (d) => { const t = traceGhost(g, d); return goal.filter((i) => !t.lit.has(i)); };
const flipsClaimed = () => g.cells.filter((c, i) => isMirror(c) && claims[i] !== UNDECIDED && claims[i] !== c.rot).length;
const staysClaimed = () => g.cells.filter((c, i) => isMirror(c) && claims[i] === c.rot && !(sup && !won && i === sup.m)).length;

function select(i) {
  if (won || i < 0) return;
  show = null;
  const c = g.cells[i];
  if (c.type === 'target') {
    ft = ft === i ? -1 : i;
    msg(ft < 0 ? 'Showing all light again.' : 'Showing only the light that could still reach this target. Tap it again to show all light.');
    return update();
  }
  if (!isMirror(c)) { sel = -1; msg('Select a mirror to claim it, or a target to see only the light that could reach it.'); return update(); }
  if (claims[i] !== UNDECIDED) {
    sel = -1; msg(`Already settled: this mirror ${claims[i] === c.rot ? 'must stay' : 'must flip'}. Undo takes a claim back.`);
    return update();
  }
  if (sup && sup.cases[sup.active].closed) { sel = -1; msg(caseClosedText(sup.active) + otherCaseText()); return update(); }
  sel = i; msg(''); update();
}

// ---- Suppose: proof by cases ----
function suppose() {
  if (won || sup || sel < 0 || !level().cases) return;
  const m = sel, rot = g.cells[m].rot;
  sup = { m, base: claims, baseHistory: history, active: 0, cases: [rot, rot ^ 1].map((v) => {
    const c = claims.slice(); c[m] = v; return { claims: c, history: [], closed: null };
  }) };
  sel = -1; show = null;
  for (const k of [1, 0]) { sup.active = k; claims = sup.cases[k].claims; history = sup.cases[k].history; sup.cases[k].closed = caseState(); }
  if (sup.cases.every((c) => c.closed)) return winCases();
  msg(`Supposing about the mirror at ${where(m)}. Prove the minimum in both cases; this board is the case where ${CASE_NAME[0]}.`);
  update();
}
const caseState = () => (darkTargets(claims).length ? 'dark' : flipsClaimed() >= level().par ? 'count' : null);
function caseClosedText(k) {
  const c = sup.cases[k];
  const who = `if the ringed mirror ${CASE_NAME[k].slice(3)}`;
  return c.closed === 'dark' ? `Case closed: ${who}, some target gets no light at all, so this case can't happen.`
    : `Case closed: ${who}, at least ${plural(level().par, 'flip')} are forced.`;
}
const otherCaseText = () => (sup.cases[1 - sup.active].closed ? '' : ` Now switch to the other case (the ringed mirror ${CASE_NAME[1 - sup.active].slice(3)}).`);
function closeCase() { // after a claim inside a case; returns true when the whole proof is done
  const st = caseState();
  if (!st) return false;
  sup.cases[sup.active].closed = st; sel = -1; show = null;
  if (sup.cases.every((c) => c.closed)) { winCases(); return true; }
  msg(`<span class="good">${caseClosedText(sup.active)}</span> Switching to the other case (the ringed mirror ${CASE_NAME[1 - sup.active].slice(3)}).`);
  update();
  const k = 1 - sup.active, from = sup; // after a moment, unless the player has moved on already
  setTimeout(() => { if (sup === from && !won && sup.active !== k && !sup.cases[k].closed) { const m = $('msg').innerHTML; switchCase(k); msg(m.replace('Switching to', 'Switched to')); } }, 1600);
  return true;
}
function switchCase(k) {
  if (!sup || won || k === sup.active) return;
  sup.cases[sup.active].claims = claims; sup.cases[sup.active].history = history;
  sup.active = k; claims = sup.cases[k].claims; history = sup.cases[k].history; sel = -1; show = null;
  msg(sup.cases[k].closed ? caseClosedText(k) : `The case where the mirror at ${where(sup.m)} ${CASE_NAME[k].slice(3)}.`);
  update();
}
function stopSupposing() {
  if (!sup || won) return;
  claims = sup.base; history = sup.baseHistory; sup = null; sel = -1; show = null;
  msg('Stopped supposing. Both cases are dropped; your earlier claims are kept.'); update();
}
function winCases() {
  const par = level().par, k = sup.cases.map((c, j) => (c.closed === 'dark' ? `if ${CASE_NAME[j]}, the targets can't all be lit`
    : `if ${CASE_NAME[j]}, at least ${plural(par, 'flip')} are forced`));
  won = true; sel = -1;
  const real = new Int8Array(g.cells.length).fill(UNDECIDED);
  g.cells.forEach((c, j) => { if (isMirror(c)) real[j] = c.rot; });
  for (const j of level().sol) real[j] ^= 1;
  claims = real;
  const st = starsFor(wrong);
  msg(`<span class="good">Proven by cases. ${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span> The mirror at ${where(sup.m)} either stays or flips: `
    + `${k[0]}; ${k[1]}. Either way no solution uses fewer than ${par}. Shown: a solution with exactly ${par}.`
    + (lv + 1 === LEVELS.length ? ' That was the last level. Thanks for playing.' : ''));
  show = { d: real, focus: -1 };
  const best = loadBest();
  if (!(best[lv] >= st)) { best[lv] = st; store.set(KEY, JSON.stringify(best)); }
  $('next').hidden = lv + 1 >= LEVELS.length;
  levelButtons(); update();
  if (!$('next').hidden) $('next').focus({ preventScroll: true });
}

function claim(flip) {
  if (won || sel < 0) return;
  if (sup && sup.cases[sup.active].closed) return;
  const i = sel, c = g.cells[i];
  const want = flip ? c.rot ^ 1 : c.rot; // the claimed state
  const test = claims.slice(); test[i] = want ^ 1; // the opposite choice
  const dark = darkTargets(test);
  if (!dark.length) {
    wrong++;
    show = { d: test, focus: i };
    msg(`<span class="bad">Not proven (yet).</span> Shown: if this mirror ${flip ? 'stayed' : 'flipped'}, light could still reach `
      + `every target (solid or dashed), given what's settled so far. Click the board to go on.`);
    return update();
  }
  history.push(claims.slice());
  claims[i] = want; sel = -1;
  show = { d: test, focus: i }; // the evidence: the opposite choice, in ghost light
  const n = flipsClaimed(), par = level().par;
  if (sup) { if (closeCase()) return; }
  else if (n >= par) return win(n, par);
  msg(`<span class="good">Proven: must ${flip ? 'flip' : 'stay'}.</span> For a moment the board shows why: if it ${flip ? 'stayed' : 'flipped'}, the crossed-out `
    + `target would get no light at all.`);
  update();
  const shown = show; // then back to the real board, with the new claim settled
  setTimeout(() => { if (show === shown && !won) { show = null; update(); } }, 1800);
}

function win(n, par) {
  won = true; sel = -1;
  const real = claims.slice();
  g.cells.forEach((cc, j) => { if (isMirror(cc) && real[j] === UNDECIDED) real[j] = cc.rot; });
  const solves = goal.every((k) => traceGhost(g, real).litReal.has(k));
  // Deduction forces at least par flips and a par-flip solution exists, so when the forced flips alone light every
  // target they are exactly a best solution.
  const st = starsFor(wrong);
  msg(`<span class="good">Proven. ${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span> Every solution must make ${n === 1 ? 'this flip' : `these ${n} flips`}, `
    + `so none can use fewer than ${par}.` + (solves ? ` Shown: making exactly ${n === 1 ? 'that flip' : 'those flips'} solves the puzzle.` : '')
    + (lv + 1 === LEVELS.length ? ' That was the last level. Thanks for playing.' : '')
    + (lv === DAILY ? ` ${dailyDone(st)}` : ''));
  show = { d: real, focus: -1 };
  if (lv !== DAILY) {
    const best = loadBest();
    if (!(best[lv] >= st)) { best[lv] = st; store.set(KEY, JSON.stringify(best)); }
  }
  $('next').hidden = lv === DAILY || lv + 1 >= LEVELS.length;
  levelButtons(); update();
  if (!$('next').hidden) $('next').focus({ preventScroll: true });
}

function dailyDone(st) {
  const b = dailyBest();
  if (!(b[today.key] >= st)) { b[today.key] = st; store.set(KEY + '-daily', JSON.stringify(b)); }
  const n = streak(Object.keys(b));
  shareText = `No Fewer, daily puzzle ${today.key} (${today.name}): proved that ${today.par} flips is the minimum ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`
    + `${n > 1 ? `, ${n} days in a row` : ''}. https://machinewright.github.io/no-fewer/`;
  $('share').hidden = false;
  return `Daily puzzle done${n > 1 ? `: ${n} days in a row` : ''}. A new board comes at midnight.`;
}

function update() {
  const par = level().par, n = flipsClaimed();
  const title = lv === DAILY ? `Daily puzzle, ${dayName(today.key)} (${today.name})` : `Level ${lv + 1}`;
  const inCase = sup && !won;
  $('goal').innerHTML = `${title}. Fewest flips: <b>${par}</b>. ${inCase ? `In this case, forced flips: <b>${n} of ${par}</b>` : `Forced flips proven: <b>${n} of ${par}</b>`}`
    + (staysClaimed() && !(won && level().cases) ? ` <span class="note">(plus ${plural(staysClaimed(), 'mirror')} proven to stay)</span>` : '');
  $('meter-fill').style.width = `${Math.min(100, (100 * n) / par)}%`;
  const s = sel >= 0;
  $('c-flip').disabled = !s; $('c-stay').disabled = !s;
  $('c-sup').disabled = !s || !!sup;
  $('cases').hidden = !inCase;
  if (inCase) {
    $('cases-what').textContent = `Supposing about the mirror at ${where(sup.m)} (ringed).`;
    sup.cases.forEach((c, k) => {
      const b = $('case-' + k); b.setAttribute('aria-pressed', String(k === sup.active));
      b.innerHTML = `If ${CASE_NAME[k]}${c.closed ? ' <span class="good">✓ closed</span>' : ''}`;
    });
  }
  $('sel').textContent = won ? '' : s ? `Selected: the mirror at ${where(sel)}, ${tilt(g.cells[sel].rot)}.` : 'No mirror selected.';
  $('undo').disabled = won || !history.length;
  $('score').textContent = wrong ? `Unproven claims so far: ${wrong}. 3 stars for none, 2 for up to two.` : '';
  draw();
}

function draw() {
  const css = canvas.getBoundingClientRect().width || 300, dpr = devicePixelRatio || 1;
  const w = Math.round(css * dpr), h = Math.round((css * dpr * g.h) / g.w);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  drawBoard(canvas, g, show ? show.d : claims, {
    focus: show && show.focus >= 0 ? show.focus : cursor >= 0 ? cursor : sup && !won ? sup.m : -1, selected: show ? -1 : sel, feedTarget: won ? -1 : ft, fadeUnreached: false,
    ghosts: show ? true : ghostsOn, showStart: true, settled: show && show.focus >= 0 ? claims.map((v, j) => (j === show.focus ? UNDECIDED : v)) : claims,
  });
  canvas.setAttribute('aria-label', describe());
}
function describe() {
  let s = `Board ${g.w} by ${g.h}. ${sup && !won ? `Case: the mirror at ${where(sup.m)} ${CASE_NAME[sup.active].slice(3)}. ` : ''}Settled: ${flipsClaimed()} must flip, ${staysClaimed()} must stay.`;
  const i = cursor >= 0 ? cursor : sel;
  if (i >= 0) {
    const c = g.cells[i];
    s += ` ${i === sel ? 'Selected' : 'Cursor'}: column ${i % g.w + 1}, row ${Math.floor(i / g.w) + 1}, ${c.type === 'empty' ? 'empty' : c.type}`
      + (isMirror(c) ? `, starts ${c.rot ? 'backslash' : 'slash'}, ${claims[i] === UNDECIDED ? 'open' : claims[i] === c.rot ? 'must stay' : 'must flip'}` : '') + '.';
  }
  return s;
}
const multi = () => g.cells.some((c) => (c.type === 'emitter' || c.type === 'target') && (c.color ?? 0) > 0);
const firstMirror = () => Math.max(0, g.cells.findIndex((c) => isMirror(c)));
function describeCell(i) {
  const c = g.cells[i], at = `Column ${i % g.w + 1}, row ${Math.floor(i / g.w) + 1}: `;
  if (isMirror(c)) return at + `mirror, starts as ${c.rot ? 'backslash' : 'slash'}, `
    + (claims[i] === UNDECIDED ? 'open' : claims[i] === c.rot ? 'must stay' : 'must flip') + (i === sel ? ', selected' : '') + '.';
  const col = multi() ? ['amber circle ', 'cyan square '][c.color ?? 0] : '';
  if (c.type === 'target') return at + `${col}target, ${traceGhost(g, claims).litReal.has(i) ? 'lit' : 'dark'}${i === ft ? ', light to it shown alone' : ''}.`;
  if (c.type === 'filter') return at + `${['amber circle', 'cyan square'][c.color ?? 0]} filter: only that color passes.`;
  if (c.type === 'emitter') return at + `${col}lamp, shining ${['up', 'right', 'down', 'left'][c.dir]}.`;
  return at + (c.type === 'wall' ? 'wall.' : 'empty.');
}
function say(t) { $('sr').textContent = t; }
function msg(h) { $('msg').innerHTML = h; }
function levelButtons() {
  const best = loadBest(), db = dailyBest(), key = dateKey();
  const d = $('daily-btn');
  d.setAttribute('aria-current', String(lv === DAILY));
  d.innerHTML = `Daily${db[key] ? `<span class="stars">${'★'.repeat(db[key])}</span>` : ''}`;
  d.setAttribute('aria-label', `Daily puzzle${db[key] ? `, solved with ${db[key]} of 3 stars` : ''}`);
  [...$('levels').querySelectorAll('[data-level]')].forEach((b, i) => {
    b.setAttribute('aria-current', String(i === lv));
    b.innerHTML = `${i + 1}${best[i] ? `<span class="stars">${'★'.repeat(best[i])}</span>` : ''}`;
    b.setAttribute('aria-label', `Level ${i + 1}${best[i] ? `, ${best[i]} of 3 stars` : ''}`);
  });
}

canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * g.w), y = Math.floor(((e.clientY - r.top) / r.height) * g.h);
  cursor = -1;
  if (x >= 0 && y >= 0 && x < g.w && y < g.h) select(y * g.w + x);
});
canvas.addEventListener('keydown', (e) => {
  const mv = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
  if (mv) {
    e.preventDefault(); if (cursor < 0) cursor = sel >= 0 ? sel : firstMirror();
    const x = Math.min(g.w - 1, Math.max(0, (cursor % g.w) + mv[0])), y = Math.min(g.h - 1, Math.max(0, Math.floor(cursor / g.w) + mv[1]));
    cursor = y * g.w + x; if (!won) show = null; draw(); say(describeCell(cursor));
  } else if (e.key === 'Escape' && ft >= 0) { ft = -1; msg('Showing all light again.'); update(); } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (cursor < 0) { cursor = firstMirror(); draw(); say(describeCell(cursor)); } else select(cursor); }
});
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.matches('input, textarea')) return;
  const k = e.key.toLowerCase();
  if (k === 'f') claim(true); else if (k === 's') claim(false); else if (k === 'u') undo();
  else if (k === 'p' && level().cases) suppose(); else if ((k === '1' || k === '2') && sup) switchCase(+k - 1);
});
canvas.addEventListener('blur', () => { cursor = -1; draw(); });
function undo() {
  if (!history.length || won) return;
  claims = history.pop(); show = null; sel = -1;
  if (sup) sup.cases[sup.active].closed = caseState();
  msg('Undone.'); update();
}
$('c-flip').onclick = () => claim(true);
$('c-stay').onclick = () => claim(false);
$('undo').onclick = undo;
$('c-sup').onclick = suppose;
$('case-0').onclick = () => switchCase(0);
$('case-1').onclick = () => switchCase(1);
$('case-stop').onclick = stopSupposing;
$('share').onclick = async () => { // the result has no spoilers: date, difficulty, par, stars
  try { await navigator.clipboard.writeText(shareText); msg('Copied: ' + shareText.replace(/&/g, '&amp;').replace(/</g, '&lt;')); }
  catch { msg('Copy this: ' + shareText.replace(/&/g, '&amp;').replace(/</g, '&lt;')); }
};
$('restart').onclick = () => load(lv);
$('next').onclick = () => { load(lv + 1); toBoard(); };
$('ghosts').checked = ghostsOn;
$('ghosts').onchange = () => { ghostsOn = $('ghosts').checked; store.set(KEY + '-ghosts', ghostsOn ? '1' : '0'); draw(); };
const toBoard = () => { const r = canvas.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) $('goal').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
{ const b = document.createElement('button'); b.id = 'daily-btn'; b.className = 'daily'; b.onclick = () => { load(DAILY); toBoard(); }; $('levels').append(b); }
LEVELS.forEach((_, i) => { const b = document.createElement('button'); b.dataset.level = i; b.onclick = () => { load(i); toBoard(); }; $('levels').append(b); });
new ResizeObserver(() => g && draw()).observe(canvas);
const best = loadBest();
load(Math.min(LEVELS.findIndex((_, i) => !best[i]) >>> 0, LEVELS.length - 1));
