#!/bin/sh
# Startet beim Containerstart den Abgleich-Dienst (F4) neben nginx und startet ihn nach einem Absturz neu.
# Wird vom nginx-Image aus /docker-entrypoint.d/ aufgerufen.
mkdir -p "${ABGLEICH_DATEN:-/daten}"
(
  while true; do
    node /abgleich/server.mjs
    echo "L.E.O. Abgleich-Dienst beendet, Neustart in 5 s" >&2
    sleep 5
  done
) &
