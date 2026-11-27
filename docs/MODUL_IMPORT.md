# Modul Import: Klassen und Noten übernehmen

> Stand 27.11.2026. Plan und Umsetzung im Prototyp (Entwurfs-PR). Gilt als Vorschlag **V20**, bis Konstantin zustimmt.
> Grundlage: Projektregel „alle Kolleginnen und Kollegen mitnehmen (Papier, iDoceo, UPZ, eigenes Excel)“, BACKLOG S9, S10, UPZ-3, UPZ-10, [UPZ_ANALYSE.md](UPZ_ANALYSE.md), [IDOCEO_ANALYSE.md](IDOCEO_ANALYSE.md), [MODULE.md](MODULE.md).

## 1 Ziel

Wer zu L.E.O. wechselt, hat mitten im Halbjahr schon Noten: in der UPZ-Datei der Schule, in einer eigenen Excel-Tabelle oder in iDoceo.
Das Modul holt **Schülerliste und Noten** aus einer Datei in eine Klasse, ohne Abtippen und ohne Risiko:

1. **Erst Vorschau, dann übernehmen.** Alles auf einer Seite, kein Dialog. Danach „Rückgängig“ in der Hinweisleiste.
2. **Nichts Bestehendes wird überschrieben**, solange die Lehrkraft es nicht ausdrücklich einschaltet. Abweichende Werte sind gelb markiert („bisher 3 → Datei 4“).
3. **Umrechnen statt Raten:** Werte kommen in die Skala der Zielklasse (FOS 0–15, OSZ 1–6), mit den Schlüsseln der UPZ.
4. **Zwischenergebnisse werden nicht übernommen** (Gesamtnote, Durchschnitte). L.E.O. rechnet selbst und zeigt bei der UPZ zum Vergleich, was die Datei ausgerechnet hatte.
5. **Die Datei bleibt im Gerät.** Gelesen wird im Browser, ohne Server und ohne Zusatzbibliothek.

## 2 Quellen

| Quelle | Erkennung | Was übernommen wird |
|---|---|---|
| **UPZ 10.1** | Blätter „Einstellungen“, „Namen“, „Zeugnis“ bzw. „Zeugnis (FOS)“ | Klasse, Fach, Klassenart (OSZ/IHK/FOS), Halbjahr; Namen und Geschlecht; Klassenarbeiten bzw. Klausuren 1–3 mit Gewicht und Datum; SL 1–4 (Titel aus dem Blatt) und die freien Prozentspalten SL 5–10 aus „SL zus.“ mit Gewichten; mündliche Mitarbeit (ein Prozentwert); Gewicht übrige SL : mündlich |
| **Eigene Tabelle** | alles andere (.xlsx oder .csv) | eine Zeile je Schüler. Kopfzeile wird gesucht (Name/Nachname/Vorname), Spalten nach Titel gedeutet |
| **iDoceo-Export** | Dateiname, Text „iDoceo“ oder die Gruppen aus Konstantins Vorlage („Tests und Sonstiges“, „Gesamtnote“) | wie eigene Tabelle; Gruppenspalten (Gesamtnote, Klausuren, Mitarbeit, Tests und Sonstiges) werden als Zwischenergebnis übergangen, Monatsnamen werden Monatsnoten. Smileys, Anmerkungen und Anwesenheit nicht |

### UPZ im Detail (aus der Vorlage, Zelle für Zelle)

- Die Prozente rechnet L.E.O. **selbst aus den Teilpunkten** (Spalten C–R, Höchstpunktzahl Zeile 4, Summe ÷ Höchstpunktzahl, abgerundet auf zwei Stellen), genau wie die Datei. So geht es auch, wenn eine Datei ohne gespeicherte Formelwerte kommt.
- Status wie in der UPZ: „ue“ in Spalte W = **UE**; Text in „Bem.“ (z. B. „krank“) = **E**, Nachschreiben offen; „.“ = noch nicht bewertet (leer). Unbenutzte Blätter (nur Punkte „.“) werden übergangen.
- Klassenarbeiten heißen in L.E.O. „Klausur 1–3“, damit sie in die vorhandenen Spalten einer WebUntis-Klasse passen.
- **Geprüft** am 27.11.2026: Vorlage UpZ 10.1 mit den Referenzwerten aus [testfaelle/upz_referenzwerte.json](testfaelle/upz_referenzwerte.json) gefüllt, mit LibreOffice berechnet, eingelesen: **98 von 98 Einzelwerten** (Prozent → Note bzw. Punkte, UE, krank, leer) stimmen. Zeugnisnote: FOS 13 von 14 gleich (eine Abweichung um einen Punkt, weil L.E.O. jede Leistung umrechnet und die UPZ erst die Prozente zusammenfasst). OSZ deutlich seltener gleich, weil die UPZ in der Berufsschule bis zum Schluss mit Prozenten rechnet und L.E.O. mit dem Notenschnitt (bekannt seit E64/E65). Deshalb zeigt die Vorschau den Vergleich und markiert jeden abweichenden Fall.
- Nicht übernommen: Fehlzeiten (kommen aus WebUntis), Noten früherer Halbjahre (Hinweis), Bemerkungen, Tendenz ±, Teilpunkte je Aufgabe, Unterrichtsplan.

### Eigene Tabelle im Detail

- **Namen:** getrennte Spalten Nachname/Vorname, eine Spalte „Nachname, Vorname“ oder „Vorname Nachname“ (Reihenfolge umschaltbar). Summenzeilen (Durchschnitt, Ø, Anzahl) werden übergangen.
- **Spalten:** „Klausur“, „KA“, „Klassenarbeit“ → Klausur; „Test“, „Referat“, „Präsentation“, „Abgabe“ → Tests/Sonstiges mit passender Art; Monatsnamen → Monatsnote (mündlich) mit Monat; „Mitarbeit“, „mündlich“ einzeln → mündlich. „(50 %)“ im Titel wird Gewicht, ein Datum im Titel wird Datum. Nr., Klasse, Mail, Bemerkung usw. werden gar nicht angeboten.
- **Skala** je Spalte geschätzt: über 15 oder „%“ = Prozent, Tendenz „2-“ oder Dezimalnoten = Noten, sonst Punkte; nur ganze Zahlen 1–6 = Noten mit Hinweis „bitte prüfen“ (in einer Punkte-Tabelle Punkte). Immer umstellbar.
- **Zellen:** Zahl, „2+“, „85 %“, „ue“ (UE), „e“/„krank“/„Attest“ (E), „fehlt“/„n. t.“ (offen), „.“/„–“ (leer). Text wie Smileys wird übergangen und gezählt.
- Umrechnung Note → Punkte nach der üblichen Tabelle (1+ = 15, 1 = 14, 1− = 13 … 5− = 1, 6 = 0); Punkte → Note nach UPZ-FOS-Tabelle; Prozent mit OSZ-, IHK- oder FOS-Schlüssel.

## 3 Ablauf auf der Seite `/import`

1. **Datei wählen** (.xlsx oder .csv). L.E.O. sagt, was es erkannt hat („UPZ-Datei · KBM 25-2 · Wirtschaft · 1. Hj. 2026/27 · 13 Schüler“). Mehrere Blätter: Auswahl als Pillen (iDoceo: „Noten“ zuerst).
   Mit Kennwort geschützte Dateien (die UPZ empfiehlt das) und alte .xls kann der Browser nicht öffnen: klare Anleitung, eine Kopie ohne Kennwort zu speichern.
2. **In welche Klasse?** Vorschlag: gleiche Klasse und gleiches Fach wie in der Datei, sonst die Klasse, in der mindestens die Hälfte der Namen schon steht, sonst „neue Klasse“ (Name, Klasse, Fach, Punkte oder Noten). Mit WebUntis-Verbindung warnt L.E.O., keine doppelte Klasse anzulegen.
3. **Welche Spalten?** Je Spalte: Klausur · Tests/Sonstiges · mündlich · nicht übernehmen, Skala, Zielspalte (neu oder eine vorhandene gleicher Gruppe), Name und Gewicht. Gleichnamige Spalten werden vorgeschlagen.
4. **Schüler:** Zuordnung über Vor- und Nachname (auch vertauscht), dann eindeutiger Nachname. Unsichere oder fehlende als Auswahl: Schüler der Klasse · „+ neu aufnehmen“ · „nicht übernehmen“. In einer bestehenden Klasse wird niemand ungefragt angelegt. Die Tabelle zeigt je Schüler die neuen Werte, gelb die abweichenden, dazu die Note, die L.E.O. danach vorschlägt, und bei der UPZ die Zeugnisnote der Datei.
5. **Übernehmen:** Zusammenfassung (neu, schon gleich, weicht ab), Schalter „Werte aus der Datei übernehmen und die bisherigen ersetzen“ (aus) und „Gewichte aus der Datei übernehmen“ (bei neuer Klasse an), Hinweise. Danach Sprung ins Notenbuch mit „Rückgängig“.

## 4 Schnittstellen

- **Modulregister:** `import` (Standard an, Startwege UPZ, eigenes Excel, iDoceo), Seite `/import`, Sperrkarte bei ausgeschaltetem Modul kommt vom Register.
- **Einstiege:** Klassen („Aus Datei übernehmen“, auch im leeren Zustand), Notenbuch einer Klasse (Pille „Aus Datei übernehmen“ → `/import?kurs=…`), Tipps im Einrichtungsassistenten.
- **Daten:** keine neue Datenart. Schüler bekommen `herkunft: 'datei'` (wie beim Stammdaten-Export, E119), der nächste WebUntis-Abgleich ordnet sie über den Namen zu. Neue Klassen haben kein `untis`. Einzelgewicht und Stern einer Zelle bleiben beim Überschreiben erhalten.
- **Notenbuch:** Klausuren : AT bleibt fest 50 : 50 (E83). Übernommen werden nur Gewichte, die L.E.O. frei kennt (mündlich : Tests, normiert auf 1; Einzelgewichte je Spalte).
- **Code:** `app/src/lib/xlsx.ts` (ZIP und XML lesen, CSV, Windows-1252), `app/src/lib/import.ts` (Deuten, Umrechnen, Zuordnen, Vorschau, Übernehmen), `app/src/routes/import/+page.svelte`, Test `app/tests/import.test.ts`.

## 5 Ehrlich: ungetestet

- **iDoceo-Export:** Aufbau nur aus den Screenshots erschlossen (IDOCEO_ANALYSE). Ein echter Export mit Fantasieschülern wäre der wichtigste nächste Test.
- **Echte eigene Excel-Dateien** von Kolleginnen und Kollegen: Nur mit selbst gebauten Beispielen geprüft.
- **UPZ aus Excel selbst gespeichert** (nicht LibreOffice): Der Leser ist darauf ausgelegt, getestet wurde mit LibreOffice-Dateien.
- **Große Dateien, Zip64**, Dateien mit verbundenen Zellen in der Kopfzeile: nicht geprüft.

## 6 Offen (für Konstantin)

1. **OSZ-Klassen aus der UPZ:** Die UPZ rechnet bis zur Zeugnisnote mit Prozenten, L.E.O. mit dem Notenschnitt. Soll L.E.O. für Klassen aus der UPZ ein Rechenprofil „wie UPZ“ bekommen (Prozente je Leistung speichern)? Vorschlag: ja, als eigener Schritt, weil das den Rechenkern betrifft.
2. **Noten früherer Halbjahre** aus der UPZ (Spalten „vorher“): als Vorhalbjahresnote übernehmen, sobald es dafür einen Platz gibt (E21)?
3. **Mündlich aus der UPZ** kommt als eine Spalte „Mündlich (aus UPZ)“ neben die Monatsnoten. Passt das, oder lieber in den aktuellen Monat?
4. **Wer testet?** Je eine Kollegin oder ein Kollege mit UPZ, eigenem Excel und iDoceo, mit einer Kopie ohne echte Namen.
