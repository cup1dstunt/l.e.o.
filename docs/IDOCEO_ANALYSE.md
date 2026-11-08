# Analyse: Konstantins iDoceo-Notenbuch

Grundlage: 15 Screenshots vom 08.11.2026 (iPad, erfundene Schüler). Kurse: „2FOS 25-1 Eng“ (1. Jahr), „2FOS 24-1 Eng“ (2. Jahr),
„KA 22-m Englisch“ und die **Vorlagenklasse**, aus der neue Kurse kopiert werden.
Offene Punkte stehen am Ende unter „Fragen“. Was hier steht, ist die Vorlage für L.E.O. (Entscheidung E5).

---

## 1 Aufbau eines Kurses

Ein Kurs hat **Seiten** (Reiter oben), jede Seite ist eine eigene Tabelle mit denselben Schülern:

| Seite | Farbe | Inhalt |
|---|---|---|
| **Noten** | grün | Notenpunkte, Berechnungen, Gesamtnote |
| **Mitarbeit** | blau | eine Spalte je Stunde/Anlass mit Smiley und Anmerkung |
| **Anwesenheit** | gelb | eine Spalte je Datum mit ✓ / ✗ / ⌛ |
| Orga | dunkelblau | nur in der Vorlagenklasse, Inhalt unbekannt |
| Hausaufgaben | lila | nur in der Vorlagenklasse, Inhalt unbekannt |

Jede Schülerzeile zeigt **Name, Alter in Jahren und Monaten** („18 Jahre, 9 Monate“) und eine laufende Nummer.

## 2 Seite „Noten“: Berechnungsbaum

Alle Werte sind **Notenpunkte 0–15** (Notenart „0-15 Leo“, Bestehen ab **5**). Angezeigt mit zwei Nachkommastellen.

```
Gesamtnote (grau)                         gewichteter Durchschnitt, Klausuren 50 % + Sonstige Leistungen 50 %
├── Klausuren (rosa)                      Durchschnitt, gleiche Gewichtung
│   ├── Klausur 1
│   └── Klausur 2
└── Sonstige Leistungen (gelb)            Mitarbeit 50 % + Tests und Sonstiges 50 %
    ├── Mitarbeit (blau)                  Durchschnitt der Monatsnoten
    │   ├── August … Februar              je eine Monatsnote 0–15, von Hand eingetragen
    │   ├── Fehlzeiten (lila)             Halbjahr 1
    │   ├── März … Juni
    │   └── Fehlzeiten (lila)             Halbjahr 2
    └── Tests und Sonstiges (lachs)       gewichteter Durchschnitt mit Einzelgewichten
        ├── Test 1, Test 2 …              mit Datum in der Zelle
        ├── z. B. Verspätungstest 10 %, Verspätungstest 2 50 %,
        └──     Berlin Day Pitch 100 %, Präsentation Marketing 100 %

Daneben, nicht im Baum:
  Gesamtnote (orange) · Abiturprüfung (dunkelgrün) · Gesamtnote X. Halbjahr (türkis, Wert + Datum)
```

**Regeln, die man in den Screenshots sieht:**
- **Leere Zellen werden übersprungen** (bei jeder Berechnung eingeschaltet). Eine **0** zählt dagegen voll mit.
  Verpasste Klausuren stehen als 0 da.
- Werte **unter 5** werden **rot** angezeigt (Ergebnisse und Einzelnoten).
- Einzelne Zellen können **eingefärbt** werden (z. B. rosa Klausurzelle).
- Ein schwarzes Dreieck in der Zellecke = **Anmerkung**. Antippen zeigt sie unten an
  (z. B. „3. Tag: kam zu spät, aber zeigt sich relativ engagiert. Abgabe kam last minute zur last deadline (deutliche Abzüge)“).
- Spalten können ein **Datum in der Zelle** zeigen (Test 1 am 10.12.2025). Optionen: aus / verbergen / zeigen / abgelaufen.
- Jede Gruppe hat einen **Ordner-Knopf** (Anhänge) und ein Menü.
- **Überblick je Spalte:** Notenspiegel 0–15 als Balken (rot unter 5), bestanden x von n mit Prozent, Durchschnitt.
- Es gibt **zwei Notenarten** für 0–15: „0-15 Leo“ und „0-15 grade gerundet“ (vermutlich ganze Punkte).

## 3 Seite „Mitarbeit“

- Eine Spalte je Anlass, Kopf mit **Titel und Datum** (z. B. „Hausaufgabe outline sentences, 17.09.2026“, „Jigsaw Reading“, oder nur das Datum).
- Wert: **fünf Smileys** (dunkelgrün, hellgrün, gelb, orange, rot) oder ein **roter Strich** (vermutlich: nicht da).
- **Anmerkung je Zelle** als Freitext. Dieselbe Anmerkung wird oft für mehrere Schüler wiederholt
  („Tabelle nicht vollständig gemacht, kein Text geschrieben, nur gequatscht“). Genau hier helfen Textbausteine.
- Auch Hausaufgaben laufen hier als Spalte mit.
- Es gibt einen **Gruppenmodus** (Schalter oben links).

## 4 Seite „Anwesenheit“

- Eine Spalte je Datum, Werte **✓ anwesend**, **✗ abwesend**, **⌛ (vermutlich verspätet)**.
- Unabhängig von WebUntis von Hand gepflegt.

## 5 Vorlagenklasse

- Ein leerer Kurs mit der kompletten Struktur. Neue Kurse entstehen per **„Register › Kopieren“**.
- Die Anleitung steht als „Schülername“ in der Liste. Das zeigt: Vorlagen sind dir wichtig, und der Weg in iDoceo ist umständlich.

## 6 Was L.E.O. besser machen kann

| Beobachtung | Idee für L.E.O. |
|---|---|
| Monatsnoten der Mitarbeit werden von Hand eingetragen, obwohl die Smileys daneben stehen | **Vorschlag der Monatsnote aus den Smileys** des Monats, mit einem Tipp übernehmen oder überschreiben |
| Gleiche Anmerkungen werden mehrfach getippt | **Textbausteine**, und eine Anmerkung für mehrere Schüler auf einmal |
| Anwesenheit doppelt (iDoceo und WebUntis) | Anwesenheit aus WebUntis übernehmen, eigene Einträge nur ergänzend |
| Fehlzeiten-Spalten in der Mitarbeit von Hand | automatisch aus WebUntis je Halbjahr |
| Vorlage per Kopie mit Anleitung im Namensfeld | **Vorlagen als eigene Funktion**: „Neuer Kurs aus Vorlage“ |
| Verpasste Klausur = 0, entschuldigt = leer? | Status **E/UE** sichtbar an der Zelle, Nachschreiber-Workflow |
| Rot unter 5, Überblick je Spalte | übernehmen |

## 7 Fragen

1. **Orange „Gesamtnote“, „Abiturprüfung“, „Gesamtnote X. Halbjahr“:** Wie hängen sie zusammen? Ist die türkise Spalte die Zeugnisnote
   des Vorhalbjahres (von Hand)? Fließt die Abiturprüfung in die orange Gesamtnote ein, und mit welchem Gewicht?
2. **Monatsnoten Mitarbeit:** Leitest du sie aus den Smileys ab? Wenn ja, nach welchem Gefühl oder Schema (z. B. dunkelgrün = 13–15)?
3. **Lila „Fehlzeiten“-Spalten:** Was trägst du ein (Stunden, Tage, Text)? Zählen sie in die Note?
4. **0 oder leer:** Ist die 0 bei einer verpassten Klausur ein UE, und bleibt die Zelle bei E leer bis zum Nachschreiben?
5. **„0-15 Leo“ und „0-15 grade gerundet“:** Was ist der Unterschied? Wie wird die Gesamtnote fürs Zeugnis gerundet?
6. **Roter Strich** in der Mitarbeit und **⌛** in der Anwesenheit: „nicht da“ und „verspätet“?
7. **Orga und Hausaufgaben** in der Vorlagenklasse: Was gehört dorthin?
8. Unterscheiden sich die Vorlagen für 1. und 2. FOS-Jahr und für die KA-Klasse, oder ist es dieselbe?
