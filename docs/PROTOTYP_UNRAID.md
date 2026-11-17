# L.E.O. Prototyp 0.4 auf Unraid betreiben

Stand: 17.11.2026 (E79, E80). Abgespeckter Prototyp mit Notenbuch, Schüleransicht, Live-Stunde und einfacher Planung.
Erfundene Beispieldaten, kein WebUntis, kein IServ, keine Anmeldung.

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
    restart: unless-stopped
```

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
| Heute | Kachel „Läuft gerade“ bzw. „Als Nächstes“ mit Zeitbalken und „Wo wir stehengeblieben sind“, Stunden des Tages, Offenes (Nachschreiben, Monatsnote), Frühwarnung, Platzhalter Kalender |
| Notenbuch | Profil FOS (Notenpunkte, Rundung in Stufen wie UPZ) oder OSZ (Noten 1–6, vereinfacht), Gewichte frei, Eingabe wie Excel oder per Notenleiste, E/UE, ★ Vorbehalt, Einzelgewicht, neue Leistung, Spaltenmenü, Monatsnote aus Smileys vorschlagen, Gesamtnote live mit Rechenweg, Was-wäre-wenn, Endnote festlegen, Warnampel, Handy-Liste mit Trendpfeil |
| Live-Stunde | fünf Smileys (Tipp speichert, Doppelklick oder langes Drücken öffnet Bausteine und Kommentar), Anwesenheit da/E/UE, „noch nicht bewertet“, Zufall ohne Wiederholung, Schnellgruppen, Lernstoff, Übergang |
| Planung | kommende Stunden mit Stoff und Hausaufgabe (erscheint in der Live-Stunde), Blöcke im Halbjahr (Beispiel-Ferien) |
| Schüler | Notenübersicht mit Rechenweg hinter ⓘ, Fehlzeiten mit Quote, Wochentag-Muster und 30-%-Grenze, Mitarbeitsverlauf je Monat, häufigste Bausteine, Notizen |
| Mehr | Navigation links/rechts/unten, hell/dunkel, Sicherung, Beispieldaten neu laden |

## Bekannte Grenzen (ehrlich)

- **OSZ-Rechnung vereinfacht:** Die UPZ rechnet in der Berufsschule mit Prozenten aus Rohpunkten. Weil wir ganze Noten eintragen (E65), rechnet der Prototyp mit dem Notenschnitt. Die FOS-Rechnung stimmt mit allen 14 UPZ-Referenzschülern überein (`npm test` in `app/`).
- **Monatsnote FOS:** Umrechnung Smiley-Note in Notenpunkte (1 = 14, 2 = 11, 3 = 8, 4 = 5, 5 = 2) ist mein Vorschlag, noch nicht abgestimmt.
- **Halbjahr und Ferien** in der Planung sind Beispielwerte (Berlin 2026/27 bitte prüfen), Feiertage fehlen.
- Getestet in Chromium (PC und iPhone-Größe). **Safari, Firefox, echtes iPad und Apple Pencil sind nicht getestet.**

## Entwickeln

```sh
cd app
npm install
npm run dev      # http://localhost:5173
npm test         # Rechenkern gegen RECHENLOGIK.md und UPZ-Referenzwerte
npm run build    # statische Dateien in app/build
```
