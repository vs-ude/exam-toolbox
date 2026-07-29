#!/usr/bin/bash

backend_path="./backend/src/types/shared/"
frontend_path="./frontend/src/app/types/shared/"

read -p "This will overwrite the files in $frontend_path. Do you want to proceed? y/N " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborting."
    exit 1
fi

for f in "$backend_path"*.ts; do
  target=$(echo "$f" | sed "s|$backend_path|$frontend_path|")
  # strip '.ts' from imports in the backend path since the frontend compiles to js
  processed=$(cat $f | sed 's|\(from\s*['\''"][^'\''"]*\)\.ts\(['\''\"]\)|\1\2|g')
  diff_output=$(diff "$target" <(echo "$processed"))
  if [ -n "$diff_output" ]; then
    echo "Differences found in ${f#$backend_path}:"
    echo "$diff_output"
    echo "Copying $f to $target"
    echo "$processed" > "$target"
  fi
done

echo "Done."
