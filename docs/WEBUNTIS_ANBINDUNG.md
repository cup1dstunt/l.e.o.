# WebUntis-Anbindung (Modulentwurf)

Stand 18.11.2026, Entwurf zur Abstimmung mit Konstantin. **Nichts davon ist gegen ein echtes WebUntis getestet.**
Grundlagen: PLANUNG 6.1, E16 (austauschbare Adapter), E79 (lokal-first), E84 (E/UE nie in der Live-Stunde).

## 1 Ziel in einem Satz

L.E.O. holt Klassen, Schüler, Stundenplan und Fehlzeiten aus WebUntis, damit nichts zweimal eingetippt wird.
WebUntis bleibt die Quelle, L.E.O. **liest nur** und schreibt nichts zurück.

## 2 Was WebUntis realistisch liefert

| Daten | Wahrscheinlich | Unsicher | Wofür in L.E.O. |
|---|---|---|---|
| Eigener Stundenplan (Fach, Klasse, Raum, Zeit, Ausfall, Vertretung) | ja | – | Heute/Stundenleiste, Live-Stunde, Semesterplanung (PB16), Stundenplan-Modul (PB13) |
| Klassen, Fächer, Räume, Zeitraster, Ferien, Schuljahr | ja | – | Klassen anlegen, Raumvorlagen Sitzplan (P2), Blockzählung |
| Schüler der eigenen Klassen (Name, Vorname, Geschlecht) | ja, über die Klassen des Stundenplans | ob Lehrkräfte die Schülerliste per Schnittstelle sehen dürfen (Recht „Stammdaten Schüler“) | Schülerliste je Klasse, Abgleich je Semester (S1) |
| Geburtsdatum (Alter) | – | oft nicht für Lehrkräfte freigegeben | Schülerkarte |
| Fehlzeiten mit Status (entschuldigt / unentschuldigt / offen) | ja, wenn das Klassenbuch-Modul aktiv ist | welche Rechte die Lehrkraft für **fremde** Stunden ihrer Schüler hat (für die 30-%-Regel reicht das eigene Fach) | Fehlzeiten, Klausur-Status, 30-%-Regel |
| Verspätungen | ja, im Klassenbuch | Format | Verspätungsübersicht (Abgleich mit eigenen Einträgen) |
| Klassenleitung | ja | – | Rolle Klassenleitung |
| Prüfungen/Klausurtermine | teilweise | ob gepflegt | später Kalender (PF13, PB14) |
| Private oder dienstliche Mail | nein | – | kommt aus IServ bzw. Eingabe (S6) |

## 3 Zugriffswege

Alle Wege landen im selben internen Format („Untis-Paket“, Abschnitt 5). So lässt sich der Weg wechseln, ohne dass Notenbuch oder Schüleransicht etwas merken (E16).

| Weg | Anmeldung | Vorteil | Nachteil | Rolle |
|---|---|---|---|---|
| **A Lehrer-Login** (JSON-RPC, dazu die REST-Endpunkte der WebUntis-Oberfläche für Fehlzeiten) | eigenes Konto: Benutzer + Passwort, oder **App-Schlüssel** (QR-Code „Freigaben“ im WebUntis-Profil, geht auch bei IServ-Anmeldung) | sofort nutzbar, nur eigene Rechte, keine Genehmigung der Schule nötig | teils undokumentiert, kann bei Untis-Updates brechen | **Startweg für den Prototyp** |
| **B Datei-Import** (Berichte/Export aus WebUntis als CSV/Excel) | keine | funktioniert immer, auch bei gesperrter Schnittstelle | Handarbeit, nicht „automatisch“ | **Rückfall**, wenn A bricht oder Daten fehlen (z. B. Geburtsdatum) |
| **C Untis-Platform-Anwendung** (offizielle Partner-Schnittstelle) | zentral durch die Schule | offiziell, stabil, alle Daten | Genehmigung durch Untis und Schuladmin, für eine lokal-first-App ohne Server schwierig | **Ziel nur, falls L.E.O. schulweit mit Server läuft** |
| D ICS-Feed des Stundenplans | Link aus WebUntis | einfachst | nur Stundenplan, keine Schüler | Notlösung für Stundenplan |

Quellen: [Untis: APIs – Datenaustausch](https://help.untis.at/hc/de/articles/4886785534354-API-documentation-for-integration-partners), [Changelog für Integrationspartner](https://help.untis.at/hc/de/articles/4886890048658-Changelog-for-integration-partners), [WebUntis-Hilfe Abwesenheiten](https://webhelp.untis.at/HTML/WebHelp/uk/untis/wu_schueler_abwesenheiten.htm).

### 3.1 Das Browser-Problem (CORS) und die Lösung

Eine Browser-App darf WebUntis nicht direkt abfragen: WebUntis erlaubt keine Anfragen fremder Webseiten (CORS).

- **Prototyp (Unraid):** Der vorhandene nginx im L.E.O.-Container leitet `/untis/` an den WebUntis-Server der Schule weiter.
  Für den Browser ist das dieselbe Adresse, CORS entfällt. **Kein zusätzlicher Dienst, keine Speicherung**:
  nginx reicht nur durch, protokolliert keine Inhalte (Zugriffslog für diesen Pfad aus).
- **Spätere App (Tauri/Capacitor, E79):** Native Apps kennen kein CORS. Die App fragt WebUntis direkt, der Durchreicher entfällt.
- Folge für den Datenschutz: Die Daten gehen nur zwischen Gerät der Lehrkraft und WebUntis hin und her,
  über den eigenen Container. Kein Dritter, keine KI, kein zentraler Speicher.

### 3.2 Zugangsdaten

- Bevorzugt **App-Schlüssel** statt Passwort (bei IServ-Anmeldung an WebUntis gibt es oft gar kein eigenes Passwort).
- Gespeichert wird er **verschlüsselt mit dem L.E.O.-Passwort** (FB1, E81). Ohne Entsperren kein Abruf.
- Ein Passwort wird höchstens für die laufende Sitzung im Speicher gehalten, nie im Klartext abgelegt.

## 4 Ablauf für die Lehrkraft

1. **Einrichten (einmal):** Mehr › WebUntis › Schule suchen (Name), App-Schlüssel per QR-Code scannen oder einfügen.
   L.E.O. macht sofort einen **Verbindungstest** und zeigt als Kacheln, was geht: Stundenplan ✓, Klassen ✓, Schüler ✓,
   Geburtsdatum ✗, Fehlzeiten ✓. Jede Kachel klappt auf und zeigt, warum (E89).
2. **Klassen übernehmen (je Halbjahr):** L.E.O. schlägt aus dem Stundenplan die eigenen Klassen vor (Klasse + Fach,
   z. B. „FOS12a Englisch“). Antippen übernimmt sie, Doppelsteckung erkennt L.E.O. an zwei Lehrkräften im selben Unterricht.
3. **Abgleich statt Überschreiben:** Bei jedem Abruf zeigt L.E.O. eine ruhige Hinweisleiste:
   „FOS12a: 1 neuer Schüler, 1 Abgang, 4 Fehlzeiten aktualisiert“. Neue Schüler kommen automatisch dazu,
   Abgänge werden **nie gelöscht**, sondern als „abgemeldet“ markiert (Noten bleiben). Kein unterbrechender Dialog.
4. **Fehlzeiten laufend:** Abruf beim Öffnen der App, beim Entsperren und alle 30 Minuten, solange sie offen ist,
   dazu ein Knopf „Jetzt abgleichen“. Im Browser gibt es keinen Abruf im Hintergrund, in der nativen App später schon.
5. **Ohne Netz:** alles läuft weiter mit dem letzten Stand; die Kachel zeigt „Stand: heute 07:41“.

## 5 Datenmodell (Fundament, gilt auch für die spätere App)

- Jedes Objekt aus WebUntis bekommt eine **Herkunft**: `quelle: 'untis' | 'datei' | 'hand'`, `untisId`, `abgerufenAm`.
  Eigene Felder (Notizen, Sitzplatz, Mail privat, NTA) gehören L.E.O. und werden vom Abgleich nie angefasst.
- **Untis-Paket** (internes Format aller Wege): `schuljahr`, `zeitraster`, `ferien`, `klassen[]`, `unterricht[]`
  (Klasse, Fach, Lehrkräfte), `schueler[]`, `stunden[]` (Datum, Zeit, Status: normal/Ausfall/Vertretung),
  `fehlzeiten[]` (Schüler, Stunde, Status E/UE/offen, Grund, Verspätung in Minuten).
- **Zwei Sichten auf Anwesenheit, getrennt gespeichert:**
  - eigene Erfassung in der Live-Stunde (da/fehlt/Verspätung, E84),
  - WebUntis-Stand (mit E/UE).
  Angezeigt wird der WebUntis-Stand, sobald er da ist. Weichen beide ab, zeigt die Schülerkarte das dezent an
  („Du: fehlt, WebUntis: anwesend“). Zusammengelegt wird nichts automatisch.
- Speicherung: weg vom einen großen Datenblock (`alles`) im Prototyp, hin zu **Tabellen je Objektart mit Schema-Version**
  in IndexedDB. Das ist ohnehin Voraussetzung für Abgleich zwischen Geräten (V10, PB18) und Verschlüsselung (FB1).

## 6 Wie es in die Module greift

| Modul | Was sich ändert |
|---|---|
| **Heute / Stundenleiste** (E82) | echte Stunden aus WebUntis inklusive Ausfall und Vertretung, statt Beispiel-Stundenplan |
| **Live-Stunde** | Schüler, die in WebUntis für diese Stunde schon fehlen, sind vorbelegt (ausgegraut, antippbar zum Ändern). Weiterhin nur da/fehlt/Verspätung (E84) |
| **Notenbuch** | Klausur-Leistung: Wer am Termin laut WebUntis fehlte, bekommt in der Zelle „fehlt E“ oder „fehlt UE“ (F5). Was daraus für die Note folgt (Nachschreiben, 0 Punkte/6), entscheidet die Lehrkraft per Antippen, L.E.O. rechnet nichts automatisch ein |
| **Schüleransicht** | Fehlzeiten-Kachel mit E/UE/offen, Monats- und Wochentagsmuster; Klick zeigt die einzelnen Stunden mit WebUntis-Stand (E89) |
| **30-%-Regel** (E62, UPZ-5) | je Klasse und Fach: Fehlstunden (E und UE zusammen) geteilt durch **gehaltene** Stunden laut WebUntis im Halbjahr. Stufen 15/20/30 % als Farbe, ab 30 % Hinweis „N im Zeugnis, Zeugniskonferenz“. Rechenweg hinter Info-Knopf |
| **Verspätungen** | WebUntis-Verspätungen ergänzen die eigenen; Wochentagsanalyse nutzt beide, Quelle sichtbar |
| **Semesterplanung** (PB16) | Blockzählung aus echtem Zeitraster, Ferien und Ausfällen statt Beispiel-Ferien |
| **Stundenplan / Kalender** (PB13, PB14) | dieselben Stundendaten, nur andere Ansicht; kein zweiter Abruf |
| **Mail an Fehlende** (E1) | später: Liste „Klausur verpasst, UE“ als Ausgangspunkt |

## 7 Reihenfolge zum Bauen (Vorschlag)

1. **Verbindungstest** (Durchreicher in nginx + Anmeldung + Kacheln „was geht“). Kleinster Schritt, beantwortet alle offenen Rechte-Fragen mit Konstantins echtem Konto.
2. Stundenplan und Klassen übernehmen (Heute zeigt echte Stunden).
3. Schüler übernehmen mit Abgleich (neu/Abgang).
4. Fehlzeiten mit E/UE, Klausur-Status im Notenbuch, 30-%-Kachel.
5. Datei-Import als Rückfall mit Spaltenzuordnung.

Echte Schülerdaten landen dabei **nur im Browser** von Konstantin, nie im Repo (CLAUDE.md). Tests laufen mit erfundenen Untis-Antworten.

## 8 Offene Fragen an Konstantin

1. WebUntis-Adresse der Schule (z. B. `xyz.webuntis.com`, steht in der Adresszeile) und Schulname in WebUntis.
2. Meldest du dich bei WebUntis über IServ an oder mit eigenem Passwort? Gibt es im Profil den Punkt „Freigaben“ mit QR-Code?
3. Siehst du in WebUntis die Fehlzeiten deiner Schüler mit „entschuldigt/unentschuldigt“?
