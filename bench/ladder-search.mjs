// Searches for bigger one-colour boards (mirrors, walls, lamps, targets only) whose par the claim rule alone proves,
// for the scaling ladder. Usage: node bench/ladder-search.mjs <size> <emitters> <turns> <decoys> <seeds>
import { generateWith } from '../src/generator.js';
import { parseBoard } from '../src/boards.js';
import { solve } from '../src/solver.js';
import { deduceRounds, enc } from '../analyze.mjs';
const [size, em, turns, decoys, n] = process.argv.slice(2).map(Number);
const out = [];
for (let s = 1; s <= n; s++) {
  let r; try { r = generateWith(s * 7919 + size, { w: size, h: size, emitters: em, colors: 1, filters: 0, splitters: 0, turns, decoys, walls: Math.floor(size / 2) }); } catch { continue; }
  const rows = enc(r.puzzle), g = parseBoard(rows), sol = solve(g, { maxNodes: 3e6 });
  if (!sol || sol.exhausted || sol.moves == null) continue;
  const d = deduceRounds(g);
  if (d.flips !== sol.moves) continue;
  out.push({ seed: s, size, par: sol.moves, mirrors: d.mirrors, rounds: d.rounds.length, rows });
}
out.sort((a, b) => b.par - a.par || b.mirrors - a.mirrors);
for (const o of out.slice(0, 6)) console.log(JSON.stringify(o));
console.error(`${out.length} provable of ${n}`);
