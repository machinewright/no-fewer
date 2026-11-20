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
