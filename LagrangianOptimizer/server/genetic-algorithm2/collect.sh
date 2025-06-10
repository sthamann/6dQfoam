#!/usr/bin/env bash
# sammelt .ts, .tsx, .js und .html in eine Datei "output"

base="$(cd "$(dirname "$0")" && pwd)"   # Ordner, in dem das Script liegt
out="$base/output"                      # Ziel­datei

: > "$out"                              # leert bzw. erstellt "output"

# findet alle relevanten Dateien unterhalb von $base
find "$base" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.html' \) |
while IFS= read -r file; do
  rel="${file#$base/}"                  # relativer Pfad
  printf '### /%s ###\n' "$rel"   >> "$out"
  cat "$file"                     >> "$out"
  printf '\n\n'                   >> "$out"
done
