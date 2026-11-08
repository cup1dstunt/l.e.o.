# Ideen: Features, Designelemente, QoL, Onboarding

Stand: 08.11.2026. Ideensammlung von Claude auf Konstantins Frage „Hast du sonst noch gute Ideen?“.
Am 08.11.2026 von Konstantin angenommen, außer I33 und I35 (E30). Die Punkte stehen im [BACKLOG](BACKLOG.md).
★ = meine Favoriten.

---

## 1 Schulressourcen und MEDIAN in der App

Konstantins Wunsch: MEDIAN soll in L.E.O. sichtbar sein, gerade bei der Planung.

- **I1 Schulressourcen** ★: Die Schule (Admin) pflegt Links und Dokumente zentral: MEDIAN-Board, Notenspiegel, Formulare,
  Konferenztermine. Sie erscheinen in L.E.O. als eigene Kachel und kontextbezogen. Links mit Zugangsschlüssel liegen in den
  Schuleinstellungen der Datenbank, **nicht im Code**. Jede Schule hat ihre eigenen (passt zu `schule_id`).
- **I2 Methode an die Stunde hängen** ★: Bei der Planung einer Stunde „Methode wählen“ → Gruppenpuzzle, Placemat, Lerntempoduett …
  Die MEDIAN-Karte ist verlinkt, und L.E.O. hilft bei der Umsetzung (siehe I3).
- **I3 Methoden-Helfer** ★: Methoden, die L.E.O. selbst unterstützen kann:
  - **Gruppenpuzzle:** bildet Stamm- und Expertengruppen in einem Schritt, zeigt sie auf dem Beamer, Timer für beide Phasen.
  - **Lerntempoduett:** Wer fertig ist, tippt auf „fertig“, L.E.O. bildet laufend Paare aus den Schnellen.
  - **Placemat:** Vierergruppen plus Timer für Einzel- und Gruppenphase.
  - **Stationenlernen / Lerntheke:** Laufzettel, wer welche Station geschafft hat.
- **I4 Bewertungskriterien aus MEDIAN-Matrizen**: Beim Anlegen eines Projekts (Podcast, Pitch, Präsentation) wird die passende
  Bewertungsmatrix als Bogen vorgeschlagen und als Notenspalte angelegt.
- **I5 Exit Ticket aus MEDIAN** digital: Karte wählen, QR an die Wand, Antworten anonym oder mit Namen, Ergebnis landet an der Stunde.
- **I6 Kann-Liste je Unterrichtseinheit**: Schüler haken ab, was sie können; Lehrkraft sieht den Klassenstand als Balken.

## 2 Entwicklung sichtbar machen (Design-Fokus)

- **I7 Schülerkarte von überall** ★: Ein Tipp auf einen Namen, egal wo, öffnet eine Karte: Foto, Notenverlauf als kleine Linie,
  Fehlzeitenquote, letzte Smileys, offene Hausaufgaben, Notizen, Nachschreibstatus. Wischen = nächster Schüler.
- **I8 Verlaufslinien im Notenbuch**: In jeder Zeile eine kleine Linie über alle Halbjahre. Ein Blick zeigt: steigt, fällt, stabil.
- **I9 Trendpfeile statt Zahlenwüste**: ↗ ↘ → neben der Gesamtnote, bezogen auf den letzten Monat.
- **I10 Aufmerksamkeitsradar** ★: „Diese Schüler hast du seit drei Wochen nicht bewertet oder aufgerufen.“ Gegen die unsichtbaren
  Stillen in der letzten Reihe. Sanft, einmal pro Woche.
- **I11 Halbjahresrückblick je Kurs**: eine Seite mit Notenspiegel, Entwicklung, Fehlzeiten, Auffälligkeiten. Für dich, für die Konferenz.

## 3 Unterricht und Alltag

- **I12 Wischgesten in Listen** ★: nach rechts = anwesend/erledigt, nach links = fehlt/nicht erledigt, langes Drücken = Menü.
  Auf dem Handy in 20 Sekunden durch eine Klasse.
- **I13 Notenschluss-Assistent** ★: Zwei Wochen vor Notenschluss eine Checkliste: „3 Kurse ohne Endnote, 2 Schüler ohne
  Mitarbeitsnote, 1 Nachschreiber offen.“ Ein Tipp führt zur Stelle.
- **I14 Klausurrückgabe**: Notenspiegel, Schnitt und der Hinweis, ob die Arbeit genehmigt werden muss (Regel der Schule: mehr als ein
  Drittel unter 5 Punkten), direkt beim Eintragen.
- **I15 Gesprächsvorbereitung**: Für Elternsprechtag oder Beratung eine Seite je Schüler mit allem Wichtigen, als PDF oder auf dem Tablet.
- **I16 Vertretungsinfo** ★: Wirst du vertreten, kannst du der Vertretung mit einem Tipp einen Lesezugang auf Zeit geben:
  Sitzplan, Stand der Reihe, Aufgabe für die Stunde. Keine Noten.
- **I17 Wochenblick**: Montags eine Kachel: Klausuren, Abgaben, Gespräche, Konferenzen, Geburtstage dieser Woche.
- **I18 Erinnerungen per Push**: Die installierte App darf auf iPhone, Android und Windows Mitteilungen schicken
  (Mitarbeit eintragen, Abgabe fällig, Nachschreiber informieren).
- **I19 Abgaben mit Frist**: Arbeitsproben einsammeln (Datei oder nur „abgegeben“), Liste „fehlt noch“, Erinnerung an die Säumigen.

## 4 Kleine Helfer (QoL), Ergänzung zu Q1–Q16

- **I20 Mehrfachauswahl per Wischen** über Namen, dann eine Aktion für alle (Baustein, Note, Gruppe).
- **I21 Zuletzt bearbeitet**: die letzten 10 Stellen, an denen du warst, einen Tipp entfernt.
- **I22 Kopieren für Excel/Word**: jede Tabelle mit einem Tipp als Tabelle in die Zwischenablage.
- **I23 Offline-Anzeige**: klares Zeichen „offline, 12 Eingaben warten“, damit man L.E.O. vertraut.
- **I24 Haptisches Feedback** beim Setzen einer Note auf dem Handy (wo das Gerät es kann).
- **I25 Diktat für Notizen** direkt aus der Schülerkarte (Spracherkennung des Geräts, nichts geht an eine KI).
- **I26 Spalte aus Vorlage**: „Verspätungstest“, „Vokabeltest“, „Referat“ als gespeicherte Spaltenarten mit Gewicht und Notenart.

## 5 Onboarding

- **I27 Start in zehn Minuten** ★: IServ-Anmeldung → L.E.O. erkennt aus WebUntis deine Kurse → „Das sind deine Kurse?“ bestätigen
  → Vorlage wählen (Schulvorgabe 50/50 oder eigene) → fertig. Kein leerer Bildschirm am ersten Tag.
- **I28 Umzugshilfe**: beim ersten Start „Kommst du von iDoceo, UPZ oder Excel?“ mit passendem Import.
- **I29 Spielwiese**: ein Demo-Kurs mit erfundenen Schülern, in dem man alles ausprobieren und nichts kaputt machen kann.
- **I30 Tipps im Kontext statt Handbuch**: kleine Hinweise beim ersten Benutzen einer Funktion, ein „Trick der Woche“ in der Heute-Ansicht.
- **I31 Vorlagen von Kollegen**: Wer eine gute Vorlage (Notenbuch, Bogen, Spaltenart) hat, teilt sie per Link. Neue Kollegen starten mit
  einer erprobten Vorlage ihres Fachbereichs.
- **I32 Fortbildungs-Kit** für die schulweite Einführung: 20-Minuten-Ablauf für eine Konferenz, Einseiter, kurze Videos.

## 6 Vertrauen und Datenschutz als Gefühl

- ~~**I33 „Wer sieht das?“**~~ entfällt (E29: Noten sieht nur die Lehrkraft).
- **I34 Eigener Datenexport** jederzeit mit einem Tipp. Niemand fühlt sich eingesperrt.
- ~~**I35 Protokoll für mich**~~ entfällt (E29).
