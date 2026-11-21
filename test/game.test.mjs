import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/puzzles.js';
import { parseBoard } from '../src/boards.js';
import { solve } from '../src/solver.js';
import { proofFor } from './sequence.mjs';
import { splits, closure, flipsOf } from '../src/suppose.js';
import { traceGhost } from '../src/ghost.js';
import { targets } from '../src/engine.js';
import { generateWith, paramsFor } from '../src/generator.js';
import { enc } from '../src/encode.js';
test('every level: par is the exact minimum and greedy deduction proves it', () => {
  for (const [k, l] of LEVELS.entries()) {
    const g = parseBoard(l.rows);
    assert.equal(solve(g).moves, l.par, `level ${k + 1} par`);
    if (l.cases) {
      const sp = splits(g, l.par);
      assert.ok(!sp.provable && sp.good.length, `level ${k + 1}: needs and has a proof by cases`);
      const real = g.cells.map((c) => c.rot ?? -1); for (const j of l.sol) real[j] ^= 1;
      assert.equal(l.sol.length, l.par);
      assert.ok(targets(g).every((t) => traceGhost(g, Int8Array.from(real)).litReal.has(t)), `level ${k + 1}: sol solves`);
      continue;
    }
    const p = proofFor(l.rows);
    const flips = p.claims.filter(([, t]) => t === 'flip').length;
    assert.equal(flips, l.par, `level ${k + 1} provable`);
  }
});

import { daily } from '../src/daily.js';
test('daily: a provable board every day for a year, the same board for the same date', () => {
  const start = new Date(2026, 10, 1);
  for (let i = 0; i < 365; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const r = daily(d);
    assert.ok(r, `no daily for ${d}`);
    const g = parseBoard(r.rows);
    if (i % 7 === 0) assert.equal(solve(g).moves, r.par, `daily ${r.key} par`); // the slow check, weekly
    const p = proofFor(r.rows);
    assert.equal(p.claims.filter(([, t]) => t === 'flip').length, r.par, `daily ${r.key} provable`);
  }
  assert.deepEqual(daily(new Date(2026, 10, 21, 8)), daily(new Date(2026, 10, 21, 23)));
});

test('proof by cases is sound: the bound it proves never exceeds the exact minimum', () => {
  let checked = 0;
  for (let seed = 1; seed <= 40; seed++) for (const L of [4, 6, 9]) {
    const g = parseBoard(enc(generateWith(seed, { ...paramsFor(L), colors: 1, filters: 0, splitters: 0 }).puzzle));
    const par = solve(g).moves, base = closure(g, new Int8Array(g.cells.length).fill(-1));
    assert.ok(!base.dead && flipsOf(g, base.d) <= par);
    g.cells.forEach((c, m) => {
      if (c.type !== 'mirror' || base.d[m] !== -1) return;
      const lb = Math.min(...[0, 1].map((v) => { const dd = base.d.slice(); dd[m] = v; const r = closure(g, dd); return r.dead ? Infinity : flipsOf(g, r.d); }));
      assert.ok(lb <= par, `seed ${seed} L${L} mirror ${m}: cases prove ${lb} > par ${par}`); checked++;
    });
  }
  assert.ok(checked > 300);
});
