# Analyse der UPZ-Datei (Version 10.1)

Stand: 09.11.2026. Grundlage: die Datei „UpZ Version 10.1.xlsx“, die Konstantin am 09.11.2026 geschickt hat. Mehrere Lehrkräfte der Schule arbeiten damit.
Die Datei selbst liegt **nicht** im Repo (fremde Vorlage, enthält keine Schülerdaten). Hier steht, wie sie rechnet, damit L.E.O. beim Planen und Testen darauf zurückgreifen kann.

Was geprüft wurde: alle 31 Tabellenblätter, jede Formel der Klassenarbeits-, Klausur-, SL-, Zeugnis-, Fehlzeiten- und Termin-Blätter, alle Hinweistexte.
Zusätzlich wurden für alle drei Klassenarten Testwerte eingetragen und mit LibreOffice neu berechnen lassen. Daraus entstehen die Referenzwerte in
[testfaelle/upz_referenzwerte.json](testfaelle/upz_referenzwerte.json) (erfundene Schüler S01 bis S14).
**Nicht getestet:** Verhalten in Excel selbst (nur LibreOffice), Randfälle bei Gleitkommazahlen genau auf einer Notengrenze, Blatt „Zensurenliste“ in der Praxis.

---

## 1 Überblick

- Eine Datei = **eine Klasse, ein Fach, ein Halbjahr**. Für jedes neue Halbjahr wird die Datei neu angelegt (Übertrag der Fehlzeiten von Hand, siehe 4.5). Genau das ist der Bruch, den L.E.O. beseitigen soll (E21).
- Grenzen: höchstens **30 Schüler**, **75 Unterrichtstermine** je Halbjahr, **3 Klassenarbeiten** bzw. **3 Klausuren**, **4 eigene SL-Blätter** plus **6 Prozent-Spalten** für weitere sonstige Leistungen.
- Drei **Klassenarten** (Einstellungen): **1 OSZ**, **2 IHK**, **3 FOS**. Sie bestimmen den Notenschlüssel und welche Blätter gebraucht werden. Nicht benötigte Blätter soll man löschen.
- Gerechnet wird mit **Prozenten** (OSZ, IHK) bzw. **Notenpunkten** (FOS). Die Note kommt immer aus einer Nachschlagetabelle.
- Blattschutz **ohne Passwort** auf Einstellungen, Termine, „SL zus.“ und Zeugnis. Die übrigen Blätter sind absichtlich offen („schnelle Anpassungen“). Die Datei verweist auf Kennwort zum Öffnen als Datenschutz.
- Namen, Geschlecht (w/m → „Fr./Hr.“ vor dem Namen) und eine Bemerkung stehen einmal im Blatt „Namen“ und laufen in alle anderen Blätter.

### Blätter

| Blatt | Zweck |
|---|---|
| Einstellungen | Lehrer, Klasse, Fach, Fachsemester, Klassenart, Notenschlüssel, Schuljahr, Halbjahr, Start und Ende, Stundenraster |
| Namen | Schülerliste (30 Plätze) |
| Unterrichtsplan | je Unterrichtstermin eine Zeile mit Datum, Stunden, Inhalt, Hausaufgabe |
| Zensurenliste | freies Raster: je Unterrichtstermin eine Spalte für Zensuren (z. B. Mitarbeit); Spalten lassen sich für Projektnoten frei einschieben |
| Fehlzeitenliste | Fehlstunden je Termin, Prozent, Ermahnungs- und Infobrief-Daten |
| Klassenarbeit 1–3 (OSZ/IHK) | Punkte je Aufgabe (bis 16), Summe, Prozent, Note, Auswertung, Notenspiegel |
| KA 1–3 einreichen | Formular zum Einreichen der Klassenarbeit (Notenverteilung, Teilnehmer, Anteil 5/6, Unterschriften) |
| SL 1–4 | sonstige Leistung (z. B. Test) mit derselben Mechanik wie eine Klassenarbeit |
| SL zus. | fasst bis zu 10 sonstige Leistungen mit Gewichten zusammen |
| Zeugnis | Klassenarbeiten, SL, mündliche Mitarbeit zur Zeugnisnote, Vorhalbjahresnoten |
| Klausur 1–3, Klausur 1–3 einreichen, SL 1–4 (FOS), SL zus. (FOS), Zeugnis (FOS) | dasselbe für FOS, mit Notenpunkten |
| Termine, Ferientermine | erzeugen die Unterrichtstermine aus dem Stundenraster, Berliner Ferien 2024/25 bis 2033/34 |

## 2 Notenschlüssel (je Klassenart)

Alle Werte stehen auf dem Blatt „Einstellungen“ und sind änderbar. Die Note ergibt sich aus dem **Prozentwert, abgerundet auf zwei Nachkommastellen**, durch Nachschlagen der **größten Grenze, die erreicht ist**.

| Klassenart | ab 0 % | Note 5 | Note 4 | Note 3 | Note 2 | Note 1 |
|---|---|---|---|---|---|---|
| **1 OSZ** | 6 | ab 9 % | ab 45 % | ab 55 % | ab 70 % | ab 85 % |
| **2 IHK** | 6 | ab 30 % | ab 50 % | ab 67 % | ab 81 % | ab 92 % |

**3 FOS** (Notenpunkte 0 bis 15, die Note ist daraus abgeleitet):

| Prozent ab | 0 | 9 | 18 | 27 | 36 | 45 | 50 | 55 | 60 | 65 | 70 | 75 | 80 | 85 | 90 | 95 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Punkte | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| Note | 6 | 5 | 5 | 5 | 5 | 4 | 4 | 3 | 3 | 3 | 2 | 2 | 2 | 1 | 1 | 1 |

Folgen: Note 4 ist in der FOS ab 5 Punkten (45 %) erreicht, 4 Punkte sind Note 5. Das passt zu Konstantins „unter 5 ist nicht bestanden“.
Die Berufsschule rechnet **ohne Zwischennoten**: ganze Noten 1 bis 6. Eine **Tendenz (±)** ist nur eine **von Hand gepflegte Zusatzspalte** (Spalte „±“), sie fließt nirgends in die Rechnung ein.
Zur Orientierung zeigt jede Arbeit unter der Tabelle „ab Prozent / ab Punkte / genau ab“ (Punktegrenzen auf halbe Punkte aufgerundet, „genau ab“ auf 0,1).
Aus den Formeln abgeleitet: Die Hilfszeile „ab Punkte“ rundet nach oben, die Note selbst rechnet mit dem abgerundeten Prozentwert. Bei ungünstigen Höchstpunktzahlen kann beides leicht auseinanderfallen (nicht getestet).

## 3 Statuswerte und Eingabegewohnheiten

| Eingabe | Wirkung |
|---|---|
| leere Zelle / „.“ in der Bemerkungsspalte (Vorgabe) | noch nicht bewertet: **keine Summe, keine Note, im Durchschnitt übersprungen** |
| „krank“ oder beliebiger Text in der Bemerkungsspalte | wie oben: **übersprungen**, nicht 0 (Schutz vor versehentlicher 6) |
| „ue“ in Spalte B (Bemerkung 2) | **unentschuldigt**: zählt als **0 %**, in OSZ/IHK Note 6, in FOS 0 Punkte |
| Spalte „±“ | Tendenz von Hand, ohne Rechenwirkung |
| Weder Punkte noch Status | wird wie leer behandelt |

Das ist **deckungsgleich** mit L.E.O.s E/UE-Modell: E (entschuldigt) entspricht „krank“ (übersprungen, Nachschreiben offen), UE entspricht „ue“ (0).
Ob der Punkt in der Bemerkungsspalte stehen bleibt, ist die einzige „Sperre“, die die Datei kennt. Wer ihn vergisst zu löschen, sieht keine Note (und wundert sich).

## 4 Rechenwege

### 4.1 Einzelne Arbeit (Klassenarbeit, Klausur, SL-Blatt)

1. **Teilpunkte je Aufgabe** (bis 16 Aufgaben), dazu die Höchstpunktzahl je Aufgabe in einer Kopfzeile.
2. Summe = Summe der Teilpunkte. Ohne Bemerkung gilt die Summe, sonst bleibt sie leer.
3. **Prozent = Summe ÷ Höchstpunktzahl, abgerundet auf 2 Stellen** (ROUNDDOWN).
4. Note (bzw. Notenpunkte und Note in der FOS) = Nachschlagen im Schlüssel aus Abschnitt 2.
5. Unten: **Auswertung je Aufgabe** (durchschnittlich erreichter Anteil), **Notenverteilung** (Anzahl je Note) mit Teilnehmerzahl, Mittelwerte, und der Notenschlüssel mit Punktegrenzen.

### 4.2 „SL zus.“: mehrere sonstige Leistungen zu einer Note

- Bis zu **10 Plätze**: SL 1 bis SL 4 kommen aus den eigenen Blättern, SL 5 bis SL 10 sind **freie Prozentspalten** (Beispiele in der Datei: Hausaufgabe, Übung 1, Übung 2, Referat, Hefter, Punktekonto).
- Je Platz ein **Gewichtungsfaktor** in Zeile 4. Voreinstellung: SL 1 = 0,2; SL 2 = 0,2; Hausaufgabe = 0,1; Übung 1 = 0,1; Punktekonto = 0,2; alle anderen 0. **Die Summe muss nicht 1 ergeben.**
- **Grundregel laut Datei: immer Prozentwerte zusammenrechnen, nie Noten.**
- Gewichteter Mittelwert der Prozente. **Leere Plätze zählen nicht mit** (auch ihr Gewicht fällt aus dem Nenner). Wer unentschuldigt fehlt: 0 % eintragen oder „ue“.
- Ergebnis wieder **abgerundet auf 2 Stellen**, danach Note aus dem Schlüssel.

### 4.3 Zeugnisnote, OSZ und IHK (Prozentrechnung)

- **Klassenarbeiten:** gewichteter Durchschnitt der Prozente (Voreinstellung KA 1 = 0,5; KA 2 = 0,5; KA 3 = 0). Leere Klassenarbeit wird übersprungen, „ue“ zählt 0 %.
- **Sonstige Leistungen gesamt:** gewichtet aus „übrige SL“ (Voreinstellung **0,4**) und **mündlicher Mitarbeit (Voreinstellung 0,6)**. Die Mitarbeit wird **als Prozentwert eingetragen** (nicht als Note), und erst dann erscheint die SL-Gesamtnote.
- **Zeugnisprozent = 0,5 × KA-Ø + 0,5 × SL gesamt**, abgerundet auf 2 Stellen, die Note kommt aus dem Schlüssel. Das 50 : 50 ist änderbar.
- Wichtiger Hinweis der Datei: Die Zeugnisnote ist **abschließend pädagogisch festzulegen**. Die Prozentskala der Noten ist nicht linear, besonders bei nicht ausreichenden Leistungen. Weicht die Lehrkraft ab, **überschreibt sie die Formel in der Notenspalte und formatiert auffällig**. (Entspricht L.E.O.s E40/E46: berechnete Note, Lehrkraft legt fest.)
- Platz für **vorherige Halbjahresnoten** (1. bis 5.) zur Orientierung.
- Spalte „Z“: **N** erscheint, wenn die Fehlzeitenquote über 30 % liegt (Bedeutung des „N“ ist in der Datei nicht erklärt, siehe Fragen).

Bei Mitarbeit und SL steckt in der Voreinstellung 40 : 60. Damit ist die **Mitarbeit nur 30 % der Gesamtnote**. Bei Konstantins iDoceo-Aufbau sind es 25 %. Gewichte sind überall frei.

### 4.4 Zeugnisnote, FOS (Notenpunktrechnung mit Rundung in Stufen)

Die FOS rechnet **nicht** mit Prozenten, sondern mit **Notenpunkten**, und **rundet in jeder Stufe kaufmännisch auf ganze Punkte**:

1. **Klausur-Ø** = ROUND( gewichteter Mittelwert der Notenpunkte der Klausuren ), Gewichte wie oben (0,5 / 0,5 / 0). Leere werden übersprungen, „ue“ = 0 Punkte.
2. **SL gesamt** = ROUND( 0,4 × SL-Notenpunkte + 0,6 × Mitarbeits-Notenpunkte ), wobei die SL-Notenpunkte aus „SL zus. (FOS)“ stammen (dort wie 4.2 mit **Prozentrechnung** und anschließender Umrechnung in Punkte) und die Mitarbeit als **Prozent** eingetragen und mit dem FOS-Schlüssel in Punkte verwandelt wird.
3. **Zeugnispunkte** = ROUND( 0,5 × Klausur-Ø + 0,5 × SL gesamt ), danach die Note aus der Tabelle.
4. Die **Prozent-Durchschnitte** in den Spalten daneben sind **nur informativ** und mit einem „X“ in einer Zelle abschaltbar (in der Datei ist das X gesetzt, sie sind also aus).
5. **Verlauf:** Platz für die Zeugnisnoten früherer Halbjahre. Eine Spalte bildet den **Durchschnitt aller eingetragenen früheren und der aktuellen Halbjahresnote** (kaufmännisch gerundet).

**Wichtig:** Das **Runden in Stufen** kann zu anderen Ergebnissen führen als einmaliges Runden am Ende. Beispiel (Referenzwert S02): Klausuren 1 und 6 Punkte ergeben 3,5, die Datei macht daraus **4** und rechnet mit der 4 weiter.
Konstantins E40 sagt dagegen: nur die Endnote runden, bei ,50 entscheidet die Lehrkraft. Siehe Abschnitt 6.

### 4.5 Fehlzeiten

- Je **Unterrichtstermin** eine Spalte (bis 75). Eintrag je Schüler: **Fehlstunden** (1 = 45 Minuten, 2 = ein Block, usw.).
- **„x“** bei Fehlen, das **nicht als Fehlzeit zählen darf** (islamische Feiertage, später in die Klasse gekommen, Suspendierung): die Fehlstunden bleiben, aber die **individuelle Gesamtstundenzahl sinkt** um die Stunden des Termins.
- Je Schüler: Fehlstunden (Summe), **Gesamtstunden** (alle Termine minus die „x“-Stunden), **Prozent = Fehlstunden ÷ Gesamtstunden**.
- **Farbige Schwellen** bei 15 bis 20 %, 20 bis 30 % und über 30 %.
- Zwei Datumsspalten, die ab einer Schwelle hervorgehoben werden: **Datum der schriftlichen Ermahnung (1. Infobrief)**, über 20 %, und **Datum des Infobriefes „30 % Fehlzeiten überschritten“**, über 30 %.
- **Zweites Halbjahr:** Fehlstunden und Gesamtstunden des 1. Halbjahrs müssen **von Hand** in gelbe Spalten übertragen werden. Die Prozentzahl gilt dann für das ganze Schuljahr.
- Termin- und Stundenzahlen kommen aus „Termine“ (4.6). Der Zeugnisbogen zeigt „N“ bei über 30 %.

### 4.6 Termine, Unterrichtsplan, Zensurenliste

- **Stundenraster:** je Wochentag und **G-/U-Woche** (gerade/ungerade ISO-Kalenderwoche) werden bis zu 4 Blöcke angekreuzt. Daraus entsteht je Datum die Stundenzahl (2, 4, 6 oder 8).
- **Ferientermine** für Berlin (Ferienordnung 2022, Schuljahre 2024/25 bis 2033/34) und weitere Ausfalltage der Klasse nehmen Tage heraus.
- Pro Tag mit Unterricht **ein Termin** mit laufender Nummer. Einzelne Änderungen: **+2 / −2 Stunden** je Termin (Vertretung, Ausfall). Streichen oder Einschieben verschiebt alle folgenden Nummern.
- **Unterrichtsplan:** je Termin Datum, Stunden, **Inhalt**, **Hausaufgabe**. **Zensurenliste:** je Termin eine Spalte, frei nutzbar (die Datei sagt: für Zwischennoten, Projektnoten). Beide hängen an der Terminnummer. Nachträgliche Änderungen der Termine **verschieben bereits eingetragene Inhalte**, davor warnt die Datei ausdrücklich.

### 4.7 Einreichen-Formulare

- **KA einreichen** (OSZ/IHK): Fach, Klasse, Datum, Nummer, Fachsemester, **Notenverteilung 1 bis 6**, Teilnehmerzahl, **Anteil der Noten 5 und 6**, Felder für Datum und Unterschrift von **Fachbereichs-/Fachleitung** und **Abteilungsleitung**.
- **Klausur einreichen** (FOS): dasselbe mit **Notenpunkten 0 bis 15**, Teilnehmerzahl, Ausfallquote (Punkte 0 bis 4).
- Jeweils eine Seite zum Ausdrucken. (Das gleiche Verfahren bildet Konstantins EWH-Tool schon ab; L.E.O. soll nichts doppelt bauen, siehe CLAUDE.md.)

### 4.7 Prozente oder Noten? (Nachtrag 28.11.2026, E127)

Wo die UPZ 10.1 mit **Prozenten** und wo mit **Noten** weiterrechnet (aus den Formeln der Blätter „Zeugnis“, „Zeugnis (FOS)“, „SL zus. (FOS)“):

| Schritt | OSZ | FOS |
|---|---|---|
| Einzelne Arbeit | Punkte → Prozent → Note | Punkte → Prozent → Notenpunkte |
| Klassenarbeiten/Klausuren zusammen | **Prozente** gemittelt | **Notenpunkte** gemittelt, gerundet |
| Tests/Sonstiges („SL zus.“) | **Prozente** gemittelt | **Prozente** gemittelt, dann in Punkte |
| Mündlich | Prozentwert | Prozentwert → Punkte |
| SL gesamt, Zeugnis | **Prozente**, Note erst am Ende | **Notenpunkte**, in jeder Stufe gerundet |

Beispiele (FOS-Schlüssel):
- Tests 0 % („ue“) und 90 %: UPZ 45 % = **5 P**; aus den Einzelnoten (0 + 14) : 2 = **7 P**. Unter 45 % ist eine Punktstufe 9 % breit, darüber 5 %.
- Tests 40 % und 100 %: UPZ 70 % = **10 P**; aus den Einzelnoten 9,5 P.
- Runden in Stufen: Klausuren 7 und 8 P, Tests 6 P, mündlich 7 P: UPZ 8 → 7 → **8 P**; einmal am Ende gerundet 7,05 = **7 P**.
- OSZ: KA 1 mit 9 % (Note 5), KA 2 mit 75 % (Note 2): UPZ 42 % = **Note 5**; aus den Einzelnoten 3,5.

Tests/Sonstiges sind in der FOS 20 % der Zeugnisnote (0,4 × 0,5), eine Abweichung dort verschiebt das Zeugnis um höchstens knapp einen halben Punkt, kann aber die Rundung kippen. Uneinheitlich in der UPZ selbst: Klausuren in Punkten, Tests in Prozent gemittelt.
Konstantin (28.11.): In der FOS muss je Leistung mit ganzen Noten gerechnet werden; ob die Prozentrechnung zulässig ist, klärt er (FRAGEN_SCHULE, An Konstantin 12).

## 5 Was die Datei gut macht (und warum Kolleginnen und Kollegen sie nutzen)

- **Alles in einer Datei**: Noten, Fehlzeiten, Termine, Unterrichtsplan, Einreichen-Formulare.
- **Schlüssel stehen sichtbar** auf einem Blatt und sind änderbar (OSZ, IHK, FOS).
- **Sicherer Umgang mit Fehlen**: krank = leer, unentschuldigt = 0, ohne dass die Lehrkraft rechnen muss.
- **Gewichte sind frei** und müssen nicht 100 % ergeben.
- **Teilpunkte je Aufgabe** mit Aufgabenauswertung und Notenspiegel direkt beim Korrigieren.
- **Fehlzeiten mit Schwellen und Briefen** passend zum Schulalltag (inklusive „x“ für Fehlen ohne Fehlzeit).
- **Zeugnisnote bleibt Entscheidung der Lehrkraft** (Formel überschreibbar).
- **Funktioniert überall mit Excel**, ohne Konto, ohne Server.

## 6 Schwächen und Lücken (hier kann L.E.O. besser sein)

- **Neue Datei je Halbjahr**, Fehlzeiten-Übertrag von Hand, kein Verlauf über Halbjahre (außer fünf Zahlen).
- **Eine Klasse und ein Fach pro Datei**: wer 8 Kurse hat, hat 8 Dateien.
- **Feste Grenzen** (30 Schüler, 3 Arbeiten, 75 Termine, 10 SL-Plätze).
- **Termin-Verschiebung bricht Einträge** (Unterrichtsplan, Zensurenliste, Fehlzeiten hängen an der Terminnummer).
- **Keine Statuswerte außer Text**: „krank“ und „ue“ sind Freitext in zwei Spalten, die man vergessen kann (der Vorgabe-Punkt wird gern vergessen).
- **Mündliche Mitarbeit** gibt es nur als einzelner Prozentwert, ohne Herkunft (keine Smileys, keine Kommentare, kein Verlauf). Die Zensurenliste ist ein freies Raster ohne Rechenlogik.
- **Runden in Stufen** (FOS) und **Abrunden auf zwei Stellen** (OSZ/IHK) sind nicht erklärt und führen zu Überraschungen.
- **Kein Smartphone, kein Offline-Abgleich, kein Mehrfachzugriff**, Dateien wandern per Mail oder Stick.
- **Kein Datenschutzschutz außer Dateikennwort**, jede Lehrkraft hat die Namen lokal.
- **Blattschutz ohne Passwort**, Formeln lassen sich beim Überschreiben leicht zerstören.

## 7 Folgen für L.E.O.

1. **Rechenprofile.** L.E.O. bekommt eingebaute Profile **„UPZ-OSZ“, „UPZ-IHK“, „UPZ-FOS“** und einen **„L.E.O.-Standard“** (exakt, Rundung am Ende, E40).
   Wer die UPZ-Datei nutzt, findet damit seine **bisherigen Ergebnisse Zahl für Zahl wieder** (Referenzwerte in [testfaelle/upz_referenzwerte.json](testfaelle/upz_referenzwerte.json)). Das ist der schnellste Weg, Kolleginnen und Kollegen mitzunehmen (V7).
2. **Der Rechenkern muss zwei Dinge einstellen können**, die [RECHENLOGIK.md](RECHENLOGIK.md) bisher nicht vorsieht:
   a) **Prozent-Kette mit Abschneiden** auf zwei Nachkommastellen (OSZ/IHK),
   b) **Notenpunkt-Kette mit Rundung in Stufen** (FOS).
   Beides sind **Einstellungen je Profil**, kein Sonderfall im Code.
3. **Notenschlüssel als Daten** je Bildungsgang, vorbefüllt mit OSZ, IHK, FOS, vom Schul-Admin änderbar (E19, V8). Die Berufsschule rechnet ohne Tendenz in der Rechnung, die Tendenz ± ist reine Zusatzinformation.
4. **SL-Gewichte** wie in „SL zus.“: Plätze mit Gewicht, leere übersprungen, nicht auf 100 normiert. Passt zu E41.
5. **Mündliche Mitarbeit** kann **als Prozent oder als Note** gewertet werden und geht mit eigenem Gewicht in die SL. Konstantins Smiley-Vorschlag (Q1) liefert dafür den Wert.
6. **Statuslogik** E / UE übernehmen (siehe Abschnitt 3), mit sichtbarem Status statt versteckter Freitexte.
7. **Fehlzeiten** wie in 4.5 (Stunden je Termin, „x“ als nicht zählend, Schwellen, Briefdaten, Übertrag zwischen Halbjahren **automatisch**). Die Fehlzeitenquote kommt aus WebUntis (E23), nicht mehr aus Handarbeit.
8. **Terminrechner** aus Stundenraster, G/U-Woche, Berliner Ferien und Ausfalltagen: Sie ersetzt „Termine“ und liefert Unterrichtsplan und Fehlzeiten-Spalten. L.E.O. bekommt Stundenplan und Ferien ohnehin aus WebUntis/IServ.
9. **Notenspiegel und Aufgabenauswertung** je Arbeit (Teilpunkte je Aufgabe, durchschnittliche Erfüllung je Aufgabe) sind Funktionen, die Kollegen offenbar täglich brauchen.
10. **Einreichen-Formulare** als PDF aus den Noten (KA, Klausur), nach dem Muster dieser Blätter.
11. **Durchschnitt über Halbjahre** (FOS-Spalte „Ende“) als Teil der Entwicklung (E21).

### Zu E40 (Runden)

Konstantin hat entschieden: nur die Endnote wird gerundet, kaufmännisch, bei ,50 entscheidet die Lehrkraft. Die UPZ-FOS rundet **in drei Stufen** (Klausur-Ø, SL gesamt, Zeugnis), die UPZ-OSZ/IHK **schneidet Prozente ab**.
Kein Widerspruch zu E40 im Kern, weil E40 für Konstantins eigenes Notenbuch gilt. Aber wer mit der UPZ weiterarbeitet, soll **dieselbe Zahl** sehen. Deshalb Rechenprofil je Kurs (V7) und die Frage unten.

## 8 Alle mitnehmen: wer arbeitet womit

| Gruppe | Was sie braucht | Weg in L.E.O. |
|---|---|---|
| **UPZ-Excel** | gleiche Ergebnisse, Teilpunkte je Aufgabe, SL-Gewichte, Fehlzeiten mit Schwellen, Einreichen-PDFs | Rechenprofil UPZ, Import der Namen und Punkte aus der Datei, PDF im Stil der Einreichen-Blätter |
| **Papier-Notenbuch** | Papier, schnelle Eingabe ohne Rechnen, ggf. nur tippen statt Blatt | **Druckansichten** (Klassenliste mit Raster, Anwesenheit, Sitzplan), Nur-Eingabe-Ansicht, später Foto-Import möglich |
| **iDoceo** | Spalten, Smileys, Gewichte, Anmerkungen | Import aus iDoceo-Export (Backups sind verschlüsselt, siehe IDOCEO_ANALYSE), sonst Neuaufbau mit Vorlagen |
| **Eigene Excel-Dateien** | die eigenen Spalten und Formeln behalten | allgemeiner Import-Assistent (Spalten zuordnen), Rechenprofil „L.E.O.-Standard“ mit freien Gewichten |

Der **gemeinsame Nenner** aller vier Gruppen ist die **Zeugnisnote als ganze Zahl** und die Handarbeit in der Schul-Excel (E33). L.E.O. kann alle vier mitnehmen, wenn Rechenweg und Schlüssel **einstellbar** sind.

## 9 Testfälle

Die Datei [testfaelle/upz_referenzwerte.json](testfaelle/upz_referenzwerte.json) enthält je Profil (OSZ, IHK, FOS) **14 Schüler** mit Eingaben und den von der Datei berechneten Ergebnissen
(Prozent, Note, SL zusammen, Zeugnisprozent bzw. Zeugnispunkte). Sie decken ab:

- Notengrenzen (z. B. 4,5 von 50 Punkten = 9 % = Note 5; 22,4 von 50 = 44 % = Note 5; 22,5 von 50 = 45 % = Note 4)
- **Abschneiden statt Runden** (27 von 50 = 54 %, also noch Note 4 statt 3 bei 55 %)
- **leer / krank** übersprungen, **ue** = 0 (OSZ: Note 6; FOS: 0 Punkte)
- leere Plätze in „SL zus.“, Gewichte 0,2 / 0,2 / 0,1 / 0,1 / 0,2 (nicht auf 1 normiert)
- Mündliche Mitarbeit in Prozent
- **OSZ-, IHK- und FOS-Schlüssel**: gleiche Prozentwerte ergeben verschiedene Noten
- FOS: **Rundung in Stufen** (z. B. 3,5 → 4)

Einige Beispiele (Referenzwerte, OSZ):

| Fall | Eingabe | Ergebnis laut UPZ |
|---|---|---|
| S06, KA 1 | 22,5 von 50 | 45 %, Note 4 |
| S07, KA 1 | 27 von 50 | 54 %, Note 4 |
| S08, KA 1 | 27,5 von 50 | 55 %, Note 3 |
| S01, SL zusammen | SL 1 100 %, SL 2 100 %, Hausaufgabe 100 %, Übung leer, Punktekonto 50 % | (0,2 + 0,2 + 0,1 + 0,1) ÷ 0,7 → 85 % (abgeschnitten von 85,7), Note 1 |
| S01, Zeugnis | KA 0 % und 75 %, SL 85 %, Mitarbeit 100 % | KA-Ø 37 %, SL gesamt 94 %, Zeugnis 65 %, Note 3 |
| S05, Zeugnis | KA 2 = ue | KA-Ø 22 %, Zeugnis 43 %, Note 5 |

Dieselben Eingaben ergeben im IHK-Schlüssel andere Noten (z. B. S01 Zeugnis: Note 4 statt 3).

## 10 Offene Fragen an Konstantin

1. **Welche Klassenart nutzen die Kolleginnen und Kollegen** vor allem: 1 OSZ-Schlüssel (9/45/55/70/85 %), 2 IHK-Schlüssel, 3 FOS? Und kommen die OSZ-Grenzen von der Schule?
2. **„N“ im Zeugnisblatt** bei über 30 % Fehlzeiten: Wofür steht es (nicht benotbar, Notenschutz)? Und sind **15 / 20 / 30 %** sowie **Ermahnung bei 20 %, Infobrief bei 30 %** feste Regeln der Schule?
3. **Mündliche Mitarbeit als Prozentwert**: Tragen die Kolleginnen und Kollegen den Wert nach Gefühl ein, oder gibt es ein Schema? Soll L.E.O. wahlweise Prozent **oder** Note erlauben?
4. **Gewicht 40 : 60** (übrige SL : Mitarbeit) und **50 : 50** (schriftlich : SL): Standard der Schule oder nur Voreinstellung der Datei?
5. **FOS-Rundung in Stufen** (Klausur-Ø, SL gesamt, Zeugnis): Ist das Vorgabe oder nur die Entscheidung der UPZ? Willst du **selbst** so rechnen oder weiter wie in iDoceo (nur Endnote runden)?
6. **Zensurenliste**: Wofür nutzen Kollegen sie in der Praxis (Mitarbeit mit Zahlen, Symbole, Vokabeltests)?

Aus der Datei beantwortet: Berufsschule rechnet **ohne Tendenzen in der Berechnung** (die ±-Spalte ist nur Information, Prozent wird abgeschnitten), also ganze Noten 1 bis 6 (siehe RECHENLOGIK, Frage 3).
