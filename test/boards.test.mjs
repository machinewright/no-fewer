import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateWith, paramsFor } from '../src/generator.js';
import { parseBoard } from '../src/boards.js';
import { enc } from '../analyze.mjs';
test('enc/parseBoard round-trip, two colors and filters', () => {
  for (let s = 1; s <= 40; s++) {
    let r; try { r = generateWith(s, { ...paramsFor(13), colors: 2, filters: 1, splitters: 0 }); } catch { continue; }
    const g = parseBoard(enc(r.puzzle));
    r.puzzle.cells.forEach((c, i) => {
      const d = g.cells[i];
      assert.equal(d.type, c.type);
      if (c.type === 'mirror') assert.equal(d.rot, c.rot);
      if (c.type === 'emitter') assert.equal(d.dir, c.dir);
      if (['emitter', 'target', 'filter'].includes(c.type)) assert.equal(d.color ?? 0, c.color ?? 0);
      assert.ok(!c.fixed);
    });
  }
});
