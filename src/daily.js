// The daily puzzle: the same board for everyone on a given date, harder through the week (Monday gentle, Sunday
// hardest, with two colors and a filter). A candidate is accepted only if its par is the solver's exact minimum (the
// generator computes it) and the player's rule proves it: iterated ghost deduction forces exactly par flips, over at
// least two rounds, so the day's board always needs a chain of reasoning.
import { generateWith, paramsFor, hashString, dateKey } from './generator.js';
import { deduceRounds } from './deduce.js';
import { enc } from './encode.js';

const PLAN = [ // indexed by getDay(): 0 = Sunday
  { name: 'Sunday challenge', level: 13, colors: 2, filters: 1 },
  { name: 'gentle', level: 6, colors: 1, filters: 0 },
  { name: 'easy', level: 8, colors: 1, filters: 0 },
  { name: 'medium', level: 10, colors: 1, filters: 0 },
  { name: 'medium', level: 11, colors: 1, filters: 0 },
  { name: 'tricky', level: 12, colors: 2, filters: 0 },
  { name: 'hard', level: 13, colors: 1, filters: 0 },
];

export function daily(date = new Date()) {
  const key = dateKey(date), plan = PLAN[date.getDay()], base = hashString('no-fewer-daily-' + key);
  for (let k = 0; k < 400; k++) {
    const seed = (base + k * 7919) >>> 0;
    let r; try { r = generateWith(seed, { ...paramsFor(plan.level), colors: plan.colors, filters: plan.filters, splitters: 0 }); } catch { continue; }
    if (r.par < 3 || r.par > 12) continue;
    const d = deduceRounds(r.puzzle);
    if (d.flips !== r.par || d.rounds.length < 2) continue;
    return { key, name: plan.name, par: r.par, rows: enc(r.puzzle), tries: k + 1 };
  }
  return null; // never seen in tests; the game falls back to the level list
}
