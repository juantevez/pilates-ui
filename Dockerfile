# Rama estable de nginx (número par). apk upgrade aplica los parches de Alpine publicados
# después de la imagen base.
FROM nginx:1.30-alpine

RUN apk upgrade --no-cache

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-write-config.sh /docker-entrypoint.d/40-write-config.sh
COPY index.html config.js /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY fonts /usr/share/nginx/html/fonts

RUN chmod +x /docker-entrypoint.d/40-write-config.sh \
    && chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80
