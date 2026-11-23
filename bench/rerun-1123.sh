#!/usr/bin/env bash
# 2026-11-23: rerun cells left unscored by the OpenCode weekly limit, plus the big ladder for two models.
# One model per background chain; models run in parallel. Stops a chain if the usage limit shows up again.
cd "$(dirname "$0")"
LOG=~/.local/share/opencode/log/opencode.log
chain() { m=$1; shift
  for cell in "$@"; do task=${cell%:*}; lv=${cell#*:}
    before=$(grep -c "usage limit reached" "$LOG")
    TIMEOUT=$([ "$task" = prove ] && echo 2400 || echo 900) AGENT=plain ./run.sh "$m" "$task" "$lv"
    after=$(grep -c "usage limit reached" "$LOG")
    [ "$after" -gt "$before" ] && { echo "$m: usage limit hit, stopping"; return; }
  done; }
chain deepseek-v4-pro prove:5 prove:12 prove:14 prove:17 solve:101 solve:102 solve:103 prove:101 prove:102 prove:103 > $HOME/work/tmp/rr/rr-deepseek.log 2>&1 &
chain glm-5.3 solve:12 solve:14 solve:17 prove:3 prove:5 prove:9 prove:12 prove:14 prove:17 > $HOME/work/tmp/rr/rr-glm.log 2>&1 &
chain grok-4.7 solve:3 solve:5 solve:9 > $HOME/work/tmp/rr/rr-grok.log 2>&1 &
chain kimi-k3.1-pro prove:14 prove:17 solve:101 solve:102 solve:103 prove:101 prove:102 prove:103 > $HOME/work/tmp/rr/rr-kimi.log 2>&1 &
chain qwen4-max prove:5 prove:9 prove:12 prove:14 prove:17 > $HOME/work/tmp/rr/rr-qwen.log 2>&1 &
wait
echo all done
