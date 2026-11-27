# L.E.O. Prototyp 0.5 auf Unraid betreiben

Stand: 18.11.2026 (E79–E93). Prototyp mit Tagesübersicht, Notenbuch, Schülerkarte, Live-Stunde, Sitzplan und einfacher Planung.
Erfundene Beispieldaten, kein WebUntis, kein IServ. Anmeldung nur lokal pro Gerät (E81).

**Erster Start:** L.E.O. fragt nach einem Passwort und legt es für dieses Gerät und diesen Browser fest. Es verlässt das Gerät nie. Ändern und automatisches Sperren unter **Mehr › Anmeldung**. Vergessen? Dann Browserdaten löschen, das löscht aber auch die Noten (vorher Sicherung herunterladen).

## So funktioniert es

- Der Container auf dem Unraid ist nur ein kleiner Webserver (nginx). Er **liefert die App aus und speichert keine Noten**.
- Alle Daten liegen **im Browser des Geräts** (IndexedDB). Jedes Gerät und jeder Browser hat seinen eigenen Stand.
- Unter **Mehr › Sicherung herunterladen** gibt es eine JSON-Datei. Damit lässt sich ein Stand sichern oder auf ein anderes Gerät bringen (**Sicherung einspielen** ersetzt alles auf dem Gerät).
- **Browserdaten löschen löscht auch die Noten.** Für den Test egal, später kommt ein verschlüsselter Export bzw. Abgleich (PB12, PB18).

## Installation über die Unraid-Oberfläche (Compose Manager, ohne Terminal)

GitHub baut bei jedem Update auf `main` ein fertiges Image (`.github/workflows/image.yml`) und legt es unter `ghcr.io/cup1dstunt/leo-prototyp` ab. Unraid lädt nur dieses Image.

1. **Einmalig: Paket öffentlich schalten.** GitHub › dein Profil › **Packages** › `leo-prototyp` › **Package settings** › ganz unten **Change visibility** › **Public**.
   Das Image enthält nur die App mit erfundenen Beispieldaten, keine Noten (die liegen im Browser). Dann braucht Unraid keinen Token.
2. Unraid › Reiter **Docker** › unten bei **Compose** › **Add New Stack**, Name `leo` (oder den bestehenden Stack bearbeiten).
3. Zahnrad › **Edit Stack** › **Compose File**, Inhalt unten einfügen › **Save Changes**.
4. **Compose Up**, danach `http://<Unraid-IP>:8128` öffnen.
5. **Update:** wieder **Compose Up** (holt durch `pull_policy: always` das neueste Image).

```yaml
services:
  leo:
    image: ghcr.io/cup1dstunt/leo-prototyp:latest
    pull_policy: always
    container_name: leo-prototyp
    ports:
      - "8128:80"
    environment:
      - LEO_EINLADUNG=hier-einen-eigenen-code-eintragen
    volumes:
      - /mnt/user/appdata/leo/daten:/daten
    restart: unless-stopped
```

`LEO_EINLADUNG` und `volumes` braucht nur der Abgleich zwischen Geräten (siehe unten). Ohne sie läuft alles wie bisher.

Soll das Paket privat bleiben, braucht der Unraid einmalig im Terminal `docker login ghcr.io -u cup1dstunt` mit einem Token (classic, Recht `read:packages`).

Der Weg „bauen direkt aus der Git-Adresse“ funktioniert mit dem privaten Repo nicht zuverlässig (GitHub leitet um und verliert dabei den Token) und ist deshalb entfernt.

## Installation mit Terminal (Alternative)

Voraussetzung: Unraid mit dem Plugin **Docker Compose Manager** (Community Apps), oder ein Terminal auf dem Server mit `docker compose`.

1. Repo auf den Server holen, z. B. in `/mnt/user/appdata/leo`:
   ```sh
   cd /mnt/user/appdata
   git clone https://github.com/cup1dstunt/l.e.o.git leo
   cd leo
   ```
   Das Repo ist privat: `git clone` fragt nach GitHub-Name und einem **Personal Access Token** (GitHub › Settings › Developer settings › Tokens, Recht „Contents: read“).
2. Bauen und starten (dauert beim ersten Mal 1–3 Minuten):
   ```sh
   docker compose up -d --build
   ```
3. Im Browser öffnen: `http://<IP-des-Unraid>:8128`
   Port belegt? In `docker-compose.yml` links die `8128` ändern.

Mit dem Compose Manager: neuen Stack „leo“ anlegen, als Pfad `/mnt/user/appdata/leo` wählen (dort liegt die `docker-compose.yml`), dann „Compose Up“.

## Aktualisieren

Mit dem GHCR-Image (Weg oben): im Compose Manager **Compose Up** klicken. Mit dem Terminal-Weg:

```sh
cd /mnt/user/appdata/leo
git pull
docker compose up -d --build
```

Die Noten im Browser bleiben dabei erhalten. Falls der Browser noch die alte Version zeigt: Seite einmal neu laden (die App speichert sich für den Offline-Betrieb zwischen).

## Als App installieren (PWA) und offline nutzen

Installieren („Zum Home-Bildschirm“ auf iPad/iPhone, „App installieren“ in Chrome/Edge) und der Offline-Betrieb funktionieren **nur über HTTPS**.
Über `http://IP:8128` läuft die App normal im Browser, aber ohne Installation und ohne Offline-Speicher der App-Dateien (die Noten werden trotzdem lokal gespeichert).

Wege zu HTTPS, je nachdem, was auf dem Unraid schon läuft:
- **Nginx Proxy Manager** oder **SWAG** mit eigener (Sub-)Domain und Let's-Encrypt-Zertifikat, Ziel `http://<IP>:8128`.
- **Tailscale** (Unraid-Plugin): `tailscale serve` stellt die App mit gültigem Zertifikat im eigenen Tailnet bereit, ohne Port nach außen zu öffnen.

Ungetestet: Ich konnte das fertige Image nicht komplett auf einem Unraid starten. Die Build-Stufe (Tests und App-Bau) läuft im Docker durch, das nginx-Image ließ sich in meiner Umgebung wegen einer Download-Sperre bei Docker Hub nicht laden.

## Was im Prototyp steckt

| Bereich | Funktionen |
|---|---|
| Anmeldung | lokales Passwort beim Start, Sperren-Knopf, automatische Sperre nach Inaktivität (einstellbar), Passwort ändern (E81) |
| Heute | Stundenleiste des Tages (laufende Stunde hervorgehoben, vergangene blass), Kachel „Läuft gerade“ bzw. „Als Nächstes“ mit „Mitarbeit/Anwesenheit“ und „+ Leistung“ (E93), „Heute erfasst“, Offenes, Frühwarnung, Platzhalter Kalender (E82) |
| Suche | Strg+K bzw. ⌘K oder Lupe: Schüler, Klassen (Noten, Stunde, Sitzplan, Planung) und Seiten, mit Pfeiltasten und Enter (E90) |
| Klassen | Übersicht aller Klassen (statt „Kurse“, E87) |
| Notenbuch | Klausuren und AT fest 50:50 (ohne Prozentanzeige, E92), nur mündlich:Tests einstellbar (E83), „Mündliche Leistungen“ (E85), Profil FOS oder OSZ (vereinfacht), Eingabe wie Excel oder per Notenleiste, E/UE, ★ Vorbehalt, freies Einzelgewicht, Ø-Zellen öffnen eine Kachel mit Herkunft und Was-wäre-wenn (Hover am PC, Antippen am iPad), Was-wäre-wenn für alle offenen Leistungen, Gesamtnote mit Rechenweg, Monatsnote aus Smileys vorschlagen |
| Live-Stunde | Liste oder Sitzplan umschaltbar (E86), Anwesenheit nur da/fehlt, nochmal antippen erfasst Verspätung mit Uhrzeit (Vorschlag jetzt, änderbar, E84), fünf Smileys mit Bausteinen, „noch nicht bewertet“, Zufall, Gruppen, Lernstoff, Übergang |
| Sitzplan | Lehrersicht mit Lehrertisch unten (E91), Vorlagen (Reihen, U-Form, Gruppentische, Doppel-U, leer), Tische an/aus, Raster ändern, alphabetisch oder zufällig setzen, Ziehen oder Antippen zum Setzen und Tauschen (E86) |
| Planung | kommende Stunden mit Stoff und Hausaufgabe, Blöcke im Halbjahr (Beispiel-Ferien) |
| Schülerkarte | Kacheln Klausur 1, Klausur 2, AT, mündlich Ø, Tests Ø, jede aufklappbar mit Herkunft (E89), Verlaufsgrafik mündlich, Fehlzeiten-Kacheln zeigen die Tage, Verspätungen mit Minuten, Wochentag-Auswertung für Fehltage oder Verspätungen, Mitarbeit je Monat in kräftigen Farben mit Trendpfeil, Monat antippen zeigt die Einträge (E88), Notizen |
| Mehr | Anmeldung, Navigation links/rechts/unten, hell/dunkel, Sicherung, Beispieldaten neu laden, **WebUntis-Verbindungstest** (siehe unten) |

Noch nicht drin: Kriterienraster und Selbsteinschätzungsbogen für mündliche Leistungen (FB7), Kalender, IServ. WebUntis nur als Verbindungstest, die Daten werden noch nicht übernommen.

## WebUntis-Abgleich (V11, E96, E98)

**Mehr › WebUntis › Jetzt abgleichen** holt deinen Stundenplan, deine Klassen mit Schülern, Fehlzeiten (E/UE/offen) und Verspätungen deiner Stunden im laufenden Halbjahr. Beim ersten Mal lassen sich die Beispielklassen entfernen. Noten, mündliche Leistungen, Notizen und Sitzpläne bleiben bei jedem weiteren Abgleich erhalten. Geburtsdatum und Nachteilsausgleich: Stammdaten-Export (CSV) unter **Export einlesen**. Der Schlüssel wird nicht gespeichert, ein automatischer Abgleich im Hintergrund kommt erst mit der Verschlüsselung (FB1).

Ungetestet mit echten Daten: Zuordnung über dein Kürzel, Dauer bei einem ganzen Halbjahr (das Klassenbuch wird in 14-Tage-Stücken geholt), Ausfälle auf „Heute“ werden noch nicht angezeigt.

### Verbindungstest

**Mehr › WebUntis › Verbindungstest öffnen.** Schule (`osz-lus`), WebUntis-Benutzername und App-Schlüssel oder Passwort eingeben, „Verbindung testen“.
Der Test meldet sich an und prüft 13 Abfragen (Schuljahr, Zeitraster, Ferien, eigener Stundenplan, Klassen, Fächer, Räume, Schüler, Fehlzeiten auf zwei Wegen, REST-Token, Stammdaten mit Geburtsdatum und Klasse).
Jede Kachel klappt auf und zeigt, wofür L.E.O. die Daten braucht, und welche Felder gefüllt sind. Er **liest nur**, trägt nichts in WebUntis ein, speichert nichts und zeigt keine Namen.
„Bericht kopieren“ erzeugt einen Text nur mit Status, Anzahlen und Feldnamen, den du Claude schicken kannst.

- **App-Schlüssel:** in WebUntis › Profil (oben rechts) › **Freigaben** › „Zugriff über Untis Mobile“ › **Anzeigen**. Der Text unter dem QR-Code ist der Schlüssel. Er wird nur für den Test im Arbeitsspeicher gehalten.
- **So kommt der Browser an WebUntis:** Der nginx im Container reicht `/WebUntis/` an `osz-lus.webuntis.com` durch (ohne Zwischenspeicher und ohne Zugriffsprotokoll). Für eine andere Schule im Compose unter `environment:` `UNTIS_SERVER=<schule>.webuntis.com` setzen.
- **Ungetestet:** Ich konnte weder WebUntis erreichen noch das nginx-Image starten. Wenn der Test „Durchreicher antwortet mit 502“ meldet, liegt es am Container (DNS oder Zertifikat), bei „Benutzer oder Schlüssel falsch“ an der Anmeldung. Die Uhr des Geräts muss stimmen, sonst passt der Einmalcode des Schlüssels nicht.

## IServ-Kalender (V17, E120)

- `ISERV_SERVER` ist im Image auf `osz-lus.de` voreingestellt, im Compose ist nichts nötig. Nur für eine andere Schule setzen, leer = aus.
- In L.E.O. unter Stundenplan › Monat › Kachel „IServ“ mit IServ-Benutzername und Passwort anmelden (holt OSZ-Info und den persönlichen Kalender). Für Ferien & Feiertage den Feed-Link des Plugins einfügen. Passwort und Links bleiben verschlüsselt auf dem Gerät.
- nginx reicht `/iserv/` nur per GET und `/iserv-caldav/` per GET/REPORT/PROPFIND an diesen einen Server durch, ohne Cookies und ohne Zugriffsprotokoll. Plan: [MODUL_KALENDER_ABGLEICH.md](MODUL_KALENDER_ABGLEICH.md).

## Sicherung und Abgleich zwischen Geräten (F3, F4, E102, E103)

**Sicherung:** Mehr › Sicherung › „Sicherung herunterladen“ gibt eine verschlüsselte Datei (über HTTPS). Auf einem anderen Gerät fragt „Sicherung einspielen …“ nach dem Passwort, das beim Herunterladen galt, und zeigt vor dem Einspielen eine Vorschau. Zusätzlich legt L.E.O. jeden Tag beim ersten Anmelden einen Stand im Gerät ab (die letzten 7) und vor jedem Einspielen den bisherigen Stand.

**Abgleich** (nur über HTTPS):
1. Im Compose-Stack `LEO_EINLADUNG` auf einen eigenen Code setzen und `/daten` auf einen Unraid-Ordner legen (siehe oben), **Compose Up**.
2. Erstes Gerät (z. B. PC): Mehr › Abgleich › Benutzername (z. B. IServ-Name) und dein L.E.O.-Passwort › Verbinden › Einladungscode › „Konto anlegen und verbinden“. Dieses Gerät bringt seine Daten mit.
3. Jedes weitere Gerät: beim ersten Öffnen „Ich nutze L.E.O. schon auf einem anderen Gerät“ und mit Benutzername + Passwort anmelden. Hat das Gerät schon eigene Daten: Mehr › Abgleich › Verbinden, dann gilt der Stand vom Server (der bisherige bleibt unter „Automatisch gesichert“).
4. Danach gleicht L.E.O. jede Minute und kurz nach jeder Änderung ab. Links unten steht „abgeglichen ✓“ oder „offline“; offline Erfasstes geht beim nächsten Mal mit.

Der Server speichert je Konto eine Datei unter `/daten/konten/`, darin nur verschlüsselte Datensätze, nicht das Passwort. Die Datei gehört in die Unraid-Sicherung. Passwort vergessen heißt auch hier: Daten nur über eine eigene Sicherungsdatei zurück.

## HTTPS über Nginx Proxy Manager (E100)

Browser verschlüsseln Daten (F2), gleichen ab (F4) und installieren die App nur über **HTTPS**. So geht es auf dem Unraid:

**Vorher wichtig:** Der Browser trennt Daten nach Adresse. Unter `https://leo.deine-domain.de` sieht er die Daten von `http://192.168.…:8128` **nicht**. Deshalb zuerst unter der alten Adresse **Mehr › Sicherung herunterladen**, nach dem Umzug unter der neuen Adresse **Mehr › Sicherung einspielen**. Den WebUntis-Schlüssel neu eingeben.

1. **Domain:** Du brauchst einen Namen, der auf deinen Anschluss zeigt, z. B. eine eigene Domain oder kostenlos über DuckDNS (`leo-xyz.duckdns.org`). Bei DuckDNS das Unraid-Template „duckdns“ installieren, damit die IP aktuell bleibt.
2. **Router:** Ports **80** und **443** an die Unraid-IP weiterleiten. (Ohne offene Ports geht es nur mit DNS-Prüfung, siehe Schritt 4.)
3. **Nginx Proxy Manager** aus den Community Apps installieren (Template „Nginx-Proxy-Manager-Official“). Weboberfläche auf Port 81, erste Anmeldung `admin@example.com` / `changeme`, sofort ändern.
4. **Proxy Host anlegen:** Domain Names `leo-xyz.duckdns.org`, Scheme `http`, Forward Hostname/IP = Unraid-IP, Forward Port `8128`, „Websockets Support“ an. Reiter **SSL:** „Request a new SSL Certificate“, „Force SSL“ und „HTTP/2“ an. Ohne offene Ports: „Use a DNS Challenge“ mit DuckDNS-Token.
5. **Aufrufen:** `https://leo-xyz.duckdns.org` öffnen, anmelden, Sicherung einspielen. WebUntis läuft weiter über den Durchreicher im L.E.O.-Container, dort ändert sich nichts.
6. **Sicherheit:** L.E.O. ist dann aus dem Internet erreichbar. Die Daten liegen nur in deinen Geräten, der Server liefert nur die App aus. Wer die App öffnet, sieht ohne dein Passwort keine Daten (ab F2 verschlüsselt). Wenn du es enger willst: im Proxy Host unter „Access List“ nur dein Heimnetz und die Schule zulassen.

Ungetestet: Ich habe keinen Zugriff auf dein Unraid. Wenn ein Schritt anders aussieht, schick mir einen Screenshot.

## Selbsteinschätzung der Schüler per Link (FB7b, E116)

Schüler öffnen den Bogen unter `https://<deine-adresse>/e/#<token>`. Dafür muss L.E.O. aus dem Internet über HTTPS erreichbar sein, und das Gerät der Lehrkraft muss mit dem Abgleich verbunden sein. Der Server sieht keine Namen und kann die Antworten nicht lesen.

Empfohlen: eine **eigene Domain nur für Schüler** (z. B. `bogen.deine-domain.de`), die nur den Bogen freigibt, nicht die ganze App. Im Nginx Proxy Manager einen zweiten Proxy-Host anlegen (gleiches Ziel wie L.E.O., Port 8128, SSL wie gehabt) und unter „Advanced“ eintragen:

```
location = / { return 404; }
location ~ ^/(?!e/|abgleich/selbst/(bogen|abgeben)$) { return 404; }
```

In L.E.O. dann unter Mündlich › Selbsteinschätzung › Mailtext und Adresse die Adresse `https://bogen.deine-domain.de` eintragen. Ungetestet auf dem Unraid.

## Bekannte Grenzen (ehrlich)

- **OSZ-Rechnung vereinfacht:** Die UPZ rechnet in der Berufsschule mit Prozenten aus Rohpunkten. Weil wir ganze Noten eintragen (E65), rechnet der Prototyp mit dem Notenschnitt. Die FOS-Rechnung stimmt mit allen 14 UPZ-Referenzschülern überein (`npm test` in `app/`).
- **Monatsnote FOS:** Umrechnung Smiley-Note in Notenpunkte (1 = 14, 2 = 11, 3 = 8, 4 = 5, 5 = 2) ist mein Vorschlag, noch nicht abgestimmt.
- **Halbjahr und Ferien** in der Planung sind Beispielwerte (Berlin 2026/27 bitte prüfen), Feiertage fehlen.
- Ältere Daten aus 0.4 werden beim ersten Start übernommen; dabei werden Klausuren:AT auf 50:50 gesetzt und alte E/UE in der Live-Stunde zu „fehlt“.
- Getestet in Chromium (PC und iPhone-Größe). **Safari, Firefox, echtes iPad und Apple Pencil sind nicht getestet.**

## Entwickeln

```sh
cd app
npm install
npm run dev      # http://localhost:5173
npm test         # Rechenkern gegen RECHENLOGIK.md und UPZ-Referenzwerte
npm run build    # statische Dateien in app/build
```
