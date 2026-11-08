# Rechenlogik des Notenbuchs

Stand: 08.11.2026, Entwurf, Fragen 1, 2 und 4 von Konstantin beantwortet (E39–E43). Grundlage: Konstantins iDoceo-Vorlagen ([IDOCEO_ANALYSE](IDOCEO_ANALYSE.md)), E5, E18–E20, E24, E37.
Wird am 09.11.2026 mit den UPZ-Dateien abgeglichen. Offene Punkte sind mit **❓** markiert und stehen am Ende.

Der Rechenkern ist reine Logik ohne Oberfläche und ohne Datenbank: Er bekommt einen Baum und Werte und liefert Ergebnisse.
So lässt er sich vollständig mit Tests absichern, bevor irgendetwas anderes gebaut wird.

---

## 1 Begriffe

| Begriff | Bedeutung |
|---|---|
| **Notenart** | Skala einer Spalte: `punkte_0_15` (0–15, bestanden ab 5) oder `noten_1_6` (1–6, bestanden bis 4) ❓ Tendenzen. Je Bildungsgang festgelegt (E19) |
| **Spalte** | ein Eintrag je Schüler: Klausur, Test, Monatsnote, Referat … |
| **Gruppe** | berechnete Spalte mit Kindern (Spalten oder Gruppen), z. B. „Klausuren“, „Sonstige Leistungen“ |
| **Gewicht** | Zahl ≥ 0 an jedem Kind einer Gruppe. Gewichte sind **relativ** (E41): 50/50, 1/1 und 2/2 rechnen gleich; „10 %“ heißt „zählt ein Zehntel eines normalen Tests“ |
| **Einzelgewicht** | Abweichendes Gewicht für **eine Zelle** (ein Schüler in einer Spalte), z. B. ×0,5. Ersetzt für diesen Schüler das Spaltengewicht (E41) |
| **Wert** | Zahl der Notenart, **leer** oder ein Status (siehe 3) |
| **eingetragene Note** | von der Lehrkraft gesetzt, immer **ganz** (z. B. fest 10 Punkte für eine Klausur oder Monatsnote) (E39) |
| **berechnete Note** | Ergebnis einer Gruppe, **vorläufig**, mit zwei Nachkommastellen (z. B. 9,47) (E39) |
| **festgelegte Endnote** | ganze Note, die die Lehrkraft aus der berechneten Endnote übernimmt (Rundungsvorschlag oder eigene Wahl) (E40) |

Jede Note trägt ihre **Herkunft**: Spalte, Art (Klausur, Test, Monatsnote …), Gruppe, Datum, wer sie eingetragen hat (bei Doppelsteckung).
Das Datum lässt sich je Spalte ein- und ausblenden (E39).

## 2 Berechnung einer Gruppe

```
Ergebnis = Σ (Wert_i × Gewicht_i) / Σ Gewicht_i     über alle Kinder i mit Wert
```

1. **Leere Kinder werden übersprungen**, ihr Gewicht fällt aus dem Nenner. Das gilt auch für Kinder, die selbst Gruppen ohne Ergebnis sind
   (ganzer Zweig leer, z. B. noch keine Klausur: die Gesamtnote besteht dann nur aus dem anderen Zweig, bestätigt).
2. **0 zählt voll** (0 ist ein Wert, nicht leer).
3. Hat **kein Kind** einen Wert, ist die Gruppe **leer** (nicht 0).
4. Gewicht 0 = Spalte wird angezeigt, zählt aber nicht.
5. Gerechnet wird **exakt** (Brüche, keine Gleitkommazahlen). **Zwischenstufen werden nie gerundet**, nur angezeigt (2 Nachkommastellen).
6. **Endnote:** Der Kern schlägt die kaufmännisch gerundete ganze Note vor (9,49 → 9, 9,51 → 10). Bei **genau ,50** schlägt er beide
   Noten vor, und die **Lehrkraft entscheidet** (E40). Erst die festgelegte Endnote ist endgültig; ändern sich danach Noten, zeigt L.E.O. einen Hinweis.
7. Werte unter der Bestehensgrenze werden rot markiert (in der Oberfläche, nicht im Rechenkern; der Kern liefert nur `bestanden: ja/nein`).

## 3 Status an Zellen

| Status | Bedeutung | zählt als |
|---|---|---|
| leer | noch nichts eingetragen | übersprungen |
| **E** | entschuldigt gefehlt, Nachschreiben offen | übersprungen; Schüler auf Nachschreiberliste (bei Klassenarbeiten automatisch, I44/E35) |
| **UE** | unentschuldigt gefehlt | **0** (wie bisher die 0 in iDoceo) |
| Wert | Zahl | Zahl |

Ein Status schließt einen Wert aus. Wird nachgeschrieben, ersetzt der Wert das E. Die Anmerkung an der Zelle bleibt unabhängig davon.

**Vorbehalt (Stern, E42):** Eine eingetragene Note kann einen Stern mit kurzem Kommentar tragen, z. B. „knapp an 11, wenn die Vokabelliste kommt,
denke ich an 11“. Der Stern ändert die Rechnung nicht. L.E.O. sammelt alle offenen Vorbehalte je Kurs und zeigt sie, wenn die Endnote festgelegt wird.

## 4 Konstantins Standardvorlage (FOS, 0–15)

```
Gesamtnote                         Gewicht
├── Klausuren                        50
│   ├── Klausur 1                     1
│   └── Klausur 2                     1
└── Sonstige Leistungen              50
    ├── Mitarbeit                    50
    │   └── Monatsnoten Aug … Jun     je 1   (Rhythmus frei, E20)
    └── Tests und Sonstiges          50
        └── Test 1, Test 2 …         je eigenes Gewicht (E18)
```

Schulvorgabe: 50 % schriftlich, 50 % Allgemeiner Teil. Die Fehlzeiten-Spalten sind **Anzeige**, keine Werte im Baum
(kommen automatisch, E23). Abiturprüfung und Vorhalbjahresnote stehen neben dem Baum und zählen nicht. Die Abiturprüfung hat eine eigene Gewichtung in den Excel-Tabellen
der Schule, die noch unbekannt ist (E43, Excel-Dateien folgen).

## 5 Testfälle

### 5.1 Aus dem Screenshot „2FOS 25-1 Eng“, Gruppe „Tests und Sonstiges“ (gleiche Gewichte)

Erfundene Schüler, Namen weggelassen. Diese Ergebnisse zeigt iDoceo, L.E.O. muss sie genauso liefern.

| # | Test 1 | Test 2 | Ergebnis |
|---|---|---|---|
| T1 | 0 | 15 | 7,50 |
| T2 | 0 | 0 | 0,00 |
| T3 | 15 | 15 | 15,00 |
| T4 | 0 | 13 | 6,50 |
| T5 | 0 | leer | 0,00 (leer übersprungen) |
| T6 | leer | leer | leer (nicht 0) |
| T7 | 0 | 10 | 5,00 |
| T8 | 13 | 15 | 14,00 |

### 5.2 Konstruierte Fälle für die Regeln

| # | Fall | Erwartung |
|---|---|---|
| T9 | Tests 12 (Gewicht 1) und Verspätungstest 0 (Gewicht 0,1) | (12 + 0) / 1,1 = 10,91 |
| T10 | Klausuren leer, Sonstige 9,00 | Gesamt 9,00 (leerer Zweig übersprungen) |
| T11 | Klausuren 6,00, Sonstige 12,00 | Gesamt 9,00 |
| T12 | Klausur 1 = UE, Klausur 2 = 10 | Klausuren 5,00 |
| T13 | Klausur 1 = E, Klausur 2 = 10 | Klausuren 10,00, Schüler auf Nachschreiberliste |
| T14 | Spalte mit Gewicht 0 und Wert 3, sonst 12 | 12,00 |
| T15 | Mitarbeit: Monate 10, 11, leer, 13 | 11,33 |
| T16 | Endnote 9,50 | Anzeige 9,50; Vorschlag 9 **oder** 10, Lehrkraft entscheidet |
| T17 | Endnote 4,50 | Vorschlag 4 oder 5, Lehrkraft entscheidet; Hinweis „entscheidet über Bestehen“ |
| T19 | Endnote 9,49 | Vorschlag 9 |
| T20 | Klausur 1 = 12 mit Einzelgewicht 0,5, Klausur 2 = 6 | Klausuren (6 + 6) / 1,5 = 8,00 |
| T21 | Klausur 11 mit Stern | Rechnung unverändert, Vorbehalt in der Liste |
| T18 | Mitarbeit 8, Tests leer, Klausuren 7 | Sonstige 8,00; Gesamt 7,50 |

## 6 Was der Rechenkern zusätzlich liefert

Alles berechnet, nichts von Hand gepflegt (Leitsatz 8):

- je Gruppe: Ergebnis, `bestanden`, Anzahl fehlender Werte (Q5)
- je Spalte: Notenspiegel, bestanden x von n, Durchschnitt (Überblick wie in iDoceo)
- **Was-wäre-wenn** (I36): Welcher Wert in Spalte X ergibt mindestens Endnote Y? Der Kern rechnet das rückwärts, ohne etwas zu speichern.
- **Warnung** (Q6): Liegt die Endnote nach einer Eingabe unter der Grenze und vorher nicht, meldet der Kern das.
- **Frühwarnliste** (I37): alle Schüler mit Endnote unter der Grenze oder bis 1 Punkt darüber, mit dem schwächsten Zweig als Grund.

## 7 Fragen an Konstantin

1. ~~Runden~~ → E40. 2. ~~Ganzer Zweig leer~~ → übersprungen. 4. ~~Gewichte~~ → E41.
3. **Noten 1–6 (Berufsschule):** Tendenzen oder Dezimalwerte, Endnote ganz gerundet? Konstantin klärt das, eventuell zeigen es die UPZ-Dateien.
5. **Abiturprüfung:** eigene Gewichtung in den Excel-Tabellen der Schule. Konstantin versucht, die Dateien am 09.11.2026 zu bekommen.
