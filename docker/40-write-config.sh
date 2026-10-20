#!/bin/sh
# Genera config.js y los encabezados de seguridad de nginx (incluida la CSP).
# Si API_URL está definida se usa tal cual; si no, se deriva del host del navegador (puerto 8000).
set -e
TARGET=/usr/share/nginx/html/config.js
HEADERS=/etc/nginx/security-headers.inc

if [ -n "${API_URL}" ]; then
  echo "window.APP_CONFIG = { apiUrl: \"${API_URL}\" };" > "$TARGET"
  echo "config.js -> apiUrl=${API_URL}"
  # Sólo el origen (esquema://host[:puerto]): https://dominio/api → https://dominio
  API_ORIGIN=$(echo "${API_URL}" | sed -E 's#^(https?://[^/]+).*#\1#')
else
  echo 'window.APP_CONFIG = { apiUrl: `${location.protocol}//${location.hostname}:8000` };' > "$TARGET"
  echo "config.js -> apiUrl=<mismo host>:8000"
  # El host no se conoce de antemano (localhost, IP de la red local...): se permite cualquiera en el 8000.
  API_ORIGIN="http://*:8000 https://*:8000"
fi

# script-src 'self': ni scripts inline ni de terceros (la defensa principal ante un XSS).
# style-src 'unsafe-inline': los templates usan atributos style="..." con valores calculados.
CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' ${API_ORIGIN}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"

cat > "$HEADERS" <<EOF
add_header Content-Security-Policy "${CSP}" always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header X-Frame-Options DENY always;
EOF
echo "CSP -> connect-src 'self' ${API_ORIGIN}"
