#!/usr/bin/env bash
# 2026-11-25 Claude batch: Sonnet on the remaining big case-split boards (112 again as rep 2, its first run hit the cost
# cap), then repeat runs of the small case boards for Sonnet and Opus. Worst case ~$10.
cd "$(dirname "$0")"; export SKIPDONE=1 TIMEOUT=1800
MAXUSD=2.5 ./run-claude.sh claude-sonnet-5-5 cases 113 114
REP=2 MAXUSD=2.5 ./run-claude.sh claude-sonnet-5-5 cases 112
for m in claude-sonnet-5-5 claude-opus-5-5; do REP=2 MAXUSD=1 ./run-claude.sh $m cases 23 24 25 26 27 28; done
echo "batch done $(date -u)"
