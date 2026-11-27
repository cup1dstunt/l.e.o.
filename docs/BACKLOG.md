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
| G20 | (Halb-)Jahresendnote je Kurs klar ablesbar zum Übertragen von Hand; kein Export nötig (E33) | K | 1 | S |
| G15 | Pilot-Schutz: Passkey/2FA, optional nur über VPN, App-Sperre nach Inaktivität, Sichtschutz-Knopf, verschlüsselte Sicherungen | K, C | G | M |
| G16 | Responsive für Smartphone, iPad, PC; eigene schmale Smartphone-Ansichten | K | G | M |
| G17 | Windows: PWA über Edge installieren (eigenes Fenster, Startmenü). Echte EXE (z. B. mit Tauri) nur, falls die PWA nicht reicht | K | 3 | M |
| G13 | Rollen-, Datenschutz-, Lösch- und Aufbewahrungskonzept ausbauen | B | 2 | M |

## Stammdaten & Import

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| S1 | Klassen/Kurse/Schüler je Semester aus WebUntis (Export-Datei als Start). Abgleich + Export ergänzt die vollständige Klassenliste (E119) | K, B | 1 | M |
| S2 | Felder: Name, Alter (aus Geburtsdatum), Geschlecht, Mail dienstlich. ~~Mail privat~~ entfällt (Konstantin 26.11.). Umgesetzt im Export-Import (E119) | K | 1 | S |
| S3 | Schalter „Bin ich Klassenleitung?“: ja → ganze Klasse, alle Fächer; nein → eigene Kurse | B | 1 | S |
| S4 | Zentraler Import durch Admin für die ganze Schule | C | 2 | M |
| S5 | Alternativquellen: IServ, CSV/Excel mit Spaltenzuordnung | K, B | 2 | M |
| S6 | Dienstmails aus IServ: IDM-REST-API, sonst Benutzerliste, sonst Adressmuster mit Prüfliste. Für den Start reicht das Muster (E106), IServ-Anbindung optional später zusammen mit dem IServ-Login (G4). Einfügen aus IServ-Text gebaut (E119) | K, B | 2 | M |
| S7 | Offizielle Untis-Platform-API (Stammdaten, Stundenplan, Fehlzeiten) | B | 2 | L |
| S8 | Inoffizielle WebUntis-JSON-RPC mit Rückfall auf Datei-Import | B | 3 | M |
| S9 | iDoceo-Import (nett, nicht entscheidend; Wechsel zum Semesterende). Entwurf 27.11. im Modul Import (V20), echter Export noch ungetestet | B | 3 | M |
| S10 | **UPZ-Dateien** analysieren, Import und Vorlagen daraus | K | 1 (Analyse) | ? |
| S11 | Volljährigkeit aus dem Alter ableiten (wer bekommt Post: Schüler oder Eltern) | C | 3 | S |

## Notenbuch

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| N1 | Notenbuch **exakt nach Konstantins iDoceo-Vorlagen** (Struktur, Berechnungen, Ansicht); Grundlage Screenshots | K, B | 1 | L |
| N2 | Vorlagen als Daten, später für Kollegen teilbar | C | 2 | M |
| N3 | Projektbewertungen als Spalten (Werkstatt-Export JSON/CSV) | K, B | 2 | S |
| N4 | EWH-Klausurendnoten als Export in eine Spalte (nur Noten, keine EWH-Inhalte). **Entwurf 26.11.:** CSV aus EWH einlesen, optionales Modul (V16, [MODUL_AUSWERTUNG.md](MODUL_AUSWERTUNG.md)) | K, C | 3 | S |
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
| P5 | Zufall ohne Wiederholung bis alle dran waren, optional gewichtet, nur Anwesende, Protokoll (gebaut 20.11., E109) | K, B | 1 | S |
| P6 | Beamer-Ansicht für Zufall und Gruppen (gebaut 20.11. mit Rad und Timer, E109) | C | 2 | S |
| P7 | Gruppen: zufällig, leistungsgemischt, geschlechterausgewogen, Konflikt- und Wunschlisten (gebaut 20.11., E109) | K, B | 1 | M |
| P8 | Gruppen im Sitzplan abbilden (gebaut 20.11.: G1, G2 … in der Live-Stunde, E109) | B | 2 | S |
| P9 | **Projektgruppen / Gruppenarbeitsmodul** (im Prototyp seit 25.11., E118; offen: Selbst-/Partnereinschätzung per Link mit FB7b) über mehrere Blöcke bis ein Semester (z. B. Präsentationen), kriteriengeleitet benotet. Vorschlag 25.11.: gespeicherten Gruppensatz zum Projekt erweitern (Titel, Zeitraum, Raster z. B. „Präsentation“, vom Kürzen auf 12 Sätze ausgenommen), Bewertung daneben speichern: Gruppennote, Abweichung je Mitglied, optional Selbst-/Peer-Einschätzung über den Link aus FB7b; Note zählt wohl unter Tests/Sonstiges (zu klären) | B, K | 1 | M |
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
| F8 | ✅ umgesetzt 20.11. (E107). **Nachschreiben (Modul 1, geplant 20.11.):** Nachschreibeliste je Klasse für alle, die bei einer Klausur fehlen mit Status E **oder offen** (E104). Lehrkraft wählt Schüler per Antippen und legt Termin fest (Datum, Uhrzeit, Raum; ein Termin für mehrere Schüler, auch klassenübergreifend). Erinnerung sofort, nicht erst nach Ablauf der Entschuldigungsfrist | K | 1 | M |
| F9 | ✅ umgesetzt 20.11. (E107). **Mail erst nach festgelegtem Nachschreibetermin** (nie automatisch nach dem Fehlen): Entwurf mit Textbaustein, nur an die schulische Adresse, Versand erst nach Klick der Lehrkraft (E105) | K | 1 | S |
| F10 | ✅ umgesetzt 20.11. (E107). Checkliste je Nachschreibetermin (Klausur vorbereitet, gedruckt, Mail verschickt); Note eintragen schließt den Fall. Statusänderung in WebUntis danach (z. B. offen → UE bei schon eingetragener Note) nur als Hinweis, keine automatische Änderung. Oberfläche: Kachel „Nachschreiben“ auf Heute, Klausurzelle im Notenbuch zeigt E/offen/Termin, Fall in der Schülerübersicht bei den Fehlzeiten | C | 1 | S |
| F11 | ✅ umgesetzt 20.11. (E107). 30-%-Übersicht der ganzen Klasse als zweiter Teil von Modul 1 (eigene Planung) | C | 1 | M |
| F12 | ✅ umgesetzt 25.11. (E117). **Nachschreibe-Mail individuell anpassbar:** Vorlagen je Status (E / offen) und eigene, Platzhalter antippen, Vorschau, Hinweis je Termin, Entwurf je Schüler vor dem Senden änderbar | K | 1 | S |

## Kalender & Organisation

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| K1 | Persönlicher Stundenplan aus WebUntis (Export/ICS als Start), mit Vertretungen | K, B | 1 | M |
| K2 | ✅ im Prototyp 25.11. (E115). Kalender: Termine, Klausuren, Abgaben, Konferenzen, Aufsichten | B | 1 | M |
| K3 | ✅ als Datei-Import im Prototyp 25.11. (E115); Abo-Link aus IServ als Entwurf 26.11. (V17). Import anderer Pläne aus IServ (iCal) | B | 2 | S |
| K4 | ✅ als Datei im Prototyp 25.11. (E115); Abo-Link offen. ICS-Export (z. B. Google Kalender) | B | 2 | S |
| K5 | Notizen je Schüler: Kürzel, Datum, Suche | B | 2 | S |
| K6 | Eltern-/Beratungsgespräche mit Vereinbarung und Wiedervorlage | B | 2 | M |
| K7 | Notizen privat oder für Klassenleitung freigeben | C | 2 | S |
| K8 | Sprechstunden über die eigene Termin-App (`easyappointments-lnu`) | C | 3 | M |
| K9 | Schuljahreswechsel-Assistent (archivieren, neue Kurse, Vorlagen übernehmen) | C | 2 | M |
| K10 | Entwurf 26.11. (V17). Kalenderabgleich: WebUntis-Prüfungen und Ausfälle, IServ-Abo, Wiederholungen, eigene Festlegungen bleiben. 27.11. Entwurf: OSZ-Kalender per CalDAV, Ferien-Plugin (E120) ([MODUL_KALENDER_ABGLEICH.md](MODUL_KALENDER_ABGLEICH.md)). Später: CalDAV, falls IServ keinen Abo-Link hat; ICS-Abo-Link aus L.E.O. heraus (K4) | K | 2 | M |

## Auswertung & Konferenz

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| A1 | Statistiken überall sammeln, übersichtlich darstellen. **Entwurf 26.11.:** Reiter „Auswertung“ je Klasse und Klassenvergleich (V16, [MODUL_AUSWERTUNG.md](MODUL_AUSWERTUNG.md)) | B | 2 | M |
| A2 | Verlaufsdiagramme je Schüler, Kurs, Klasse (Noten, Mitarbeit, Fehlzeiten, Hausaufgaben) | B | 2 | M |
| A3 | Konferenzansicht: ganze Klasse, alle Fehlzeiten aller Fächer, Kurzübersicht je Schüler | B | 2 | M |
| A6 | EWH-Noten direkt abrufen statt CSV (Weg B: Abrufschlüssel und Lese-Endpunkt in EWH), erst wenn beide schulweit laufen | C | 3 | M |
| A7 | Auswertung drucken bzw. als PDF | C | 3 | S |
| A8 | Halbjahresvergleich je Klasse nach dem Schuljahreswechsel (K9) | C | 3 | S |
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

## Zweite Ideenrunde (08.11.2026, angenommen: E35)

Beschreibung in [IDEEN](IDEEN.md) Abschnitt 7. Herkunft C.

| # | Punkt | Prio | Aufwand |
|---|---|---|---|
| I36 | **Was-wäre-wenn-Rechner** (nötige Note für 5/10) | 1 | S |
| I37 | **Frühwarnliste** vor Notenschluss und Mahnfristen | 1 | S |
| I38 | Blockunterricht: Betriebsphasen kennen, Erinnerungen pausieren | 2 | M |
| I39 | **Notenstand zum Mitgeben** (Zettel/QR, nur auf Tipp der Lehrkraft) | 2 | S |
| I40 | Mitarbeit-Schnellrunde am Stundenende | 1 | S |
| I41 | Stoffprotokoll je Stunde, kopierbar ins WebUntis-Klassenbuch | 2 | S |
| I42 | **Nachteilsausgleich**: dezentes Symbol, Details per Mouse-over/Antippen, eingetragen von Klassenleitung oder Kurslehrkraft (E36) | 1 | S |
| I43 | Schultermine als Fristen, zentral gepflegt | 2 | S |
| I44 | Abwesend bei der **Klassenarbeit** (nicht Test) → automatisch Nachschreiberliste | 1 | S |
| I45 | Kursstart-Assistent fürs neue Halbjahr | 1 | M |

## Themen zum Planen (08.11.2026, Herkunft C, von Konstantin ins Backlog)

| # | Punkt | Prio | Aufwand |
|---|---|---|---|
| T-1 | **„Heute“-Bildschirm**: Stunden, Nachschreiber, Fristen, Erinnerungen, offene Vorbehalte | 2 | M |
| T-2 | **Ausbildungsbetriebe**: Ansprechpartner je Azubi, Fehlzeitenmeldung an den Betrieb per Vorlage | 2 | M |
| T-3 | **Kammerprüfungen**: Termine der Zwischen- und Abschlussprüfung je Klasse, Warnung bei Klassenarbeiten in Prüfungswochen | 3 | S |
| T-4 | **Klassenleitung**: Vorbereitung der Zeugniskonferenz, Fehlzeiten-Mahnstufen, NTA-Pflege | 2 | M |
| T-5 | **Notenbuch-Bedienung** wird gerade geplant: [NOTENBUCH_BEDIENUNG](NOTENBUCH_BEDIENUNG.md) | 1 | — |

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

## Aus der UX-Planung (09.11.2026)

Details: [DESIGN_SYSTEM_PROTOTYP.md](DESIGN_SYSTEM_PROTOTYP.md), Entscheidungen E49–E59.

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| U1 | Kachel **„Läuft gerade“** mit dynamischem Zeitbalken (Beginn bis Ende, „jetzt“-Marke, Restminuten), ohne Phasen (E50) | K | 1 | M |
| U2 | **Mitarbeit überall einen Tipp entfernt**: Nebenknopf neben „Stunde öffnen“, Kachel, Sitzplatz, Schülerkarte, Handy-Kopfzeile (E51) | K | 1 | M |
| U3 | **Mitarbeitsskala mit fünf Farben** und Smileys mit Hintergrund, eigener SVG-Satz, Gesichtsform trägt die Stufe mit (E52) | K | 1 | M |
| U4 | **Textbaustein-Bibliothek**, vom Admin gepflegt, eigener Kommentar je Eintrag (E53). Startsatz: 14 Bausteine in [DESIGN_SYSTEM_PROTOTYP.md](DESIGN_SYSTEM_PROTOTYP.md), Abschnitt 9.2 | K | 1 | S |
| U5 | **Mitarbeitsverlauf** in der Schülerübersicht: Anteilsbalken je Monat, häufigste Bausteine, letzte Einträge | K | 1 | M |
| U6 | **Fehlzeiten-Analyse** in der Schülerübersicht: Kennzahlen, Wochentage, Monatsverlauf, Muster-Hinweis (z. B. Montage, vor Klassenarbeiten), Klassenarbeiten mit E/UE und Nachschreib-Stand | K | 1 | M |
| U7 | **Navigation wählbar je Nutzer**: Seitenleiste, Reiterleiste, untere Leiste, links oder rechts (E54) | K | 1 | S |
| U8 | **Stundenende-Hinweis** „n Schüler ohne Mitarbeitseintrag“, später abschaltbar (E55) | K | 2 | S |
| U9 | Einstellung **Größe** (normal, groß) für Full-HD- und 4K-Bildschirme | C | 2 | S |
| U10 | **Beamer-Ansicht** mit großen Schriften für Live-Stunde, Gruppen, Zufall, Countdown | C | 2 | M |
| U11 | **Freihandzeichnen** mit dem Apple Pencil (Skizze im Sitzplan, handschriftliche Randnotiz als Bild) | K | 3 | L |
| U12 | Touch auf den 4K-Tafeln nur für Timer o. ä. | K | 3 | S |
| U13 | **Dunkelmodus** der neuen Mitarbeitsfarben ableiten (Kontrast und Rot-Grün-Schwäche sind laut Konstantin erledigt, E60) | C | 2 | S |
| U14 | **Schullogo als Vektordatei** beim Sekretariat oder auf der Schul-Webseite erfragen | K | 2 | S |
| U15 | Eigene Marken im Zeitbalken (z. B. „Gruppenarbeit bis 09:15“), nur auf Wunsch, nie als feste Phasen | C | 3 | S |

## Aus der UPZ-Analyse (09.11.2026)

Details: [UPZ_ANALYSE.md](UPZ_ANALYSE.md), Testwerte: [testfaelle/upz_referenzwerte.json](testfaelle/upz_referenzwerte.json). Ziel: möglichst alle Kollegen mitnehmen (UPZ, Papier, iDoceo, eigenes Excel).

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| UPZ-1 | **Rechenprofile OSZ und FOS** genau nach UPZ (E64), IHK nur als unauffällige Zusatzoption | K | 1 | M |
| UPZ-2 | **Notenschlüssel als Daten** je Bildungsgang (E63) | K | 1 | S |
| UPZ-3 | **UPZ-Import** (Namen, Noten, Fehlzeiten aus der Excel-Datei), siehe I28. Entwurf 27.11. (V20): Namen und Noten ja, Fehlzeiten bewusst nicht (WebUntis) | K | 2 | M |
| UPZ-4 | **Teilpunkte je Aufgabe** mit Aufgabenanalyse, Notenspiegel und Schlüssel mit halben Punkten | K | 2 | M |
| UPZ-5 | **Fehlzeiten-Logik** wie UPZ plus „N“ im Zeugnis bei über 30 % (E62, Quelle WebUntis): „x“ = nicht angerechnet, Schwellen 15/20/30 %, Datum für Infobrief, Übertrag ins 2. Halbjahr automatisch | K | 1 | M |
| UPZ-6 | **Terminrechner**: G/U-Wochen, Berliner Ferien, Stunden je Termin | K | 2 | M |
| UPZ-7 | **Unterrichtsplan / Stoffverteilung** je Termin, ohne dass Verschieben Einträge zerstört | K | 3 | M |
| UPZ-8 | **Einreichen-PDFs** (KA und Klausur) mit Notenverteilung und Anteil 5/6 | K | 2 | M |
| UPZ-9 | **Druckansichten**: Zeugnislisten für Fachlehrer (Ersatz der UPZ-Zensurenliste, Konstantin 09.11.2026) und für Kollegen mit Papier-Notenbuch | K | 3 | S |
| UPZ-10 | **Allgemeiner Excel-Import-Assistent** für eigene Dateien. Entwurf 27.11. im Modul Import (V20) | K | 3 | L |
| UPZ-11 | **Halbjahresdurchschnitt** über alle Fächer | K | 3 | S |
| UPZ-12 | **Mitarbeit:** L.E.O. bildet aus Monatsnoten eine Gesamtmitarbeit und reicht sie ins Profil weiter (die UPZ kennt nur eine Gesamtangabe), Gewichtung frei | K | 1 | S |

## Aus dem Prototyp-Feedback (09.11.2026)

Quelle: [prototyp-feedback/2026-11-09.md](prototyp-feedback/2026-11-09.md), Entscheidungen E65–E71, offene Fragen in [FRAGEN_SCHULE.md](FRAGEN_SCHULE.md). **Die Prioritäten folgen dem Vorschlag im PDF (P0 → 1, P1 → 2, P2 → 2/3) und sind nicht von Konstantin bestätigt.** Gebaut wird erst nach der Modulplanung (Notenbuch: Fr 13.11.2026, 10:00). Das Notenbuch ist ausdrücklich Teil dieser Planung, keine Umbauliste für den Prototyp.

| # | Punkt | Herkunft | Prio | Aufwand |
|---|---|---|---|---|
| PF1 | **Notenbuch: Eingabe und Anzeige als Note (OSZ) oder Notenpunkte (FOS)**, Umrechnung aus Rohpunkten nur im Rechenkern, Baum-Aufbau nach Referenz (E65) | K | 1 | L |
| PF2 | **Notenbuch-Aufbau nach altem Baum-Notenbuch:** Gruppen Klausuren / AT (Mitarbeit ½, Tests ½), Ø-Spalten, Live-Gesamtnote mit Vorschlag, „Profil & Gewichte“ bleibt (E65) | K | 1 | M |
| PF3 | **Schülerkarte ohne Rechenweg und ohne Endnote-Kachel**, Notenübersicht mit fünf Werten (Klausur 1, 2 ganz; AT, Mitarbeit, Tests/Sonstiges dezimal) (E69) | K | 1 | S |
| PF4 | **Fünf Smileys = Noten 1 bis 5** (Smiley 1 = Note 1, kein „6 − Stufe“), Durchschnitte überall als Note, Prototyp-Zählung umdrehen (E72) | K | 1 | S |
| PF5 | **Mitarbeitsübersicht verdichten:** letzte 6–8 Stunden als Smileys, davor Monatsfeld (Durchschnitts-Smiley oder eingetragene Monatsnote), rechts Trendpfeil und Durchschnitt (E67) | K | 1 | M |
| PF6 | **Monatsnote vorschlagen ausbauen** (exakter Durchschnitt als Vorschlag, Lehrkraft entscheidet, E73): Monatsauswahl, „Alle übernehmen“, Haken je Zeile, Stift je Zeile, übernommene Note erscheint im Monatsfeld (E68) | K | 1 | M |
| PF7 | **Doppelklick aufs Smiley öffnet Textbausteine und Kommentar**, Einfachklick speichert ohne Verzögerung; am Touch langer Druck statt Doppeltipp (E66, E73) | K | 1 | S |
| PF8 | **Textbausteine mit Komma trennen**, pro Kategorie 1–2 Bausteine mehr (liefert Konstantin, E53) | K | 1 | S |
| PF9 | **Lernstoff-Kachel** in der Live-Stunde: Textfeld oder Diktat, dazu wählbar Hausaufgabe (E78), pro Stunde gespeichert, in der Kurshistorie wiederfindbar (E70) | K | 2 | M |
| PF10 | **Übergang in die nächste Stunde:** kurze Notiz am Kurs („Aufgabenblock A bis Nr. 4 verglichen“), nächste Stunde zeigt „Weiter bei: …“, nur für die Lehrkraft (E70, E78); Ort der Anzeige (Kachel oder Tagesplan) noch offen | K | 2 | M |
| PF11 | **Spaltenkopf anklickbar:** Menü mit Name, Datum, Gewichtung, Typ (E71) | K | 2 | S |
| PF12 | **„Neue Leistung“ als schnelles Interaktionsmenü** (Test, Präsentation, Abgabe, Klausur), auch für zukünftige Termine; verzahnt mit NB19 in [NOTENBUCH_BEDIENUNG.md](NOTENBUCH_BEDIENUNG.md) (E71) | K | 2 | M |
| PF13 | **Kalender** (Klausurtermine, zukünftige Leistungen), **viel später, nach dem Notenbuch (E76)**, Quelle offen: lokal, IServ oder anderer; Schnittstelle zu UPZ-6, F-Kalender, U1 (E71) | K | 2 | L |
| PF14 | **Raumplan-Editor** für den Sitzplan (Tische, Reihen, Gang, Tafel, Tür, Plätze; Details offen), E7 „Sitzplan muss einfach sein“ beachten, System muss intuitiv und einfach sein, noch zu entwerfen (E71, E76) | K | 3 | M |
| PF15 | **PDF-Report je Schüler**, eine Seite, per Mail versendbar; **3–4 Designvorschläge erstellen (E74)**, Inhalt offen, Datenschutz beachten (nur eigene Noten, E29), verzahnt mit UPZ-8 und E-Mail-Modul (E69) | K | 2 | M |
| PF16 | **Historie in der Notenübersicht:** Halbjahr und Vorjahr wählbar, nur eigene Noten (E75), alte Halbjahre fest und nur nach ausdrücklicher Warnung änderbar (mit Bestätigung und Eintrag im Verlauf), Halbjahr-ID im Datenmodell, passt zu E21 (E71) | K | 2 | M |
| PF17 | **Ruhigerer Smiley-Artstyle:** **fünf Stilvarianten entwickeln, beste wählen (E73)**, weniger expressiv, Stufen und Farben bleiben (E52, E60), auch ohne Farbe unterscheidbar | K | 2 | S |
| PF18 | **Mobil-Test** auf iPad, iPhone und Schul-PC (Navigation, 44-px-Tippziele, Handy-Notenliste, Beamer); danach Entscheidung zur Navigation (E54) | K | 2 | S |
| PF19 | **Firefox und echte 4K-Tafel testen** (E56), bisher nicht getestet | C | 3 | S |
| PF20 | **Rechenpfad prüfen:** UPZ-Referenzwerte stammen aus LibreOffice, nicht aus Excel; Gegenprüfung mit Excel der Kollegen einplanen | C | 2 | S |
| PF21 | **Schülersuche** bleibt (von Konstantin gelobt), bei Modulplanung als gemeinsame Funktion mitdenken | K | G | S |
| PF23 | **Rechenweg hinter Info-Knopf** in der Schülerkarte, freiwerdenden Platz sinnvoll nutzen (E74) | K | 1 | S |
| PF24 | **Platzhalter Startseite** mit Kachel „Kalender folgt später“ (V9, zu bestätigen) | C | 2 | S |
| PF25 | **Beamer-Modus** nur mit Gruppenauslosung, zufälligem Namenziehen (gern als Rad) und Timer (E78); verzahnt mit U10 | K | 2 | M |
| PF22 | Plan und Entwurf 26.11. (V15, [MODULE.md](MODULE.md)). **Modul-Abgrenzung:** Lernstoff/Übergang (Stunde), Kalender, Raumplan (Sitzplan), Historie (Notenbuch) so schneiden, dass Nutzer Module abwählen können (Projektregel), z. B. Notenbuch ohne Kalender | C | 1 | S |

## Aus dem Prototyp 0.4 und dem Brainstorming (17.11.2026)

Quelle: Thread „Abgespeckten Prototyp für Unraid bauen“ und Feature-Brainstorming im Projektchat. Status: **im Prototyp** = im abgespeckten Prototyp (`app/`) eingebaut, zum Testen; endgültig erst nach der Modulplanung.

| # | Punkt | Herkunft | Prio | Aufwand | Status |
|---|---|---|---|---|---|
| PB1 | **Wo sind wir stehengeblieben:** Notiz am Kurs (Klasse + Fach), erscheint in der nächsten Stunde oben und auf der Startseite (konkretisiert PF10) | K | 1 | S | im Prototyp, Stand je Tag im Rückblick (E114); eigenes Modul mit Merkern, Nachtrag und Verlauf als Entwurf (V18) |
| PB2 | **Was-wäre-wenn:** welche Note in einer offenen Leistung nötig ist, um eine Gesamtnote zu erreichen (I36) | C, K bestätigt | 1 | S | im Prototyp (Rechenweg-Fenster) |
| PB3 | **Warnampel:** unter der Grenze, auf der Kippe, zu wenige Noten; Fehlzeitengrenze in der Schülerkarte (I37, Q6) | C, K bestätigt | 1 | S | im Prototyp |
| PB4 | **Nachschreiber-Liste** bei E an Klausuren (I44), mit Namen und Termin | C, K bestätigt | 1 | S | Zähler im Prototyp, Liste offen |
| PB5 | **Trendpfeil Mitarbeit** (letzter Monat gegen Vormonat) | C, K bestätigt | 2 | S | im Prototyp (Handy-Liste) |
| PB6 | **Hinweis „heute noch nicht bewertet“** mit Filter in der Live-Stunde (erweitert E55) | C, K bestätigt | 1 | S | im Prototyp |
| PB7 | **Schnellgruppen:** zufällig oder leistungsgemischt, nur Anwesende | K | 1 | S | im Prototyp |
| PB8 | **Fairer Zufall:** nur Anwesende, niemand doppelt, bis alle dran waren | C, K bestätigt | 1 | S | im Prototyp |
| PB9 | **Gesprächsvorbereitung:** eine Seite je Schüler mit Noten, Fehlzeiten, Mitarbeit, Notizen für Eltern- oder Schülergespräch (verzahnt mit PF15 PDF-Report) | C, K bestätigt | 2 | M | offen |
| PB10 | **Bausteine zu Formulierungen:** aus gesammelten Textbausteinen Sätze für Rückmeldung oder Gespräch vorschlagen, ohne Schülernamen an KI-Dienste | C, K bestätigt | 3 | M | offen |
| PB11 | **Wochenrückblick:** was diese Woche erfasst wurde, wer ohne Mitarbeitseintrag blieb, offene Nachschreiber | C, K bestätigt | 2 | S | offen |
| PB12 | **Verschlüsselter Export** der lokalen Daten (Passwort), weil die Daten nur im Gerät liegen (E79) | C, K bestätigt | 1 | M | gebaut 20.11. (F3, E102): verschlüsselte Datei + 7 Tagesstände |
| PB13 | **Stundenplan als Wochenübersicht oder Liste**, gekoppelt mit WebUntis/IServ | K | 1 | M | Woche/Tag umschaltbar im Prototyp (19.11., Entwurf A+B), Quelle WebUntis |
| PB14 | **Kalender** mit WebUntis/IServ gekoppelt, um Stunden dort vorzubereiten (ergänzt PF13, E76) | K | 2 | L | im Prototyp (E115): Monat im Stundenplan, ICS-Datei hin und zurück |
| PB15 | **Stundenplanung:** jede kommende Stunde planbar (Stoff, Hausaufgabe, Material), erscheint in der Live-Stunde als Lernstoff | K | 1 | M | im Prototyp (E114); Material/Dateien als Vorschlag V14 |
| PB16 | **Semesterplanung:** wie viele Blöcke habe ich mit der Klasse im Halbjahr (ohne Ferien, Feiertage, Ausfälle), damit der Unterricht danach geplant werden kann | K | 1 | M | im Prototyp (E114): WebUntis-Termine und -Ferien, Unterrichtsreihen; mit echtem WebUntis ungetestet |
| PB17 | **Live-Stunde: Werkzeuge für die Stunde** sammeln (Zufall, Gruppen, Timer, Beamer-Modus PF25, Lernstoff, Übergang); was fehlt noch? | K | 1 | M | teilweise im Prototyp |
| PB18 | **Abgleich zwischen Geräten** (Handy, iPad, PC) trotz lokaler Daten: Datei, eigener Sync-Dienst auf dem Unraid oder Ende-zu-Ende-verschlüsselt (E79, V10) | C | 1 | L | gebaut 20.11. (F4, E103): eigener Dienst auf dem Unraid, Ende-zu-Ende-verschlüsselt; ungetestet auf Unraid/iPad |
| PB19 | **App-Pakete** für Windows/macOS (Tauri) und Android/iOS (Capacitor) aus derselben Browser-App (E79) | C | 2 | M | offen |

## Aus dem Testinstanz-Feedback (18.11.2026)

Quelle: [prototyp-feedback/2026-11-18.md](prototyp-feedback/2026-11-18.md), Entscheidungen E81–E90.

| # | Punkt | Herkunft | Prio | Aufwand | Status |
|---|---|---|---|---|---|
| FB1 | Lokale Anmeldung, Sperre, später IServ-SSO und Verschlüsselung der lokalen Daten mit dem Passwort (E81) | K | 1 | M | Passwort, Sperre, Verschlüsselung (F2) und verschlüsselt gemerkter WebUntis-Schlüssel gebaut; IServ-SSO offen |
| FB2 | Tagesübersicht als Stundenleiste (E82) | K | 1 | S | in 0.5 |
| FB3 | Suche Strg+K (E90) | K | 1 | S | in 0.5 |
| FB4 | Sitzplan-Editor mit Vorlagen und Drag and Drop (E86), Raumvorlagen später je Raum teilen | K | 1 | L | Grundfassung in 0.5; eigene Vorlagen („Als Vorlage merken“, für alle Klassen) seit 19.11. |
| FB5 | Live-Stunde: Liste/Sitzplan umschaltbar (E86) | K | 1 | S | in 0.5; Liste heißt „Alphabet“, im Sitzplan Schalter Anwesenheit/Mündlich (19.11.) |
| FB6 | Anwesenheit da/fehlt, Verspätung mit Uhrzeit (E84); E/UE später aus WebUntis | K | 1 | S | in 0.5; Zeitvorschläge jetzt/+5…+30 min (19.11.) |
| FB7 | **Mündliche Leistungen kriterienorientiert:** Rasterbogen (Kriterien, Mitarbeit ist eines), Selbsteinschätzungsbogen für Schüler zum Verteilen, Vergleich Selbst-/Fremdeinschätzung (E85, verzahnt mit BEWERTUNGSBOEGEN.md) | K | 1 | L | Raster springt ein (E110) im Prototyp, 25.11.2026; Selbsteinschätzung per Link gebaut (FB7b, E116) |
| FB7b | **Selbsteinschätzung per Link** (E111): Einmal-Link per Mail an die IServ-Adresse, Formular auf dem eigenen Server, Antworten verschlüsselt ohne Namen, Erinnerung an die Fehlenden, Selbst- und Fremdbild nebeneinander mit markierten Abweichungen | K | 1 | L | gebaut 25.11.2026 (E116), ungetestet auf Unraid und echten Schülerhandys |
| FB7c | **Raster vorbefüllen** aus Smileys und Bausteinen je Kriterium (Weg 3), Lehrkraft bestätigt oder tippt um | K, C | 2 | M | offen |
| FB7d | **Raster aus Word/PDF hochladen** und als Entwurf übernehmen (BEWERTUNGSBOEGEN 4) | K | 2 | M | offen |
| FB8 | Klausuren : AT fest 50 : 50, nur mündlich : Tests frei (E83) | K | 1 | S | in 0.5 |
| FB9 | Einzelgewicht frei eingeben | K | 1 | S | in 0.5 |
| FB10 | Ø-Kachel mit Noten und Was-wäre-wenn (E89) | K | 1 | M | in 0.5 |
| FB11 | Was-wäre-wenn für alle Leistungsarten | K | 1 | S | in 0.5 |
| FB12 | „Klassen“ statt „Kurse“ (E87) | K | 1 | S | in 0.5 |
| FB13 | Schülerkarte: Kacheln klickbar, Reihenfolge Klausur 1, Klausur 2, AT, mündlich Ø, Tests Ø; Verlaufsgraph mündliche Noten | K | 1 | M | in 0.5 |
| FB14 | Verspätungsübersicht mit Wochentagsanalyse | K | 1 | S | je Schüler in 0.5; für die ganze Klasse im Reiter „Anwesenheit“ (19.11.) |
| FB15 | Mitarbeitsverlauf kräftiger, Trendpfeil, Monat aufklappbar (E88) | K | 1 | S | in 0.5; Trendpfeil farbig, auch in Live-Stunde (19.11.) |
| FB-N1 | **Rechenweg aufklappbar mit allen Zahlen:** Klausuren, AT (darunter mündlich und Tests), Gesamt; jede Stufe zeigt Formel, Gewichte und warum ein Eintrag nicht zählt (E, leer, Gewicht 0). In Gesamtnote-Fenster und AT-Kachel der Schülerkarte. Gewichte-Fenster zeigt den Anteil an der Gesamtnote und Vorlagen 60:40, 50:50, 40:60 | K (Feedback 18.11.) | 1 | S | im Prototyp, 19.11.2026 |
| FB-N2 | Was-wäre-wenn auch mit eingetragenen Noten („Klausur 1 eine 3 statt 5?“), Umschalter; Was-wäre-wenn auch an den Klausur-Kacheln der Schülerkarte | K (Feedback 18.11.) | 1 | S | im Prototyp, 19.11.2026 |

## Aus dem WebUntis-Abgleich (19.11.2026)

| # | Punkt | Herkunft | Prio | Aufwand | Status |
|---|---|---|---|---|---|
| WU1 | **Heute: ausgefallene Stunden** aus WebUntis nicht als „läuft gerade“ zeigen, sondern als Ausfall (im Stundenplan schon so); nächste Verbesserungsrunde | K | 1 | S | erledigt 19.11. (Heute und Live-Stunde) |
| WU2 | **Automatischer Abgleich** beim Öffnen, braucht verschlüsselt gespeicherten Schlüssel (FB1) | C | 1 | M | ✅ umgesetzt 20.11. (E108): beim Entsperren, beim Zurückkehren in den Tab und alle 30 Minuten, Schalter unter Mehr › WebUntis |
| WU3 | **Doppelsteckung:** beide Lehrkräfte dürfen Abwesenheiten eintragen, meist ist eine verantwortlich; Klassenliste kommt aus Einträgen aller Lehrkräfte der Stunde | K | 1 | S | im Prototyp (PR #15) |

## Offen

| # | Punkt | Herkunft | Prio |
|---|---|---|---|
| O1 | Dateiablage je Stunde: Konzept als Vorschlag V14 ([MODUL_DATEIABLAGE.md](MODUL_DATEIABLAGE.md)), Prototyp als Entwurf; EWH-Inhalte bleiben draußen | K, B | ? |
| O2 | Abiturprüfung: Excel-Tabellen mit der Gewichtung schickt Konstantin später, nicht dringend | K | 3 |

## Verworfen

| Punkt | Grund |
|---|---|
| Gutachten und Zeugnistexte | nicht benötigt (Brainstorm) |
| Monatsnoten als Pflicht | Rhythmus frei wählbar (E20) |
| I33 „Wer sieht das?“-Symbol | Noten sieht ohnehin nur die Lehrkraft (E29) |
| I35 „Wer hat meine Kurse angesehen?“ | entfällt, niemand außer der Lehrkraft sieht sie (E29) |
| Schulleitung sieht Endnoten | ersetzt durch E29 |
| EWH-Inhalte (Klausurarchiv, Bausteinkatalog für Klausuren) | L.E.O. ist eigenständig (Brainstorm) |
| Klausur-Assistent (Brainstorm 17.11.2026) | nicht benötigt (Konstantin) |
| Design-Vorschläge in der Planung | anfangs nicht gewünscht; seit E48 gibt es eine Designsprache (docs/DESIGN.md) |
