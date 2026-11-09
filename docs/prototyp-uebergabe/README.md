# Übergabe an den Prototyp-Agenten

Stand 09.11.2026. Dieses Paket ist für einen KI-Agenten gedacht, der das Repo **nur lesen** darf. Alles Nötige liegt im Repo. Nichts liegt ausschließlich in den Projektdateien: `leo/ux/` und `leo/konzept/` dort sind ältere Kopien von `docs/UX_ART_DIRECTION.md`, `docs/DESIGN_SYSTEM_PROTOTYP.md` (dort veraltet, im Repo gilt die neuere Fassung) und `docs/konzept/`. Maßgeblich ist immer das Repo.

Drei Teile: 1. Prompt, 2. Lesedateien, 3. Feedback.

---

## 1 Prompt zum Kopieren

````text
Du baust einen klickbaren Frontend-Prototyp für "L.E.O." (Leistung, Entwicklung, Organisation), ein selbst gehostetes Werkzeug für Lehrkräfte der Leopold-Ullstein-Schule (OSZ Berlin) als Ersatz für iDoceo. Sprache: Deutsch, Anrede "du", alle Texte und Kommentare auf Deutsch.

Du hast Lesezugriff auf das GitHub-Repo cup1dstunt/l.e.o., aber keinen Schreibzugriff. Beginne mit docs/prototyp-uebergabe/README.md (Abschnitt 2 listet alle Dateien in Lesereihenfolge). Lies zuerst, baue danach. Die Dokumente im Repo sind verbindlich. Wenn dir etwas fehlt oder sich widerspricht, frag nach oder triff eine sichtbar benannte Annahme. Erfinde keine Anforderungen.

ZIEL
Ein bedienbarer Prototyp mit erfundenen Daten, der zeigt, ob sich die Gestaltung auf PC, iPad und Handy im Alltag gut anfühlt, bevor das echte System gebaut wird. Kein Produktivsystem: kein Backend, keine Anmeldung, keine echten Daten.

UMFANG (Details und Meilensteine: docs/DESIGN_SYSTEM_PROTOTYP.md, Abschnitt 5)
1. Heute: Kachel "Läuft gerade", dynamischer Zeitbalken, Hinweise
2. Kurs-Übersicht (Kacheln), Mitarbeit überall einen Tipp entfernt
3. Live-Stunde: Sitzplan, Mitarbeit-Schnelleingabe (Smiley + Textbaustein + Rückgängig), Zufallsauswahl
4. Notenbuch: Tabelle, Tastatur wie Excel, Eintragen mit Live-Gesamtnote, Rechenweg, Endnote festlegen
5. Schülerübersicht: Fehlzeiten-Analyse, Mitarbeitsverlauf, Notizen
6. Handy-Ansichten: Heute, Mitarbeit, Notenliste mit Schülerkarte, Fehlzeiten
7. Navigationseinstellung: Seitenleiste (Standard), Reiterleiste links/rechts, untere Leiste, umschaltbar
8. Dunkelmodus für 1 bis 3
Technik: SvelteKit (Svelte 5) mit TypeScript, statische Mock-Daten als JSON (nur erfundene Namen), eigene SVG-Smileys, eine Bausteine-Übersichtsseite. Lauffähig mit einem einzigen Befehl, Anleitung im README. Alles in einem eigenen Ausgabeordner, Konstantin legt es selbst ab.

VERBINDLICHE DESIGNPRINZIPIEN (Richtung A "Papier und Petrol")
- Gestaltung nach docs/DESIGN.md, design/tokens.css (einzige Quelle für Farben, Abstände, Schrift, keine Farbwerte in Komponenten), docs/UX_ART_DIRECTION.md und docs/DESIGN_SYSTEM_PROTOTYP.md. Keine neuen Farben ohne Grund.
- Aus Richtung C: große Kachel "Läuft gerade", Zeitbalken, Navigation links. Aus B: Fehlzeitenanalyse und Notizen in der Schülerübersicht. Keine Stundenphasen, nur der Zeitbalken.
- Mitarbeit: fünf Stufen als zarte Farben (E52, E60) nur auf Smiley und Verlauf, Verlauf aus Smileys plus Textbausteinen, nicht acht Smileys nebeneinander. Textbausteine: gemeinsame Bibliothek, Lehrkraft ergänzt nur eigenen Kommentar (E53).
- Design und Farben NICHT an iDoceo orientieren (E34). Logo nach E47 (docs/konzept/logo/doppellogo/).
- Funktionen nehmen Arbeit ab: antippen statt eintippen, keine unterbrechenden Dialoge, alles hat "Rückgängig".
- Geräte: PC (Chrome, Firefox, Full-HD, 4K-Tafel), iPad/iPhone (Safari), Apple Pencil einplanen (normale Textfelder, kein Hover-Zwang). Handy: Tippziele mindestens 44 px, keine waagerecht scrollende Tabelle.
- Barrierefreiheit: sichtbarer Fokusring, Smileys auch ohne Farbe lesbar, "Bewegung reduzieren" beachten.

PROJEKTREGEL MODULPLANUNG
Jedes Modul (was das Programm leisten kann, z. B. Notenbuch) wird einzeln und genau geplant, Design und Funktion gemeinsam, verzahnt mit den anderen Modulen (Schnittstellen, gemeinsame Daten, Navigation). Nutzerführung, Verlässlichkeit und Funktionalität haben Vorrang, dazu gutes modernes Design. Nutzer sollen später Module an- und abwählen können (z. B. nur Notenbuch). Baue deshalb jedes Modul als eigenständigen Ordner mit klarer Schnittstelle. Alle Kolleginnen und Kollegen mitnehmen (Papier, iDoceo, UPZ, eigenes Excel).

NOTENBERECHNUNG
- Ziel: zwei Rechenprofile, "OSZ" (duale Berufsschule) und "FOS" (Fachoberschule), genau nach docs/UPZ_ANALYSE.md (Abschnitte 2 bis 4) und Entscheidungen E62 bis E64 in docs/ENTSCHEIDUNGEN.md. Die UPZ-Berechnungen sind von der Schulleitung abgesegnet und werden genau eingehalten. Kein eigener "L.E.O.-Standard". IHK-Profil nur als unauffällige Zusatzoption oder weglassen.
- Notenschlüssel als Daten (nicht im Code verdrahtet). Gewichtungen (Sonstige Leistungen : Mitarbeit, Klausur : Sonstige) frei einstellbar, auch je Einzelnote.
- Fehlzeiten über 30 % im Fach: Kennzeichnung "N" (E62), Entscheidung trifft die Zeugniskonferenz, also nur anzeigen und nie automatisch entscheiden.
- Prüfe deine Rechnung gegen docs/testfaelle/upz_referenzwerte.json (Schlüssel osz, ihk, fos; erfundene Schüler S01 bis S14, Werte aus LibreOffice). Schreibe daraus automatische Tests und berichte das Ergebnis ehrlich (bestanden/nicht bestanden, mit Abweichungen).
- Der Notenbuch-Aufbau (Spalten, Bedienung im Detail) wird erst am 13.11. endgültig geplant. Baue ihn nach den Konzeptbildern und RECHENLOGIK.md, kennzeichne ihn als vorläufig.
- Noten sieht nur die eigene Lehrkraft (E29). Zeige das im Prototyp nirgends anders.

NICHT-ZIELE
Anmeldung/IServ-SSO, WebUntis-Import, Mails, Dateiablage, Bewertungsbögen, Auswertungen über Kurse hinweg, Offline-Betrieb, Mandanten, Rechte, Freihandzeichnen, Abiturgewichtung, Halbjahresnoten-Austausch. Neue Ideen nicht einbauen, sondern am Ende als Liste nennen.

DATENSCHUTZ
Nur erfundene Namen und Daten. Keine echten Schülerdaten. Schicke nichts an externe Dienste, keine externen Schriften (Inter lokal), kein Tracking.

ABNAHMEKRITERIEN (docs/DESIGN_SYSTEM_PROTOTYP.md, 5.5)
1. Mitarbeit eintragen: höchstens zwei Tipps vom Heute-Bildschirm.
2. Note eintragen: Zahl tippen, Enter, nächster Schüler, ohne Maus. Klassenarbeit für 24 Schüler in unter zwei Minuten.
3. Live-Gesamtnote immer sichtbar, erklärt auf Antippen den Rechenweg.
4. Kein Dialog unterbricht eine Eingabe, alles hat Rückgängig.
5. Handy: Tippziele mindestens 44 px, keine waagerecht scrollende Tabelle.
6. Beamer-Ansicht der Live-Stunde aus drei Metern lesbar.
Prüfbreiten: 390, 820, 1180, 1366, 1440 px; zusätzlich 1920x1080 und 3840x2160.

ARBEITSWEISE UND ABGABE
- Arbeite nach den Meilensteinen 0 bis 6 aus DESIGN_SYSTEM_PROTOTYP.md. Nach Meilenstein 2 und nach Meilenstein 4 hältst du an und zeigst Konstantin etwas Vorzeigbares (Screenshots auf den Prüfbreiten, Anleitung zum Starten).
- Sei ehrlich bei Ungetestetem. Schreibe, was du geprüft hast (Browser, Gerät, Tests) und was nicht.
- Gib am Ende eine kurze Liste "Annahmen und offene Fragen" ab, damit Konstantin sie ins Backlog übernehmen kann.

FEEDBACKFRAGEN AN KONSTANTIN (stelle sie nach Meilenstein 2 und am Ende)
1. Fühlt sich Mitarbeit eintragen in der Live-Stunde schnell an (zwei Tipps)? Was stört?
2. Welche Navigation bleibt: Seitenleiste, Reiterleiste oder untere Leiste?
3. Sind Smiley-Töne, Textbausteine und Mitarbeitsverlauf verständlich und alltagstauglich?
4. Stimmt die Notenrechnung für OSZ und FOS mit deiner Erfahrung überein? Welche Zelle ist unklar?
5. Ist die Schülerübersicht (Fehlzeiten, Verlauf, Notizen) die Lieblingsansicht geworden oder fehlt etwas?
6. Was ist auf iPad/Handy/Schul-PC schwer zu bedienen?
7. Welche Funktion fehlt dir, welche ist überflüssig?
````

---

## 2 Dateien zum Lesen (Reihenfolge)

Alle Pfade im Repo `cup1dstunt/l.e.o.`, Branch `main`.

**Pflicht, zuerst**
1. `CLAUDE.md` Arbeitsregeln
2. `docs/ENTSCHEIDUNGEN.md` besonders E29, E31, E34, E37 bis E48, E50 bis E64
3. `docs/DESIGN_SYSTEM_PROTOTYP.md` Prototyp-Plan (Abschnitt 5), Bausteine, Smileys, Textbausteine, Geräte
4. `docs/DESIGN.md` und `design/tokens.css` Designsprache und Tokens
5. `docs/UX_ART_DIRECTION.md` Richtung A, Navigation, Mitarbeit
6. `docs/UPZ_ANALYSE.md` Notenschlüssel, Rechenwege OSZ/FOS, Fehlzeiten
7. `docs/RECHENLOGIK.md` Kernregeln des Notenbuchs
8. `docs/testfaelle/upz_referenzwerte.json` Referenzwerte (osz, ihk, fos)

**Danach, bei Bedarf**
- `docs/PLANUNG.md`, `docs/BACKLOG.md` (Was ist bewusst nicht dabei), `docs/FRAGEN_SCHULE.md` (offene Fragen)
- `docs/IDOCEO_ANALYSE.md`, `docs/NOTENBUCH_BEDIENUNG.md` (Notenbuch-Aufbau und Bedienungsvorschläge, offen)
- `docs/BEWERTUNGSBOEGEN.md`, `docs/IDEEN.md` (nicht im Prototyp)

**Bilder (Mockups, ansehen)**
- Gewählte Richtung A: `docs/konzept/richtungen/A1` bis `A4-A-papier-petrol.png`
- Aktuelle Mockups: `docs/konzept/mockups-v2/N1` bis `N8` (Heute, Live-Stunde, Notenbuch-Seitenleiste, Schülerübersicht, Handy, Reiterleiste, untere Leiste)
- Notenbuch-Konzept: `docs/konzept/notenbuch-1` bis `notenbuch-8` (PC, Rechenweg, Tablet, Handy, Aufbau/Gewichte, Endnote, neue Leistung) und `docs/konzept/notenbuch-skizze.html`
- Nur zum Vergleich: B/C in `docs/konzept/richtungen/` (verworfen, nur Teile übernommen)
- Logo: `docs/konzept/logo/doppellogo/` (SVG und PNG, `uebersicht.html`)

---

## 3 Feedback zurückgeben (für Konstantin)

Der andere Agent schreibt nicht ins Repo, du bist die Brücke.

1. Sag ihm, er soll nach Meilenstein 2 und am Ende anhalten und seine Feedbackfragen stellen (steht im Prompt).
2. Antworte knapp pro Frage, am besten stichpunktartig. Screenshots oder Handyfotos vom iPad direkt anhängen.
3. Bring das Feedback hierher in diesen Thread (oder an die Projektleitung), wir übertragen es in `docs/ENTSCHEIDUNGEN.md` (Entscheidungen mit Datum) und `docs/BACKLOG.md` (Ideen mit Herkunft K).
4. Den fertigen Prototyp-Code legst du selbst ab. Vorschlag: eigener Branch `prototyp` in diesem Repo, damit nichts in `docs/` vermischt wird.
5. Echte Schülerdaten oder Namen nie in Prompt oder Feedback an den anderen Agenten.

Hinweis: Die Planung des Moduls Notenbuch startet **Freitag 13.11. um 10 Uhr**. Danach kann der Prompt in Abschnitt 1 angepasst werden (Punkt "Notenberechnung").
