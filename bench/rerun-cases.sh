#!/usr/bin/env bash
# 2026-11-23: the "cases" task (one case split) for the OpenCode models. Waits for bench-rerun-1123c to finish,
# then two chains (the 5-hour window can't take more). Resumable: a cell counts as done when its output is >= 200 bytes.
cd "$(dirname "$0")"
while systemctl --user is-active --quiet bench-rerun-1123c; do sleep 120; done
LOG=~/.local/share/opencode/log/opencode.log
done_cell() { f="out/$1-plain/$2-$3.txt"; [ -f "$f" ] && [ "$(stat -c %s "$f")" -ge 200 ]; }
chain() { for cell in "$@"; do m=${cell%%:*}; lv=${cell#*:}
    done_cell "$m" cases "$lv" && continue
    before=$(grep -c "usage limit reached" "$LOG")
    TIMEOUT=1500 AGENT=plain ./run.sh "$m" cases "$lv"
    after=$(grep -c "usage limit reached" "$LOG")
    [ "$after" -gt "$before" ] && { echo "$m: usage limit hit, stopping chain"; return; }
  done; }
A=""; B=""
for lv in 23 24 25 26 27 28 111 112 113 114; do A="$A deepseek-v4-pro:$lv"; done
for lv in 23 24 25 26 27 28; do B="$B grok-4.7:$lv qwen4-max:$lv kimi-k3.1-pro:$lv"; done
chain $A > ~/work/tmp/rr/cases-A.log 2>&1 &
chain $B > ~/work/tmp/rr/cases-B.log 2>&1 &
wait; echo "cases done $(date -u)"
