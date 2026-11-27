# Modul Kalender: Abgleich mit WebUntis und IServ

Stand 26.11.2026, Vorschlag V17 (Konstantin: „so machen wir das“). Baut auf E115 (Kalender) und E114 (Semesterplanung) auf.
Backlog: K3, K4, K10, PB14. Umsetzung als Entwurf in der PR „Kalenderabgleich mit IServ-Abo und WebUntis-Prüfungen“, **noch nicht mit echtem IServ oder echten WebUntis-Prüfungen getestet**.

## 1 Ziel

Termine, die den Unterricht betreffen, stehen einmal im Kalender, ohne Abtippen: Ferien, Ausfälle und Prüfungen aus WebUntis,
Konferenzen und Schultermine aus IServ, dazu alles, was L.E.O. selbst kennt (Klausuren, Tests, Nachschreiben, eigene Termine).
Die Semesterplanung rechnet mit denselben Daten, damit die Blockzählung stimmt.

## 2 Quellen

| Quelle | Was | Wie | Wann |
|---|---|---|---|
| WebUntis | Ferien und Feiertage (`getHolidays`), Ausfälle eigener Stunden, Prüfungen der eigenen Klassen (`getExamTypes` + `getExams`, sonst Web-Schnittstelle `api/exams`) | beim WebUntis-Abgleich (Mehr › WebUntis), kein zweiter Abruf | von Hand und alle 30 Minuten (E108) |
| IServ | feste Kalender des Schulprofils (OSZ: OSZ-Info, persönlicher Kalender, Ferien & Feiertage Berlin, Aufgaben) und ein weiterer Kalender per Link (E120) | CalDAV mit IServ-Anmeldung über `/iserv-caldav/`, sonst Feed-Link über `/iserv/`; nginx reicht an `ISERV_SERVER` durch (CORS) | beim Öffnen, beim Zurückkehren, alle 30 Minuten; Knopf „Jetzt abgleichen“ |
| Datei | jede .ics-Datei | Import wie bisher (E115) | von Hand |

Nur lesen. L.E.O. schreibt nichts nach WebUntis oder IServ. Export als .ics enthält weiterhin nur eigene Termine, Klausuren, Tests und Nachschreiben.

### 2.1 Kalender am OSZ (E120)

| Kalender | Weg | Standard | Wirkung |
|---|---|---|---|
| OSZ-Info (alle Schultermine, Konferenzen) | nur CalDAV `/caldav/lusadmin/osz-info`, kein Feed-Link | an | Termine im Kalender |
| Persönlicher Kalender | CalDAV `/caldav/<iserv-benutzer>/home`, sonst Feed „Freigabe für alle Termine“ | an | Termine im Kalender |
| Ferien & Feiertage Berlin (Plugin) | Plugin-Feed-Link | an | ganztägige Termine werden Ferien, falls WebUntis keine liefert |
| Aufgaben (Plugin) | Plugin-Feed-Link | aus | Termine als Abgabe |

- Der IServ-Benutzername ist ein eigenes Feld (nicht der WebUntis-Name).
- Das Passwort liegt auf Wunsch verschlüsselt im Tresor des Geräts (Entscheidung Konstantin, 27.11.). Ohne HTTPS (Aufruf über `http://IP`) wird es nie gespeichert, nur bis zum Neuladen gehalten.
- CalDAV: `REPORT` mit Zeitfenster; kann der Server das nicht, holt L.E.O. den ganzen Kalender mit `?export`.
- Schulprofil in `app/src/lib/schule.ts`. Für eine andere Schule ein neues Profil anlegen.
- **Ungetestet:** echtes IServ (REPORT, Zwei-Faktor-Anmeldung, App-Passwörter), nginx im Container.

### 2.2 Datenschutz

- Der Link liegt verschlüsselt im Tresor des Geräts (wie der WebUntis-Schlüssel), nicht in den Daten, nicht im Abgleich zwischen Geräten, nicht in der Sicherung. Je Gerät einmal einfügen.
- nginx reicht nur GET an genau einen Server durch, ohne Cookies, ohne Zugriffsprotokoll (der Schlüssel steht im Pfad).
- WebUntis-Prüfungen: Schülerlisten werden sofort verworfen; Prüfungen fremder Klassen auch.

## 3 Regeln beim Abgleich

1. Jeder abgeglichene Termin trägt seine Quelle (`quelle: 'iserv' | 'untis'`) und die UID der Quelle.
2. **Die Quelle gewinnt bei Titel, Datum, Zeit, Ort, Notiz.** Was die Quelle nicht mehr liefert, verschwindet.
3. **Die Lehrkraft gewinnt bei Art, Klassen, „Unterricht fällt aus“ und „ausgeblendet“.** Änderung über „Ändern“ (Titel und Zeit sind gesperrt), sie bleibt beim nächsten Abgleich.
4. Löschen gibt es für abgeglichene Termine nicht (sie kämen wieder), sondern **Ausblenden** mit Rückgängig; unter dem Kalender „n ausgeblendet · wieder zeigen“.
5. Wiederholte Termine (RRULE: täglich, wöchentlich mit Wochentagen, monatlich, jährlich, INTERVAL, COUNT, UNTIL) werden im Fenster zwei Monate zurück bis 15 Monate voraus aufgelöst, ausgenommene Tage (EXDATE) und einzeln verschobene Termine (RECURRENCE-ID) beachtet, abgesagte (STATUS:CANCELLED) übersprungen. Seltene Formen („2. Dienstag im Monat“) nur als erster Termin. Höchstens 400 Termine je Serie.
6. Keine Dialoge: Änderungen erscheinen als ruhige Hinweisleiste („IServ: 2 neue Termine, 1 Termin entfallen“), Fehler nur auf der Kachel.

## 4 WebUntis-Prüfungen

- **Eigen:** Klasse und Fach passen zu einer eigenen Klasse. Steht dieselbe Klausur (gleicher Tag, gleiche Klasse) mit Datum im Notenbuch, zeigt der Kalender nur die Klausur aus dem Notenbuch mit dem Zeichen „auch in WebUntis“.
- Hat die Klasse im Notenbuch noch eine Klausur ohne Datum, bietet der Termin „Datum für ‚Klausur 2‘ ins Notenbuch übernehmen“ (ein Tipp, mit Rückgängig). Nichts wird automatisch ins Notenbuch geschrieben.
- **Fremd:** Klausur einer anderen Lehrkraft in einer eigenen Klasse. Erscheint gestrichelt als Hinweis gegen Klausurhäufung, belegt keinen Block, abschaltbar.

## 5 Verzahnung

| Wo | Was |
|---|---|
| Stundenplan › Monat | Einträge mit Herkunft (IServ, WebUntis), Kacheln „WebUntis“ und „IServ“ mit Stand, klappen auf (Rechenweg, Schalter, Link) |
| Stundenplan › Woche | abgeglichene Termine über dem Tag (wie eigene) |
| Heute › Demnächst | auch Ausfälle, Prüfungen und IServ-Termine der nächsten 14 Tage |
| Semesterplanung | Ferien/Feiertage aus WebUntis (wie bisher), Ausfälle, unterrichtsfreie IServ-Termine (z. B. Projekttage, wenn als „Unterrichtsfrei“ festgelegt), eigene WebUntis-Prüfung belegt den ersten Block des Tages wie eine Klausur; ausgeblendete Termine zählen nicht |
| Notenbuch | Datum einer Klausur aus WebUntis übernehmen (Tipp) |
| Mehr › Module | Modul „Kalender“ aus = kein Kalender, kein IServ-Abruf, keine Prüfungen in der Anzeige. Planung rechnet weiter mit Ferien und Ausfällen |

## 6 Daten

- `Termin.quelle` erweitert um `'iserv' | 'untis'`, neu `ort`, `angepasst`, `ausgeblendet`, `fremd`; neue Art `pruefung`.
- `einstellungen.kalender`: `iservAuto`, `iservAbgerufen`, `iservAnzahl`, `untisPruefungen`, `fremdePruefungen` (alle optional, fehlt = an).
- Tresor: `iserv` (weiterer Link), `iserv-passwort`, `iserv-feed-<kalender>`. Container: `ISERV_SERVER`, voreingestellt `osz-lus.de` (leer = aus).

## 7 Grenzen und Ungetestetes

- `getExams`/`api/exams` sind gegen das echte WebUntis der Schule ungetestet; Feldnamen sind aus Dokumentation und Bibliotheken abgeleitet, beide Formen werden gelesen.
- IServ-Abo ungetestet: Link-Format und ob IServ ihn ohne Anmeldung ausliefert, ist offen. Getestet nur mit nachgebildeter Antwort im Browser.
- Zeiten mit eigener Zeitzone (TZID) werden als Berliner Ortszeit gelesen, UTC-Zeiten umgerechnet.
- Der Link muss je Gerät eingefügt werden (bewusst, siehe 2.2).
- Native App später (E79): kein Durchreicher nötig, dann direkter Abruf.
