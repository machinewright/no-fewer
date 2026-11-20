# Prove it (prototype)

A puzzle where you don't solve the board: you prove that its best solution can't be beaten, by claiming mirrors
that must flip or must stay. A claim is accepted only if the opposite choice leaves a target unreachable even in
"ghost light" (every unclaimed mirror sends light both ways). Follow-up idea to the essay in ../proving-par.

Status: 5-level prototype to test whether the core loop is fun. Not published.
- Play: `python3 -m http.server 8772`, then open http://localhost:8772/
- `pick.mjs` picks levels whose par is provable by chained deduction (1–3 rounds).
- src/ engine, solver, ghost tracer, renderer: copied from proving-par.
