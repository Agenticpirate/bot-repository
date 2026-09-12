#!/bin/bash
# Appends the daily order export to orders.csv.
# usage: import_orders.sh <daily_export.csv>
set -euo pipefail
tail -n +2 "$1" >> "$(dirname "$0")/../orders.csv"
echo "imported $(($(wc -l < "$1") - 1)) rows from $1"
