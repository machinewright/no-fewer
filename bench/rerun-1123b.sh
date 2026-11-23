#!/usr/bin/env bash
# 2026-11-23 (2): resumable rerun of cells still unscored after the 5-hour OpenCode window ran out.
# A cell counts as done when its output file exists and is >= 200 bytes (limit-hit runs leave ~30-byte files).
# Two chains only (five at once drained the 5-hour window in 30 minutes). A chain stops when the limit shows up.
cd "$(dirname "$0")"
LOG=~/.local/share/opencode/log/opencode.log
done_cell() { f="out/$1-plain/$2-$3.txt"; [ -f "$f" ] && [ "$(stat -c %s "$f")" -ge 200 ]; }
chain() { for cell in "$@"; do m=${cell%%:*}; rest=${cell#*:}; task=${rest%:*}; lv=${rest#*:}
    done_cell "$m" "$task" "$lv" && continue
    before=$(grep -c "usage limit reached" "$LOG")
    TIMEOUT=$([ "$task" = prove ] && echo 2400 || echo 900) AGENT=plain ./run.sh "$m" "$task" "$lv"
    after=$(grep -c "usage limit reached" "$LOG")
    [ "$after" -gt "$before" ] && { echo "$m: usage limit hit, stopping chain"; return; }
  done; }
A="glm-5.3:solve:14 glm-5.3:solve:17 glm-5.3:prove:3 glm-5.3:prove:5 glm-5.3:prove:9 glm-5.3:prove:12 glm-5.3:prove:14 glm-5.3:prove:17
   grok-4.7:solve:12 grok-4.7:solve:14 grok-4.7:solve:17 grok-4.7:prove:3 grok-4.7:prove:5 grok-4.7:prove:9 grok-4.7:prove:12 grok-4.7:prove:14 grok-4.7:prove:17"
B="deepseek-v4-pro:prove:14 deepseek-v4-pro:prove:17 kimi-k3.1-pro:prove:14 qwen4-max:prove:17
   kimi-k3.1-pro:prove:102 kimi-k3.1-pro:prove:103 deepseek-v4-pro:solve:101 deepseek-v4-pro:solve:102 deepseek-v4-pro:solve:103
   deepseek-v4-pro:prove:101 deepseek-v4-pro:prove:102 deepseek-v4-pro:prove:103"
mkdir -p ~/work/tmp/rr
chain $A > ~/work/tmp/rr/rrb-A.log 2>&1 &
chain $B > ~/work/tmp/rr/rrb-B.log 2>&1 &
wait; echo "all done $(date -u)"
