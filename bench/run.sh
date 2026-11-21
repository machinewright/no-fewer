#!/usr/bin/env bash
# run.sh <model> <task> <level>...: runs each prompt through an OpenCode Go model in an empty folder (so it can't read
# the solver or the levels) and checks the answer. Output: bench/out/<model>/<task>-<level>.txt and results.jsonl.
set -uo pipefail
cd "$(dirname "$0")"; source ~/.nvm/nvm.sh >/dev/null 2>&1
model=$1; task=$2; shift 2
agent=${AGENT:-build}; empty=$HOME/work/tmp/bench-${AGENT:-empty}; mkdir -p "$empty" "out/$model-$agent"
for lv in "$@"; do
  f="out/$model-$agent/$task-$lv.txt"; t0=$(date +%s)
  timeout 900 opencode run --dir "$empty" --agent "$agent" -m "opencode-go/$model" "$(node tasks.mjs prompt "$task" "$lv")" > "$f" 2>&1
  code=$?; t1=$(date +%s)
  r=$(node tasks.mjs check "$task" "$lv" "$f")
  echo "{\"model\":\"$model\",\"agent\":\"$agent\",\"task\":\"$task\",\"level\":$lv,\"exit\":$code,\"sec\":$((t1-t0)),\"result\":$r}" | tee -a results.jsonl
done
