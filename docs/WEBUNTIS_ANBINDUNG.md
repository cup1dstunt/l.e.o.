# WebUntis-Anbindung (Modulentwurf)

Stand 18.11.2026 (ergänzt nach Konstantins Antworten, 18:47), Entwurf zur Abstimmung mit Konstantin. **Nichts davon ist gegen ein echtes WebUntis getestet.**
Grundlagen: PLANUNG 6.1, E16 (austauschbare Adapter), E79 (lokal-first), E84 (E/UE nie in der Live-Stunde).

## 1 Ziel in einem Satz

L.E.O. holt Klassen, Schüler, Stundenplan und Fehlzeiten aus WebUntis, damit nichts zweimal eingetippt wird.
WebUntis bleibt die Quelle und das amtliche System, L.E.O. **ersetzt es nicht** (darf es auch nicht).
Stufe 1: L.E.O. **liest nur**. Stufe 2 (Wunsch Konstantin): L.E.O. **sendet die eigene Anwesenheitsfeststellung** an WebUntis (Abschnitt 3.4).
Den Status entschuldigt/unentschuldigt entscheidet immer die Klassenleitung in WebUntis.

Schule: `https://osz-lus.webuntis.com`, Schulname „Leopold-Ullstein-Schule“. Konstantin meldet sich per IServ (OpenID Connect) an,
kann aber auch einen Benutzer mit Schlüssel nutzen.

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

### 3.2 Zugangsdaten (Anmeldung über IServ)

- Bevorzugt **App-Schlüssel** statt Passwort (bei IServ-Anmeldung an WebUntis gibt es oft gar kein eigenes Passwort).
- Gespeichert wird er **verschlüsselt mit dem L.E.O.-Passwort** (FB1, E81). Ohne Entsperren kein Abruf.
- Ein Passwort wird höchstens für die laufende Sitzung im Speicher gehalten, nie im Klartext abgelegt.

### 3.3 Abwesenheiten an dieser Schule (Ablauf und Status)

So läuft es laut Konstantin (18.11.2026):

1. Die Lehrkraft stellt **zu Beginn jeder Stunde** die Anwesenheit fest. Wer später kommt, wird von „abwesend“ auf „verspätet“ gesetzt.
2. Die **Klassenleitung** bearbeitet danach den Status. Bis dahin ist er **ungeklärt** (in der Liste „?“ und „0/4 Stunden bearbeitet“).
3. Frist für eine Krankschreibung ab dem ersten Fehltag: **FOS 3 Tage, Berufsschule 14 Tage.**
4. Die Klassenleitung trägt dann ein: entschuldigt oder unentschuldigt. Die Zeugnisdaten erzeugt WebUntis selbst.

WebUntis kennt viele **Abwesenheitsgründe** (Abwesend ohne/mit Meldung, schulunfähig wegen Krankheit, Entschuldigt aus betrieblichen
bzw. privaten Gründen, Religiöser Feiertag, Sonderurlaub (Dual), Prüflinge (Dual), ausgesetzte Präsenzpflicht, angeleitetes Lernen zu Hause,
Unentschuldigt, Verspätung zählend / nicht zählend) und daneben einen **Status** (entsch. / nicht entsch. / Verspätung / ?).
Die Lehrkraft braucht davon nur wenig. L.E.O. fasst daher zusammen:

| L.E.O. zeigt | aus WebUntis | Darstellung |
|---|---|---|
| **entschuldigt (E)** | Status „entsch.“ | ruhig, ohne Warnfarbe |
| **unentschuldigt (UE)** | Status „nicht entsch.“ | Warnfarbe |
| **offen** | Status „?“ / unbearbeitet | neutral, mit „Frist bis …“ (Startdatum + 3 bzw. 14 Tage je Bildungsgang); nach Ablauf „Frist abgelaufen, Klassenleitung noch nicht entschieden“ |
| **Verspätung** | Grund „Verspätung (zählend/nicht zählend)“, mit Ankunftszeit | Verspätungsübersicht, nicht als Fehlstunde |

Der genaue Grund (z. B. Religiöser Feiertag) steht nur im aufgeklappten Detail (E89), für die Note spielt er keine Rolle.
Verspätungen zählen **nicht** zu den Fehlzeiten und nicht in die 30-%-Quote (Konstantin, 18.11.2026; eine Ausnahme im Regelwerk wird nicht abgebildet). Auf dem Zeugnis steht nur die **Anzahl** der Verspätungen. L.E.O. zeigt deshalb die Anzahl im Vordergrund und **zusätzlich die Minuten** (Summe und Ø je Schüler, Wochentagsmuster), mit Hinweis, dass die Minuten nur so genau sind wie der Zeitpunkt des Eintrags.

### 3.4 Anwesenheit an WebUntis senden (Stufe 2)

**Technisch wahrscheinlich möglich, aber nicht offiziell dokumentiert.** Die WebUntis-Webseite speichert die Anwesenheit selbst über
interne Schnittstellen, und die Lehrkraft hat dafür das Recht. L.E.O. könnte dieselben Aufrufe nutzen. Die dokumentierte JSON-RPC-Schnittstelle
ist dagegen nur lesend; ob die Untis-Platform Schreiben erlaubt, ist offen. **Nichts davon ist getestet.**

Weil das ein amtlicher Eintrag ist, gelten strenge Regeln:

- L.E.O. sendet **nur** „abwesend“ und „verspätet bis HH:MM“ für **eigene** Stunden, mit dem Grund, den Lehrkräfte heute auch wählen
  (voraussichtlich „Abwesend ohne Meldung“). **Nie** ein Status E/UE, nie fremde Stunden, nie Löschen alter Einträge.
- Senden ist **ein Knopf am Ende der Feststellung** („3 Abwesende an WebUntis senden“), keine Automatik im Hintergrund und kein Dialog.
  Danach liest L.E.O. den Stand aus WebUntis zurück und zeigt ✓ je Schüler oder „nicht angekommen, bitte in WebUntis eintragen“.
- Eine Verspätung nach dem Senden (zweiter Klick, E84) wird als Änderung nachgeschickt.
- Hat schon jemand in WebUntis etwas eingetragen, gewinnt WebUntis; L.E.O. zeigt den Unterschied und überschreibt nicht.
- Vorher mit Schulleitung bzw. Untis-Admin klären, ob das so erlaubt ist (FRAGEN_SCHULE).
- Bricht die interne Schnittstelle nach einem Untis-Update, schaltet L.E.O. das Senden ab und sagt es deutlich; Lesen und Datei-Import laufen weiter.

## 4 Ablauf für die Lehrkraft

1. **Einrichten (einmal):** Mehr › WebUntis › Schule (voreingestellt `osz-lus`), Benutzer mit Schlüssel bzw. App-Schlüssel per QR-Code eintragen.
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
| **Live-Stunde** | Schüler, die in WebUntis für diese Stunde schon fehlen, sind vorbelegt (ausgegraut, antippbar zum Ändern). Weiterhin nur da/fehlt/Verspätung (E84). Stufe 2: Knopf „an WebUntis senden“ mit Rückmeldung je Schüler (3.4) |
| **Notenbuch** | Klausur-Leistung: Wer am Termin laut WebUntis fehlte, bekommt in der Zelle „fehlt E“ oder „fehlt UE“ (F5). Was daraus für die Note folgt (Nachschreiben, 0 Punkte/6), entscheidet die Lehrkraft per Antippen, L.E.O. rechnet nichts automatisch ein |
| **Schüleransicht** | Fehlzeiten-Kachel mit E/UE/offen, Monats- und Wochentagsmuster; Klick zeigt die einzelnen Stunden mit WebUntis-Stand (E89) |
| **30-%-Regel** (E62, UPZ-5) | je Klasse und Fach: Fehlstunden (E und UE zusammen) geteilt durch **gehaltene** Stunden laut WebUntis im Halbjahr. Stufen 15/20/30 % als Farbe, ab 30 % Hinweis „N im Zeugnis, Zeugniskonferenz“. Rechenweg hinter Info-Knopf |
| **Verspätungen** | WebUntis-Verspätungen ergänzen die eigenen; Wochentagsanalyse nutzt beide, Quelle sichtbar |
| **Semesterplanung** (PB16) | Blockzählung aus echtem Zeitraster, Ferien und Ausfällen statt Beispiel-Ferien |
| **Stundenplan / Kalender** (PB13, PB14) | dieselben Stundendaten, nur andere Ansicht; kein zweiter Abruf |
| **Mail an Fehlende** (E1) | später: Liste „Klausur verpasst, UE“ als Ausgangspunkt |

## 7 Reihenfolge zum Bauen (Vorschlag)

1. **Verbindungstest** (Durchreicher in nginx + Anmeldung + Kacheln „was geht“). **Gebaut 18.11.2026** unter Mehr › WebUntis, ungetestet gegen das echte WebUntis. Kleinster Schritt, beantwortet alle offenen Rechte-Fragen mit Konstantins echtem Konto.
2. Stundenplan und Klassen übernehmen (Heute zeigt echte Stunden).
3. Schüler übernehmen mit Abgleich (neu/Abgang).
4. Fehlzeiten mit E/UE, Klausur-Status im Notenbuch, 30-%-Kachel.
5. Datei-Import als Rückfall mit Spaltenzuordnung.
6. **Stufe 2: Anwesenheit senden** (3.4), erst nach Freigabe durch die Schule und zuerst nur in Konstantins eigenen Stunden.
   Vorher einmal mitschauen, welche Aufrufe die WebUntis-Webseite beim Eintragen macht (ohne Schülerdaten zu speichern).

Echte Schülerdaten landen dabei **nur im Browser** von Konstantin, nie im Repo (CLAUDE.md). Tests laufen mit erfundenen Untis-Antworten.

## 7a Ergebnis des ersten Verbindungstests (18.11.2026, 21:28, Konstantins Konto)

| Abfrage | Ergebnis | Folge |
|---|---|---|
| Anmeldung (App-Schlüssel) | ✓ Lehrkraft, 5 Rechte | Weg A trägt |
| Schuljahr, Zeitraster, Ferien | ✓ (Halbjahr 24.08.2026–29.01.2027, 5 Tage × 11 Stunden, 89 Ferien-/Feiertagseinträge) | Semesterplanung kann echte Daten nutzen |
| Eigener Stundenplan | ✓ 27 Stunden in 2 Wochen, mit Ausfall (`code`) und Vertretungstext | Heute/Stundenleiste kann umgestellt werden |
| Klassen | ✓ 68, mit `teacher1`/`teacher2` | Klassenleitung ablesbar |
| Fächer, Räume | ✓ 204 / 86 | |
| Schüler | ✓ **5028 (ganze Schule)**, Geschlecht 100 %, **kein Geburtsdatum** | Alter nur per Datei-Import oder von Hand; die Liste enthält **keine Klassenzuordnung** |
| Fehlzeiten JSON-RPC (`getTimetableWithAbsences`) | ✓ **17 917 Einträge in 14 Tagen** (schulweit), Felder `studentId`, `teacherIds`, `date`, `startTime`, `absenceReason`, `excuseStatus`, `absentTime`, `checked` | E/UE kommt per Schnittstelle. Klassenlisten lassen sich vermutlich aus den Einträgen der eigenen Stunden ableiten (zweiter Test prüft das) |
| Fehlzeiten Web-Schnittstelle | leer | Endpunkt ist für Schülerkonten gedacht, nicht nötig |
| REST-Token | Fehler beim Lesen (Antwort als Text) | im zweiten Test behoben |

**Test 2 (21:00):** Token ✓. Fehlzeiten-Status kommen als Text: „entsch.“, „nicht entsch.“, „Verspätung“, „entsch. aPP“ (ausgesetzte Präsenzpflicht); ohne Status = offen. Gründe als Kürzel (Abw oM, K, V (z), UE, Abw mM, B, P, aPP, V (nicht z)). `absentTime` ist eine Zahl (Minuten). Zuordnung zu eigenen Stunden über `teacherIds` ergab 0 Treffer, Test 3 prüft zusätzlich Datum + Beginn. `studentlist.do` lieferte HTML statt Daten, Test 3 probiert Kopfzeilen-Varianten.

Abbildung in L.E.O.: „entsch.“ und „entsch. aPP“ → **E**, „nicht entsch.“ → **UE**, „Verspätung“ → **Verspätung** (zählt nicht, E95), kein Status → **offen**.

**Datenschutz-Folge:** Das Lehrerkonto sieht Schüler und Fehlzeiten der ganzen Schule. L.E.O. übernimmt deshalb **nur** Schüler und Einträge aus den **eigenen Stunden** (bzw. als Klassenleitung der eigenen Klasse) und verwirft den Rest sofort im Arbeitsspeicher. Nichts Schulweites wird gespeichert.

## 8 Antworten von Konstantin (18.11.2026)

1. WebUntis: `https://osz-lus.webuntis.com`, Leopold-Ullstein-Schule.
2. Anmeldung über IServ (OpenID Connect), alternativ Benutzer mit Schlüssel möglich.
3. Status E/UE wird von der Klassenleitung gesetzt, vorher „ungeklärt“; Fristen FOS 3 Tage, Berufsschule 14 Tage (3.3).
   Wunsch: in L.E.O. erfasste Anwesenheit an WebUntis senden (3.4).
