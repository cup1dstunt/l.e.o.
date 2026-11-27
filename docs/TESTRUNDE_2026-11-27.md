# Testrunde mit Fantasieklassen (27.11.2026)

> Ziel: alle Module auf `main` gemeinsam mit realistischen Fantasiedaten prüfen, Zusammenspiel und PC/iPad/Handy.
> Projektregel: erst Einzelteile testen, dann zusammenbauen. Gebaut wird nur, was eindeutig ein kleiner Fehler ist (Entwurfs-PR).

## Testdaten

`app/tests/fantasie.ts` erzeugt 7 Klassen mit 115 erfundenen Schülerinnen und Schülern (keine echten Namen),
`docs/testfaelle/fantasie-sicherung.json` ist dieselbe Datei als **unverschlüsselte Sicherung** zum Einspielen
(Mehr › Sicherung einspielen …). Achtung: Einspielen ersetzt die Daten im Gerät, vorher wird ein Stand „vorher“ abgelegt.

| Klasse | Profil | SuS | Besonderheit |
|---|---|---|---|
| BKA 24-1 Wirtschafts- und Sozialprozesse | OSZ | 28 | Klausur 2 geschrieben, beide Klausuren verpasst, Endnote festgelegt, Reihe überplant (200 Blöcke) |
| EH 25-3 Englisch | OSZ | 22 | Blockunterricht (Smileys nur jede zweite Woche) |
| 1FOS 26-2 Englisch | FOS | 31 | mehr Schüler als Tische, gleichnamige Schüler, >30 % Fehlzeiten, Semesterplanung, Material |
| 1FOS 26-2 Wirtschaft | FOS | 31 | dieselbe Klasse im zweiten Fach |
| 2FOS 25-1 Englisch | FOS | 17 | Abschlussjahr, Klausur 2 geschrieben |
| GH 25-1, GH 25-2 Politik | OSZ | 17 | zusammengelegte Klassen, ohne Tests |
| BOS 26-1 Deutsch | FOS | 0 | neue, leere Klasse |

Dazu je Klasse: E / UE / offen bei Klausur 1, Sternvermerk, Einzelgewicht, Probetest mit Gewicht 0, ein Schüler ganz ohne Noten,
einer fast ohne Smileys, Verspätungen immer montags, Fehlzeiten teils aus WebUntis, Doppelname mit Akzent, Geschlecht d,
fehlendes Geburtsdatum, fehlende Schulmail, NTA.

## Was geprüft wurde

1. **Rechenlogik aller Module** (`tests/fantasie.test.ts`, läuft jetzt mit `npm test`): 1.249 Prüfungen, alle grün.
   Notenbuch (keine NaN, Wertebereich, Gewicht 0, ohne Klausur), Auswertung und Klassenvergleich, 30-%-Hinweis,
   Nachschreibefälle aus Notenbuch und Fehlzeiten, Sitzplan, Gruppen (vollständig, ausgewogen, „nicht zusammen“),
   fairer Zufall erreicht alle, Raster, Gruppenarbeit, Semesterplan, Kalender, Material, Modulauswahl,
   Abgleich (zerlegen/zusammensetzen), Stammdaten-Export für zusammengelegte Klassen.
2. **Oberfläche**: alle 68 Seiten (7 Klassen × 8 Reiter + Heute, Stundenplan, Klassen, Schüler, Mehr, Nachschreiben,
   Auswertung, Schülerkarten) auf PC (1440 px), iPad und iPhone. Keine Programmfehler, kein „NaN“/„undefined“
   im Text, kein seitlicher Überlauf.
3. **Zusammenspiel** im Browser: Fehlen in der Live-Stunde → Fehlzeiten; „E“ im Notenbuch → neuer Fall unter Nachschreiben;
   Modul Sitzplan aus → Reiter weg, alte Adresse zeigt die ruhige Karte „ausgeschaltet“; Suche; Neuladen.

**Nicht getestet** (braucht echte Dienste oder Konten): WebUntis- und IServ-Abruf live, Abgleich zwischen Geräten über den Server,
Selbsteinschätzung mit echten Links, Hochladen echter Dateien, Mailversand, EWH-CSV über die Oberfläche, Beamer, Druck.

## Befunde

### Behoben im Entwurfs-PR

| # | Befund | Lösung |
|---|---|---|
| B1 | Leere Klasse (BOS 26-1): Notenbuch zeigt nur Tabellenkopf, kein Hinweis, was zu tun ist. | Hinweis „Noch keine Schülerinnen und Schüler … Mehr › WebUntis“ wie bei Klassen und Stundenplan. |
| B2 | Mehr › Darstellung zeigt interne Nummer: „Hinweis ‚n Schüler ohne Mitarbeitseintrag‘ (E55)“. | Klartext: „Beim Abschließen der Stunde zeigen, wer noch keinen Smiley hat“. |

### Offen, Priorität hoch

| # | Befund | Vorschlag |
|---|---|---|
| B3 | **Handy-Sitzplan bei 8 Spalten unlesbar**: Namen werden zu „K… Y.“ abgeschnitten (Reihen-Vorlage, 390 px). | Am Handy kleinere Schrift und nur Vorname, oder waagrecht scrollen mit fester Platzbreite. Gemeinsam planen. |
| B4 | **Gleichnamige Schüler** (zwei „Bastian Iwanow“ in einer Klasse): Sitzplan und Live-Stunde zeigen zweimal „Bastian I.“, die Suche zwei gleiche Zeilen. | Bei gleichem Kurznamen automatisch unterscheiden (z. B. „Bastian I. ¹/²“ oder Geburtsjahr in der Suche). |
| B5 | **Erledigt (E121).** **Begriff „Mitarbeit“** steht noch an mehreren Stellen, obwohl es „mündliche Leistungen“ heißt: Heute („Mitarbeit-Einträge“, Knopf „Mitarbeit/Anwesenheit“), Live-Stunde („Nur Mitarbeit“, „Mitarbeit heute“, „ohne Mitarbeitseintrag“), Notenbuch („Mitarbeit-Smileys“). | Frage an Konstantin: Sind die Smileys „Mitarbeit“ (ein Kriterium) und darf das so bleiben, oder überall „mündlich“? |

### Offen, Priorität mittel

| # | Befund | Vorschlag |
|---|---|---|
| B6 | **Erledigt (E121).** **Gesamtnote ohne Klausurnote**: Wer nur Smileys hat, bekommt eine Gesamtnote allein aus dem AT. Der Rechenweg schreibt trotzdem „Klausuren 50 % + AT 50 %“. Die Warnung „wenige Noten“ erscheint. | Rechenweg ehrlich: „Klausuren leer, zählt nicht → Gesamt = AT“. Frage: soll ohne Klausur überhaupt eine Gesamtnote erscheinen? |
| B7 | Selbst angelegte zusammengelegte Klasse mit Schrägstrich („GH 25-1/25-2“) wird beim Stammdaten-Export nicht erkannt; nur Komma („GH 25-1, GH 25-2“, so wie WebUntis es liefert) klappt. | Beim Erkennen auch „/“ und „+“ als Trenner nehmen. |
| B8 | Handy: Kurs-Reiter werden rechts abgeschnitten („Gru…“), ohne Hinweis, dass man wischen kann. | Weicher Rand rechts als Wisch-Hinweis. |

### Offen, Priorität niedrig

| # | Befund | Vorschlag |
|---|---|---|
| B9 | Alle Klassen › Auswertung: „5 Leistungen“ zählt den Probetest mit Gewicht 0 mit, die Monatsnoten nicht. | Nur zählende Leistungen zählen oder „5 Spalten“ schreiben. |
| B10 | Sitzplan mit mehr Schülern als Tischen: der Rest steht korrekt unter „Ohne Platz“. Hinweis „Raster vergrößern“ fehlt. | Kleiner Hinweis mit Knopf „+1 Reihe“. |

### Gut gelaufen (kurz)

Notenrechnung OSZ/FOS stimmt auf allen Klassen, Nachschreiben findet E und offen aus Notenbuch und Fehlzeiten (auch dieselbe Klausur in zwei Fächern einer Klasse),
30-%-Regel und „N“ erscheinen, Semesterplanung zeigt Überplanung deutlich, Modul aus/an ohne Datenverlust, Läuft-gerade-Kachel und Stundenplan passen,
Planung, Material und „Wo wir stehengeblieben sind“ greifen in der Live-Stunde ineinander.
