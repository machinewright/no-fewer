#!/usr/bin/env bash
# chain.sh <model> <levels...>: no-tools solve then prove on each level, one model, sequentially.
cd "$(dirname "$0")"; m=$1; shift
AGENT=plain ./run.sh "$m" solve "$@"; AGENT=plain ./run.sh "$m" prove "$@"
