#!/bin/sh
# Genera config.js. Si API_URL está definida se usa tal cual; si no, se deriva del host del navegador.
set -e
TARGET=/usr/share/nginx/html/config.js
if [ -n "${API_URL}" ]; then
  echo "window.APP_CONFIG = { apiUrl: \"${API_URL}\" };" > "$TARGET"
  echo "config.js -> apiUrl=${API_URL}"
else
  echo 'window.APP_CONFIG = { apiUrl: `${location.protocol}//${location.hostname}:8000` };' > "$TARGET"
  echo "config.js -> apiUrl=<mismo host>:8000"
fi
