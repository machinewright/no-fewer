#!/usr/bin/env bash
# 2026-11-24 Claude batch (resumable, SKIPDONE): Opus on the big cases boards, then repeat runs r2/r3 of the small
# cases boards for all three models, then a second Opus pass on the big solve/prove ladder. Budget: ~$15 total.
cd "$(dirname "$0")"; export SKIPDONE=1 TIMEOUT=1500
MAXUSD=2 ./run-claude.sh claude-opus-5-5 cases 111 112 113 114
for r in 2 3; do for m in claude-haiku-5-5 claude-opus-5-5 claude-sonnet-5-5; do
  REP=$r MAXUSD=1.5 ./run-claude.sh $m cases 23 24 25 26 27 28; done; done
for t in solve prove; do REP=2 MAXUSD=2 ./run-claude.sh claude-opus-5-5 $t 101 102 103 104 105 106; done
echo "batch done $(date -u)"
