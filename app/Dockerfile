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
COPY app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=bau /repo/app/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
