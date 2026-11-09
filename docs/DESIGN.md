# Designsprache von L.E.O.

Stand: 08.11.2026 (E48). Abgeleitet aus den Konzeptbildern in [konzept/](konzept/), die Konstantin als „sehr clean“ bestätigt hat.
Werte zum Einbauen: [`design/tokens.css`](../design/tokens.css). Logo: [konzept/logo/doppellogo/](konzept/logo/doppellogo/) (E47).
Grundsätze: nicht an iDoceo orientiert (E34), viel drin, nichts überladen (E38).

---

## 1 Haltung in fünf Sätzen

1. **Ruhig.** Warmes Papier als Hintergrund, weiße Karten, feine Linien. Farbe nur dort, wo sie etwas bedeutet.
2. **Zahlen zuerst.** Noten sind das Wichtigste auf dem Bildschirm: groß, fett, in gleich breiten Ziffern.
3. **Eine Akzentfarbe für die Bedienung** (Petrol). Was aktiv, gewählt oder der Hauptknopf ist, ist Petrol, sonst nichts.
4. **Bedeutungsfarben sind reserviert.** Rot heißt „unter der Grenze / UE“, Gold heißt „Vorbehalt / Hinweis“. Nie zur Dekoration.
5. **Nichts unterbricht.** Hinweise erscheinen klein neben dem Inhalt oder als kurze Leiste unten mit „Rückgängig“, nie als Nachfrage-Dialog.

## 2 Farben

| Rolle | Token | Hell | Verwendung |
|---|---|---|---|
| Papier | `--leo-papier` | #f5f3ee | Seitenhintergrund |
| Karte | `--leo-karte` | #ffffff | Tabellen, Karten, Dialoge |
| Leise Fläche | `--leo-flaeche-leise` | #fbfaf7 | Tabellenkopf, berechnete Spalten |
| Tinte | `--leo-tinte` | #1d2125 | Haupttext, eingetragene Noten |
| Leise | `--leo-leise` | #6b7074 | Beschriftungen, Nebentext (Kontrast 4,5:1 auf Papier) |
| Berechnet | `--leo-berechnet` | #4a5258 | berechnete, vorläufige Werte |
| Linie | `--leo-linie` / `--leo-linie-fein` | #e3dfd6 / #ece9e2 | Ränder, Zeilentrenner |
| **Akzent** | `--leo-akzent` | #2f5d62 | aktive Reiter, Auswahl, Hauptknopf, Fokus, Endnotenspalte |
| Akzent hell | `--leo-akzent-hell` | #e3eeee | gewählte Kachel, Rechenweg-Kasten |
| **Warnung** | `--leo-warnung` | #b23a2a | Werte unter 5 (bzw. über 4 bei 1–6), UE |
| **Stern** | `--leo-stern` | #c58b00 | Vorbehalt ★, Hinweis-Schritte. Nur für Symbole, nicht für Text (Kontrast zu gering) |
| Auswahl | `--leo-auswahl` | #fff6d6 | aktuelle Zeile / aktueller Schüler bei der Eingabe |
| Marke Grau / Rot | `--leo-marke-*` | #868889 / #b10814 | **nur im Logo**. Das Schulrot wird in der Bedienung nicht benutzt, damit es nicht wie eine Warnung wirkt |

Dunkelmodus: Werte stehen in `tokens.css`, Umschalten per System oder `data-theme`. Noch nicht in Konzeptbildern geprüft.

## 3 Schrift und Zahlen

- Schrift **Inter** (Ersatz Segoe UI / Systemschrift). Wird mit der App ausgeliefert, nicht von Google geladen (Datenschutz).
- Zahlen immer mit **gleich breiten Ziffern** (`font-variant-numeric: tabular-nums`), damit Spalten sauber untereinander stehen.
- Komma als Dezimalzeichen: **9,47**.

| Element | Größe | Gewicht |
|---|---|---|
| Seitentitel | 22 px | 700 |
| Kurstitel in der Kopfzeile | 16 px | 600 |
| Fließtext, Tabelle | 14 px | 400–500 |
| Beschriftung, Datum, Gruppen-Gewicht | 11–12 px | 400–600 |
| **Eingetragene Note** | 15 px | **700**, Tinte |
| **Berechnete Note** | 13 px | 500, Farbe „Berechnet“, gepunktete Unterlinie, 2 Nachkommastellen |
| **Gesamtnote live** | 17 px (Handy-Karte 44 px) | 700–800 |

## 4 Formen und Abstände

- Abstände im 4er-Raster: 4, 8, 12, 16, 24, 32.
- Rundungen: Kennzeichen 6, Felder 10, Karten 12, Dialoge 16, Pillen ganz rund. App-Symbol 22 % der Kantenlänge.
- Schatten nur für Dinge, die über dem Inhalt schweben (Menü, Rechenweg, Dialog). Karten haben eine Linie, keinen Schatten.
- Tippziele mindestens 44 px. Notentasten 58 px (Tablet) bzw. 46 px (Handy).

## 5 Bausteine

| Baustein | Aussehen und Regel | Bild |
|---|---|---|
| **Kopfzeile** | weiß, L.E.O.-Symbol, Kursname + Nebeninfo, Halbjahr-Umschalter, rechts Suche/Filter als Pillen, Online-Zustand | 1 |
| **Reiter** | Text, aktiver Reiter fett mit Petrol-Unterstrich | 1 |
| **Notentabelle** | Namen links fest, Gruppenköpfe mit ▾ und Gewicht, Endnotenspalte rechts fest mit Petrol-Kante | 1 |
| **Zelle eingetragen / berechnet** | siehe Schrift. Leer = blasser Punkt „·“ | 1 |
| **Kennzeichen** | E (grau), UE (rot hinterlegt), ★ (Gold, oben rechts), Einzelgewicht „×½“ (Petrol, unten rechts), Anmerkung = Petrol-Dreieck in der Ecke, NTA = umrandetes „N“ am Namen | 1 |
| **Pille** | runder Rahmen, leiser Text, Wert fett: „Sortiert: **Name**“ | 1 |
| **Umschalter** | verbundene Felder, aktives Feld Petrol | 1 |
| **Schwebendes Fenster** | Karte mit Schatten, Titel, leise Unterzeile, Zeilen mit gestrichelten Trennern; Rechenweg in Mono auf Akzent-hell | 2 |
| **Notenleiste** | 0–15 als Tasten, Werte unter 5 in Warnfarbe, gewählte Taste Petrol, darunter Sondertasten mit Rahmen | 3, 8 |
| **Hinweisleiste** | dunkel, unten mittig, Text + „Rückgängig“ in Gold | 3, 8 |
| **Liste (Handy)** | Name + kleine Nebenzeile, Note rechts groß, Trendpfeil | 4 |
| **Kachel-Auswahl** | Rahmen, gewählt = Petrol-Rand + Akzent-hell | 7, 8 |
| **Feld** | Rahmen, kleine Beschriftung oben, Wert fett; Fokus = Petrol-Rand 2 px | 7 |
| **Hauptknopf / Nebenknopf** | Petrol gefüllt / Petrol umrandet. Pro Fenster höchstens ein Hauptknopf | 6, 7 |
| **Untere Leiste (Handy)** | Heute, Kurse, Schüler, Mehr; aktiv = Petrol fett | 4 |

Bildnummern = Dateien `docs/konzept/notenbuch-<Nr>-*.png`.

## 6 Regeln für neue Ansichten

1. Erst fragen: Was muss man **hier** sehen? Alles andere eine Ebene tiefer (E38).
2. Höchstens **ein** Hauptknopf je Ansicht.
3. Neue Farbe? Nein. Bedeutung über Akzent, Warnung oder Stern ausdrücken, sonst über Schrift und Abstand.
4. Jede Zahl, die berechnet ist, sieht berechnet aus und erklärt auf Antippen ihren Weg.
5. Auf Handy prüfen: Liste statt Tabelle (E44), Tippziele ≥ 44 px.
6. Tastatur am PC mitdenken (E45).
7. Neue Bausteine hier eintragen, bevor sie zweimal gebaut werden.

## 7 Ergänzungen vom 09.11.2026 (E49–E58)

Nach der Auswahl von Richtung A. Vollständige Vorgaben, Bausteine und Prototyp-Plan: [DESIGN_SYSTEM_PROTOTYP.md](DESIGN_SYSTEM_PROTOTYP.md). Mockups: [konzept/mockups-v2/](konzept/mockups-v2/).

- **Zeitbalken** statt Phasen, Kachel **„Läuft gerade“** (E50).
- **Mitarbeit** ist überall einen Tipp entfernt, Sitzplan eine Ebene tiefer (E51).
- **Mitarbeitsskala** mit fünf Farben (dunkelgrün, hellgrün, gelb, orange, rot) auf Smileys und im Verlauf, nie als Text-, Rand- oder Knopffarbe (E52).
- **Navigation** wählbar: Seitenleiste, Reiterleiste, untere Leiste, links oder rechts (E54). Aktiv = Petrol, nicht Schulrot.
- **Logo:** Doppellogo für große Flächen, Wortmarke in der Kopfzeile, App-Symbol in der Navigation (E47).
- **Schülerübersicht** und **Notenbuch** nach den Mockups N3 und N4 sind Vorlage (E49).
