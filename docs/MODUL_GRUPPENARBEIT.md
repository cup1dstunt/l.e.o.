# Modul Gruppenarbeit (P9, E114)

Stand 25.11.2026, im Prototyp. Bilder: Projektordner `leo/gruppenarbeit/`.

## Wofür
Gruppen, die länger als eine Stunde bestehen (Podcast, Präsentation, Projekt über 2–3 Blöcke bis ein Halbjahr), festhalten, ihren Stand notieren und am Ende fair benoten: Gruppennote aus einem kurzen Raster, Abweichung nur dort, wo jemand mehr oder weniger beigetragen hat.

## Ablauf
1. **Anlegen** im Reiter „Gruppenarbeit“ der Klasse oder in der Live-Stunde mit „Als Projekt festhalten“. Gruppen: aus der Stunde, aus gespeicherten Gruppen oder neu (ganze Klasse, je 2–6, leistungsgemischt, mit den Gruppenregeln).
2. **Während des Projekts:** Gruppen im Sitzplan zeigen (Live-Stunde zeigt „Projekt läuft“), Name und Thema je Gruppe, „Stand der Gruppe“ als datierte Notiz, Nachzügler und Wechsel per Antippen.
3. **Bewerten:** Raster je Gruppe (≤ 5 Kriterien, 4 Stufen, Gewichte je Projekt). Mitglieder bekommen die Gruppennote, ± bis 3 Schritte mit Grund. Daneben: Fehlzeiten, Smileys, Verspätungen im Projektzeitraum.
4. **Abschließen:** „Ins Notenbuch übernehmen“ (eine Spalte unter Tests/Sonstiges oder mündlich, wiederholbar), Rückmeldung per Mail je Schüler.

## Rechnung
Gruppennote wie das mündliche Raster (E113): gewichteter Durchschnitt der Stufen → Smiley-Skala → Note bzw. Punkte. Einzelnote = Gruppennote + Abweichung (FOS: + Punkte, OSZ: − Note), begrenzt auf die Skala. Code: `app/src/lib/projekt.ts`, Tests: `app/tests/projekt.test.ts`.

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
- FOS: Stufe 4 in allen Kriterien ergibt 14 Punkte (Umrechnung wie Smileys, E68). Soll ein Projekt 15 erreichen können?
- Ungetestet auf iPad; PC und Handy-Breite im Browser geprüft.
