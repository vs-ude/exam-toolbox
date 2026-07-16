#!/usr/bin/bash

err=0
backend_path="./backend/src/types/shared/"
frontend_path="./frontend/src/app/types/shared/"
for f in "$backend_path"*.ts; do
  target=$(echo "$f" | sed "s|$backend_path|$frontend_path|")
  # diff between the two files but strip '.ts' from imports in the backend path
  diff -q <(cat "$f" | sed 's|\(from\s*['\''"][^'\''"]*\)\.ts\(['\''\"]\)|\1\2|g') "$target" >/dev/null
  if [ $? -ne 0 ]; then
    echo ">>> Shared type $target not identical to $f."
    err=1
  fi
done

if [ $err -ne 0 ]; then
  echo "Run ./tools/copy_shared_types.sh to fix."
  exit 1
fi

echo "Shared types match."
