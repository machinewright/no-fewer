// Like ladder-search.mjs, but keeps boards the claim rule alone CAN'T prove and one case split CAN (the "cases" task
// at scale). Usage: node bench/ladder-cases-search.mjs <size> <emitters> <turns> <decoys> <seeds>
import { generateWith } from '../src/generator.js';
import { parseBoard } from '../src/boards.js';
import { solve } from '../src/solver.js';
import { splits } from '../src/suppose.js';
import { deduceRounds, enc } from '../analyze.mjs';
const [size, em, turns, decoys, n] = process.argv.slice(2).map(Number);
const out = [];
for (let s = 1; s <= n; s++) {
  let r; try { r = generateWith(s * 7919 + size, { w: size, h: size, emitters: em, colors: 1, filters: 0, splitters: 0, turns, decoys, walls: Math.floor(size / 2) }); } catch { continue; }
  const rows = enc(r.puzzle), g = parseBoard(rows), sol = solve(g, { maxNodes: 3e6 });
  if (!sol || sol.exhausted || sol.moves == null) continue;
  const d = deduceRounds(g);
  if (d.flips >= sol.moves) continue;
  const sp = splits(g, sol.moves);
  if (sp.provable || !sp.good.length) continue;
  out.push({ seed: s, size, par: sol.moves, baseFlips: d.flips, mirrors: d.mirrors, goodSplits: sp.good.length, rows });
}
out.sort((a, b) => b.par - a.par || a.goodSplits - b.goodSplits);
for (const o of out.slice(0, 6)) console.log(JSON.stringify(o));
console.error(`${out.length} need exactly one split, of ${n}`);
