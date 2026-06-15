#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-mail-logs-export-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

copy_if_exists() {
  local src="$1"
  local dst="$2"
  if [[ -f "$src" ]]; then
    cp "$src" "$dst"
  fi
}

mkdir -p "$OUT_DIR/logs"

# Known mail log files
for f in logs/create-doctors-*.log logs/reset-resend-*.log logs/mail-audit.csv; do
  for real in $f; do
    [[ -e "$real" ]] || continue
    cp "$real" "$OUT_DIR/logs/"
  done
done

# Optional local rendered previews
for f in mail_*.html logs/welcome-mail-test-preview.html; do
  for real in $f; do
    [[ -e "$real" ]] || continue
    cp "$real" "$OUT_DIR/"
  done
done

# Quick summary helpers
{
  echo "Generated at: $(date -Is)"
  echo "Host: $(hostname)"
  echo "PWD: $(pwd)"
  echo "---"
  echo "Files exported:"
  find "$OUT_DIR" -maxdepth 3 -type f | sort
} > "$OUT_DIR/README.txt"

if [[ -f "$OUT_DIR/logs/mail-audit.csv" ]]; then
  {
    echo "timestamp,script,status,to,username,messageId"
    tail -n +2 "$OUT_DIR/logs/mail-audit.csv" | awk -F',' '{print $1","$2","$3","$4","$5","$6}'
  } > "$OUT_DIR/mail-audit-summary.csv"
fi

tar -czf "${OUT_DIR}.tar.gz" "$OUT_DIR"

echo "Export done: ${OUT_DIR}.tar.gz"
