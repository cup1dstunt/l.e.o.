# L.E.O. Prototyp: baut die Browser-App und liefert sie mit nginx aus.
# Build-Kontext ist das Repo-Wurzelverzeichnis (wegen design/tokens.css).
FROM node:22-alpine AS bau
WORKDIR /repo/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY design /repo/design
COPY docs/testfaelle /repo/docs/testfaelle
COPY app ./
RUN npm test && npm run build

FROM nginx:1.27-alpine
# Vorlage statt fester Datei: WebUntis-Server und DNS werden beim Start eingesetzt (V11)
ENV UNTIS_SERVER=osz-lus.webuntis.com \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY app/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=bau /repo/app/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
