// Level analysis for Prove it: per deduction round, how many flips/stays become provable.
import { generateWith, paramsFor } from './src/generator.js';
import { deduceRounds } from './src/deduce.js';
export { deduceRounds };
import { enc } from './src/encode.js';
export { enc };
if (import.meta.url === `file://${process.argv[1]}`) {
  const L = +process.argv[2], N = +(process.argv[3] || 60);
  for (let s = 1; s <= N; s++) {
    const p = { ...paramsFor(L), colors: 1, filters: 0, splitters: 0 };
    let r; try { r = generateWith(s * 13 + L, p); } catch { continue; }
    const x = deduceRounds(r.puzzle);
    if (x.flips !== r.par) continue;
    console.log(JSON.stringify({ seed: s * 13 + L, par: r.par, m: x.mirrors, R: x.rounds.map((q) => `${q.flips}f${q.stays}s`).join(' '), rows: enc(r.puzzle) }));
  }
}
