# Code-Review L.E.O., 20.11.2026

Kritischer Review des Stands `main` (Prototyp 0.5, Fundament F1 bis F4, Nachschreiben). Schwerpunkt: Schutz der
Schülerdaten (Verschlüsselung, Abgleich-Dienst, nginx), Betrieb. Die Rechenlogik der Noten ist durch die
UPZ-Referenzwerte getestet und wurde hier nicht erneut nachgerechnet.

## Kurzfassung

Die Verschlüsselung im Gerät ist gut gemacht. Ein zufälliger Datenschlüssel (AES-GCM 256) wird mit PBKDF2-SHA256 und
600 000 Runden aus dem Passwort verpackt. Art, id und Schema-Version gehen als Zusatzdaten in jede Prüfsumme ein.
Der Nachweis für den Server hat einen eigenen Zweck, der Server nimmt nur verschlüsselte Datensätze an, und im
Svelte-Code gibt es kein `{@html}`. Die Tests laufen grün.

Die wichtigsten offenen Punkte:

1. **Die Sicherheits-Header aus nginx kommen nie an** (Mittel). `add_header` auf Server-Ebene wird in jeder
   `location` mit eigenem `add_header` verworfen. Zusätzlich fehlen eine CSP und ein Schutz gegen Einbetten.
   Das wiegt schwer, weil L.E.O. entschlüsselte Noten im Browser hält.
2. **Der Einladungscode des Abgleich-Dienstes lässt sich beliebig oft raten, und der Standardwert ist
   `bitte-aendern`** (Mittel).
3. **Abgleich-Dienst: Fehler beim Schreiben hinterlassen einen veränderten Zwischenspeicher** (Mittel).
   Außerdem entscheidet die Uhr des Geräts, welche Änderung gewinnt.

## Wie geprüft wurde

- Gelesen: `app/nginx.conf.template`, `app/abgleich/server.mjs` vollständig, `src/lib/tresor.ts` vollständig,
  Ausschnitte aus `speicher.svelte.ts` und `abgleich.ts`, `service-worker.ts`, `docker-compose.yml`, Dockerfile.
- Suche nach `{@html}` und `innerHTML`: keine Treffer.
- `npm audit`: Laufzeit 0 Meldungen. Entwicklung 3 Meldungen (1 hoch: `@sveltejs/kit` ≤ 3.1.0 über `cookie`), nur
  beim Bauen relevant, weil `adapter-static` keinen Server-Code ausliefert.
- `npm test`, `npm run check`, `npm run build` am 20.11. grün (beim Bau von WU2).
- **Nicht** gemacht: Bedienung im Browser, Test gegen das echte WebUntis, Prüfung der Rechenlogik,
  Angriffe auf die Kryptografie über die Code-Lektüre hinaus.

## Befunde

### M1 Mittel: Sicherheits-Header gehen verloren, CSP und Einbett-Schutz fehlen

`nginx.conf.template` setzt am Ende auf Server-Ebene:

```
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy no-referrer always;
```

nginx erbt `add_header` aber **nur**, wenn eine `location` selbst kein `add_header` hat. Alle fünf `location`-Blöcke
(`/`, `/_app/immutable/`, `/service-worker.js`, `/abgleich/`, `/WebUntis/`) setzen ein eigenes `Cache-Control`.
Damit kommen beide Header nirgends an.

Wichtiger noch: Es gibt **keine Content-Security-Policy** und **kein `frame-ancestors`/`X-Frame-Options`**.
L.E.O. hält entschlüsselte Noten und den Datenschlüssel im Tab. Jede eingeschleuste Zeile JavaScript könnte
alles lesen und an eine fremde Adresse schicken, und eine fremde Seite könnte L.E.O. im iframe für Klick-Tricks
einbetten.

**Vorschlag:** Die Header in eine Datei `sicherheit.conf` legen und in **jeder** `location` per `include` einbinden
(oder `more_set_headers` verwenden). Inhalt etwa:

```
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" always;
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy no-referrer always;
```

SvelteKit erzeugt ein kleines Inline-Skript zum Starten. Dafür in `svelte.config.js` `kit.csp` mit
`mode: 'hash'` setzen. Dann trägt SvelteKit die Hashes selbst ein, und `script-src` bleibt ohne `'unsafe-inline'`.

### M2 Mittel: Einladungscode ohne Grenze ratbar, Standardwert `bitte-aendern`

- `docker-compose.yml`: `LEO_EINLADUNG=bitte-aendern`. Wer die Compose-Datei unverändert übernimmt, lässt jeden
  Konten anlegen, der den Code aus dem öffentlichen Repo kennt.
- `POST /abgleich/konto` zählt Fehlversuche **je gewünschtem Benutzernamen**
  (`fehlversuch(id)` mit `id = kontoId(benutzer)`). Ein Angreifer wählt bei jedem Versuch einen neuen Namen und
  rät den Code so ohne Sperre.
- Folge: fremde Konten auf dem Server, also Speicher und Last. Daten anderer Lehrkräfte bleiben geschützt, weil
  jedes Konto seinen eigenen Schlüssel hat.

**Vorschlag:** Den Dienst nicht starten (oder Kontoanlage abschalten), wenn `LEO_EINLADUNG` leer, kürzer als
16 Zeichen oder gleich `bitte-aendern` ist. Fehlversuche bei der Kontoanlage **global** zählen (z. B. 10 je
Stunde), nicht je Benutzername. In der Compose-Datei als Beispiel `LEO_EINLADUNG=` mit Kommentar
`openssl rand -hex 16`.

### M3 Mittel: Abgleich-Dienst, Zustand bei Fehlern und Uhrzeit als Schiedsrichter

1. **Veränderter Zwischenspeicher bei Fehlern.** `laden(id)` gibt das Objekt aus der Map `konten` zurück, und
   `POST /abgleich/aenderungen` verändert genau dieses Objekt (`k.rev++`, `k.saetze[key] = …`). Wirft danach
   `sichern()` (Platte voll) oder mitten in der Schleife die 507-Grenze, ist der Speicher verändert, die Datei
   aber nicht. Der Client bekommt einen Fehler, spätere Anfragen sehen trotzdem die halbe Änderung, und nach
   einem Neustart ist sie wieder weg. **Vorschlag:** auf einer Kopie arbeiten (`structuredClone(k)`) und erst nach
   erfolgreichem `sichern()` in die Map übernehmen. Die 507-Prüfung vor der Schleife für alle neuen Schlüssel
   zusammen machen.
2. **Uhr des Geräts entscheidet.** „Neuere Änderung gewinnt“ vergleicht `geaendert` als Text, den das Gerät
   setzt. Ein iPad mit falscher Uhr (Datum in der Zukunft) gewinnt danach jeden Konflikt um diesen Datensatz,
   auch gegen spätere echte Änderungen am PC. **Vorschlag:** Beim Schreiben einen Zeitstempel in der Zukunft
   (mehr als 5 Minuten) ablehnen oder auf Serverzeit kappen, und im Client warnen, wenn die Geräteuhr deutlich
   von der `Date`-Kopfzeile der Antwort abweicht.
3. **Konto sperren durch Fremde.** Fünf falsche Anmeldungen sperren ein Konto 15 Minuten. Wer den Benutzernamen
   kennt, kann eine Kollegin so dauerhaft vom Abgleich aussperren. Die Arbeit im Gerät geht weiter, deshalb
   nur ein Hinweis: Sperre zusätzlich nach Adresse (nginx setzt `X-Forwarded-For` bewusst leer, dann
   `X-Real-IP` aus dem Proxy übernehmen).
4. **Unterschiedliche Fehler bei unbekanntem Konto** (404 „Konto unbekannt“ vs. 401). Damit lässt sich prüfen,
   welche Benutzernamen es gibt. Einheitlich 401 antworten.

### N1 Niedrig: WebUntis-Durchreicher

- `proxy_cookie_flags ~ nosecure`: Das WebUntis-Sitzungscookie verliert auch über HTTPS das `Secure`-Merkmal.
  Besser nur ohne HTTPS entfernen (zwei Server-Blöcke oder `map` auf `$scheme`).
- Der Durchreicher ist ohne Anmeldung erreichbar und entfernt `X-Forwarded-For`. Wer L.E.O. erreicht, kann
  darüber Anmeldeversuche gegen das WebUntis der Schule schicken, die alle von der Adresse des Unraid-Servers
  kommen. Wenn WebUntis dann sperrt, trifft es den Abgleich aller. `limit_req` auf `/WebUntis/jsonrpc.do`
  (z. B. 30 je Minute) begrenzt das.

### N2 Niedrig: Server kann alte Stände zurückspielen

Die Zusatzdaten der Verschlüsselung binden Art, id und Schema-Version, aber nicht `geaendert`. Ein manipulierter
Server könnte einen älteren, echten Stand eines Datensatzes unter neuer Zeit ausliefern, und das Gerät merkt es
nicht. Bei einem Server in eigener Hand ist das ein theoretisches Risiko. Wer es schließen will, nimmt
`geaendert` in `zusatz()` auf. Das braucht eine Umstellung bestehender Datensätze.

### N3 Niedrig: Ohne HTTPS unverschlüsselt

Bewusst so entschieden (E101), steht in der Doku. Über `http://IP:8128` liegen Noten im Klartext in IndexedDB.
Ein deutlicher Hinweis in der App („Ohne HTTPS: Daten unverschlüsselt“) im Kopf statt nur in den Einstellungen
würde verhindern, dass jemand aus Bequemlichkeit dabei bleibt.

### N4 Niedrig: WU2 (automatischer WebUntis-Abgleich, PR #22)

Selbst gebaut und hier der Vollständigkeit halber: Der automatische Abgleich und „Jetzt abgleichen“ unter
Mehr › WebUntis sperren sich nicht gegenseitig. Laufen beide gleichzeitig, übernimmt `uebernehmen()` zweimal
hintereinander. Das ist harmlos (gleicher Stand), erzeugt aber zwei Speichervorgänge. Die Seite sollte
`untisAuto.laeuft` prüfen und den Knopf so lange sperren.

## Was gut ist (bitte beibehalten)

- Datenschlüssel und Passwort getrennt, Passwortwechsel packt nur um. Zusatzdaten verhindern das Umhängen von
  Datensätzen.
- Server sieht nur Art, id und Zeit, lehnt Klartext ab (`!('daten' in g)`), Token nur als Hash gespeichert.
- Datei je Konto atomar ersetzt (`tmp` + `rename`), Schreiben je Konto nacheinander.
- Service Worker speichert `/abgleich/` und `/WebUntis/` nie zwischen.
- Keine HTML-Ausgabe aus Daten (`{@html}` kommt nicht vor).

## Reihenfolge, die ich vorschlage

1. M1: Header per `include` in jede `location`, CSP mit `kit.csp` (klein, große Wirkung).
2. M2: Start ohne sicheren `LEO_EINLADUNG` verweigern, Fehlversuche global zählen.
3. M3.1 und M3.2: Kopie statt Original im Zwischenspeicher, Zukunftszeiten ablehnen.
4. Rest bei Gelegenheit.
