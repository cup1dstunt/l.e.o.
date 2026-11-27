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
# Node nur für den kleinen Abgleich-Dienst (F4), der nginx reicht /abgleich/ an ihn durch
RUN apk add --no-cache nodejs
# Vorlage statt fester Datei: WebUntis-Server und DNS werden beim Start eingesetzt (V11)
# ISERV_SERVER: Adresse des Schul-IServ ohne https://, voreingestellt für das OSZ (E120), leer = IServ aus
ENV UNTIS_SERVER=osz-lus.webuntis.com \
    ISERV_SERVER=osz-lus.de \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    ABGLEICH_DATEN=/daten \
    LEO_EINLADUNG=
COPY app/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=bau /repo/app/build /usr/share/nginx/html
COPY --from=bau /repo/app/abgleich/server.mjs /abgleich/server.mjs
COPY --from=bau --chmod=755 /repo/app/abgleich/start.sh /docker-entrypoint.d/90-abgleich.sh
# Verschlüsselte Abgleich-Daten (je Konto eine Datei); auf dem Unraid z. B. /mnt/user/appdata/leo einhängen
VOLUME /daten
EXPOSE 80
HEALTHCHECK CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
