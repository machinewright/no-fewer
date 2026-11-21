// Re-scores every transcript in out/<model>-<agent>/<task>-<level>.txt with the current checker, joined with the
// run's exit code and time from results.jsonl (latest run wins). Prints a table and writes scores.json.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { check } from './tasks.mjs';
const runs = new Map();
for (const l of readFileSync('results.jsonl', 'utf8').trim().split('\n')) {
  const r = JSON.parse(l); runs.set(`${r.model}-${r.agent || 'build'}/${r.task}-${r.level}`, r);
}
const rows = [];
for (const dir of readdirSync('out')) for (const f of readdirSync(`out/${dir}`)) {
  const m = f.match(/^(solve|prove)-(\d+)\.txt$/); if (!m) continue;
  const key = `${dir}/${m[1]}-${m[2]}`, run = runs.get(key); if (!run) continue; // still running
  const text = readFileSync(`out/${key}.txt`, 'utf8');
  const infra = /Upstream request failed|exceeded its monthly spending cap|rate limit/i.test(text);
  const body = text.replace(/\x1b\[[0-9;]*m/g, '').replace(/^\s*> \S+ · \S+\s*/m, '').trim();
  // An empty transcript means no answer arrived: on 2026-11-21 the OpenCode Go weekly limit was hit and runs hung
  // silently until the timeout. Those are not scored (noanswer), only rerun.
  const noanswer = body.length < 5;
  const res = noanswer ? { ok: false, why: 'no answer received (not scored)' } : check(m[1], +m[2] - 1, text);
  rows.push({ model: run.model, agent: run.agent || 'build', task: m[1], level: +m[2], sec: run.sec, timeout: run.exit === 124, infra, noanswer, ...res });
}
rows.sort((a, b) => a.model.localeCompare(b.model) || a.agent.localeCompare(b.agent) || a.task.localeCompare(b.task) || a.level - b.level);
writeFileSync('scores.json', JSON.stringify(rows, null, 1));
for (const r of rows) console.log(`${r.model.padEnd(16)} ${r.agent.padEnd(6)} ${r.task} ${String(r.level).padStart(2)} ${r.infra ? 'INFRA' : r.noanswer ? '---  ' : r.ok ? 'ok   ' : 'FAIL '} ${String(r.sec).padStart(4)}s ${r.timeout ? 'timeout ' : ''}${r.why || ''}`);
