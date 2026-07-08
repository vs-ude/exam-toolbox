#!/usr/bin/bash

wait_on_start () {
  name=$1
  port=$2
  path=${3:-/}
  counter=0
  while ! curl -s http://localhost:$port$path >/dev/null; do
    sleep 1
    counter=$((counter+1))
    if [ $counter -eq 50 ]; then
      printf "%s didn't start\n" "$name"
      exit 1
    fi
  done
  printf "%s is online\n" "$name"
}

LOG_FOLDER=${CI_PROJECT_DIR}/.logs/
mkdir -p ${LOG_FOLDER}

export NO_COLOR=1 # make the logs readable
bash -c 'cd backend && deno task start' > ${LOG_FOLDER}/backend.log 2>&1 &
bash -c 'cd frontend && deno run ng serve --watch false --live-reload false' > ${LOG_FOLDER}/frontend.log 2>&1 &
caddy run --config .ci/e2e/Caddyfile --adapter caddyfile 2>/dev/null &

wait_on_start "backend" 3000 "/api/health"
wait_on_start "frontend" 4200 "/"
wait_on_start "caddy-backend" 80 "/api/health"
wait_on_start "caddy-frontend" 80 "/"
