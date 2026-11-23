// Re-scores every transcript in out/<model>-<agent>/<task>-<level>.txt with the current checker, joined with the
// run's exit code and time from results.jsonl (latest run wins). Prints a table and writes scores.json.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { check, checkCases } from './tasks.mjs';
const runs = new Map();
for (const l of readFileSync('results.jsonl', 'utf8').trim().split('\n')) {
  let r; try { r = JSON.parse(l); } catch { continue; } // a stray partial line must not stop the rescore
  runs.set(`${r.model}-${r.agent || 'build'}/${r.task}-${r.level}${(r.rep ?? 1) > 1 ? '.r' + r.rep : ''}`, r);
}
const rows = [];
for (const dir of readdirSync('out')) for (const f of readdirSync(`out/${dir}`)) {
  const m = f.match(/^(solve|prove|cases)-(\d+)(?:\.r(\d+))?\.txt$/); if (!m) continue;
  const rep = +(m[3] ?? 1), key = `${dir}/${m[1]}-${m[2]}${rep > 1 ? '.r' + rep : ''}`, run = runs.get(key); if (!run) continue; // still running
  const text = readFileSync(`out/${key}.txt`, 'utf8');
  // Claude runs keep the CLI's JSON next to the transcript; a run the API ended with a safety stop, or
  // whose answer says it was withheld after one, is not scored. (A stop followed by a complete answer is scored.)
  const meta = existsSync(`out/${key}.txt.json`) ? (() => { try { return JSON.parse(readFileSync(`out/${key}.txt.json`, 'utf8')); } catch { return {}; } })() : {};
  const stopped = meta.is_error === true || meta.stop_reason === 'refusal' || /stopped by a safety classifier/.test(text);
  const infra = stopped || /Upstream request failed|exceeded its monthly spending cap|rate limit|can't respond to this message with/i.test(text);
  const body = text.replace(/\x1b\[[0-9;]*m/g, '').replace(/^\s*> \S+ · \S+\s*/m, '').trim();
  // An empty transcript means no answer arrived: on 2026-11-21 the OpenCode Go weekly limit was hit and runs hung
  // silently until the timeout. Those are not scored (noanswer), only rerun.
  const noanswer = body.length < 5;
  const res = noanswer ? { ok: false, why: 'no answer received (not scored)' } : m[1] === 'cases' ? checkCases(+m[2] - 1, text) : check(m[1], +m[2] - 1, text);
  rows.push({ model: run.model, agent: run.agent || 'build', task: m[1], level: +m[2], rep, sec: run.sec, timeout: run.exit === 124, infra, noanswer, ...res });
}
rows.sort((a, b) => a.model.localeCompare(b.model) || a.agent.localeCompare(b.agent) || a.task.localeCompare(b.task) || a.level - b.level || a.rep - b.rep);
writeFileSync('scores.json', JSON.stringify(rows, null, 1));
for (const r of rows) console.log(`${r.model.padEnd(16)} ${r.agent.padEnd(6)} ${r.task} ${String(r.level).padStart(3)}${r.rep > 1 ? '.r' + r.rep : '   '} ${r.infra ? 'INFRA' : r.noanswer ? '---  ' : r.ok ? 'ok   ' : 'FAIL '} ${String(r.sec).padStart(4)}s ${r.timeout ? 'timeout ' : ''}${r.why || ''}`);
