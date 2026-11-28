# Modul Statistische Auswertung (mit optionaler EWH-Anbindung)

Stand 26.11.2026, Vorschlag **V16**. Entwurf im Prototyp: Entwurfs-PR „Modul Auswertung“ (Branch `claude/project-thread-1x9645`).
Herkunft: Projektthema („Statistische Auswertung, Anbindung an EWH Tool“), Backlog A1–A3, N4, PLANUNG Modul M.

## 1 Ziel

Die Lehrkraft sieht je Klasse auf einen Blick, wo die Klasse steht und wer einen zweiten Blick braucht:
Noten, mündliche Leistungen, Fehlzeiten und Verspätungen zusammen, ohne etwas von Hand zu pflegen.
Alles kommt aus Daten, die L.E.O. sowieso hat. **Die Auswertung funktioniert vollständig ohne EWH.**
EWH Korrektur ist nur ein zusätzlicher Weg, Klausurnoten ins Notenbuch zu bekommen (Konstantin 26.11.2026:
„bleibt natürlich optional, weil das momentan nur einer ganz kleinen Gruppe von Lehrkräften zur Verfügung steht“).

## 2 Was das EWH-Tool ist (geprüft im Repo `cup1dstunt/ewh`, Version 0.8)

- Eigene, selbst gehostete Web-App (FastAPI, SQLite, eigenes Konto mit Passwort/Passkey) zum **Korrigieren von
  Englisch-Klausuren** (FOS/DQ) mit dem Erwartungshorizont. Rechnet Notenpunkte nach Berliner Regeln.
- Hat schon eine eigene **Klausurstatistik** (Notenverteilung, Erfüllungsgrad je EWH-Punkt, häufige Schwächen,
  Lernstand über Schuljahre). Das sind EWH-Inhalte und bleiben in EWH (E4).
- Schüler kommen dort aus dem **LUSD-Export** (LokalerCode), in L.E.O. aus **WebUntis**. Eine gemeinsame Nummer gibt es nicht.
- EWH schreibt heute schon zwei CSV-Dateien, die L.E.O. lesen kann, ohne dass EWH geändert werden muss:
  1. **Notenliste als CSV** einer Klausur (Statistik › Weitere): `LokalerCode;Nachname;Vorname;Stammklasse;Klausur;Status;…;Gesamt (NP);Note`,
     mit Zeilen für Klausur und Nachschreibeklausur.
  2. **Notenübersicht Halbjahr** als CSV (Klassenansicht): `LokalerCode;Nachname;Vorname;<Klausur (TT.MM.JJJJ)>…;Schnitt`,
     Zellen mit Punkten, „n. t.“, „NS“ oder „–“.
- Im EWH-Backlog stehen 22–25 „Allgemeiner Teil“, „Mitarbeit nach der Stunde“, „Eigener Stundenplan“, „Halbjahresnote“.
  Das baut L.E.O. bereits. Frage dazu unten (Abschnitt 7).

## 3 Schnittstelle: Bewertung der Wege

| Weg | Aufwand | Bewertung |
|---|---|---|
| **A: CSV-Datei aus EWH in L.E.O. einlesen** | nur L.E.O. | **Empfohlen, im Entwurf gebaut.** Funktioniert heute, auch offline. Daten bleiben auf dem Gerät. Ein Klick in EWH, ein Klick in L.E.O. |
| B: L.E.O. ruft EWH direkt ab (persönlicher Abrufschlüssel in EWH, Lese-Endpunkt nur für eigene Klausurnoten, CORS für die L.E.O.-Adresse) | EWH und L.E.O. | Später möglich (Stufe 2), wenn beide schulweit laufen. Bequemer, aber eine neue Angriffsfläche in EWH und nur für die kleine EWH-Gruppe. |
| C: Gemeinsame Datenbank oder EWH-Statistik in L.E.O. anzeigen | groß | **Nein.** Widerspricht E4 (keine EWH-Inhalte) und E79 (lokal-first). |
| Rückweg L.E.O. → EWH (z. B. Fehlzeiten, E/UE) | EWH | Nicht vorgesehen. EWH kennt Nachschreiber selbst. |

Richtung also nur **EWH → L.E.O., nur die Note**. Keine Teilpunkte, keine Kommentare, kein Erwartungshorizont.

## 4 Modul Auswertung (ohne EWH)

### 4.1 Wo es liegt
- Reiter **„Auswertung“** je Klasse (nach „Planung“). Unter **Klassen › „Alle Klassen vergleichen“** eine Tabelle aller eigenen Klassen.
- Kein eigener Navigationspunkt, damit die Navigation schlank bleibt (wie Kalender, E115).
- **Abschaltbar** unter Mehr › Module („Auswertung“, Standard an). Daten gehen dabei nicht verloren, es wird nichts gespeichert.
- **Anschluss an die Modulauswahl (V15, [MODULE.md](MODULE.md)):** Der Entwurf nutzt schon die id `statistik` aus dem Modulregister
  und prüft `einstellungen.module.statistik` bzw. `.ewh`. Wenn beide Entwürfe zusammenkommen: im Register bei `statistik`
  `bald` entfernen, `standard: true`, `pfade: ['/auswertung']`, `reiter` „Auswertung“; neuer Eintrag `ewh`
  („Noten aus EWH“, Bereich Organisation, `standard: false`, `pfade: ['/ewh']`, Startweg nur „EWH“); die Abfragen durch `istAn(…)` ersetzen.

### 4.2 Inhalt des Reiters (von oben nach unten)
1. **Leistungsbild**, klickbare Kacheln (E89): Ø vorläufige Gesamtnote, unter der Grenze, auf der Kippe, noch ohne Note,
   Fehlzeiten über 30 %, Verspätungen (führt in den Reiter Anwesenheit). Ein Tipp zeigt die Namen dahinter.
2. **Notenspiegel der Gesamtnote**, Säulen 1–6 (FOS mit Punktebereichen 15–13 … 0). Säule antippen zeigt, wer dahinter steht.
3. **Mündliche Leistungen je Monat:** Ø Smiley, Anzahl Einträge, „erreicht“ (Schüler mit mindestens einem Eintrag, gelb unter 75 %),
   Verteilung der Smileys als Balken.
4. **Leistungen** (Klausuren, Tests, Präsentationen …) nach Datum: Schnitt, Mini-Notenspiegel, Anteil unter der Grenze,
   E/offen/UE/leer. Aufklappen: genaue Werte mit Namen, Nachschreiber mit Link zur Nachschreibeliste, Hinweis
   „mehr als ein Drittel unter der Grenze“ (Genehmigung, wie die Einreichen-Vordrucke in UPZ und EWH).
5. **Genauer hinsehen:** leise Hinweise je Schüler, keine Bewertung, Link zur Schülerkarte:
   - Leistungsabfall: letzte datierte Note mindestens 3 NP (OSZ 1 Note) unter dem eigenen Schnitt davor, mindestens 2 Noten davor
   - mündlich still: früher Einträge, seit 21 Tagen keiner
   - Fehlzeiten ab 20 %
   - Gesamtnote unter der Grenze oder auf der Kippe (dieselbe Regel wie die Warnampel im Notenbuch)

### 4.3 Verzahnung mit anderen Modulen
- **Notenbuch:** dieselbe Rechnung (`rechne`, `warnungen`), keine zweite Logik. UE zählt wie im Notenbuch als schlechtester Wert.
- **Anwesenheit:** Fehlzeiten und Verspätungen nur als Kurzfassung, die Einzelheiten bleiben im Reiter Anwesenheit (kein Doppelbau).
- **Mündlich:** Smileys aus der Live-Stunde, Monatsverlauf. Raster-Einschätzungen fließen über die Monatsnote ins Notenbuch ein.
- **Nachschreiben:** Leistungen mit E/offen verweisen auf die Nachschreibeliste.
- **Schülerkarte:** jeder Name führt dorthin (Fehlzeitenanalyse, Mitarbeitsverlauf).

### 4.4 Datenschutz
Rechnet nur im Gerät aus den eigenen, verschlüsselten Daten. Nichts wird gesendet, nichts zusätzlich gespeichert.
Noten sieht nur die eigene Lehrkraft (E29). Keine Schulleitungs- oder Fachbereichsstatistik über Lehrkräfte hinweg.

## 5 Optionales Modul „Noten aus EWH übernehmen“

- Schalter unter Mehr › Module, **Standard aus**. Nur wer ihn einschaltet, sieht den Knopf „Aus EWH übernehmen“
  im Notenbuch und in der Auswertung.
- Ablauf auf einer Seite, ohne Dialog: **1** CSV wählen (Notenliste oder Notenübersicht; bei der Übersicht die Klausur antippen)
  → **2** Spalte wählen (L.E.O. schlägt die Spalte mit gleichem Datum oder Namen vor, sonst „neue Klausurspalte“)
  → **3** Vorschau: je Zeile EWH-Name, zugeordneter Schüler, bisher, neu, „neu / ändert / gleich / bleibt“ → übernehmen, mit Rückgängig.
- **Zuordnung:** Vor- und Nachname (ohne Akzente, ß = ss), dann eindeutiger Nachname. Unsichere oder fehlende Zuordnung
  wählt die Lehrkraft per Auswahlliste. Niemand wird doppelt zugeordnet.
- **Werte:** FOS übernimmt die Punkte. OSZ-Klassen bekommen die Note nach dem Leistungsspiegel (15–13 = 1 … 0 = 6).
  Nachschreibenote zählt, wenn die Hauptklausur keine hat. „Nicht teilgenommen“/„Nachschreiber“ wird zu **offen**
  (E104); eine schon geklärte Zelle (E, UE, Note) bleibt. Noch nicht fertig korrigierte Arbeiten werden übersprungen.
  Einzelgewicht und Stern einer Zelle bleiben erhalten. Die Spalte merkt sich „aus EWH, Titel, Datum“.

## 6 Stand im Entwurf (ehrlich)

- Gebaut: `app/src/lib/auswertung.ts`, `app/src/lib/ewh.ts`, Reiter `/auswertung/[id]`, Vergleich `/auswertung`,
  Übernahme `/ewh/[id]`, Schalter unter Mehr › Module. 28 Prüfungen in `tests/auswertung.test.ts`, alle Tests grün,
  Typprüfung und Build ohne Fehler. Am PC (1360 px) und Handy (390 px) mit den Beispieldaten angesehen.
- **Nicht getestet:** eine echte CSV aus EWH (getestet mit nachgebauten Dateien nach dem EWH-Quelltext), Tablet,
  Dunkelmodus, große Klassen über ein ganzes Halbjahr.
- Halbjahre: Die Auswertung nimmt alles, was in der Klasse steht (die Klasse ist das Halbjahr). Ein Halbjahresvergleich
  folgt, wenn der Schuljahreswechsel (K9) gebaut ist.
- Nicht gebaut (Backlog): Verlaufsdiagramm je Schüler über Halbjahre (A2), Konferenzansicht (A3), Druck/PDF der Auswertung, Weg B.

### Ausbau 27.11.2026 (V19, Entwurfs-PR)
- **Schwellen einstellbar:** unter „Genauer hinsehen“ › „Schwellen anpassen“, Plus/Minus, gilt für alle Klassen, „Zurück auf Standard“.
  Bereiche: Abfall FOS 1–8 NP, OSZ 0,5–3 Noten, still 7–60 Tage (Schritt 7), Fehlzeiten 5–30 % (Schritt 5). Die Kurzfassung 20–30 % folgt der Fehlzeitenschwelle.
- **Verlauf der Noten (A2):** Linie Klassenschnitt je datierter Leistung, Schüler per Auswahlliste dazu (oder `?s=<id>`), Grenze gestrichelt,
  oben = besser, darunter Tabelle und mündlich je Monat. Logik `notenVerlauf`, `muendlichSchueler`.
- **Drucken (A7):** Knopf „Drucken oder als PDF“ in der Klassenauswertung und im Klassenvergleich; Druckansicht ohne Navigation und Bedienknöpfe, mit Kopfzeile „nur für die eigene Lehrkraft“.
- Getestet: 20 neue Prüfungen, Typprüfung, Build, Ansicht PC 1360 px, Handy 390 px und Druckansicht mit Beispieldaten. Nicht getestet: echter Papierdruck, Tablet, Dunkelmodus.
- Weiter offen: Konferenzansicht (A3, braucht Fehlzeiten aller Fächer), Halbjahresvergleich (A8).

## 7 Grundsatzfragen, beantwortet am 28.11.2026 (E122)

1. **Arbeitsteilung:** EWH und L.E.O. sind getrennte Werkzeuge. EWH verwaltet nur Klausuren, L.E.O. ist das Notenbuch. Frage entfällt.
2. **Weg:** Erst CSV. Ein späterer Abgleich ist gewünscht (siehe 7.1).
3. **Was übernehmen:** nur die Note. Dazu ein Link zu EWH an übernommenen Klausuren („Genaueres zur Note und Leistungsentwicklung in EWH“),
   sobald die Lehrkraft die Adresse ihrer EWH-Installation auf der Seite „Aus EWH übernehmen“ einträgt. Der Link öffnet EWH, L.E.O. sendet nichts.
   EWH nutzt derzeit nur Konstantin; die Verbindungen werden später ausgebaut, jetzt liegt der Schwerpunkt auf L.E.O.
4. **Hinweise:** Schwellen passen. Neu: **Vorwarnung „letzte Note an der Grenze“**, FOS 5 NP oder weniger (einstellbar 0–8), OSZ Note 4 oder schlechter
   (einstellbar 3–5), damit man Schüler früh vorwarnen kann. Die Schwelle „mündlich still“ bleibt vorläufig: Sie hängt davon ab, wie eine Lehrkraft
   mündliche Noten vergibt (jede Stunde, je Einheit, je Monat, je Halbjahr). Das soll später im Personalisierungsmenü einstellbar werden (Backlog M10).

### 7.1 Einschätzung: Abgleich statt CSV (Weg B, Backlog A6)

Nicht umständlich, weil die CSV-Übernahme schon die ganze Logik hat (Zuordnung über Namen, Vorschau, „überschreibt nie eine geklärte Zelle“, Rückgängig).
Ein Abgleich tauscht nur die Quelle aus:
- **In EWH (eigenes Repo):** ein Lese-Endpunkt „Noten meiner Klausuren“ (nur Note, Status, Datum, Titel), geschützt mit einem persönlichen Abrufschlüssel,
  den die Lehrkraft in EWH erzeugt und widerrufen kann, dazu CORS-Freigabe für die L.E.O.-Adresse. Etwa ein Arbeitstag mit Tests.
- **In L.E.O.:** Abrufschlüssel im Tresor des Geräts (wie IServ und WebUntis), Knopf „Aus EWH aktualisieren“, danach dieselbe Vorschau wie bei der CSV.
  Etwa ein Arbeitstag. Automatischer Abgleich im Hintergrund wäre ein kleiner Zusatz, aber die Vorschau sollte bleiben, damit nie ungeprüft Noten wandern.
- **Voraussetzung:** EWH muss vom Gerät aus erreichbar sein (z. B. über das Netz der Schule oder den eigenen Server), und es braucht eine kleine Sicherheitsprüfung
  in EWH, weil dort eine neue Tür entsteht.
- **Empfehlung:** jetzt nicht einführen, weil der Schwerpunkt auf L.E.O. liegt und nur eine Lehrkraft EWH nutzt. Wenn die EWH-Seite gebaut wird,
  ist die L.E.O.-Seite schnell nachgezogen. Eine gemeinsame Schülernummer gibt es weiterhin nicht (LUSD gegen WebUntis), die Zuordnung bleibt über Namen.
