import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/puzzles.js';
import { parseBoard } from '../src/boards.js';
import { solve } from '../src/solver.js';
import { proofFor } from './sequence.mjs';
test('every level: par is the exact minimum and greedy deduction proves it', () => {
  for (const [k, l] of LEVELS.entries()) {
    const g = parseBoard(l.rows);
    assert.equal(solve(g).moves, l.par, `level ${k + 1} par`);
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
