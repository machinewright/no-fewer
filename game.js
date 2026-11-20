// "Prove it" prototype: prove a mirror puzzle's par is a lower bound by claiming forced mirrors.
import { parseBoard } from './src/boards.js';
import { drawBoard, isMirror } from './src/view.js';
import { traceGhost, UNDECIDED } from './src/ghost.js';
import { targets } from './src/engine.js';
import { solve } from './src/solver.js';
import { LEVELS } from './src/puzzles.js';



const $ = (id) => document.getElementById(id);
const canvas = $('c');
let lv, g, goal, claims, history, tool = 'flip', show = null, wrong = 0, peeks = 0, won = false;

function load(k) {
  lv = k; g = parseBoard(LEVELS[k].rows); goal = targets(g);
  claims = new Int8Array(g.cells.length).fill(UNDECIDED); history = [];
  show = null; wrong = 0; peeks = 0; won = false;
  $('goal').innerHTML = `Level ${k + 1}. Best solution: <b>${LEVELS[k].par} flips</b>. Prove no solution uses fewer.`;
  msg('Pick a mirror you can prove must flip.');
  [...$('levels').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === k)));
  draw();
}

// What a claim set means for tracing: claimed mirrors are fixed, the rest undecided (light goes both ways).
const darkTargets = (d) => { const t = traceGhost(g, d); return goal.filter((i) => !t.lit.has(i)); };
const flipsClaimed = () => g.cells.filter((c, i) => isMirror(c) && claims[i] !== UNDECIDED && claims[i] !== c.rot).length;

function claim(i) {
  if (won || !isMirror(g.cells[i])) return;
  if (claims[i] !== UNDECIDED) { msg('Already settled. Use Undo to take a claim back.'); return; }
  const c = g.cells[i];
  const want = tool === 'flip' ? c.rot ^ 1 : c.rot; // the claimed state
  const test = claims.slice(); test[i] = want ^ 1;     // the opposite choice
  const dark = darkTargets(test);
  if (!dark.length) {
    wrong++;
    msg(`<span class="bad">Not proven.</span> If this mirror ${tool === 'flip' ? 'stayed' : 'flipped'}, light could still reach every target, given what's settled so far.`);
    show = null; draw(); score(); return;
  }
  history.push(claims.slice());
  claims[i] = want;
  show = { d: test, focus: i }; // evidence: the opposite choice, in ghost light
  const n = flipsClaimed(), par = LEVELS[lv].par;
  if (n >= par) {
    won = true;
    const real = claims.slice();
    g.cells.forEach((cc, j) => { if (isMirror(cc) && real[j] === UNDECIDED) real[j] = cc.rot; });
    const solves = goal.every((k) => traceGhost(g, real).litReal.has(k));
    msg(`<span class="good">Proven.</span> Every solution flips these ${n} mirrors, so none can use fewer than ${par}. `
      + (solves ? 'And flipping exactly these solves the puzzle, so the best is exactly ' + par + '.'
        : `A ${solve(g).moves}-flip solution exists, so the best is exactly ${par}.`));
    show = { d: real, focus: -1 };
    save();
  } else {
    msg(`<span class="good">Accepted.</span> Shown: if it ${tool === 'flip' ? 'stayed' : 'flipped'}, the crossed-out target `
      + `couldn't be reached by any light, even going both ways through unclaimed mirrors. Forced flips proven: ${n} of ${par}.`);
  }
  draw(); score();
}

function draw() {
  const css = canvas.getBoundingClientRect().width || 300, dpr = devicePixelRatio || 1;
  canvas.width = Math.round(css * dpr); canvas.height = Math.round(css * dpr * g.h / g.w);
  if (show) drawBoard(canvas, g, show.d, { focus: show.focus, fadeUnreached: false });
  else drawBoard(canvas, g, claims, { ghosts: false, fadeUnreached: false, focus: cursor });
}
function msg(h) { $('msg').innerHTML = h; }
function score() { $('score').textContent = `Wrong claims: ${wrong}. Peeks: ${peeks}.`; }
function save() {
  const best = JSON.parse(localStorage.getItem('prove-it') || '{}');
  const prev = best[lv];
  if (!prev || wrong + peeks < prev) best[lv] = wrong + peeks;
  localStorage.setItem('prove-it', JSON.stringify(best));
}

canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / r.width * g.w), y = Math.floor((e.clientY - r.top) / r.height * g.h);
  if (show && !won) { show = null; }
  claim(y * g.w + x);
});
let cursor = -1;
canvas.addEventListener('keydown', (e) => {
  const mv = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
  if (mv) {
    e.preventDefault(); if (cursor < 0) cursor = 0;
    const x = Math.min(g.w - 1, Math.max(0, cursor % g.w + mv[0])), y = Math.min(g.h - 1, Math.max(0, Math.floor(cursor / g.w) + mv[1]));
    cursor = y * g.w + x; show = won ? show : null; draw();
  } else if ((e.key === 'Enter' || e.key === ' ') && cursor >= 0) { e.preventDefault(); show = null; claim(cursor); }
  else if (e.key === 'f') setTool('flip'); else if (e.key === 's') setTool('stay');
});
function setTool(t) { tool = t; $('t-flip').setAttribute('aria-pressed', String(t === 'flip')); $('t-stay').setAttribute('aria-pressed', String(t === 'stay')); }
$('t-flip').onclick = () => setTool('flip');
$('t-stay').onclick = () => setTool('stay');
$('peek').onclick = () => { if (won) return; peeks++; show = { d: claims.slice(), focus: -1 }; msg('Ghost light given your claims (dashed: might be lit). Click the board to continue.'); draw(); score(); };
$('undo').onclick = () => { if (!history.length || won) return; claims = history.pop(); show = null; msg('Undone.'); draw(); };
$('restart').onclick = () => load(lv);
LEVELS.forEach((_, i) => { const b = document.createElement('button'); b.textContent = i + 1; b.onclick = () => load(i); $('levels').append(b); });
new ResizeObserver(() => g && draw()).observe(canvas);
load(0); score();
