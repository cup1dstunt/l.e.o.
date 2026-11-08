# Brainstorm: iDoceo-Ersatz (Arbeitstitel)

Stand: 08.11.2026. Zusammenfassung des bisher Erarbeiteten. Nichts davon wurde in ein Repo geschrieben.

## 0. Grundsätze

- Neues, eigenständiges Tool, nicht Teil von EWH Korrektur. Von EWH wird nur das Betriebs- und Sicherungskonzept übernommen (Docker, Backups, Offline-Cache).
- Keine EWH-Inhalte (Klausurarchiv, Bausteinkatalog für Klausuren usw.) im neuen Tool.
- Keine Design-Vorschläge nötig.
- Statistiken überall sammeln, übersichtlich und intuitiv präsentieren, plus grafische Entwicklungen (Verlaufsdiagramme) und Mustererkennung.
- Gutachten und Zeugnistexte: nicht benötigt.
- Rollen und Datenschutzkonzept: erstmal nachrangig.

## 1. Datenquellen und Import

### 1.1 Stammdaten / Klassen (jedes Semester)
- Primärquelle: WebUntis (besser als IServ). Alternativ IServ oder andere Quellen (CSV/Excel).
- Felder: Name, Alter, Geschlecht, zwei Mailadressen (dienstlich aus IServ, privat optional).
- Beim Einrichten/Import wählen: **Bin ich Klassenleitung dieser Klasse?**
  - Ja: Daten über **alle Fächer** der Klasse aus WebUntis (insbesondere Fehlzeiten).
  - Nein: nur die eigenen Kurse/Fächer.
- Dienstliche Mailadressen: IServ (IDM-REST-API mit Admin-Token, falls verfügbar; sonst Benutzerlisten-Export und Zuordnung über Name/Klasse).

### 1.2 Fehlzeiten (laufend, mit aktuellem Status)
Fehlzeiten werden ständig aus WebUntis übernommen, inklusive Status entschuldigt (E) / unentschuldigt (UE) und späteren Statusänderungen.

| Weg | Status | Bemerkung |
|---|---|---|
| Offizielle Untis-Platform-API | prüfen | Braucht genehmigte Platform-Applikation; Fehlzeiten-Endpunkte nur mit aktivem Klassenbuch-Modul. |
| Inoffizielle JSON-RPC-API (Mobile-App-Schnittstelle, z. B. getStudentAbsences2017) | **Backlog** | Reverse-engineered, undokumentiert, kann jederzeit brechen. |
| Export aus WebUntis (CSV/Excel), regelmäßiger Import | **Plan B / Startweg** | Upload oder Watch-Ordner, täglicher Abgleich, Status-Updates werden gemerged. |

Architektur-Vorgabe: Import hinter austauschbaren Schnittstellen (z. B. `FehlzeitenQuelle`, `StundenplanQuelle`), damit ein Wechsel zwischen Reverse-Engineering, Export und offizieller API ohne Umbau geht. Bricht die inoffizielle API, zeigt das Tool einen Hinweis und fällt auf Datei-Import zurück.

### 1.3 Stundenplan
- Export aus WebUntis (evtl. ohne API) als Startweg.
- Reverse-Engineering-API als Backlog-Option, mit Plan B (Export/ICS/manuell).

### 1.4 Datenübernahme
- Jedes Semester: Klassen/Kurse neu aus WebUntis (oder IServ) laden.
- iDoceo-Import: nett, nicht kriegsentscheidend (Wechsel zum Semesterende).

## 2. Module

### 2.1 Notenliste
- Wird **exakt so übernommen, wie sie in iDoceo bei dir aufgebaut ist**. Keine eigenen Überlegungen. Struktur, Berechnungen und Ansicht werden aus deinen iDoceo-Listen abgeleitet (Screenshots/Export als Vorlage nötig).
- Projektbewertungen können als Spalten einfließen.

### 2.2 Sitzplan
- Raumvorlagen, Drag & Drop, mehrere Pläne mit Gültigkeitsdatum.
- Neuer Plan kann **generiert** werden.
- Regelkategorien: nicht nebeneinander; so weit wie möglich voneinander entfernt; möglichst weit vorne. Ergänzungsideen: nah beieinander, feste Plätze, Geschlechter- oder Leistungsmischung.
- Anbindung an Zufallsgenerator und Gruppen.

### 2.3 Zufallsgenerator
- Aufruf ohne Wiederholung, bis alle dran waren; optional gewichtet.
- Aufrufe werden protokolliert und können in die Mitarbeitsbewertung einfließen.

### 2.4 Mitarbeitsbewertung
- Schnelle Bewertung im Unterricht (Klick), mit Textbausteinen für Kommentare.

### 2.5 Zeitleiste und Timer (sehr wichtig)
- Stundenablauf mit Phasen, Countdown, Beamer-Ansicht.
- **Stundenabschluss:** auswählen, wo man stehen geblieben ist (Fortschrittsmarke je Kurs), und ob Hausaufgaben aufgegeben wurden (selten).

### 2.6 Hausaufgabenkontrolle
- Ein Klick pro Schüler, Zähler und Schwellenwerte (z. B. dreimal fehlend → Hinweis).
- Verknüpft mit der Aufgabe aus dem Stundenabschluss.

### 2.7 Gruppen
- Zusammensetzung: zufällig, leistungsgemischt, geschlechterausgewogen, Konflikt- und Wunschlisten.
- **Projektgruppen:** Gruppen für ein Projekt anlegen (Beispiel: Podcast-Projekt über 3 Blöcke) und den **Beitrag der Mitglieder bewerten**, ähnlich wie Mitarbeit.
- Gruppen im Sitzplan abbildbar.

### 2.8 Fehlzeiten-Dashboard und Nachschreiber-Workflow
- Quote pro Schüler, Verlauf, Status E/UE, Fristen für ausstehende Entschuldigungen.
- **Mustererkennung** (z. B. wiederholt montags/freitags, bestimmte Fächer/Stunden, Häufungen vor/nach Ferien).
- **Checkliste für Nachschreiber:**
  1. In die Nachschreibedatei eintragen
  2. Nachschreibeklausur angelegt und ausgedruckt
  3. Nachschreiber per Mail informiert
- Fehlzeit zur Klausur: Status E oder UE.

### 2.9 E-Mail
- Versand aus dem Tool (z. B. SMTP über IServ), Vorlagen mit Platzhaltern, Vorschau, Protokoll.
- Details später; nicht erste Priorität.

### 2.10 Notizen und Gespräche
- Schnelle Notizen pro Schüler (Kürzel, Datum, Suche).
- Eltern-/Beratungsgespräche mit Datum, Vereinbarung, Wiedervorlage; sinnvoll auszubauen.

### 2.11 Eigener Plan und Kalender (sehr wichtig)
- Persönlicher Stundenplan plus Kalender (Termine, Klausuren, Abgaben, Konferenzen, Aufsichten).
- Import anderer Pläne aus IServ; Export z. B. per ICS nach Google Kalender.

### 2.12 Dateiablage pro Stunde
- **Offen.** Konzept legst du noch fest. EWH-Inhalte bleiben ausdrücklich draußen.

### 2.13 Noten- und Klassenkonferenzen
- Eigene Konferenzansicht.
- Importiert alle Fehlzeiten der **ganzen Klasse** aus WebUntis (alle Fächer) und stellt sie übersichtlich dar.
- Pro Schüler Kurzübersicht: Noten, Mitarbeit, Fehlzeiten, Notizen, Entwicklung.

### 2.14 Auswertung und Entwicklung
- Verlaufsdiagramme pro Schüler, Kurs und Klasse (Noten, Mitarbeit, Fehlzeiten, Hausaufgaben).
- **Leistungsstand und Einschätzung per Knopfdruck**: Diktat → KI formuliert einen guten Text. Wie bei EWH keine Klarnamen an KI-Dienste senden.
- Webdesign-Tool: nur Export (JSON/CSV) pro Gruppe/Schüler in eine Notenspalte.

### 2.15 Betrieb
- Offline-Betrieb (Cache, späteres Nachsenden).
- Automatische Sicherung, Sicherung vor Updates, Wiederherstellung (Vorbild: EWH).
- Vollständiger Datenexport als Notausstieg.

## 3. Backlog

- Reverse-Engineering-Anbindung an WebUntis (Fehlzeiten, Stundenplan) mit Plan B.
- Offizielle Untis-Platform-API, falls Zugang möglich.
- IServ-IDM-API für Mailadressen.
- Rollen, Datenschutzkonzept, Lösch- und Aufbewahrungsfristen.
- iDoceo-Import.
- E-Mail-Details.
- Dateiablage pro Stunde.

## 4. Vorgeschlagene Reihenfolge (unverbindlich)

1. Klassen-/Kursimport aus WebUntis (inkl. Klassenleitungs-Schalter), Stundenplan.
2. Notenliste nach iDoceo-Vorbild, Mitarbeit, Hausaufgaben.
3. Sitzplan, Zufallsgenerator, Gruppen inkl. Projektgruppen.
4. Zeitleiste/Timer und Stundenabschluss.
5. Fehlzeiten-Import und Dashboard, Nachschreiber-Workflow.
6. Kalender (IServ-Import, ICS-Export), Notizen und Gespräche.
7. Verlaufsdiagramme, Konferenzansicht, KI-Einschätzung.
8. Mail, Backlog-Punkte.

## 5. Offene Fragen

- Aufbau deiner iDoceo-Notenlisten (Screenshots oder Export).
- Ist das Klassenbuch-Modul in WebUntis aktiv? Sind Platform-API-Zugänge möglich?
- Welche Exporte erlaubt WebUntis dir für Fehlzeiten und Stundenplan (Format, Felder)?
- Konzept der Dateiablage pro Stunde.
- Welche IServ-Kalender/Pläne sollen importiert werden (iCal-Feed vorhanden)?

## 6. Namensvorschläge

**Favoriten:** Kladde, Klassenlotse, Rotstift, Stundenwerk, Leuchtturm

**Klassenzimmer / Alltag:** Tafelrunde, Schulterblick, Merkbuch, Kreidestaub, Pausenklingel, Stundenglas, Sitzordnung, Lehrertisch, Kreidebox, Wandtafel, Federmappe, Zirkelschlag, Pultnachbar, Tafeldienst, Kreidekasten, Schulranzen, Unterrichtsfluss, Gongschlag

**Sachlich / seriös:** Klassenkompass, Notenwerk, Katheder, Lehrmappe, Kursbuch, Unterrichtsbuch, Kursmappe, Lehrerkalender, Stundenbuch, Klassenakte, Schulalltag, Lehrerbegleiter

**Kurz / modern:** Nota, Doceo, Ordo, Katha, Kurs.io, Klasso, Lehro, Notio, Stufe, Raster, Pensum, Takt, Pegel, Kursus, Schicht

**Mit Augenzwinkern:** Zensus, Sokrates, Lehrerzimmer, Notbremse, Streber, Pausenhof, Sitzenbleiber, Hausmeister, Besserwisser, Fünfminutenpause, Vertretungsstunde, Klassenfahrt, Zeugniskonferenz, Nachsitzen

**Sitzplan / Gruppen / Überblick:** Platzwart, Gruppenpuzzle, Platzkarte, Überblick, Lotse, Kompass, Radar, Wegweiser, Stundenlotse, Klassenradar

**Latein / klassisch:** Magister, Praeceptor, Schola, Cathedra, Tabula, Album, Doctor, Discipulus, Lectio, Paedagogus

**Englisch:** ClassPilot, Roster, Gradebook, Deskly, Tally, ClassDeck, Chalk, Lessonly, Staffroom, Teachmate

Hinweis: Namen vor der Entscheidung auf bestehende Produkte, Marken und freie Domains prüfen (nicht geprüft).
