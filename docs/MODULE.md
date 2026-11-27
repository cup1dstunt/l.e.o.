# Module: Auswahl pro Lehrkraft

> Stand 26.11.2026. Plan und Umsetzung im Prototyp (Entwurf, Pull Request „Modulauswahl“). Gilt als Vorschlag **V15**, bis Konstantin zustimmt.
> Grundlage: Projektregel Modulplanung, BACKLOG PF22, E114 (Planung und Kalender schon abschaltbar).

## 1 Ziel

Die Kolleginnen und Kollegen kommen von **Papier, iDoceo, UPZ oder eigenem Excel**. Nicht alle wollen alles.
Jede Lehrkraft schaltet ein, was ihr Arbeit abnimmt, und sieht den Rest nicht. Wer nur ein Notenbuch will, bekommt ein Notenbuch.

Grundsätze:

1. **Ausschalten blendet nur aus.** Daten, Rechnung, Abgleich und Sicherung bleiben unverändert. Einschalten holt alles zurück.
   Damit ist Ausschalten gefahrlos und braucht keinen Bestätigungsdialog (ein „Rückgängig“ in der Hinweisleiste reicht).
2. **Die Notenrechnung hängt nie an einem Modul.** Auch mit „Mündliche Leistungen“ aus rechnet das Notenbuch die Monatsnoten-Spalten wie bisher; nur die Smileys und der Vorschlag verschwinden.
3. **Kern ist immer an:** Klassen und Schüler (inkl. Schülerkarte, Suche, Notizen) und das Notenbuch (Herzstück, E37).
4. **Die Auswahl gehört zur Lehrkraft,** nicht zum Gerät: sie liegt in den Einstellungen und wird mit dem Abgleich auf alle Geräte übertragen.
5. **Eine Liste, ein Ort.** Alle Module stehen in einem Register (`app/src/lib/module.ts`). Navigation, Kurs-Reiter, Mehr › Module und der Einrichtungsassistent lesen daraus.

## 2 Die Module

| Bereich | Modul | Was es zeigt | baut auf | Standard |
|---|---|---|---|---|
| Kern | Klassen und Schüler | Klassen, Schülerkarte, Suche, Notizen | – | immer |
| Kern | Notenbuch | Reiter „Noten“, Rechenweg, Endnote | – | immer |
| Unterricht | Live-Stunde | Reiter „Stunde“, Knöpfe auf Heute | – | an |
| Unterricht | Wo wir stehengeblieben sind | Band oben in der Stunde, Karte „Für die nächste Stunde“, Nachtrag und Stand auf Heute, Stand und Verlauf in Klassen ([MODUL_STUNDENSTAND.md](MODUL_STUNDENSTAND.md)) | – | an |
| Unterricht | Sitzplan | Reiter „Sitzplan“, Sitzplan-Ansicht in der Stunde | – | an |
| Unterricht | Mündliche Leistungen | Reiter „Mündlich“, Smileys in der Stunde, Monatsnote vorschlagen, Abschnitt in der Schülerkarte, Mehr › Mündliche Leistungen | – | an |
| Unterricht | Selbsteinschätzung | Schalter und Karte im Reiter „Mündlich“ | Mündliche Leistungen | an |
| Unterricht | Zufall und Gruppen | Zufall, Gruppen, Beamer in der Stunde | Live-Stunde | an |
| Unterricht | Gruppenarbeit | Reiter „Gruppenarbeit“ | – | an |
| Organisation | Fehlzeiten und Verspätungen | Reiter „Anwesenheit“, Abschnitt in der Schülerkarte | – | an |
| Organisation | Nachschreiben | Seite Nachschreiben, Kachel auf Heute, Links in Notenbuch und Schülerkarte | – | an |
| Organisation | Stundenplan | Navigationspunkt „Stundenplan“ | – | an |
| Organisation | Kalender | Monat im Stundenplan, „Demnächst“ auf Heute | Stundenplan | an |
| Organisation | Semesterplanung | Reiter „Planung“, „Heute geplant“ | – | an |
| Organisation | Dateiablage | Material je Reihe, Stunde und Klasse in Planung und Live-Stunde | – | an |
| Organisation | Auswertung (`statistik`) | Auswertungsreiter je Klasse und Vergleich eigener Klassen | – | an |
| Organisation | EWH-Übernahme (`ewh`) | Klausurnoten aus einer CSV übernehmen | – | aus |
| in Vorbereitung | Import | Klassen und Noten aus Excel, UPZ oder iDoceo | – | aus |

Bewusst **kein** Modul:
- **Anwesenheit erfassen** gehört zur Live-Stunde (antippen, wer fehlt). Das Modul „Fehlzeiten“ ist die Auswertung.
- **WebUntis** ist eine Datenquelle, kein Modul. Sie liegt unter Mehr › WebUntis.
- **Heute** bleibt immer, zeigt aber nur Kacheln eingeschalteter Module. Ohne Live-Stunde führt eine Stundenkachel direkt ins Notenbuch.

Standard „an“ heißt: Wer nichts auswählt (oder vor der Modulauswahl schon mit L.E.O. gearbeitet hat), sieht alles wie bisher.

## 3 Abhängigkeiten

Ein Modul kann andere brauchen (`braucht`). Regeln:

- **Wirksam** ist ein Modul, wenn es gewählt ist **und** alle Module, die es braucht, wirksam sind.
- **Einschalten** nimmt nötige Module mit („Live-Stunde mit eingeschaltet, sonst wirkt es nicht“).
- **Ausschalten** lässt abhängige Module in Ruhe. Sie bleiben gewählt, ruhen aber („Zufall und Gruppen ruht, solange das aus ist“) und kommen zurück, sobald das Modul wieder an ist. So geht keine Einstellung verloren.
- In der Liste steht bei abhängigen Modulen „baut auf … auf“, bei ruhenden „ruht, braucht …“.

Abhängigkeiten nur dort eintragen, wo das Modul ohne das andere **gar nicht erscheinen kann** (Zufall lebt in der Live-Stunde). Lose Verbindungen (Gruppenarbeit nutzt gern Gruppen aus „Zufall und Gruppen“) sind keine Abhängigkeit: die Stelle wird einfach nicht gezeigt.

## 4 Navigation

- **Hauptnavigation:** Heute, Stundenplan (Modul), Klassen, Schüler, Mehr, Suche. Fällt ein Punkt weg, rücken die anderen zusammen.
- **Kurs-Reiter** (Noten, Stunde, Sitzplan, Mündlich, Gruppenarbeit, Anwesenheit, Planung, Auswertung) kommen aus dem Register, Reihenfolge wie dort.
- **Seiten eines ausgeschalteten Moduls** (alter Link, Lesezeichen, Suche) zeigen statt der Seite eine ruhige Karte: „Sitzplan ist ausgeschaltet. Deine Daten dazu sind noch da.“ mit „Einschalten“ und „Alle Module“. Kein Fehler, keine leere Seite.
- **Einzelne Kacheln und Knöpfe** fragen `istAn(…)` (z. B. Nachschreiben-Kachel auf Heute, Smileys in der Stunde).

## 5 Einrichtungsassistent beim ersten Start

Erscheint nach dem ersten Passwort, einmalig, ganzseitig (kein Dialog), jederzeit mit „Später“ überspringbar.
Unter Mehr › Module lässt er sich mit „Einrichtung noch einmal durchgehen“ wieder starten.

1. **Womit arbeitest du bisher?** Papier und Stift · iDoceo · UPZ (Excel der Schule) · eigene Excel-Tabelle · noch nichts Festes.
   Ein Tipp wählt den Startweg und springt weiter.
2. **Was brauchst du?** Die Modulliste mit dem Vorschlag des Startwegs, frei änderbar.
3. **Woher kommen deine Klassen?** (nur solange noch Beispieldaten da sind) Aus WebUntis · erst mit Beispieldaten ausprobieren · leer anfangen.
4. **Gut zu wissen:** zwei bis drei Sätze, was in L.E.O. anders ist als im bisherigen Werkzeug, dazu die Liste der eingeschalteten Module. „Los geht’s“ bzw. „Weiter zu WebUntis“.

Vorschläge je Startweg (alles andere aus, Kern immer an):

| Startweg | eingeschaltet | Gedanke |
|---|---|---|
| Papier | Live-Stunde, Mündlich, Sitzplan, Zufall, Fehlzeiten, Nachschreiben, Stundenplan | im Raum antippen statt aufschreiben, wenig Neues auf einmal |
| iDoceo | alles außer Selbsteinschätzung und Semesterplanung | gewohnter Umfang (Notenbuch, Smileys, Sitzplan), dazu Kalender, Dateiablage und Auswertung |
| UPZ | Live-Stunde, Mündlich, Fehlzeiten, Nachschreiben, Stundenplan | Noten und Fehlzeiten im Mittelpunkt, wie in der UPZ |
| Eigenes Excel | Live-Stunde, Mündlich, Fehlzeiten, Nachschreiben, Stundenplan, Semesterplanung | Rechnen und Planen, Rechenweg als Ersatz für eigene Formeln |
| Noch nichts | reguläre Module einschließlich Dateiablage und Auswertung, ohne Selbsteinschätzung; EWH bleibt optional | zum Ausprobieren |

Gespeichert werden `einstellungen.module` (jede Wahl ausdrücklich), `einstellungen.herkunft` und `einstellungen.eingerichtet`.
Wer vor dieser Änderung schon Daten hatte, sieht den Assistenten nicht (`eingerichtet` fehlt → gilt als eingerichtet) und behält alles wie bisher.
„Beispieldaten neu laden“ (Mehr › Sicherung) behält Modulauswahl und Einrichtung.

## 6 Schnittstelle für neue Module

Für die parallel entstehenden Module (Dateiablage, Statistik, Import) gilt:

1. **Eintrag im Register** `app/src/lib/module.ts`: `id` in `MODUL_IDS`, dann in `MODULE` mit `name`, `text` (ein Satz, was es abnimmt), `bereich`, `standard`, bei Bedarf `braucht`, `pfade` (eigene Seiten) und `reiter` (eigener Kurs-Reiter). Solange es nicht fertig ist: `bald: true`, dann erscheint es nur als „in Vorbereitung“. Beim Fertigstellen `bald` entfernen und `standard` festlegen.
2. **Eigene Seiten** unter einem eigenen Pfad (z. B. `/ablage/[id]`) und diesen in `pfade` eintragen. Die Sperrkarte bei ausgeschaltetem Modul kommt dann von selbst.
3. **Stellen in anderen Modulen** (Kachel auf Heute, Abschnitt in der Schülerkarte, Knopf in der Stunde) mit `istAn(d.einstellungen, 'meinmodul')` umschließen. Mehr ist nicht nötig.
4. **Daten** liegen wie bisher als eigene Datenart oder am Kurs; das Modul selbst speichert nichts über seine Sichtbarkeit hinaus. Ausschalten löscht nie.
5. **Startwege:** In `STARTWEGE` entscheiden, für welche Herkunft das Modul vorgeschlagen wird (z. B. Import für UPZ, Excel und iDoceo).
6. **Test:** `tests/module.test.ts` prüft Register, Abhängigkeiten und Startwege; ein neues Modul braucht dort meist nur eine Zeile für seine Pfade.

## 7 Offen (für Konstantin)

- **Notenbuch als Kern:** Soll es Lehrkräfte geben, die L.E.O. ganz ohne Notenbuch nutzen (z. B. nur Sitzplan und Zufall)? Dann müsste die Schülerkarte ohne Noten auskommen. Vorschlag: nein, Notenbuch bleibt Kern.
- **Vorschläge je Startweg** sind geschätzt. Am besten mit je einer Kollegin oder einem Kollegen aus jeder Gruppe kurz durchgehen.
- **Schulweite Vorgaben** (z. B. ein Modul für alle aus, weil die Schule es nicht erlaubt): im lokal-first Prototyp nicht vorgesehen, für den schulweiten Betrieb merken.
- **Tipps im letzten Schritt** sind Entwürfe. Für die Import-Kollegen (UPZ, Excel, iDoceo) wird der Import-Thread eigene Hinweise ergänzen.
