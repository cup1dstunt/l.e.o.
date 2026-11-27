# Modul „Wo wir stehengeblieben sind“

> Stand 27.11.2026. Vorschlag **V18**, im Prototyp als Entwurf gebaut. Gilt, wenn Konstantin nach dem Test zustimmt.
> Grundlage: Prototyp-Feedback 09.11. (E70, PF10), PB1, E114 (Stand je Tag im Rückblick). Bilder: [konzept/stundenstand/](konzept/stundenstand/).

## 1 Wozu

Am Ende der Stunde ein Satz, wo die Klasse steht („Aufgabenblock A bis Nr. 4 verglichen“). Die nächste Stunde derselben Klasse beginnt damit.
Am OSZ liegen zwischen zwei Stunden einer Klasse oft Wochen (Blockunterricht, Ferien). Gerade dann hilft der Stand mehr als jede Planung.

Grundsätze:
1. **Antippen statt eintippen.** „Wie geplant“ übernimmt das geplante Thema mit einem Tipp, „Nur zum Teil“ setzt den Anfang und springt ins Feld.
2. **Nichts geht verloren.** Der Stand wird beim Tippen gespeichert, „Stunde abschließen“ ist dafür nicht mehr nötig.
3. **Vergessen wird aufgefangen.** Ist eine Stunde vorbei und hat keinen Stand, fragt Heute danach, ohne Dialog.
4. **Nur für die Lehrkraft** (E70). Keine Schülernamen nötig, nichts geht an Dritte.

## 2 Was es zeigt

| Wo | Was |
|---|---|
| Live-Stunde, oben | Gelbes Band „Wo wir stehengeblieben sind“: Stand mit Datum („vor 2 Wochen“), Hausaufgabe bis heute, Merker zum Abhaken, heute geplant (Planung), zuletzt gezeigt (Dateiablage). Ab 14 Tagen Pause: „Lange Pause · Stunden davor“ klappt die vorigen Stunden auf |
| Live-Stunde, rechts | Karte „Für die nächste Stunde“: Vorschläge „Wie geplant“ / „Nur zum Teil“, Feld für den Stand, „Reihe braucht 1 Block mehr“ (Planung), Merker „Nicht vergessen beim nächsten Mal“ mit drei häufigen zum Antippen |
| Heute, Kachel „Läuft gerade / Als Nächstes“ | Stand, Hausaufgabe und offene Merker der Klasse |
| Heute, Karte „Wo seid ihr stehengeblieben?“ | erscheint nur, wenn Stunden von heute vorbei sind und keinen Stand haben (Blockstunden zählen als eine, Ausfälle nicht). Ein Tipp auf „Wie geplant“ speichert, sonst Feld + Enter, mit Rückgängig |
| Klassen | je Klasse der aktuelle Stand, offene Merker und die nächste Stunde; Antippen klappt den Verlauf auf (Datum, Stand, Thema, Hausaufgabe, gezeigtes Material) |
| Planung › Rückblick | Stand je Tag (wie bisher), nur wenn das Modul an ist |

## 3 Verzahnung mit anderen Modulen

- **Live-Stunde:** braucht es nicht. Ohne Live-Stunde kommt der Stand über Heute (Nachtrag) und steht in Klassen.
- **Semesterplanung:** liefert das geplante Thema (Thema des Tages, sonst Titel der Reihe) für „Wie geplant“ und „Heute geplant“; „braucht 1 Block mehr“ bleibt dort, wo man merkt, dass man nicht fertig wurde.
- **Dateiablage:** „Zuletzt gezeigt“ im Band und „Gezeigt“ im Verlauf.
- **Stundenplan/WebUntis:** welche Stunden heute vorbei sind, nächste Stunde der Klasse (echte Termine, auch Blockwochen).
- **Modulauswahl:** eigener Eintrag „Wo wir stehengeblieben sind“, Standard an, vorgeschlagen für Papier, iDoceo, eigenes Excel und „Noch nichts“, nicht für UPZ. Ausschalten blendet nur aus.

## 4 Daten

- Stand je Tag: `kurs.lernstoff[datum].stand` (gibt es seit E114). `kurs.uebergang` bleibt als „neuester Stand“ und wird daraus nachgeführt, damit ältere Geräte und Sicherungen weiter passen.
- Neu: `kurs.merker` (id, text, seit). Ein Merker erscheint ab der nächsten Stunde und bleibt, bis er abgehakt ist. Der Abgleich führt Merker je Eintrag zusammen (Abhaken auf dem Handy gilt auch am PC).
- Logik in `app/src/lib/stand.ts`, Prüfungen in `app/tests/stand.test.ts`.

## 5 Grenzen und Ungetestetes

- Zwei getrennte Stunden derselben Klasse an einem Tag teilen sich einen Stand (wie Thema und Hausaufgabe, E114).
- Ein in der Planung vorab eingetragenes Thema zählt nach dem Tag als gehaltene Stunde, auch wenn die Stunde nicht stattfand.
- Der Nachtrag auf Heute fragt nur nach Stunden von heute, nicht nach gestern.
- Die Suche (Strg K) findet Stände noch nicht.
- Getestet mit Beispieldaten im Browser (PC und Handy-Ansicht) und mit Prüfungen; nicht auf einem echten iPad.

## 6 Offen (für Konstantin)

- Passen die drei Merker-Vorschläge („Hausaufgabe kontrollieren“, „Arbeiten zurückgeben“, „Kopien mitbringen“)? Oder lieber die eigenen zuletzt genutzten?
- Soll der Nachtrag auf Heute auch Stunden vom Vortag zeigen (wer abends nachträgt)?
- Ab wie vielen Tagen Pause sollen die Stunden davor angeboten werden (jetzt 14)?
