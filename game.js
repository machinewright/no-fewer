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
let lv, today = null, g, goal, claims, history, show = null, wrong = 0, won = false, cursor = -1, sel = -1, ft = -1; // ft: the target whose light is shown alone
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
  show = null; wrong = 0; won = false; cursor = -1; sel = -1; ft = -1;
  $('hint').innerHTML = level().hint || '';
  $('hint').hidden = !level().hint;
  $('next').hidden = true;
  msg(k === 0 ? 'Select the mirror you think must flip.' : 'Select a mirror you can prove must flip or must stay.');
  levelButtons(); update();
}

// Claimed mirrors are fixed; unclaimed ones are open (light goes both ways).
const darkTargets = (d) => { const t = traceGhost(g, d); return goal.filter((i) => !t.lit.has(i)); };
const flipsClaimed = () => g.cells.filter((c, i) => isMirror(c) && claims[i] !== UNDECIDED && claims[i] !== c.rot).length;
const staysClaimed = () => g.cells.filter((c, i) => isMirror(c) && claims[i] === c.rot).length;

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
  sel = i; msg(''); update();
}

function claim(flip) {
  if (won || sel < 0) return;
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
  if (n >= par) return win(n, par);
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
  return `Daily puzzle done${n > 1 ? `: ${n} days in a row` : ''}. A new board comes at midnight.`;
}

function update() {
  const par = level().par, n = flipsClaimed();
  const title = lv === DAILY ? `Daily puzzle, ${dayName(today.key)} (${today.name})` : `Level ${lv + 1}`;
  $('goal').innerHTML = `${title}. Fewest flips: <b>${par}</b>. Forced flips proven: <b>${n} of ${par}</b>`
    + (staysClaimed() ? ` <span class="note">(plus ${plural(staysClaimed(), 'mirror')} proven to stay)</span>` : '');
  $('meter-fill').style.width = `${Math.min(100, (100 * n) / par)}%`;
  const s = sel >= 0;
  $('c-flip').disabled = !s; $('c-stay').disabled = !s;
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
    focus: show && show.focus >= 0 ? show.focus : cursor, selected: show ? -1 : sel, feedTarget: won ? -1 : ft, fadeUnreached: false,
    ghosts: show ? true : ghostsOn, showStart: true, settled: show && show.focus >= 0 ? claims.map((v, j) => (j === show.focus ? UNDECIDED : v)) : claims,
  });
  canvas.setAttribute('aria-label', describe());
}
function describe() {
  let s = `Board ${g.w} by ${g.h}. Settled: ${flipsClaimed()} must flip, ${staysClaimed()} must stay.`;
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
});
canvas.addEventListener('blur', () => { cursor = -1; draw(); });
function undo() {
  if (!history.length || won) return;
  claims = history.pop(); show = null; sel = -1; msg('Undone.'); update();
}
$('c-flip').onclick = () => claim(true);
$('c-stay').onclick = () => claim(false);
$('undo').onclick = undo;
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
