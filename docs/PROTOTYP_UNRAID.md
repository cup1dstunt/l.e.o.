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

## WebUntis-Verbindungstest (V11, E96)

**Mehr › WebUntis › Verbindungstest öffnen.** Schule (`osz-lus`), WebUntis-Benutzername und App-Schlüssel oder Passwort eingeben, „Verbindung testen“.
Der Test meldet sich an und prüft 13 Abfragen (Schuljahr, Zeitraster, Ferien, eigener Stundenplan, Klassen, Fächer, Räume, Schüler, Fehlzeiten auf zwei Wegen, REST-Token, Stammdaten mit Geburtsdatum und Klasse).
Jede Kachel klappt auf und zeigt, wofür L.E.O. die Daten braucht, und welche Felder gefüllt sind. Er **liest nur**, trägt nichts in WebUntis ein, speichert nichts und zeigt keine Namen.
„Bericht kopieren“ erzeugt einen Text nur mit Status, Anzahlen und Feldnamen, den du Claude schicken kannst.

- **App-Schlüssel:** in WebUntis › Profil (oben rechts) › **Freigaben** › „Zugriff über Untis Mobile“ › **Anzeigen**. Der Text unter dem QR-Code ist der Schlüssel. Er wird nur für den Test im Arbeitsspeicher gehalten.
- **So kommt der Browser an WebUntis:** Der nginx im Container reicht `/WebUntis/` an `osz-lus.webuntis.com` durch (ohne Zwischenspeicher und ohne Zugriffsprotokoll). Für eine andere Schule im Compose unter `environment:` `UNTIS_SERVER=<schule>.webuntis.com` setzen.
- **Ungetestet:** Ich konnte weder WebUntis erreichen noch das nginx-Image starten. Wenn der Test „Durchreicher antwortet mit 502“ meldet, liegt es am Container (DNS oder Zertifikat), bei „Benutzer oder Schlüssel falsch“ an der Anmeldung. Die Uhr des Geräts muss stimmen, sonst passt der Einmalcode des Schlüssels nicht.

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
