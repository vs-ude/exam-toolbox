#!/usr/bin/bash
if [[ "x$CI_JOB_STATUS" == "xfailed" ]]; then
  echo "Job failure detected"
  echo ">>> Caddy Logs ========================"
  cat /tmp/caddy.log
  echo ">>> Frontend Logs ========================"
  cat /tmp/frontend.log
  echo ">>> Backend Logs ========================"
  cat /tmp/backend.log
fi
