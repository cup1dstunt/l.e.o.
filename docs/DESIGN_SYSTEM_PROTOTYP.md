# L.E.O. – Schritt 5: Designsystem und Plan für den Frontend-Prototyp

Stand: 09.11.2026, mit den Abschnitten 8 und 9 (Antworten von Konstantin) aktualisiert. Richtung A (Papier und Petrol), geschärft nach deiner Rückmeldung zu den Mockups. Kein Code, nur Vorgaben und Plan. Bestehende Grundlage: `docs/DESIGN.md` und `design/tokens.css` (E48). Dieses Dokument sagt, was daran **bleibt**, was **neu** ist und was **sich ändert**.

---

## 1 Was sich durch deine Rückmeldung ändert

| # | Entscheidung aus deiner Rückmeldung | Folge fürs Design |
|---|---|---|
| 1 | **Keine Phasen** (Einstieg, Erarbeitung, Sicherung). Stunden laufen immer anders. | Ein **dynamischer Zeitbalken** von Stundenbeginn bis Stundenende, mit „jetzt“-Marke und Restminuten. Keine Abschnitte, keine Phasennamen. |
| 2 | Kachel **„Läuft gerade“** und Ablaufbalken gefallen. | Wird die zentrale Kachel in „Heute“, auf dem Handy und in der Kurs-Übersicht. |
| 3 | **Mitarbeit steht immer neben „Stunde öffnen“**, und in jedem Block erreichbar, weil man sie am ehesten vergisst. | Neue Regel „Mitarbeit ist überall einen Tipp entfernt“ (Abschnitt 4). |
| 4 | **Sitzplan ist zweite Ebene.** Man braucht ihn nur am Anfang. | Kein Sitzplan-Knopf mehr neben „Stunde öffnen“. Er liegt **in** der Stunde (Reiter „Sitzplan“) oder in der Kurs-Übersicht. |
| 5 | **Navigation links** gefällt, die Reiterleiste vom Foto auch, wahlweise links, rechts oder unten. | Drei Varianten, **eine Einstellung** (Abschnitt 3.1). Aktiver Reiter in Petrol, nicht im Schulrot. |
| 6 | **Smileys mit dezenter Hintergrundfarbe.** | Vier Stufen mit zarten Flächen (Abschnitt 2.2). Als einzige neue Farben kommen zwei Grüntöne dazu. |
| 7 | **Schülerübersicht** (Noten, Fehlzeiten-Analyse, Mitarbeit als Verlauf, Notizen) ist genau richtig. | Wird als feste Vorlage übernommen, ebenso das Notenbuch. |
| 8 | **Mitarbeit als Verlauf**, nicht als acht Smileys nebeneinander. | Anteils-Balken je Monat, häufigste Bausteine, letzte Einträge. |
| 9 | **Logo** ist schon entschieden (E47). | Doppellogo für große Flächen, Wortmarke in der Kopfzeile, App-Symbol in Navigation und Homescreen. In den Mockups stand nur der Text „L.E.O.“ als Platzhalter. |

**Zum Logo:** Gefunden in `docs/konzept/logo/doppellogo/`. Es gibt `leo-doppellogo-quer.svg` und `-hoch.svg` (Schullogo + Wortmarke), `leo-wortmarke.svg` und `-dunkel.svg`, `leo-app-symbol.svg` und `-dunkel.svg` (roter Bogen mit grauem Quadrat). Das Schulrot (#b10814) bleibt **nur im Logo**, nie in der Bedienung (E48). Das Schullogo selbst liegt bisher nur als PNG vor (`osz.png`), für scharfe große Flächen fehlt weiterhin die Vektordatei (FRAGEN_SCHULE, Schule 7).

---

## 2 Designsystem

### 2.1 Leitplanken (gelten weiter)
1. **Ruhig.** Papier, weiße Karten, feine Linien. Farbe nur mit Bedeutung.
2. **Zahlen zuerst**, gleich breite Ziffern, Komma als Dezimalzeichen.
3. **Eine Bedienfarbe: Petrol.** Aktiv, gewählt, Hauptknopf, Fokus.
4. **Rot = unter der Grenze oder UE. Gold = Vorbehalt oder Hinweis.** Nie Dekoration.
5. **Nichts unterbricht.** Hinweise klein neben dem Inhalt oder als Leiste mit „Rückgängig“.
6. **Neu: Ein Tipp für das Häufigste.** Anwesenheit, Mitarbeit und Note eintragen brauchen höchstens zwei Tipps.
7. **Neu: Zeit ist ein Fluss, kein Raster.** Stunden werden als Balken von Anfang bis Ende dargestellt, nie als Phasen.

### 2.2 Farben und Tokens

Alle bestehenden Tokens aus `tokens.css` bleiben unverändert. **Neu** kommen dazu:

| Token (Vorschlag) | Hell | Verwendung |
|---|---|---|
| `--leo-mit-sehrgut` | #d5e8da | Hintergrund Smiley „sehr gut“ |
| `--leo-mit-gut` | #e6efd9 | Hintergrund Smiley „gut“ |
| `--leo-mit-mittel` | = `--leo-taste` (#efede6 / #f1efe9) | Smiley „mittel“, bestehende Farbe |
| `--leo-mit-schwach` | = `--leo-warnung-hell` (#fbeae6) | Smiley „schwach“, bestehende Farbe |
| `--leo-balken-sehrgut` / `-gut` / `-mittel` / `-schwach` | #8fc4a0 / #c5dcae / #d6d3c8 / #e6a99d | Anteils-Balken im Mitarbeitsverlauf (kräftiger als die Flächen) |
| `--leo-balken-leise` | #c7d6d7 | neutrale Balken (Wochentage, Monate), Hervorhebung mit `--leo-akzent` |
| `--leo-zeitbalken-fuell` | #cfe3e3 | bereits vergangener Teil des Zeitbalkens auf Akzent-hell |
| `--leo-nav-breite` | 92 px | Seitenleiste PC und iPad quer |
| `--leo-reiter-breite` | 78 px | Reiterleiste rechts oder links |
| `--leo-nav-hoehe-handy` | 68 px | untere Leiste |

**Dunkelmodus:** Für die neuen Tokens liegen noch keine geprüften Werte vor. Sie werden erst im Prototyp abgeleitet und gemessen (Abschnitt 5, Meilenstein 1).

**Wichtig, ehrlich:** Die Kontraste der neuen Grüntöne und Balken habe ich **nicht gemessen**. Die Smileys tragen ihre Bedeutung durch die **Gesichtsform**, nicht durch die Farbe. Damit ist die Unterscheidung auch bei Rot-Grün-Schwäche gesichert. Text auf den Hintergründen bleibt Tinte.

### 2.3 Schrift
Unverändert: **Inter**, lokal ausgeliefert (kein Google-Aufruf, Datenschutz), Tabellenziffern. Größen wie in `DESIGN.md`. Für Kennzahlen (Fehltage, Quote) 24 px 800, für die große Gesamtnote weiter 34 bis 52 px 800.

### 2.4 Smileys
- **Vier Stufen:** sehr gut, gut, mittel, schwach. Jeweils ein Gesicht auf einer runden Fläche.
- **Eigener Satz als SVG, kein System-Emoji.** Die Mockups nutzen Emoji, die auf Apple, Windows und Android jeweils anders aussehen. Auf dem Schul-PC würde die Mitarbeits-Erfassung anders aussehen als auf dem iPad. Das gestaltete SVG-Set sichert gleiche Form, scharfe Darstellung und Kontrolle über Linienstärke.
- **Größen:** 24 px in Listen, 28 px am Sitzplatz, 56 px im Auswahlfenster am PC, 42 px im Handy-Raster. Ausgewählt: Petrol-Ring 2 px mit weißem Abstand.
- **Skala:** Vier Stufen sind mein Vorschlag. Die Zahl der Stufen und die Namen sind noch zu bestätigen (Abschnitt 6).

---

## 3 Bausteine

Neu oder geändert gegenüber `DESIGN.md`. Alles Übrige (Notentabelle, Kennzeichen, Pillen, Notenleiste, Hinweisleiste, Felder, Knöpfe) bleibt.

### 3.1 Navigation (drei Varianten, eine Einstellung)

| Variante | Wo | Aussehen |
|---|---|---|
| **Seitenleiste** (Standard PC, iPad quer) | links, 92 px | weiß, Linie rechts. L.E.O.-Symbol oben, vier Punkte Heute, Kurse, Schüler, Mehr mit Strich-Symbol und Beschriftung, Suche unten. Aktiv: Akzent-hell-Fläche, Petrol, fett. |
| **Reiterleiste** | links oder rechts, 78 px | wie dein Foto: schmale Spalte, Trennlinien, Beschriftung gedreht. Aktiv: **volle Petrol-Fläche, weiße fette Schrift**. Beginnt unterhalb der Kopfzeile. |
| **Untere Leiste** (Standard Handy) | unten, 68 px | Symbol und Beschriftung. Alternative **Segmentleiste**: gleiche Optik wie die Reiterleiste, waagerecht, Beschriftung nicht gedreht, aktiv volle Petrol-Fläche. |

Regeln:
- Immer **vier Hauptpunkte** (Heute, Kurse, Schüler, Mehr). Mehr zeigt alles Seltene eine Ebene tiefer.
- Gedrehte Schrift nur bei der Reiterleiste und nur bei kurzen Wörtern (bis etwa neun Zeichen).
- Die Seite (links oder rechts) und die Variante sind eine **Nutzer-Einstellung**, Standard links beziehungsweise unten am Handy.
- Reiter **innerhalb** eines Kurses (Übersicht, Noten, Stunde, Mitarbeit, Notizen) bleiben waagerecht unter der Kopfzeile.
- Tippziel mindestens 44 px, die Reiter sind 130 px hoch.

### 3.2 Zeitbalken (ersetzt Phasenleiste)
- Ein einziger Balken von Beginn bis Ende der Stunde. Vergangener Teil gefüllt in `--leo-zeitbalken-fuell`, Rest weiß, **„jetzt“-Marke** als Petrol-Linie.
- Darunter links Beginn, mittig „noch 22 Min.“, rechts Ende.
- Kein Text im Balken, keine Teilung. Wer eigene Marken setzen will (z. B. „Gruppenarbeit bis 09:15“), setzt sie später als kleine Tick-Marke, optional und nur auf Wunsch (Backlog, nicht jetzt).
- Mehrfachstunden (Doppelstunde) bekommen **einen** Balken, nicht zwei.

### 3.3 Kachel „Läuft gerade“
- Flächig `--leo-akzent-hell`, Linie in `#c8dcdc`, großer Kurstitel (30 px 700), eine Zeile Raum und Anwesenheit und letzter Stand.
- Darunter der Zeitbalken.
- **Knopfzeile: „Stunde öffnen“ (Hauptknopf, Petrol gefüllt) und „Mitarbeit“ (Nebenknopf, Petrol umrandet), gleich groß, nebeneinander.** Weitere Knöpfe (Material) eine Ebene tiefer in der geöffneten Stunde.
- Auf dem Handy volle Breite: „Stunde öffnen“ oben, „Mitarbeit“ darunter.
- Ohne laufende Stunde zeigt die Kachel „Als Nächstes“ (kleiner, weiß, Knopf „Vorbereiten“).

### 3.4 Mitarbeit-Schnelleingabe
Das Fenster, das bei Antippen eines Schülers erscheint (PC: schwebend neben dem Platz, Handy: ganzer Bildschirm mit „Nächster“).
1. **Vier Smileys** nebeneinander, 56 px. Der **zuletzt gewählte** ist vorausgewählt, ein Tipp bestätigt (schnell am Stundenende).
2. **Textbausteine** darunter als Chips: positive in zartem Grün, negative in zartem Rot, neutrale weiß. **Optional**, ein Tipp, mehrere möglich.
3. **Eigener Text …** als letzter Chip, nie Pflicht.
4. Speichern passiert beim Tipp, unten erscheint **„Gespeichert: 🙂 · Rückgängig“** (dunkle Hinweisleiste, keine Rückfrage).
5. Ein Eintrag zählt als „schnell erfasst“, wenn nur der Smiley gesetzt ist. Er erscheint in der Schülerübersicht entsprechend.

### 3.5 Mitarbeitsverlauf (Schülerübersicht)
- **Ein Balken je Monat**, gestapelt aus den vier Stufen (Anteil der Einschätzungen), rechts Anzahl der Einträge und Monatsnote, der laufende Monat mit „laufend“.
- **Häufigste Bausteine** als Chips mit Anzahl („bringt eigene Ideen ein 6×“).
- **Letzte Einträge** als drei Zeilen: Smiley-Chip, Baustein oder „schnell erfasst“, Datum.
- Legende klein unter den Balken. Keine Smiley-Reihe.

### 3.6 Fehlzeiten-Analyse (Schülerübersicht)
- Vier **Kennzahl-Kacheln**: Tage entschuldigt, Tage unentschuldigt (Zahl in Warnrot), Fehlstunden, Quote mit Kursschnitt.
- **Nach Wochentag:** fünf Balken Mo bis Fr, der höchste in Petrol, die anderen in `--leo-balken-leise`, Zahl über jedem Balken.
- **Verlauf pro Monat:** gleiche Darstellung.
- **Muster-Hinweis** in Gold-Hell (z. B. „3 von 8 Fehltagen sind Montage. 2 Fehltage liegen direkt vor einer Klassenarbeit.“). Das ist das einzige „Gold“ in dieser Ansicht, es bedeutet „Hinweis“.
- **Klassenarbeiten** mit Status **E oder UE**, Nachschreib-Stand und Weg zur vorbereiteten Mail.
- Daten kommen aus WebUntis, automatisch (E23). Die Analyse ist **keine Note** und sieht deshalb auch die Klassenleitung (E29 gilt nur für Noten, Mitarbeit und Notizen).

### 3.7 Schülerübersicht als Vorlage
Aufbau PC: oben Stammdaten und Notenentwicklung, Mitte Fehlzeiten-Analyse links und Mitarbeit rechts, unten Notizen in drei Spalten mit Wiedervorlage-Chip. Handy: Gesamtnote groß, dann Mitarbeit, letzte Einträge, Klausuren. Fehlzeiten als eigene Ansicht eine Ebene tiefer.

### 3.8 Weitere Bausteine
- **Tag-Leiste in „Heute“:** vier Stunden als gleich breite Karten. Die aktuelle gefüllt in Petrol, die übrigen weiß. Vertretung als kleine Beschriftung.
- **Sitzplatz:** weiße Karte, Name, optional Smiley-Chip unten rechts, fehlend = graue Fläche mit **E oder UE** und „WebUntis“, aktuell gewählt = `--leo-auswahl` mit Petrol-Rand.
- **Textbaustein-Chip:** Pille, zarte Fläche je nach Wertung, bei Häufigkeit Zahl in Fett.
- **Wiedervorlage-Chip:** Gold-Hell, nur für Termine.

---

## 4 Regel: Mitarbeit ist überall einen Tipp entfernt

Du hast es so gesagt: Man vergisst Mitarbeit am ehesten. Die Regel:

> **Überall, wo ein Kurs oder eine Stunde vorkommt, gibt es einen Mitarbeit-Zugang, höchstens einen Tipp vom Anblick entfernt.**

| Ort | Wie |
|---|---|
| Kachel „Läuft gerade“ | Nebenknopf **„Mitarbeit“** neben „Stunde öffnen“ |
| „Als Nächstes“-Kachel | gleiche Knopfpaarung |
| Kurs-Übersicht | Kachel „Mitarbeit“ (zeigt heutige Einträge, Tipp öffnet die Erfassung) |
| Geöffnete Stunde | Reiter „Stunde“ ist zugleich die Mitarbeitserfassung, jeder Schüler antippbar |
| Sitzplatz | Tipp auf den Platz öffnet die Schnelleingabe |
| Schülerkarte | Knopf „Mitarbeit“ neben der Gesamtnote |
| Handy | „Mitarbeit“ in der Kopfzeile jedes Kurses, auch ohne geöffnete Stunde |
| Stundenende | Beim Abschließen der Stunde zeigt L.E.O. einmal **„3 Schüler ohne Mitarbeitseintrag“** als leise Zeile (kein Dialog) |

**Offen, ehrlich:** Ob die Erinnerung am Stundenende als Zeile oder gar nicht kommen soll, ist eine Geschmacksfrage. Ich schlage Zeile vor, abschaltbar.

Sitzplan: eine Ebene tiefer, **nach** dem Öffnen der Stunde (Reiter „Sitzplan“ oder Knopf in der Stunde). Kein Knopf in der Kachel.

---

## 5 Plan für den Frontend-Prototyp

### 5.1 Ziel
Ein **bedienbarer Prototyp mit erfundenen Daten**, der zeigt, ob sich die Gestaltung auf PC, iPad und Handy im Alltag gut anfühlt, bevor das echte System gebaut wird. Er ist **kein** Produktivsystem: kein Backend, keine Anmeldung, keine echten Daten (E11).

### 5.2 Umfang (repräsentativ, nicht vollständig)

| # | Bildschirm | Warum im Prototyp |
|---|---|---|
| 1 | **Heute** mit Kachel „Läuft gerade“, Zeitbalken, Hinweise | zeigt Navigation, Zeitbalken, Mitarbeit-Knopf |
| 2 | **Kurs-Übersicht** (Kacheln) | zeigt die „Mitarbeit überall“-Regel |
| 3 | **Live-Stunde** mit Sitzplan, Mitarbeit-Schnelleingabe (Smiley + Baustein + Rückgängig), Zufall | der zeitkritische Kern |
| 4 | **Notenbuch**: Tabelle, Tastatur wie Excel (E45), Eintragen mit Live-Gesamtnote, Rechenweg, Endnote festlegen | Herzstück (E37) |
| 5 | **Schülerübersicht** mit Fehlzeiten-Analyse, Mitarbeitsverlauf, Notizen | deine Lieblingsansicht |
| 6 | **Handy-Ansichten**: Heute, Mitarbeit-Schnelleingabe, Notenliste mit Schülerkarte, Fehlzeiten | Handy ist in E44 festgelegt |
| 7 | **Navigations-Einstellung**: Seitenleiste, Reiterleiste links oder rechts, untere Leiste, umschaltbar | zeigt, welche Variante sich bewährt |
| 8 | **Dunkelmodus** für 1 bis 3 | Beamer und dunkle Räume |

**Bewusst nicht im Prototyp:** Anmeldung, Import aus WebUntis, Mails, Dateiablage, Bewertungsbögen, Auswertungen über Kurse hinweg, Offline-Betrieb, Mandanten, Rechte. Ob die Notenberechnung nur die Kernregeln aus `RECHENLOGIK.md` (Gewichte, leerer Zweig, Runden bei ,50) oder alles abbildet, entscheidest du (Abschnitt 6). Ich empfehle die Kernregeln mit den Testfällen aus dem Dokument.

### 5.3 Technischer Rahmen
- **SvelteKit mit Svelte 5 und TypeScript**, wie in E22 festgelegt, damit der Prototyp später **in das echte System wächst**, nicht weggeworfen wird.
- **Statische Mock-Daten** als JSON im Projekt, ausschließlich erfundene Namen. Kein Schülername an KI-Dienste (E11).
- **`tokens.css` als einzige Quelle** für Farben, Abstände, Schrift. Keine Farbwerte in Komponenten.
- **Komponentenbibliothek** (`ui/`): Knopf, Pille, Chip, Kachel, Kennzahl, Zeitbalken, Smiley, Mitarbeit-Fenster, Hinweisleiste, Navigationsvarianten, Notentabelle-Zelle. Eine **Übersichtsseite** zeigt alle Bausteine mit ihren Zuständen (hell, dunkel, Fokus, deaktiviert).
- **Breakpoints:** Handy bis 767 px (untere Leiste), Tablet 768 bis 1199 px (Seitenleiste schmal oder Reiterleiste), PC ab 1200 px (Seitenleiste). Prüfbreiten: 390, 820, 1180 (iPad), 1366 (typischer Schul-PC), 1440.
- **Tastatur:** Pfeile, Enter, Tab im Notenbuch, Strg K Suche, Strg Z Rückgängig. Sichtbarer Fokusring in Petrol auf allen Bedienelementen.
- **Bewegung:** nur kurze, ruhige Übergänge, respektiert „Bewegung reduzieren“. Der Zeitbalken wächst im Sekundentakt nicht, sondern aktualisiert sich minütlich.
- **Auslieferung:** lokal auf dem Unraid-Server als statische Seite hinter Passwort, nicht im Internet offen. Kein Tracking, keine externen Schriften.

### 5.4 Meilensteine

| # | Inhalt | Ergebnis |
|---|---|---|
| **0** | Projektgerüst, `tokens.css` erweitert, Inter lokal, Logo-Dateien eingebunden | leere Seite im richtigen Aussehen, hell und dunkel |
| **1** | Bausteine inklusive Smiley-SVG-Satz, Dunkelmodus-Werte gemessen, Bausteine-Übersicht | prüfbare Bibliothek |
| **2** | Heute, Kurs-Übersicht, Navigationsvarianten | erster Durchgang auf PC, iPad, Handy |
| **3** | Live-Stunde mit Mitarbeit-Schnelleingabe, Zufall | **Prüfstein für Tempo:** Mitarbeit in zwei Tipps |
| **4** | Notenbuch mit Eintragen und Live-Note | **Prüfstein für Tempo:** Klassenarbeit für 24 Schüler in unter zwei Minuten |
| **5** | Schülerübersicht mit Fehlzeiten und Mitarbeitsverlauf | deine Lieblingsansicht in Bewegung |
| **6** | Handy-Fassungen, Dunkelmodus, Feinschliff | Abnahme durch dich |

Aufwand: Ich nenne bewusst keine Stunden, weil sie bei einem Prototyp mit offener Entscheidung (Notenberechnung, Smiley-Skala) nicht belastbar wären. Die Reihenfolge ist so gewählt, dass nach Meilenstein 2 und nach Meilenstein 4 jeweils etwas Vorzeigbares steht und du eingreifen kannst.

### 5.5 Prüfung und Abnahme
- **Browsertests** (Playwright) auf den fünf Breiten, mit Screenshots zum Vergleichen mit den Mockups.
- **Barrierefreiheits-Prüfung** mit automatischem Werkzeug (axe) plus von Hand: Tastaturbedienung, Fokusreihenfolge, Kontrast der neuen Farben, Smileys ohne Farbe lesbar.
- **Echte Geräte**, nicht nur Emulation: dein iPad (Safari), ein **Schul-PC** (welcher Browser?), ein Handy. Das ist der Punkt, an dem Annahmen aus Abschnitt 1 des ersten Dokuments (Gerätemix, Beamer, Raumlicht) überprüft werden.
- **Abnahmekriterien** (messbar):
  1. Mitarbeit eintragen: höchstens zwei Tipps vom Heute-Bildschirm.
  2. Note eintragen: Zahl tippen, Enter, nächster Schüler, ohne Maus.
  3. Live-Gesamtnote ist immer sichtbar und erklärt auf Antippen ihren Rechenweg.
  4. Kein Dialog unterbricht eine Eingabe, alles hat „Rückgängig“.
  5. Handy: alle Tippziele mindestens 44 px, keine waagerecht scrollende Tabelle.
  6. Lesbar aus drei Metern auf dem Beamer in der Live-Stunde (Beamer-Ansicht).

### 5.6 Risiken
- **Emoji sehen auf jedem Gerät anders aus.** Deshalb eigene SVG-Smileys schon in Meilenstein 1.
- **Alte Schul-PCs und Browser.** Wenn dort nur ein älterer Browser läuft, sind manche Layout-Funktionen (z. B. Container-Abfragen) zu vermeiden. Das hängt an der Antwort aus Abschnitt 6.
- **Gedrehte Schrift der Reiterleiste** ist auf kleinen Bildschirmen schwer zu lesen. Deshalb nur ab Tablet-Breite, am Handy Segmentleiste.
- **Zu viel Funktion.** Der Prototyp wächst gern. Der Umfang in 5.2 ist die Grenze, Neues kommt ins Backlog (E38).
- **Kontraste der neuen Farben** sind noch nicht gemessen. Prüfpunkt in Meilenstein 1.

---

## 6 Was ich von dir noch brauche

1. **Mitarbeitsskala:** Reichen vier Stufen (sehr gut, gut, mittel, schwach) oder willst du drei oder fünf? Und die **Namen** der Stufen, gerade bei Kollegen, die anders denken.
2. **Textbausteine:** Wer pflegt sie, jede Lehrkraft für sich oder eine gemeinsame Bibliothek? Für den Prototyp reichen 6 bis 8 feste, die ich vorschlage.
3. **Schul-PC:** Welcher Browser und welche Bildschirmgröße? Davon hängt ab, wie modern der Prototyp sein darf.
4. **Standard der Navigation:** Seitenleiste links als Standard (mein Vorschlag), Reiterleiste als Wahl in den Einstellungen. Passt das?
5. **Stundenende-Hinweis** („3 Schüler ohne Mitarbeitseintrag“): ja oder nein.
6. **Notenberechnung im Prototyp:** Kernregeln mit den Testfällen aus `RECHENLOGIK.md` (mein Vorschlag) oder nur Anzeige mit festen Werten?
7. **Schullogo als Vektordatei** für große Flächen (Anmeldeseite, Beamer-Titel).

---

## 7 Vorschläge für `ENTSCHEIDUNGEN.md` (noch nicht eingetragen)

Wenn du zustimmst, würde ich sie so festhalten, mit Datum:

- **E49** Designrichtung **A** (Papier und Petrol) bestätigt, mit Elementen aus C (Kachel „Läuft gerade“, Zeitbalken, linke Navigation) und B (Fehlzeiten-Analyse, Notizen, Mitarbeit als Verlauf).
- **E50** Stunden haben **keine Phasen**, nur einen dynamischen Zeitbalken von Beginn bis Ende.
- **E51** **Mitarbeit ist überall einen Tipp entfernt**, in jeder Kachel mit Kurs oder Stunde, neben „Stunde öffnen“ als Nebenknopf. Der Sitzplan liegt eine Ebene tiefer, in der geöffneten Stunde.
- **E52** **Smileys** mit dezenten Hintergrundfarben, vier Stufen, eigener SVG-Satz statt System-Emoji. Wertung zusätzlich durch Gesichtsform.
- **E53** **Navigation** wählbar: Seitenleiste links (Standard), Reiterleiste links oder rechts, untere Leiste am Handy. Aktiver Reiter in Petrol, nicht im Schulrot.
- **E54** **Schülerübersicht** und **Notenbuch** gelten in der gezeigten Form als Vorlage.

---

## 8 Antworten vom 09.11.2026 und was daraus folgt

| # | Antwort | Folge |
|---|---|---|
| 1 | **Fünf Stufen** für Mitarbeit | Skala mit fünf Smileys (z. B. sehr gut, gut, mittel, schwach, sehr schwach). Das Auswahlfenster am PC und die Kacheln am Handy werden auf fünf ausgelegt, der SVG-Satz bekommt fünf Gesichter. Neuer Token für „sehr schwach“ (kräftigeres Warnung-Hell). Namen der Stufen noch festlegen. |
| 2 | **Gemeinsame Textbaustein-Bibliothek.** Lehrkräfte können pro Eintrag einen **eigenen Kommentar** schreiben, aber **keinen neuen Baustein anlegen**. | Chips kommen nur aus der Bibliothek. Der letzte Chip heißt „Eigener Kommentar …“ und gilt nur für diesen Eintrag. Wer die Bibliothek pflegt (Admin oder Fachbereich), ist noch offen. Eigene Kommentare erscheinen im Verlauf wie Bausteine, aber ohne Zählung unter „Häufigste Bausteine“. |
| 3 | **Chrome und Firefox**, Full-HD-Monitore und **4K-Tafeln** | siehe unten |
| 4 | **Seitenleiste** gefällt, pro Nutzer wählbar, links oder rechts, vor allem auf Mobilgeräten | Einstellung „Navigation“ je Nutzer: Seitenleiste, Reiterleiste, untere Leiste, dazu Seite links oder rechts. Rechtsstellung gilt vor allem für Handy und Tablet. Standard: Seitenleiste links am PC. |
| 5 | **Stundenende-Hinweis** erstmal ja, später evtl. abschaltbar | Leise Zeile, kein Dialog, Schalter in den Einstellungen von Anfang an vorsehen. |
| 6 | **Notenberechnung: erst UPZ-Dateien abwarten.** Falls doch im Prototyp, dann nach `RECHENLOGIK.md`. | Der Prototyp rechnet **nicht** selbst. Die Noten und Live-Werte sind feste Beispielwerte. Falls später nötig: nur Kernregeln aus `RECHENLOGIK.md`. Meilenstein 4 prüft dann nur das Eintragen und die Bedienung, nicht die Rechnung. |
| 7 | **Schullogo als Vektor**: „schadet nicht“ | Ja, kostet nichts außer der Nachfrage beim Sekretariat oder der Schul-Webseite. Bis dahin bleibt das PNG, nur nicht für große Flächen. |

### Was Chrome, Firefox, Full-HD und 4K genau bewirken

**Browser (Chrome und Firefox am PC):**
- Beide sind aktuelle Browser. Ich kann moderne Gestaltungsfunktionen nutzen, ohne Notlösungen für alte Versionen. Das hält die Bausteine einfach.
- **iPad und iPhone laufen weiter auf Safari.** Der Prototyp muss auf Chrome, Firefox **und** Safari geprüft werden. Safari ist bei neuen Funktionen oft der Engpass.
- **Installieren als App (PWA):** Chrome kann das am PC, Firefox am PC nicht. Auf dem Schul-PC läuft L.E.O. also im Browser-Tab. Offline-Betrieb über Service Worker funktioniert in beiden. Der „Installieren“-Hinweis erscheint nur dort, wo er geht.
- Eingeschränkte Schul-PCs: Falls sich keine Einstellungen oder Speicher ändern lassen, muss die Navigations-Einstellung zusätzlich am Konto hängen, nicht nur im Browser.

**Full-HD-Monitore (1920 × 1080):**
- Mehr Platz als die 1440-Breite meiner Mockups. Folge: Inhalte bekommen eine **sinnvolle Maximalbreite** und werden nicht endlos gestreckt. Die Notentabelle darf voll breit werden, Karten-Ansichten nutzen zusätzliche Spalten (z. B. vier statt drei Kacheln je Zeile).
- Die Schrift bleibt bei 14 px Standard. Auf Full-HD wirkt das bei großen Monitoren klein, deshalb gibt es eine Einstellung „Größe“ (normal, groß).

**4K-Tafeln (3840 × 2160):**
- Entscheidend ist die **Skalierung des Betriebssystems**. Bei 200 % Skalierung sieht der Browser nur etwa 1920 × 1080 „CSS-Pixel“, bei 100 % wären es 3840. Ich plane auf **relative Einheiten** (rem) und prüfe beide Fälle.
- **Logo und Smileys müssen Vektor (SVG) sein**, sonst werden sie auf 4K unscharf. Das ist ein weiterer Grund für den eigenen Smiley-Satz.
- Die **Beamer- oder Tafel-Ansicht** (Live-Stunde, Gruppen, Zufall, Countdown) bekommt eigene große Schriftgrößen, lesbar aus mehreren Metern.
- **Touch auf der Tafel:** Falls die Tafeln berührbar sind, gelten dort 44 px Tippziele wie am Tablet. Ob es Touch-Tafeln sind, weiß ich nicht. Bitte kurz bestätigen.
- Prüfmatrix im Prototyp: 1920 × 1080 bei 100 %, 3840 × 2160 bei 100 % und bei 200 %, jeweils in Chrome und Firefox.

### Neue Fragen, die daraus entstehen
1. **Wer pflegt die Textbaustein-Bibliothek** (Admin, Fachbereichsleitung, jeder Fachbereich für sich)?
2. **Sind die 4K-Tafeln berührbar** (Touch) oder nur Anzeige?
3. **Wie heißen die fünf Stufen** der Mitarbeit?

---

## 9 Antworten vom 09.11.2026, zweite Runde: Mitarbeitsskala, Stift, Bibliothek

### 9.1 Die fünf Stufen sind Farben (ersetzt Abschnitt 2.2 und 2.4 bei Mitarbeit)

Konstantin legt die Skala über **fünf Farben** fest, keine Namen nötig. Seine Bedeutung:

| Stufe | Farbe | Bedeutung (Beispiele, keine abschließende Liste) |
|---|---|---|
| 5 | **dunkelgrün** | hilft anderen, sehr engagiert, sehr gute Beteiligung, top vorbereitet, schnell fertig |
| 4 | **hellgrün** | engagiert, phasenweise gute Beteiligung, Beitragsqualität meistens gut |
| 3 | **gelb** | unauffällig und ruhig, kaum Beteiligung, Beitragsqualität schwankend |
| 2 | **orange** | abgelenkt, langsam, keine hochwertigen Beiträge, quatscht manchmal, Arbeitsmaterial fehlt am Anfang |
| 1 | **rot** | stört, schläft, Handy |

**Gestaltung dazu (Vorschlag):**
- Fünf runde Smiley-Flächen in genau diesen fünf Farben, jeweils **zarte Fläche** für Chips, Sitzplatz und Listen, **kräftigerer Ton** für den Anteilsbalken im Verlauf.
- Gesichter: lachend breit, lachend, neutral, Mund nach unten, Stirn gerunzelt. Die **Form trägt die Bedeutung zusätzlich zur Farbe**, damit Rot-Grün-Schwäche nichts kaputt macht (bei Ampelfarben besonders wichtig).
- **Endgültige Töne (E60):** Flächen dunkelgrün #d5e8da, hellgrün #e6efd9, gelb #faf0c4, orange #fbe0c6, rot #f9e3de (dunkelgrün, hellgrün und rot genau wie im Mockup N2). Balken im Verlauf: #8fc4a0, #c5dcae, #e9cf6a, #eba461, #e6a99d.

**Ehrlicher Zielkonflikt mit E48:** In der Designsprache bedeutet **Rot = unter der Grenze oder UE** und **Gold = Hinweis oder Vorbehalt**. Die Mitarbeitsfarben Gelb, Orange und Rot sind diesen beiden ähnlich. Lösung, die ich vorschlage:
1. Die Mitarbeitsfarben gibt es **nur auf dem Smiley-Gesicht und im Mitarbeitsverlauf**, nie als Textfarbe, Rand, Kachel oder Knopf.
2. Sie sind **blasser** als Warnrot und Gold-Hinweis und stehen immer mit Gesicht.
3. Ein Schüler mit „rot“ in der Mitarbeit bekommt **keine** Warnmarkierung in der Namenszeile. Warnrot bleibt für Noten unter der Grenze und UE.
Konstantin hat die zarten Töne aus dem Mockup N2 bestätigt und Kontrast sowie Rot-Grün-Schwäche als erledigt erklärt (09.11.2026, E60). Es gibt dafür keinen eigenen Prüfpunkt mehr. Die Regel, dass die Mitarbeitsfarben nur auf Gesicht und Verlauf stehen, gilt weiter.

### 9.2 Textbausteine (Entwurf, abgeleitet aus deinen Beispielen)

Eine gemeinsame Bibliothek, **vom Admin gepflegt, nicht viele**. Lehrkräfte wählen daraus und können pro Eintrag einen **eigenen Kommentar** hinzufügen, aber keine neuen Bausteine anlegen. Vorschlag für den Prototyp, ungefähr zehn bis zwölf, zugeordnet zu Stufen:

| Stufe | Textbaustein |
|---|---|
| dunkelgrün | hilft Mitschülern |
| dunkelgrün | sehr gut vorbereitet |
| dunkelgrün | bringt eigene Ideen ein |
| hellgrün | beteiligt sich aktiv |
| hellgrün | Beiträge meistens treffend |
| gelb | ruhig, wenig Beteiligung |
| gelb | Beitragsqualität schwankt |
| orange | wirkt abgelenkt |
| orange | arbeitet langsam |
| orange | Material fehlt zu Beginn |
| orange | spricht dazwischen |
| rot | stört den Unterricht |
| rot | Handy genutzt |
| rot | schläft |

Hinweise:
- Bausteine sind **Vorschläge zur Stufe**, keine Pflicht. Man kann auch einen „grünen“ Baustein an einen „gelben“ Smiley hängen, wenn es passt.
- Die Formulierungen sind bewusst **beschreibend und neutral**, nicht wertend über die Person (wichtig, weil Schüler und Eltern Einsicht verlangen können; das ist keine Rechtsberatung, bitte mit dem Datenschutz klären).
- Das ist nur ein Startsatz. Der Admin kann ihn später ändern.

### 9.3 Stift (Apple Pencil) wird eingeplant

- **Eingabe per Stift im Textfeld:** iPadOS wandelt Handschrift in Text um (Scribble). Wenn Eingabefelder normale Textfelder sind, funktioniert das ohne Zusatzaufwand. Alle Felder (Notizen, eigener Kommentar, Suche) müssen **normale Textfelder** sein, keine selbstgebauten.
- **Keine Bedienung nur über Hover** (Mouse-over). Der Stift kann das nicht verlässlich. Alles, was Mouse-over zeigt (z. B. Nachteilsausgleich), hat auch Antippen (E36 sagt das schon).
- **Ruhige Hand:** Wer mit dem Stift schreibt, legt die Hand auf. Der Prototyp muss versehentliche Berührungen am Rand tolerieren (keine Wischgesten ganz am Bildschirmrand, Mindestabstände bei Tippzielen). Das prüfe ich am echten iPad.
- **Freihandzeichnen** (Skizze im Sitzplan, handschriftliche Randnotiz als Bild) ist **nicht** Teil des Prototyps. Kommt als Idee ins Backlog, mit Herkunft K.

### 9.4 Weitere Antworten
- **Bibliothek pflegt der Admin**, wenige Bausteine.
- **4K-Tafeln:** Touch ja, aber nur für Timer oder Ähnliches. Wenig wichtig. Die Beamer-Ansicht bleibt Anzeige mit großen Schriften, keine eigene Touch-Optimierung im Prototyp.
- **Stundenende-Hinweis** vorerst an, später eventuell aus. Schalter von Anfang an.

### 9.5 Auswirkung auf den Plan
- **Meilenstein 1:** Smiley-Satz mit **fünf** Gesichtern in den fünf Farben aus E60.
- **Meilenstein 3:** Mitarbeit-Fenster mit fünf Smileys und zwölf bis vierzehn Bausteinen, Eingabe des eigenen Kommentars im Textfeld.
- **Offen nur noch:** ob dir die vorgeschlagenen Textbausteine (9.2) passen.

---

## 10 Entscheidung zu den Smiley-Farben (09.11.2026, E60)

Konstantin nimmt die **zarten Töne aus dem Mockup N2** und behält **fünf Stufen** (Option „Fünf Stufen, N2-Töne erweitert“). Damit ist 9.1 so zu lesen: dunkelgrün #d5e8da, hellgrün #e6efd9, gelb #faf0c4, orange #fbe0c6, rot #f9e3de als Flächen, Balken #8fc4a0, #c5dcae, #e9cf6a, #eba461, #e6a99d. **Kontrast und Rot-Grün-Schwäche** werden nicht weiter verfolgt (Konstantin). Die Tokens `--leo-mit-*` in 2.2 sind entsprechend fünf, nicht vier: sehr gut, gut, mittel (gelb), schwach (orange), sehr schwach (rot). Die Gesichtsform bleibt zusätzlich bestehen.
