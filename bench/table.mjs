// Builds the results tables for index.html from scores.json (run `node rescore.mjs` first) and writes them between
// the <!--table:NAME--> ... <!--/table:NAME--> markers. Cells are passed / scored runs; repeat runs all count.
// Runs that got no answer (usage limits) or that the API stopped (safety stop) are not scored; they're counted apart.
import { readFileSync, writeFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync('scores.json', 'utf8')).filter((r) => r.agent === 'plain');
const GAME = [3, 5, 9, 12, 14, 17], BIG = [101, 102, 103, 104, 105, 106], SMALLC = [23, 24, 25, 26, 27, 28], BIGC = [111, 112, 113, 114];
const COLS = {
  main: [['solve', GAME, 'solve, game'], ['prove', GAME, 'prove, game'], ['solve', BIG, 'solve, big'], ['prove', BIG, 'prove, big']],
  cases: [['cases', SMALLC, 'cases, small'], ['cases', BIGC, 'cases, big']],
};
const ORDER = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'grok-4.7', 'qwen4-max', 'kimi-k3.1-pro', 'deepseek-v4-pro', 'glm-5.3', 'gpt-6-luna'];
export function cell(model, task, levels) {
  const rs = rows.filter((r) => r.model === model && r.task === task && levels.includes(r.level));
  const scored = rs.filter((r) => !r.infra && !r.noanswer);
  return { pass: scored.filter((r) => r.ok).length, n: scored.length, unscored: rs.length - scored.length };
}
function table(name) {
  const cols = COLS[name], out = ['<table>', '<thead><tr><th>model</th>' + cols.map((c) => `<th>${c[2]}</th>`).join('') + '</tr></thead><tbody>'];
  for (const m of ORDER) {
    const cs = cols.map(([t, lv]) => cell(m, t, lv));
    if (!cs.some((c) => c.n)) continue;
    out.push(`<tr><th>${m}</th>` + cs.map((c) => `<td>${c.n ? `${c.pass}/${c.n}` : ''}</td>`).join('') + '</tr>');
  }
  out.push('</tbody></table>'); return '<div class="tablewrap">' + out.join('\n') + '</div>';
}
if (import.meta.url === `file://${process.argv[1]}`) {
  let html = readFileSync('index.html', 'utf8');
  for (const name of Object.keys(COLS)) {
    html = html.replace(new RegExp(`(<!--table:${name}-->)[\\s\\S]*?(<!--/table:${name}-->)`), `$1\n${table(name)}\n$2`);
    console.log(table(name));
  }
  writeFileSync('index.html', html);
}
