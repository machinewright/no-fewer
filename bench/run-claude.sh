#!/usr/bin/env bash
# run-claude.sh <model> <task> <level>...: the same prompts through a Claude model with every tool switched off
# (reasoning only, the "plain" condition), in an empty folder, no user settings or memory. Appends to results.jsonl
# with agent "plain"; transcripts in out/<model>-plain/, raw JSON (cost, turns) next to them.
set -uo pipefail
cd "$(dirname "$0")"; source ~/.nvm/nvm.sh >/dev/null 2>&1
model=$1; task=$2; shift 2
empty=$HOME/work/tmp/bench-claude; mkdir -p "$empty" "out/$model-plain"; here=$PWD
for lv in "$@"; do
  f="$here/out/$model-plain/$task-$lv.txt"; t0=$(date +%s)
  prompt=$(node tasks.mjs prompt "$task" "$lv")
  (cd "$empty" && timeout ${TIMEOUT:-900} claude -p "$prompt" --model "$model" --tools "" --strict-mcp-config \
     --setting-sources "" --system-prompt "You are a careful puzzle solver. Answer the task you are given." \
     --max-budget-usd ${MAXUSD:-1.5} --output-format json < /dev/null > "$f.json" 2> "$f.err")
  code=$?; t1=$(date +%s)
  node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(j.result??""))' "$f.json" > "$f" 2>/dev/null
  cost=$(node -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(j.total_cost_usd??null)}catch{console.log(null)}' "$f.json")
  r=$(node tasks.mjs check "$task" "$lv" "$f")
  echo "{\"model\":\"$model\",\"agent\":\"plain\",\"task\":\"$task\",\"level\":$lv,\"exit\":$code,\"sec\":$((t1-t0)),\"limit\":${TIMEOUT:-900},\"usd\":$cost,\"result\":$r}" | tee -a results.jsonl
done
