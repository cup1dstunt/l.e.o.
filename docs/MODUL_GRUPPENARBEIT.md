# Modul Gruppenarbeit (P9, E118)

Stand 25.11.2026, im Prototyp. Bilder: Projektordner `leo/gruppenarbeit/`.

## Wofür
Gruppen, die länger als eine Stunde bestehen (Podcast, Präsentation, Projekt über 2–3 Blöcke bis ein Halbjahr), festhalten, ihren Stand notieren und am Ende benoten. Die Note ist eine ganz normale Note unter Sonstiges (FOS 15–0). Bewertet werden das **Handlungsprodukt** (einmal je Gruppe) und die **Arbeitsweise** (je Person; die Beteiligung der Einzelnen gehört dazu). Wie viel Prozent welcher Teil zählt, legt die Lehrkraft fest (Konstantin 26.11.).

## Ablauf
1. **Anlegen** im Reiter „Gruppenarbeit“ der Klasse oder in der Live-Stunde mit „Als Projekt festhalten“. Gruppen: aus der Stunde, aus gespeicherten Gruppen oder neu (ganze Klasse, je 2–6, leistungsgemischt, mit den Gruppenregeln).
2. **Während des Projekts:** Gruppen im Sitzplan zeigen (Live-Stunde zeigt „Projekt läuft“), Name und Thema je Gruppe, „Stand der Gruppe“ als datierte Notiz, Nachzügler und Wechsel per Antippen.
3. **Bewerten:** Handlungsprodukt mit dem Raster der Gruppe. Arbeitsweise: Stufe für die Gruppe als Vorgabe, je Person änderbar (z. B. Beteiligung). Anteil Handlungsprodukt : Arbeitsweise frei (Standard 50 : 50), Gewichte je Kriterium frei. Daneben: Fehlzeiten, Smileys, Verspätungen im Projektzeitraum. Eigene Raster: Bereiche mit „je Person bewerten“ zählen zur Arbeitsweise.
4. **Abschließen:** „Ins Notenbuch übernehmen“ (eine Spalte unter Tests/Sonstiges oder mündlich, wiederholbar), Rückmeldung per Mail je Schüler.

## Rechnung
Handlungsprodukt und Arbeitsweise je als gewichteter Durchschnitt der Stufen (1–4), dann nach dem Anteil zusammen; fehlt ein Teil, zählt der andere allein. Umrechnung: FOS Stufe 4 = 15, 3 = 11, 2 = 7, 1 = 3 Punkte (linear, kaufmännisch gerundet); OSZ Stufe 4 = Note 1 bis Stufe 1 = Note 5. Code: `app/src/lib/projekt.ts`, Tests: `app/tests/projekt.test.ts`.

## Verzahnung
| Modul | Wie |
|---|---|
| Gruppen/Zufall (P7, P8) | Projekt nutzt einen Gruppensatz für den Sitzplan; Projektsätze werden nicht gekürzt |
| Live-Stunde | Hinweis „Projekt läuft“, Gruppen zeigen, „Als Projekt festhalten“ |
| Mündlich (FB7) | Projekt als Beleg beim Kriterium Zusammenarbeit; Projektraster getrennt von mündlichen Rastern |
| Notenbuch | eine Spalte, Art „Projekt“, Gewicht dort änderbar |
| Fehlzeiten/Mitarbeit | Belege je Mitglied im Projektzeitraum |
| Mail (E105) | nur schulische Adresse, Vorlage mit Platzhaltern, vor dem Senden änderbar |

## Offen
- Selbst- und Partnereinschätzung der Gruppen per Link (mit FB7b).
- Ungetestet auf iPad; PC und Handy-Breite im Browser geprüft.
