// Proof by cases ("Suppose"), as the player does it. Pick an open mirror m; in each case (m stays, m flips) run the
// round rule with m settled. A case is closed when some target gets no light even in ghost light (that case can't
// happen), or when it forces at least par flips. If both cases close, every solution needs at least par flips.
// Pure; runs in node and browsers.
import { traceGhost } from './ghost.js';
import { targets } from './engine.js';

const mirrorsOf = (g) => g.cells.map((c, i) => (c.type === 'mirror' ? i : -1)).filter((i) => i >= 0);
export const flipsOf = (g, d) => mirrorsOf(g).filter((i) => d[i] !== -1 && d[i] !== g.cells[i].rot).length;

// Iterates the round rule from `d0`. Returns { d, claims: [[cell, value]...], rounds } or { dead: true, claims } when
// a target goes dark (the claims made up to that point are kept, so a play-through can replay them).
export function closure(g, d0) {
  const goal = targets(g), mirrors = mirrorsOf(g), d = d0.slice(), claims = [];
  const dark = (dd) => { const t = traceGhost(g, dd); return goal.some((k) => !t.lit.has(k)); };
  if (dark(d)) return { dead: true, claims, rounds: 0 };
  for (let rounds = 0; ; rounds++) {
    const found = [];
    for (const i of mirrors) if (d[i] === -1) for (const v of [0, 1]) {
      const dd = d.slice(); dd[i] = v; if (dark(dd)) found.push([i, v ^ 1]);
    }
    if (!found.length) return { d, claims, rounds };
    for (const [i, v] of found) {
      if (d[i] !== -1 && d[i] !== v) return { dead: true, claims, rounds: rounds + 1 }; // both ways dark
      if (d[i] === -1) { d[i] = v; claims.push([i, v]); }
    }
    if (dark(d)) return { dead: true, claims, rounds: rounds + 1 };
  }
}

// For a board the round rule can't prove: every mirror whose case split (after the base rounds) closes both cases.
export function splits(g, par) {
  const base = closure(g, new Int8Array(g.cells.length).fill(-1));
  if (base.dead) return { base, provable: true, good: [] };
  if (flipsOf(g, base.d) >= par) return { base, provable: true, good: [] };
  const good = [];
  for (const m of mirrorsOf(g)) {
    if (base.d[m] !== -1) continue;
    const cases = [g.cells[m].rot, g.cells[m].rot ^ 1].map((v) => {
      const dd = base.d.slice(); dd[m] = v; const c = closure(g, dd);
      return { v, ...c, flips: c.dead ? Infinity : flipsOf(g, c.d) };
    });
    if (cases.every((c) => c.flips >= par)) good.push({ m, cases });
  }
  return { base, provable: false, good };
}
