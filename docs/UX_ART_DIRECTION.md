# L.E.O. – UX und Art Direction, Schritte 1 bis 4

Stand: 09.11.2026. Kein Code, nur Planung. Schritt 5 (Designsystem und Prototyp-Plan) folgt erst nach deiner Auswahl.

Gelesen: CLAUDE.md, PLANUNG, ENTSCHEIDUNGEN (E5, E24 bis E27, E34, E37 bis E48), DESIGN.md, tokens.css, FRAGEN_SCHULE, die Konzeptbilder 1 und 4 und das Doppellogo.

---

## 1 Fehlende Informationen und Annahmen

### Wie ich deinen Auftrag gelesen habe
In der Nachricht waren die Platzhalter für Projekt und Referenzen nicht ausgefüllt. Ich habe sie als L.E.O. gelesen: Notenbuch, Anwesenheit, Mitarbeit, Sitzplan, Zufall und Gruppen, Fehlzeiten und Mails, Stundenplan, Entwicklung über Halbjahre. Zielgruppe sind Lehrkräfte der Leopold-Ullstein-Schule auf PC, Tablet und Handy. Als Referenz gelten deine Konzeptbilder (gefallen, „sehr clean“) und das Doppellogo. iDoceo ist ausdrücklich keine Gestaltungsreferenz (E34), es liefert nur Aufbau und Rechenlogik.

### Spannung, die du kennen solltest
Mit E48 steht schon eine Designsprache (Papier, Petrol, Inter). E10 („keine Design-Vorschläge in der Planungsphase“) ist damit überholt. Ich behandle E48 deshalb als **Richtung A**, also als eine der drei Möglichkeiten und nicht als gesetzt. B und C weichen bewusst davon ab. Gewinnt B oder C, ersetzt das Ergebnis E48.

### Was mir fehlt (nach Gewicht für die Gestaltung)
1. **Gerätemix im Alltag.** Wie viel Prozent der Zeit PC, iPad, Handy? Welches Gerät liegt im Unterricht in der Hand? Das entscheidet, ob die Stunde oder die Tabelle der Mittelpunkt ist.
2. **Beamer und Blickwinkel.** Wird L.E.O. projiziert (Gruppen, Zufall, Timer)? Sehen Schüler zufällig mit? Das bestimmt Kontrast, Schriftgröße und den Sichtschutz-Knopf.
3. **Raumlicht.** Verdunkelte Räume bei Beamer? Dann braucht der Dunkelmodus (Q15, bisher ungeprüft) echte Aufmerksamkeit.
4. **Schul-PC im Unterricht (Korrektur 09.11.):** Der Schul-PC am Beamer ist ein vollwertiges Unterrichtsgerät, nicht nur Vor- und Nachbereitung. Die Live-Stunde muss also auch mit Maus und Tastatur auf großem Bildschirm gut gehen, und Unterrichtsmaterial gehört in die Stunden-Ansicht (Dateiablage, Modul O, Konzept noch offen). Das stärkt die Live-Stunde (Richtung C) etwas.
5. **Hardware.** Alte Schul-iPads, Lehrerzimmer-PCs? Wirkt auf Schriften, Effekte, Bildschirmgröße (1366×768 ist an Schulen häufig).
5. **Technikaffinität der 100 Lehrkräfte.** Du bist nicht der Maßstab. Gibt es Kolleginnen und Kollegen, die man früh zum Testen hätte (E15: eine Kollegin)?
6. **Schullogo als Vektor** (FRAGEN_SCHULE, Schule 7). Ohne SVG bleibt das Logo ein Pixelbild, relevant für große Flächen wie ein Login-Bildschirm.
7. **Barrierefreiheit.** Rot-Grün-Schwäche im Kollegium oder bei Schülern? Ich plane vorsichtshalber so, dass nichts nur über Farbe unterscheidbar ist (Form oder Text kommt immer dazu).
8. **Stift.** Wird mit Apple Pencil gearbeitet (Skizzen im Sitzplan, handschriftliche Notizen)? Bisher nicht erwähnt, daher nicht eingeplant.
9. **Sprache.** Nur Deutsch? Für Gestaltung relevant, weil „Notenpunkte 0–15“ und deutsche Dezimalkommas fest eingebaut sind.

### Annahmen, nach denen ich plane
- Haupt-Gerät im Unterricht: Handy und iPad im Hochformat und Querformat, am PC Vor- und Nachbereitung. Die große Notentabelle gibt es auf dem Handy nicht (E44).
- Jede Hauptansicht zeigt nur das, was man jetzt braucht (E38). Der Notenrechner bleibt Herzstück (E37).
- Berechnete Werte sehen anders aus als eingetragene (E39), Warnung und Vorbehalt behalten ihre Bedeutung (Rot, Gold).
- Datenschutz vor Effekt: keine externen Schriften oder Bilder, Schriften werden mitgeliefert. Sichtschutz-Modus ist Pflicht.
- Das Schullogo ist nur Marke, nie Bedienfarbe (E47, E48).
- Wegen „Noten sieht nur die Lehrkraft“ (E29) gibt es keine Dashboards für Schulleitung, die Gestaltung muss nichts dafür vorhalten.

---

## 2 Nutzeraufgaben und Seitenstruktur

### Wichtigste Aufgaben (geordnet nach Häufigkeit mal Zeitdruck)

| # | Aufgabe | Wo / Wann | Zeitdruck | Gerät |
|---|---|---|---|---|
| 1 | **Stunde beginnen:** Kurs öffnen, Anwesenheit bestätigen | Beginn der Stunde | sehr hoch (Schüler warten) | Handy, iPad, **Schul-PC** (Konstantin 09.11.) |
| 2 | **Mitarbeit festhalten:** Tipp auf Schüler, Smiley, Baustein | während der Stunde | sehr hoch (2 Sekunden) | Handy, iPad |
| 3 | **Noten für eine Klasse eintragen** (Klausur, Test) | nach Rückgabe, oft am PC | hoch (Schnelleingabe, E24, E27) | PC, iPad |
| 4 | **Stand prüfen:** Live-Note, Rechenweg, „Was brauche ich noch?“ | Gespräch, Konferenz | mittel | alle |
| 5 | **Fehlende nach Klausur:** E oder UE setzen, Nachschreiber, Mail | Tage nach der Klausur | mittel | PC, Handy |
| 6 | **Zufall und Gruppen** ziehen, anzeigen | im Unterricht, projiziert | hoch | iPad, Beamer |
| 7 | **Sitzplan** pflegen und nutzen | selten pflegen, oft ansehen | niedrig/hoch | iPad |
| 8 | **Entwicklung** eines Schülers über Halbjahre sehen | Elterngespräch, Konferenz | mittel | alle |
| 9 | **Endnote festlegen** | Halbjahresende | mittel, aber folgenreich | PC |
| 10 | **Heute / Stundenplan**, Dateien zur Stunde | morgens | niedrig | Handy |
| 10a | **Unterrichtsmaterial zur Stunde:** Dateien, Aufgaben, Links der Stunde ablegen und im Unterricht am Schul-PC/Beamer öffnen (neu, 09.11.) | Vorbereitung und in der Stunde | hoch (in der Stunde) | Schul-PC, iPad |
| 11 | **Einrichten:** Import aus WebUntis, Kurse, Notenbaum | selten (Semesterbeginn) | niedrig | PC |

Aus der Tabelle folgt: Die Aufgaben 1, 2, 6 passieren **in** der Stunde unter Zeitdruck, 3, 4, 8, 9 passieren **nach** der Stunde mit Ruhe. Zwei verschiedene Arbeitsweisen unter einem Dach. Die Gestaltung muss beide bedienen, ohne dass eine die andere stört.

### Seitenstruktur

```
Heute                    Stunden des Tages, nächste Stunde groß, Hinweise (Nachschreiber, Fehlzeiten-Auffälligkeit)
Kurse                    Liste der Kurse
 └ Kurs-Übersicht        Kacheln (E25): Noten, Mitarbeit, Anwesenheit, Sitzplan, Gruppen/Zufall, Notizen, Dateien
    ├ Noten              Tabelle (PC/iPad), Liste mit Schülerkarte (Handy, E44); Rechenweg, Endnote
    ├ Stunde (Live)      Anwesenheit + Mitarbeit + Sitzplan + Zufall/Gruppen + Timer in einer Ansicht
    ├ Sitzplan           Pflege
    └ Notizen, Dateien
Schüler                  Suche über alle eigenen Schüler → Schülerkarte: Verlauf über Halbjahre, Fehlzeiten, Notizen
Klasse                   nur Klassenleitung: Fehlzeiten der Klasse, Konferenzansicht (keine fremden Noten, E29)
Mehr                     Stundenplan/Kalender, Mails, Bewertungsbögen, Auswertung, Import, Einstellungen, Sichtschutz
```

**Navigation:** Handy untere Leiste mit vier Punkten (Heute, Kurse, Schüler, Mehr), wie in Bild 4. PC und iPad quer: schmale Seitenleiste mit denselben vier Punkten, Kurs-Reiter oben. Global immer erreichbar: Suche (Strg K), Sichtschutz, Halbjahr-Umschalter.

**Zwei Modi statt einer Oberfläche:** „Stunde“ (Live: groß, wenige Elemente, Tippflächen, projektionstauglich) und „Arbeiten“ (Notenbuch, Auswertung: dichter, Tastatur). Ob sie visuell unterschiedlich aussehen, ist genau der Unterschied zwischen den Richtungen unten.

---

## 3 Drei Designrichtungen

Alle drei halten ein: nicht iDoceo (E34), Zahlen zuerst, nichts unterbricht, Rot und Gold nur mit Bedeutung, Schullogo nur als Marke, Schriften mitgeliefert.

### Richtung A: „Papier und Petrol“ (Ist-Zustand, E48)

**Leitidee.** Ein ruhiger Arbeitstisch. Der Bildschirm tritt zurück, damit die Zahlen sichtbar bleiben.

**Hierarchie und Layout.** Warmes Papier als Grund, weiße Karten mit feinen Linien, kein Schatten außer bei schwebenden Fenstern. Eine Bedienfarbe (Petrol #2f5d62). Eingetragene Note fett in Tinte, berechnete Note leichter, grau, gepunktet unterstrichen. Gesamtnote rechts fest mit Petrol-Kante. Reiter oben, Kacheln in der Übersicht.

**Typografie und Bildsprache.** Inter, Ziffern gleich breit. Keine Bilder, keine Illustrationen, Symbole schlicht. Das Logo ist die einzige Marke und die einzige Rotfläche.

**Mobil.** Liste mit großer Note rechts und Trendpfeil, Schülerkarte mit 44-px-Note, Filter-Pillen, untere Leiste. Notentasten 46 px, unten eingeblendete Hinweisleiste mit „Rückgängig“.

**Vorteile für diese Zielgruppe.**
- Steht schon in Bildern, von dir bestätigt, und in Tokens. Geringstes Risiko, niedrigster Aufwand.
- Sehr gut lesbar, wenig Ablenkung, auch bei dichten Tabellen.
- Kontraste sind geprüft (Nebentext 4,5:1).

**Nachteile.**
- Am nächsten an dem, was man als „modernes, sauberes SaaS“ kennt: heller Grund, eine Akzentfarbe, Inter, weiße Karten. Es ist gut, aber es hat noch **keine eigene Handschrift**. Das ist genau das, was du ausgeschlossen hast (austauschbare KI-Ästhetik).
- Die Unterrichtssituation (Beamer, Distanz, Zeitdruck) ist nicht eigens gestaltet, die Live-Stunde sähe aus wie das Notenbuch mit anderen Inhalten.
- Wenig Wiedererkennung gegenüber dem Doppellogo: Das Rot der Wortmarke kommt in der Oberfläche nicht vor.

### Richtung B: „Klassenbuch und Bleistift“

**Leitidee.** Das Notenbuch als gutes Papier-Klassenbuch, das mitdenkt. Es nutzt eine Sprache, die jede Lehrkraft schon lesen kann: **Tinte ist endgültig, Bleistift ist vorläufig.** Genau die Unterscheidung aus E39 (eingetragen ganz, berechnet vorläufig) wird zum durchgehenden Gestaltungsprinzip statt zu einer Zusatzmarkierung.

**Hierarchie und Layout.** Hauptkörper ist die Seite: Tabellen sehen aus wie liniertes Heft mit durchgezogenen Zeilenlinien und leicht angedeuteten Spaltenlinien. Seitentitel und Kursname sitzen wie ein Aktendeckel oben links, Randnotizen (Anmerkungen, Vorbehalt) am Rand statt in Pop-ups. Eingetragene Noten in tiefem Tintenblau, fett. Berechnete Noten in Bleistiftgrau, kursiv, mit leicht unruhiger Unterlinie. Festgelegte Endnote bekommt einen **Stempel** (kleiner Rahmen, leicht geneigt, nur für diesen einen Zustand). Korrekturrot nur für Werte unter der Grenze, Textmarker-Gelb für Vorbehalt und aktuelle Zeile.

**Typografie und Bildsprache.** Titel und Kursnamen in einer Serifenschrift mit Charakter (Kandidaten mit freier Lizenz: Source Serif 4, Newsreader), Fließtext und Tabellen in einer nüchternen Grotesk (Source Sans 3 oder Inter), Zahlen in Tabellenziffern. Bildsprache: Papiertextur nur als sehr leise Fläche, Linien statt Kästen, Symbole wie Handzeichen (Haken, Kringel, Stern). Keine Fotos.

**Mobil.** Die Liste wird zur **Karteikarte**: eine Schülerkarte hat Kartenränder, die Note steht wie eine Randnote groß rechts, der Verlauf als Bleistiftlinie. „Blättern“ von Schüler zu Schüler per Wisch (wie Karteikarten). Untere Leiste wie bisher.

**Vorteile.**
- Hohe Wiedererkennung und eine eigene Idee, die den Inhalt erklärt: Man sieht ohne Legende, was endgültig ist und was nur Rechenvorschlag.
- Wirkt vertraut für Lehrkräfte, die Klassenbuch und Notenheft kennen, ohne verspielt zu werden.
- Serif für Titel setzt L.E.O. klar von Tools wie iDoceo und Standard-Webapps ab.

**Nachteile.**
- Gefahr von „Skeuomorphismus“: Zu viel Papier, Stempel und Kringel wirken schnell kitschig oder altmodisch. Verlangt strenge Zurückhaltung.
- Kursive Bleistift-Zahlen sind weniger gut lesbar als aufrechte, besonders auf schlechten Displays. Der Kontrast muss trotzdem 4,5:1 erreichen, damit bleibt „Bleistift“ dunkler, als es sich anfühlt.
- Aufwendiger als A (zwei Schriftfamilien, Spezial-Zustände). Dichte Tabellen mit Serifenschrift nur in Titeln sind okay, in Zellen nicht.
- Weniger geeignet für die Live-Stunde und den Beamer, dort wirkt die Papier-Metapher zu klein und leise.

### Richtung C: „Aushang und Anzeigetafel“

**Leitidee.** Schulgebäude als Vorbild: Raumschilder, Stundenplan-Aushang, Vertretungsplan-Anzeige. Alles, was in der Stunde passiert, ist **auf Distanz lesbar** und **farblich nach Kurs geordnet**. Der Tag ist ein Zeitband, die Stunde ist die Einheit.

**Hierarchie und Layout.** Oben der Tag als horizontales Zeitband (Stunden als Blöcke, jetzt-Marke). Jeder Kurs hat eine zurückgenommene Kennfarbe (Streifen, kein Vollton), die sich durch Heute, Kurs, Sitzplan und Noten zieht. In der Live-Stunde: Raster aus großen Flächen (Anwesenheit, Zufall, Gruppen, Timer), alles ≥ 56 px, Zahlen wie auf einer Anzeigetafel. Das Notenbuch ist die dichte Gegenseite dazu: gleiche Farben, aber ruhig und eng. Optionaler dunkler **Unterrichtsmodus** für verdunkelte Räume.

**Typografie und Bildsprache.** Eine Grotesk im Stil von Beschilderung (DIN-artig, z. B. Barlow oder Barlow Semi Condensed, freie Lizenz), nur ein Schriftschnitt-Paar. Dicke Piktogramme, Quadratraster, eckiger als A und B (kleine Radien). Zahlen groß und halbfett, ausgerichtet wie auf Tafeln.

**Mobil.** Hier am stärksten: Heute als Zeitband hochkant, Live-Stunde mit großen Daumenflächen, Zufall und Gruppen als Vollbild, das Handy kann man dem Beamer-Modus gleichsetzen. Noten-Liste ähnlich wie A, Kursfarbe als Randstreifen.

**Vorteile.**
- Beste Lösung für den Unterricht selbst (Zeitdruck, Distanz, Beamer). Die Stunde ist als Einheit gestaltet.
- Kurswechsel erkennt man im Augenwinkel. Nützlich bei vielen Kursen pro Tag.
- Visuell eigenständig, lehnt sich an die Schule an, ohne das Schulrot zu verbrauchen.

**Nachteile.**
- Kursfarben stehen im Konflikt mit dem Grundsatz „Farbe nur mit Bedeutung“. Lösung nur: gedeckte Töne, nie Rot oder Gold, nie Farbe allein als Information.
- Mehr Farbe heißt mehr Aufwand für Kontrast, Dunkelmodus und Farbfehlsichtigkeit.
- Wirkt im Notenbuch, das eigentlich ruhig sein soll, schnell zu laut, wenn man es nicht streng zurückhält.
- Weniger vertraut für ältere Lehrkräfte, die vor allem Tabellen und Listen mögen.

### Vergleich auf einen Blick

| Kriterium | A Papier und Petrol | B Klassenbuch und Bleistift | C Aushang und Anzeigetafel |
|---|---|---|---|
| Stärke | ruhig, lesbar, bereits abgesegnet | erklärt eingetragen vs. berechnet von selbst, eigene Handschrift | gut in der Stunde, auf Distanz, Beamer |
| Schwäche | austauschbar | Kitsch- und Lesbarkeitsrisiko | Farbregel, laut im Notenbuch |
| Notenbuch (E37) | sehr gut | sehr gut | gut |
| Live-Stunde / Beamer | mittel | schwach | sehr gut |
| Mobil | gut | gut | sehr gut |
| Aufwand | niedrig | mittel | hoch |
| Passt zum Logo | neutral | neutral | gut (Raster, Quadrate der Wortmarke) |

---

## 4 Empfehlung

**Empfehlung: A als Grundrichtung, aber geschärft mit zwei gezielten Übernahmen, ein Wechsel zu B oder C als Ganzes nur auf deinen Wunsch.**

Begründung:
1. **Der Inhalt entscheidet, nicht der Trend.** 80 Prozent der Zeit in L.E.O. sind Zahlen, Namen und Listen (Noten, Fehlzeiten, Entwicklung). Dafür ist Ruhe die richtige Gestaltung. B und C brauchen zusätzlichen Aufwand für eine Wirkung, die in der Tabelle selbst nichts bringt.
2. **Du hast A bereits gesehen und bestätigt.** Ein Wechsel kostet Zeit und riskiert, dass die guten Teile der Konzeptbilder verloren gehen.
3. **A ist robust für die Zielgruppe:** ältere Geräte, 100 verschiedene Technikniveaus, Schüler, die mitschauen. Weniger Gestaltung heißt weniger, das kaputtgehen kann.

Aber A allein erfüllt deine Forderung nach einer eigenen Handschrift nicht. Deshalb zwei Schärfungen:
- **Aus B: Tinte und Bleistift als Prinzip** statt nur grau und gepunktet. Eingetragene Zahl aufrecht und dunkel, berechnete heller mit klar erkennbarer „Skizzen“-Behandlung. Auf Wunsch eine Serifenschrift nur für Kursnamen und Seitentitel (Wiedererkennung bei null Lesbarkeitsrisiko in Zellen).
- **Aus C: ein eigener Live-Modus für die Stunde.** Große Tippflächen, Zeitband in „Heute“, optionaler dunkler Unterrichtsmodus, Kurs-Kennung als schmaler Streifen. Das Notenbuch bleibt A.

Wann ich anders empfehlen würde:
- Wenn die Live-Stunde bei dir wichtiger ist als das Notenbuch, nimm C.
- Wenn dir „eigene Handschrift“ wichtiger ist als geringes Risiko, nimm B.

Was ich nicht beurteilen kann: Ich habe keine Mock-ups gesehen oder gebaut, nur die vier bestehenden Bilder. Alles zu B und C ist Beschreibung, noch kein Beweis, dass es gut aussieht. Wenn du willst, skizziere ich pro Richtung einen Bildschirm (Notenbuch und Live-Stunde) als Bild, bevor du auswählst.

---

## Was ich von dir brauche

**Wähle A (geschärft), B oder C**, oder sag, was du mischen willst. Danach erstelle ich Schritt 5: ein konkretes Designsystem (aufbauend auf DESIGN.md und tokens.css) und einen Plan für einen repräsentativen Frontend-Prototyp (Vorschlag: Notenbuch + Live-Stunde auf PC, iPad und Handy).

Nützlich, aber nicht blockierend: Antworten auf die Fragen aus Abschnitt 1 (vor allem Gerätemix, Beamer, Raumlicht, Hardware).
