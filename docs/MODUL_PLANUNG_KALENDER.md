# Modul Planung und Kalender

Stand 25.11.2026, Entscheidungen E114 (Planung) und E115 (Kalender). Backlog: PB1, PB14, PB15, PB16, K2–K4, PF13.
Bilder: [konzept/planung-kalender/](konzept/planung-kalender/).

## 1 Wozu

- **Semesterplanung:** Wie viele Blöcke habe ich mit der Klasse in diesem Halbjahr wirklich, und passen meine Unterrichtsreihen hinein?
- **Stundenplanung:** Was ist in welchem Block dran (Thema, Hausaufgabe)?
- **Stundenstand:** Wo sind wir stehengeblieben, und was ist heute geplant?
- **Kalender:** Termine, die den Unterricht betreffen, an einem Ort, ohne sie doppelt zu pflegen.

## 2 Verzahnung

| Wo | Was erscheint |
|---|---|
| Heute, Kachel „Läuft gerade/Als Nächstes“ | Wo ihr stehengeblieben seid, „Geplant: Reihe · Block n von m · Thema“ |
| Heute, Kachel „Demnächst“ | Termine der nächsten 14 Tage (ersetzt den Platzhalter aus V9) |
| Live-Stunde | Banner „Wo wir stehengeblieben sind“ + „Heute geplant“; Lernstoff = Thema des Blocks; „Reihe braucht 1 Block mehr“ |
| Klasse › Planung | Kennzahlen, Zeitstrahl, Reihen, kommende Blöcke, Rückblick mit Stand je Tag |
| Stundenplan › Woche/Tag | Termine über dem Tag |
| Stundenplan › Monat | Kalender mit Formular für eigene Termine, .ics hin und zurück |
| Notenbuch | Klausuren und Tests mit Datum kommen von selbst in den Kalender und markieren den Block |
| Nachschreiben | Termine kommen von selbst in den Kalender |
| WebUntis | echte Stunden im Schuljahr (auch Blockwochen, A/B-Wochen), Ausfälle, Ferien und Feiertage |
| Mehr › Module | Planung und Kalender einzeln abschaltbar, Halbjahresgrenze |

## 3 Rechenweg der Blockzählung

1. Stunden der Klasse im Halbjahr: aus WebUntis (echte Termine), sonst Wochenmuster des Stundenplans.
2. Zusammenhängende Stunden am selben Tag (Pause höchstens 5 Minuten) sind **ein Block**.
3. Ferien und Feiertage: Block entfällt (WebUntis, sonst Beispiel Berlin 2026/27, bitte prüfen).
4. Ausfall: alle Stunden des Blocks laut WebUntis ausgefallen, oder ein unterrichtsfreier Kalendertermin trifft ihn, oder „fällt aus“ in der Planung.
5. Eine Klausur belegt den ersten Block ihres Tages; dieser Block gehört keiner Reihe.
6. Reihen werden der Reihe nach auf die übrigen Blöcke gelegt. Puffer = freie Blöcke − geplante Blöcke.

## 4 Daten

- `kurs.reihen` (Titel, Blöcke), `kurs.untisStunden` (echte Termine), `kurs.lernstoff[datum].stand` (neu).
- Neue Datenart `termine` (verschlüsselt, abgeglichen; der Abgleich-Dienst kennt sie ab diesem Stand).
- `einstellungen.ferien`, `einstellungen.halbjahrGrenze`, `einstellungen.module`.

## 5 Grenzen und Ungetestetes

- Mit echtem WebUntis ungetestet: `getHolidays` und die echten Termine kommen erst beim nächsten Abgleich.
- Thema und Hausaufgabe hängen am Tag: zwei Blöcke derselben Klasse an einem Tag teilen sich ein Thema.
- ICS-Export nur als Datei. Abgleich mit IServ (Abo-Link) und WebUntis-Prüfungen sowie das Auflösen von Wiederholungen: [MODUL_KALENDER_ABGLEICH.md](MODUL_KALENDER_ABGLEICH.md) (V17, Entwurf).
- Beispiel-Ferien enthalten nur Herbst-, Weihnachts- und Winterferien und die gesetzlichen Feiertage.
- Material/Dateiablage je Stunde: eigener Plan [MODUL_DATEIABLAGE.md](MODUL_DATEIABLAGE.md) (V14).
