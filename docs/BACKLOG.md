# Backlog

Alle Wünsche und Ideen an einer Stelle. Nichts davon ist verpflichtend, bis es gebaut wird.

**Herkunft:** K = Konstantin · B = Brainstorm mit anderem Agenten (08.11.2026) · C = Vorschlag von Claude
**Priorität:** G = Grundgerüst · 1 = zuerst · 2 = danach · 3 = später · ? = offen
**Aufwand:** S < 1 Tag · M 1–3 Tage · L > 3 Tage (grobe Schätzung)

---

## Grundgerüst (schulweit, ~100 Lehrkräfte)

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| G1 | Mandantenfähiges Datenmodell (`schule_id`), Schuljahr, Halbjahre, Ferien | K, C | G | M |
| G2 | PostgreSQL, Migrationen, Testdaten-Generator (erfundene Schüler) | C | G | M |
| G3 | Anmeldung lokal + Passkey als Notfall-Zugang | C | G | S |
| G4 | **IServ-SSO** per OpenID Connect (Scopes `openid profile email iserv:uuid iserv:groups iserv:roles`), nur Lehrkräfte | K | G (vorbereiten), 2 (live) | M |
| G5 | Rollen: Lehrkraft, Klassenleitung (nur Fehlzeiten der Klasse), Admin ohne Notenzugriff; Noten nur für die eigene Lehrkraft (E29) | K, B, C | G | M |
| G6 | Co-Teaching: mehrere Lehrkräfte je Kurs | C | G | S |
| G7 | Protokoll technischer Admin-Zugriffe (Sicherung, Wiederherstellung) | C | G | S |
| G8 | Austauschbare Import-Adapter (`FehlzeitenQuelle`, `StundenplanQuelle`, `StammdatenQuelle`, `MailQuelle`) | B | G | M |
| G9 | Offline-Puffer mit Nachsenden, Konflikt je Zelle | B | G | M |
| G10 | Sicherung nächtlich, vor Updates, verschlüsselt, Wiederherstellung (Vorbild EWH) | B | G | M |
| G11 | Vollständiger Datenexport als Notausstieg (je Lehrkraft und gesamt) | B | G | M |
| G12 | Docker Compose für Unraid (Entwicklung) und Schulserver (Echtbetrieb) | C | G | S |
| G14 | Aktives Teilen durch die Lehrkraft: Empfänger, Umfang, Frist, jederzeit zurücknehmbar (E29) | K | 2 | M |
| G18 | **Verschlüsselung der Noten je Lehrkraft** (auch der Serverbetreiber kann nichts lesen). Bedingung: keine spürbaren Wartezeiten bei der Statistik. Einschätzung: Statistik über die eigenen Kurse rechnet das Gerät nach dem Entschlüsseln, das sind wenige tausend Werte und geht in Sekundenbruchteilen. Knifflig sind Doppelsteckung (gemeinsamer Schlüssel), Halbjahresnoten bleiben lokal (E33), also kein Sonderfall und Schlüsselverlust (Wiederherstellung) | K, C | 3 | L |
| G19 | Doppelsteckung: 2–3 Lehrkräfte im selben Fach und Kurs, ein Notenbuch, alle schreiben; jede Eingabe mit Kürzel (E31) | K | 1 | M |
| G20 | Halbjahresnoten zum Übertragen in die Excel-Tabellen der Schule (Kopieren in passender Reihenfolge oder Export im Tabellenformat; Vorlage der Tabelle nötig) (E33) | K | 2 | S |
| G15 | Pilot-Schutz: Passkey/2FA, optional nur über VPN, App-Sperre nach Inaktivität, Sichtschutz-Knopf, verschlüsselte Sicherungen | K, C | G | M |
| G16 | Responsive für Smartphone, iPad, PC; eigene schmale Smartphone-Ansichten | K | G | M |
| G17 | Windows: PWA über Edge installieren (eigenes Fenster, Startmenü). Echte EXE (z. B. mit Tauri) nur, falls die PWA nicht reicht | K | 3 | M |
| G13 | Rollen-, Datenschutz-, Lösch- und Aufbewahrungskonzept ausbauen | B | 2 | M |

## Stammdaten & Import

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| S1 | Klassen/Kurse/Schüler je Semester aus WebUntis (Export-Datei als Start) | K, B | 1 | M |
| S2 | Felder: Name, Alter (aus Geburtsdatum), Geschlecht, Mail dienstlich, Mail privat (optional) | K | 1 | S |
| S3 | Schalter „Bin ich Klassenleitung?“: ja → ganze Klasse, alle Fächer; nein → eigene Kurse | B | 1 | S |
| S4 | Zentraler Import durch Admin für die ganze Schule | C | 2 | M |
| S5 | Alternativquellen: IServ, CSV/Excel mit Spaltenzuordnung | K, B | 2 | M |
| S6 | Dienstmails aus IServ: IDM-REST-API, sonst Benutzerliste, sonst Adressmuster mit Prüfliste | K, B | 2 | M |
| S7 | Offizielle Untis-Platform-API (Stammdaten, Stundenplan, Fehlzeiten) | B | 2 | L |
| S8 | Inoffizielle WebUntis-JSON-RPC mit Rückfall auf Datei-Import | B | 3 | M |
| S9 | iDoceo-Import (nett, nicht entscheidend; Wechsel zum Semesterende) | B | 3 | M |
| S10 | **UPZ-Dateien** analysieren, Import und Vorlagen daraus | K | 1 (Analyse) | ? |
| S11 | Volljährigkeit aus dem Alter ableiten (wer bekommt Post: Schüler oder Eltern) | C | 3 | S |

## Notenbuch

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| N1 | Notenbuch **exakt nach Konstantins iDoceo-Vorlagen** (Struktur, Berechnungen, Ansicht); Grundlage Screenshots | K, B | 1 | L |
| N2 | Vorlagen als Daten, später für Kollegen teilbar | C | 2 | M |
| N3 | Projektbewertungen als Spalten (Werkstatt-Export JSON/CSV) | K, B | 2 | S |
| N4 | EWH-Klausurendnoten als Export in eine Spalte (nur Noten, keine EWH-Inhalte) | K, C | 3 | S |
| N5 | Rechenweg der Endnote anzeigen | C | 2 | S |
| N6 | Was-wäre-wenn / Zielnote („was braucht er in der nächsten Klausur?“) | C | 3 | S |
| N8 | Seiten je Kurs (Noten, Mitarbeit, Anwesenheit, frei ergänzbar wie Orga/Hausaufgaben) | K (Screenshots) | 1 | M |
| N9 | Berechnungsbaum: Gruppen mit gewichtetem Durchschnitt (gleich oder Einzelgewichte), „leere Zellen überspringen“, 0 zählt | K (Screenshots) | 1 | M |
| N10 | Notenarten (0–15 mit Bestehensgrenze 5, Rundung, Farben), rot unter Grenze | K (Screenshots) | 1 | S |
| N11 | Anmerkung je Zelle, Zellfarbe, Datum in der Zelle | K (Screenshots) | 1 | S |
| N12 | Überblick je Spalte: Notenspiegel, bestanden x/n, Durchschnitt | K (Screenshots) | 2 | S |
| N13 | Vorlagenklasse → „Neuer Kurs aus Vorlage“ als eigene Funktion | K (Screenshots), C | 1 | S |
| N14 | **Monatsnote Mitarbeit aus den Smileys vorschlagen**, übernehmen oder überschreiben | C | 1 | S |
| N15 | Fehlzeiten-Spalten je Halbjahr automatisch aus WebUntis | C | 2 | S |
| N16 | Alter in Jahren und Monaten an der Schülerzeile | K (Screenshots) | 1 | S |
| N17 | **Notensystem je Bildungsgang** (Berufsschule, FOS/DQ, später IBA/WK): 0–15 oder 1–6, Notenspiegel in Prozent, Bestehensgrenze | K | 1 | M |
| N18 | Standard-Vorlage nach Schulvorgabe: 50 % schriftlich, 50 % AT | K | 1 | S |
| N19 | **Kurse über Halbjahre**: Vorhalbjahresnote automatisch als Richtwert, frühere Halbjahre auf Wunsch einblendbar | K | 1 | M |
| N20 | **Schnelltest in zwei Tipps** (z. B. Verspätungstest: Anwesende voller Wert, Verspätete 0, dann Ausnahmen) | K | 1 | S |
| N21 | **Schnelleingabe**: Zahl tippen → nächster Schüler, große Zahlentasten auf dem Handy, Tastatur am PC, kein Scrollrad | K | 1 | M |
| N22 | Gewichtsregler je Note/Test mit Live-Vorschau der Gesamtnoten | K, C | 2 | S |
| N7 | Export der Endnoten für Zeugniskonferenz und WebUntis/LUSD | C | 2 | S |

## Anwesenheit, Mitarbeit, Hausaufgaben

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| M1 | Anwesenheit und Mitarbeit als Kategorien mit Smiley, Kommentar aus **Textbausteinen** zum Antippen | K | 1 | M |
| M8 | Eine Anmerkung für mehrere Schüler gleichzeitig | C | 1 | S |
| M9 | Mitarbeit-Spalte mit Titel und Datum (z. B. „Jigsaw Reading“) | K (Screenshots) | 1 | S |
| M10 | **Mitarbeit im frei gewählten Rhythmus** (Stunde, Woche, Einheit, Monat, keiner) | K | 1 | S |
| M11 | Erinnerung am Ende des Zeitraums: „Mitarbeitsnoten für Oktober fehlen noch“ | K | 2 | S |
| M12 | **Selbsteinschätzung der Schüler** nach Kriterien (Link/QR, ohne Konto), danach Einschätzung der Lehrkraft daneben | K | 2 | M |
| M13 | Bericht zur Mitarbeit je Zeitraum als PDF/Mail | K | 3 | M |
| M2 | Eigene Bausteine, Favoriten, Sortierung nach Häufigkeit, Freitext | K, C | 1 | S |
| M3 | Bewerten direkt im Sitzplan | C | 1 | S |
| M4 | Zufallsaufrufe fließen optional in Mitarbeit ein | B | 2 | S |
| M5 | Hausaufgabenkontrolle: ein Tipp je Schüler, Zähler, Schwelle (3× fehlend → Hinweis) | B | 2 | S |
| M6 | Hausaufgabe verknüpft mit dem Stundenabschluss | B | 2 | S |
| M7 | Diktat/Sprachnotiz nach der Stunde, Zuordnung zu Schülern (Namen bleiben lokal) | C | 3 | M |

## Sitzplan, Zufall, Gruppen

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| P1 | Sitzplan **einfach**: Raumvorlagen, Ziehen und Ablegen, mehrere Pläne mit Gültigkeitsdatum | K, B | 1 | M |
| P2 | Raumvorlagen schulweit teilen (Räume aus WebUntis) | C | 2 | S |
| P3 | Sitzplan-Generator mit Regeln: nicht nebeneinander, weit auseinander, vorne, nah beieinander, fester Platz, Mischung Geschlecht/Leistung | B | 2 | M |
| P4 | Klausur-Sitzplan (abwechselnd, Abstand, Nachteilsausgleich) | C | 3 | S |
| P5 | Zufall ohne Wiederholung bis alle dran waren, optional gewichtet, nur Anwesende, Protokoll | K, B | 1 | S |
| P6 | Beamer-Ansicht für Zufall und Gruppen | C | 2 | S |
| P7 | Gruppen: zufällig, leistungsgemischt, geschlechterausgewogen, Konflikt- und Wunschlisten | K, B | 1 | M |
| P8 | Gruppen im Sitzplan abbilden | B | 2 | S |
| P9 | **Projektgruppen** über mehrere Blöcke mit Bewertung des Beitrags je Mitglied | B | 2 | M |
| P10 | Namen lernen mit Fotos (Karteikarten) am Schuljahresanfang | C | 3 | S |

## Stunde

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| T1 | **Zeitleiste** mit Phasen, Countdown, Beamer-Ansicht | B | 1 | M |
| T2 | **Stundenabschluss**: Fortschrittsmarke je Kurs, Hausaufgabe ja/nein | B | 1 | S |
| T3 | Abläufe als Vorlage speichern | C | 2 | S |
| T7 | **Kursübersicht mit Kacheln** (Noten, Mitarbeit, Anwesenheit, Hausaufgaben, Notizen, Sitzplan, Entwicklung) | K | 1 | M |
| T4 | „Heute“-Startseite mit Stunden, Hinweisen, offenen Aufgaben | C | 1 | M |
| T5 | Stundencockpit: Sitzplan, Anwesenheit, Ablauf, Zufall, Gruppen auf einem Bildschirm | C | 2 | M |
| T6 | Exit-Ticket per QR-Code | C | 3 | M |

## Fehlzeiten

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| F1 | Laufender Import aus WebUntis mit Status E/UE und späteren Statusänderungen (Start: Export, Upload/Watch-Ordner, täglicher Abgleich) | K, B | 1 | M |
| F2 | Dashboard: Quote je Schüler, Verlauf, Fristen für ausstehende Entschuldigungen | B | 1 | M |
| F3 | Mustererkennung: Wochentage, Fächer/Stunden, vor/nach Ferien, vor Klausuren | B | 2 | M |
| F4 | Nachschreiber-Checkliste (Nachschreibedatei, Klausur angelegt und gedruckt, Mail) | B | 1 | S |
| F5 | Status E/UE zur Klausur automatisch aus WebUntis | K | 1 | S |
| F6 | Frühwarnliste: Note fällt + Fehlzeiten steigen → „braucht Aufmerksamkeit“ | C | 2 | M |
| F7 | Fehlzeiten-Zusammenfassung je Klasse als PDF für die Klassenleitung | C | 3 | S |

## Kalender & Organisation

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| K1 | Persönlicher Stundenplan aus WebUntis (Export/ICS als Start), mit Vertretungen | K, B | 1 | M |
| K2 | Kalender: Termine, Klausuren, Abgaben, Konferenzen, Aufsichten | B | 1 | M |
| K3 | Import anderer Pläne aus IServ (iCal) | B | 2 | S |
| K4 | ICS-Export (z. B. Google Kalender) | B | 2 | S |
| K5 | Notizen je Schüler: Kürzel, Datum, Suche | B | 2 | S |
| K6 | Eltern-/Beratungsgespräche mit Vereinbarung und Wiedervorlage | B | 2 | M |
| K7 | Notizen privat oder für Klassenleitung freigeben | C | 2 | S |
| K8 | Sprechstunden über die eigene Termin-App (`easyappointments-lnu`) | C | 3 | M |
| K9 | Schuljahreswechsel-Assistent (archivieren, neue Kurse, Vorlagen übernehmen) | C | 2 | M |

## Auswertung & Konferenz

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| A1 | Statistiken überall sammeln, übersichtlich darstellen | B | 2 | M |
| A2 | Verlaufsdiagramme je Schüler, Kurs, Klasse (Noten, Mitarbeit, Fehlzeiten, Hausaufgaben) | B | 2 | M |
| A3 | Konferenzansicht: ganze Klasse, alle Fehlzeiten aller Fächer, Kurzübersicht je Schüler | B | 2 | M |
| A4 | Endnoten **aktiv** an die Klassenleitung schicken (statt Zettel/Rundmail), nur wer will (E29) | C | 2 | M |
| A5 | Leistungsstand per Knopfdruck: Diktat → KI-Text, keine Klarnamen an KI | B | 3 | M |

## Bewertungsbögen

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| B1 | Klickbarer Bogen: Bereiche mit Gewicht, Kriterien, 3–5 Stufen, Ich-Form für Schüler | K | 2 | M |
| B2 | Ausfüllen per Einmal-Link/QR ohne Konto, Erinnerung an Säumige | K, C | 2 | M |
| B3 | Selbst- und Fremdeinschätzung nebeneinander, Abweichungen markiert, Notenvorschlag ins Notenbuch | K, C | 2 | M |
| B4 | Eigene Bögen erstellen, kopieren, teilen | K | 2 | S |
| B5 | Bögen als Word/PDF hochladen und in klickbare Bögen umwandeln (KI darf helfen, leerer Bogen enthält keine Schülerdaten) | K | 3 | M |
| B6 | Bibliothek mit Bögen aus MEDIAN (nach Absprache mit dem MEDIAN-Team) | K | 3 | M |
| B7 | Verlauf Selbstbild gegen Fremdbild je Kriterium über das Jahr | C | 3 | S |
| B8 | Daten aus L.E.O. (Hausaufgaben, Verspätungen) beim Einschätzen automatisch anzeigen | C | 2 | S |
| B9 | Bogen als PDF an den Schüler | K | 3 | S |
| B11 | **MEDIAN in der App**: Schulressourcen-Kachel und Verlinkung bei der Planung; Matrizen und Arbeitstechniken als Grundlage für Bögen und Kriterien (Link mit Schlüssel in den Schuleinstellungen, nicht im Code). Details: IDEEN I1–I6 | K | 2 | M |
| B10 | Erster Bogen: Mitarbeit Englisch (Entwurf in BEWERTUNGSBOEGEN.md, Abschnitt 6) | K | 2 | S |

## Aus der Ideensammlung übernommen (E30)

Details in [IDEEN.md](IDEEN.md). Herkunft C, von Konstantin angenommen.

| # | Punkt | Prio | Aufwand |
|---|---|---|---|
| I1 | Schulressourcen-Kachel (MEDIAN, Notenspiegel, Formulare), je Schule gepflegt | 2 | S |
| I2 | Methode an die Stunde hängen (MEDIAN-Karte verlinkt) | 2 | S |
| I3 | Methoden-Helfer: Gruppenpuzzle (Stamm-/Expertengruppen), Lerntempoduett, Placemat, Stationen-Laufzettel | 2 | M |
| I4 | Bewertungsmatrix passend zum Projekt als Bogen und Notenspalte | 3 | M |
| I5 | Exit Ticket digital per QR | 3 | M |
| I6 | Kann-Liste je Einheit mit Klassenstand | 3 | M |
| I7 | **Schülerkarte von überall** | 1 | M |
| I8 | Verlaufslinien im Notenbuch über alle Halbjahre | 1 | S |
| I9 | Trendpfeile neben der Gesamtnote | 2 | S |
| I10 | **Aufmerksamkeitsradar** (lange nicht bewertet/aufgerufen) | 2 | S |
| I11 | Halbjahresrückblick je Kurs | 3 | M |
| I12 | **Wischgesten** in Listen | 1 | S |
| I13 | **Notenschluss-Assistent** | 2 | M |
| I14 | Klausurrückgabe mit Genehmigungshinweis (> 1/3 unter 5) | 2 | S |
| I15 | Gesprächsvorbereitung je Schüler | 3 | S |
| I16 | Vertretungsinfo: Lesezugang auf Zeit, keine Noten | 3 | M |
| I17 | Wochenblick-Kachel | 2 | S |
| I18 | Push-Erinnerungen | 2 | M |
| I19 | Abgaben mit Frist und „fehlt noch“ | 2 | M |
| I20–I26 | QoL: Mehrfachauswahl per Wischen, zuletzt bearbeitet, Kopieren für Excel/Word, Offline-Anzeige, Haptik, Diktat für Notizen, Spaltenarten als Vorlage | 1–3 | je S |
| I27 | **Start in zehn Minuten** | 1 | M |
| I28 | Umzugshilfe iDoceo/UPZ/Excel | 2 | M |
| I29 | Spielwiese mit Demo-Kurs | 2 | S |
| I30 | Tipps im Kontext, Trick der Woche | 3 | S |
| I31 | Vorlagen von Kollegen per Link | 2 | S |
| I32 | Fortbildungs-Kit für die Einführung | 3 | S |
| I34 | Eigener Datenexport mit einem Tipp (→ G11) | G | — |

## Kleine Helfer (Quality of Life)

Konstantin: „Das sind genau die QoL-Features, die mir in iDoceo fehlen, davon gibt es sicher noch zig mehr.“ Sammlung:

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| Q1 | Monatsnote aus Smileys vorschlagen (→ N14) | C | 1 | S |
| Q2 | Ein Baustein / eine Note für mehrere Schüler auf einmal (→ M8) | C | 1 | S |
| Q3 | **Rückgängig** für jede Eingabe, ohne Nachfrage-Dialoge | C | 1 | S |
| Q4 | Spalte füllen („alle 15“) und dann nur Ausnahmen ändern | C | 1 | S |
| Q5 | Hinweis „in dieser Spalte fehlen noch 3 Werte“ | C | 2 | S |
| Q6 | Warnung beim Eintragen: „Durch diese Note fällt X unter 5 Punkte“ | C | 2 | S |
| Q7 | Spaltenstruktur (z. B. ein Test) mit einem Tipp in Parallelkurse kopieren | C | 2 | S |
| Q8 | Schnellsuche über alles (Schüler, Kurs, Notiz), am PC mit Strg+K | C | 2 | S |
| Q9 | Kurs der aktuellen Stunde öffnet sich beim Start von selbst | C | 2 | S |
| Q10 | Bausteine mit Platzhalter (`{Vorname}`) und zuletzt benutzte oben | C | 2 | S |
| Q11 | Spracheingabe von Noten („Ali zwölf, Berta neun“), lokal verarbeitet | C | 3 | M |
| Q12 | Namensspalte fixiert, Spaltengruppen ein- und ausklappbar | C | 1 | S |
| Q13 | Zeugnisliste (alle Endnoten eines Kurses) mit einem Tipp kopieren oder exportieren | C | 2 | S |
| Q14 | Abgaben-Zähler mit „fehlt noch“-Liste (Arbeitsproben, Hausaufgaben) | C | 2 | S |
| Q15 | Dunkelmodus, Schriftgröße je Gerät | C | 2 | S |
| Q16 | Geburtstagshinweis in „Heute“ (Alter ist ohnehin da) | C | 3 | S |

## E-Mail

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| E1 | Versand per SMTP (IServ), Vorlagen mit Platzhaltern, Vorschau, Protokoll | K, B | 3 | M |
| E2 | Mail nach verpasster Klausur je nach Status E/UE | K | 3 | S |
| E3 | Schulweit: zentrales Absenderkonto mit Antwort an Lehrkraft oder eigenes Postfach | C | 3 | ? |

## Offen

| # | Punkt | Herkunft | Prio |
|---|---|---|---|
| O1 | Dateiablage je Stunde: Konzept legt Konstantin fest, EWH-Inhalte bleiben draußen | K, B | ? |

## Verworfen

| Punkt | Grund |
|---|---|
| Gutachten und Zeugnistexte | nicht benötigt (Brainstorm) |
| Monatsnoten als Pflicht | Rhythmus frei wählbar (E20) |
| I33 „Wer sieht das?“-Symbol | Noten sieht ohnehin nur die Lehrkraft (E29) |
| I35 „Wer hat meine Kurse angesehen?“ | entfällt, niemand außer der Lehrkraft sieht sie (E29) |
| Schulleitung sieht Endnoten | ersetzt durch E29 |
| EWH-Inhalte (Klausurarchiv, Bausteinkatalog für Klausuren) | L.E.O. ist eigenständig (Brainstorm) |
| Design-Vorschläge in der Planung | nicht gewünscht |
