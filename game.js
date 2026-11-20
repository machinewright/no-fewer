// "Prove it": prove a mirror puzzle's par is a lower bound by claiming forced mirrors.
import { parseBoard } from './src/boards.js';
import { drawBoard, isMirror } from './src/view.js';
import { traceGhost, UNDECIDED } from './src/ghost.js';
import { targets } from './src/engine.js';
import { LEVELS } from './src/puzzles.js';

const $ = (id) => document.getElementById(id);
const canvas = $('c');
const KEY = 'prove-it-v2';
let lv, g, goal, claims, history, tool = 'flip', show = null, wrong = 0, won = false, cursor = -1;
let ghostsOn = localStorage.getItem(KEY + '-ghosts') !== '0';

function loadBest() {
  try { const b = JSON.parse(localStorage.getItem(KEY) || '{}'); return b && typeof b === 'object' ? b : {}; } catch { return {}; }
}
export const starsFor = (w) => (w === 0 ? 3 : w <= 2 ? 2 : 1);

function load(k) {
  lv = k; g = parseBoard(LEVELS[k].rows); goal = targets(g);
  claims = new Int8Array(g.cells.length).fill(UNDECIDED); history = [];
  show = null; wrong = 0; won = false; cursor = -1;
  $('goal').innerHTML = `Level ${k + 1} of ${LEVELS.length}. Best solution: <b>${LEVELS[k].par} flip${LEVELS[k].par > 1 ? 's' : ''}</b>. Prove no solution uses fewer.`;
  $('hint').innerHTML = LEVELS[k].hint || '';
  $('hint').hidden = !LEVELS[k].hint;
  $('next').hidden = true;
  msg(k === 0 ? 'Click the mirror you think must flip.' : 'Claim a mirror that must flip, or one that must stay.');
  levelButtons(); draw(); score();
}

// Claimed mirrors are fixed; unclaimed ones are undecided (light goes both ways).
const darkTargets = (d) => { const t = traceGhost(g, d); return goal.filter((i) => !t.lit.has(i)); };
const flipsClaimed = () => g.cells.filter((c, i) => isMirror(c) && claims[i] !== UNDECIDED && claims[i] !== c.rot).length;

function claim(i) {
  if (won || i < 0 || !isMirror(g.cells[i])) return;
  if (claims[i] !== UNDECIDED) { msg('Already settled. Use Undo to take a claim back.'); return; }
  const c = g.cells[i], flip = tool === 'flip';
  const want = flip ? c.rot ^ 1 : c.rot;  // the claimed state
  const test = claims.slice(); test[i] = want ^ 1; // the opposite choice
  if (!darkTargets(test).length) {
    wrong++;
    show = { d: test, focus: i };
    msg(`<span class="bad">Not proven.</span> Shown: if this mirror ${flip ? 'stayed' : 'flipped'}, light could still reach `
      + `every target (solid or dashed), given what's settled so far. Click the board to go on.`);
    draw(); score(); return;
  }
  history.push(claims.slice());
  claims[i] = want;
  show = { d: test, focus: i }; // the evidence: the opposite choice, in ghost light
  const n = flipsClaimed(), par = LEVELS[lv].par;
  if (n >= par) return win(n, par);
  msg(`<span class="good">Proven: must ${flip ? 'flip' : 'stay'}.</span> Shown: if it ${flip ? 'stayed' : 'flipped'}, the crossed-out `
    + `target would get no light at all. Forced flips: <b>${n} of ${par}</b>.`);
  draw(); score();
}

function win(n, par) {
  won = true;
  const real = claims.slice();
  g.cells.forEach((cc, j) => { if (isMirror(cc) && real[j] === UNDECIDED) real[j] = cc.rot; });
  const solves = goal.every((k) => traceGhost(g, real).litReal.has(k));
  // Deduction picks at least par flips, and a par-flip solution exists, so these flips are exactly a best solution
  // whenever every target lights up; otherwise the remaining unclaimed mirrors still had a role we didn't settle.
  const st = starsFor(wrong);
  msg(`<span class="good">Proven. ${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span> Every solution must make these ${n} flips, `
    + `so none can use fewer than ${par}.` + (solves ? ' Shown: making exactly these flips solves the puzzle.' : ''));
  show = { d: real, focus: -1 };
  const best = loadBest();
  if (!(best[lv] >= st)) { best[lv] = st; localStorage.setItem(KEY, JSON.stringify(best)); }
  $('next').hidden = lv + 1 >= LEVELS.length;
  levelButtons(); draw(); score();
}

function draw() {
  const css = canvas.getBoundingClientRect().width || 300, dpr = devicePixelRatio || 1;
  canvas.width = Math.round(css * dpr); canvas.height = Math.round(css * dpr * g.h / g.w);
  const ghosts = show ? true : ghostsOn;
  drawBoard(canvas, g, show ? show.d : claims, { focus: show ? show.focus : cursor, fadeUnreached: false, ghosts, showStart: true, settled: claims });
  canvas.setAttribute('aria-label', describe());
}
function describe() {
  const n = flipsClaimed(), stays = g.cells.filter((c, i) => isMirror(c) && claims[i] === c.rot).length;
  let s = `Board ${g.w} by ${g.h}. Settled: ${n} must flip, ${stays} must stay.`;
  if (cursor >= 0) {
    const c = g.cells[cursor];
    s += ` Cursor at column ${cursor % g.w + 1}, row ${Math.floor(cursor / g.w) + 1}: ${c.type}`
      + (isMirror(c) ? `, starts ${c.rot ? 'backslash' : 'slash'}, ${claims[cursor] === UNDECIDED ? 'unclaimed' : claims[cursor] === c.rot ? 'must stay' : 'must flip'}` : '') + '.';
  }
  return s;
}
function msg(h) { $('msg').innerHTML = h; }
function score() { $('score').textContent = `Wrong claims: ${wrong}. ${wrong === 0 ? 'No mistakes so far.' : ''}`; }
function levelButtons() {
  const best = loadBest();
  [...$('levels').children].forEach((b, i) => {
    b.setAttribute('aria-pressed', String(i === lv));
    b.textContent = `${i + 1}${best[i] ? ' ' + '★'.repeat(best[i]) : ''}`;
  });
}

canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / r.width * g.w), y = Math.floor((e.clientY - r.top) / r.height * g.h);
  if (won) return;
  if (show) { show = null; draw(); }
  if (x >= 0 && y >= 0 && x < g.w && y < g.h) claim(y * g.w + x);
});
canvas.addEventListener('keydown', (e) => {
  const mv = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
  if (mv) {
    e.preventDefault(); if (cursor < 0) cursor = 0;
    const x = Math.min(g.w - 1, Math.max(0, cursor % g.w + mv[0])), y = Math.min(g.h - 1, Math.max(0, Math.floor(cursor / g.w) + mv[1]));
    cursor = y * g.w + x; if (!won) show = null; draw();
  } else if ((e.key === 'Enter' || e.key === ' ') && cursor >= 0) { e.preventDefault(); if (!won) { show = null; claim(cursor); } }
  else if (e.key === 'f') setTool('flip'); else if (e.key === 's') setTool('stay');
  else if (e.key === 'u') undo();
});
canvas.addEventListener('blur', () => { cursor = -1; draw(); });
function setTool(t) { tool = t; $('t-flip').setAttribute('aria-pressed', String(t === 'flip')); $('t-stay').setAttribute('aria-pressed', String(t === 'stay')); }
function undo() { if (!history.length || won) return; claims = history.pop(); show = null; msg('Undone.'); draw(); }
$('t-flip').onclick = () => setTool('flip');
$('t-stay').onclick = () => setTool('stay');
$('undo').onclick = undo;
$('restart').onclick = () => load(lv);
$('next').onclick = () => load(lv + 1);
$('ghosts').checked = ghostsOn;
$('ghosts').onchange = () => { ghostsOn = $('ghosts').checked; localStorage.setItem(KEY + '-ghosts', ghostsOn ? '1' : '0'); draw(); };
LEVELS.forEach((_, i) => { const b = document.createElement('button'); b.onclick = () => load(i); $('levels').append(b); });
new ResizeObserver(() => g && draw()).observe(canvas);
const best = loadBest();
load(Math.min(LEVELS.findIndex((_, i) => !best[i]) >>> 0, LEVELS.length - 1));
