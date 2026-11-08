# Entscheidungen

Neue Entscheidungen oben anfügen, mit Datum. **Vorschläge** (V…) gelten erst, wenn Konstantin sie bestätigt.

## Festgelegt

| # | Datum | Entscheidung | Warum |
|---|---|---|---|
| E43 | 08.11.2026 | **Abiturprüfung** zählt nicht im Notenbaum, sie wird in die Excel-Tabellen der Schule eingetragen; deren eigene Gewichtung ist noch unbekannt. Excel-Dateien folgen | Konstantin |
| E42 | 08.11.2026 | **Vorbehalt mit Stern:** Einzelne Noten bekommen einen Stern mit kurzem Kommentar (z. B. Bedingung für eine bessere Note). Ändert die Rechnung nicht, wird bei der Endnote angezeigt | Konstantin |
| E41 | 08.11.2026 | **Gewichte relativ** („10 %“ = ein Zehntel eines normalen Tests). Gewichtet werden kann eine ganze Spalte (Test, Präsentation) **und** eine einzelne Note eines Schülers | Konstantin |
| E40 | 08.11.2026 | **Runden:** nur die Endnote, kaufmännisch. Bei genau ,50 entscheidet die Lehrkraft. Ein leerer Zweig (z. B. noch keine Klausur) wird übersprungen | Konstantin |
| E39 | 08.11.2026 | **Eingetragene Noten sind ganz** (z. B. fest 10 Punkte), **berechnete Noten vorläufig** mit zwei Nachkommastellen; beides klar unterscheidbar. Jede Note trägt genau, was sie war (Spalte, Art, Datum); das Datum ist bei Bedarf sichtbar | Konstantin |
| E38 | 08.11.2026 | **Viele Funktionen, aber nicht überladen.** Die App soll modern, schön, intuitiv und flüssig sein. Selten genutzte Funktionen liegen eine Ebene tiefer, die Hauptansichten zeigen nur das Nötige | Konstantin |
| E37 | 08.11.2026 | **Der Notenrechner ist das Herzstück.** Er war die Stärke von iDoceo und wird gründlich nachgebaut (im Kern wie Excel), aber modern und flüssig bedienbar | Konstantin |
| E36 | 08.11.2026 | **Nachteilsausgleich (NTA)** wird dezent mit einem kleinen Symbol am Schüler markiert. Welcher NTA genau gilt, zeigt Mouse-over (PC) oder Antippen (Tablet/Handy); er kann sich je Schüler unterscheiden. Eintragen dürfen die Klassenleitung (gilt für alle Lehrkräfte des Schülers) oder jede Lehrkraft für ihre eigenen Kurse. Für Konstantin keine Datenschutzbedenken, weil Lehrkräfte das wissen müssen | Konstantin |
| E35 | 08.11.2026 | Ideen **I36–I45 angenommen**. I44 gilt nur für **Klassenarbeiten**, nicht für Tests | Konstantin |
| E34 | 08.11.2026 | **Design und Farben auf keinen Fall an iDoceo orientieren.** Die iDoceo-Analyse beschreibt nur Aufbau und Rechenlogik | Konstantin |
| E33 | 08.11.2026 | Halbjahresnoten werden weiter in den **Excel-Tabellen der Schule** eingetragen. Je Fach wird nur die (Halb-)Jahresendnote **von Hand** übertragen. L.E.O. zeigt sie keinen anderen Lehrkräften und braucht **keinen Export und keine Tabellenvorlage**; die Endnote muss nur klar ablesbar sein. **Ersetzt E32** | Konstantin |
| E32 | 08.11.2026 | ~~Halbjahresnoten für alle Lehrkräfte einsehbar~~ → **ersetzt durch E33** (Missverständnis) | |
| E31 | 08.11.2026 | **Doppelsteckung:** Unterrichten zwei oder drei Lehrkräfte **dasselbe Fach im selben Kurs** (z. B. Lernfeld 3), sehen und ändern **alle** das Notenbuch dieses Fachs. Sonst sieht niemand fremde Noten | Konstantin: Doppelsteckungen gibt es, dort ist das sinnvoll |
| E30 | 08.11.2026 | Ideen aus [IDEEN.md](IDEEN.md) übernommen, außer I33 („Wer sieht das?“), das durch E29 entfällt | Konstantin: „alles gute Ideen“ |
| E29 | 08.11.2026 | **Noten sind vertraulich: nur die Lehrkraft sieht sie.** Keine Einsicht für Klassenleitung, Schulleitung oder Admin. Teilen nur aktiv durch die Lehrkraft (Noten oder Lernstands-/Entwicklungsberichte an Schüler, Endnoten an Klassenleitung). **Ersetzt E17** | Konstantin: „Lehrer sind die Herren über ihre eigenen Noten“ |
| E28 | 08.11.2026 | **Bewertungsbögen** als eigenes Modul: klickbare Bögen für Selbst- und Fremdeinschätzung, übersichtlich, eigene erstellen oder hochladen, Bibliothek (z. B. aus MEDIAN). Konzept in [BEWERTUNGSBOEGEN.md](BEWERTUNGSBOEGEN.md) | Konstantin |
| E27 | 08.11.2026 | Notenauswahl auf Touchgeräten: **ein Fenster mit allen Noten auf einen Blick** (z. B. 0–15 als Tastenfeld), ein Tipp setzt die Note und springt weiter. Ein Rad ist nur ok, wenn alle Werte ohne langes Scrollen erreichbar sind | Konstantin präzisiert E24 |
| E26 | 08.11.2026 | Doku-Änderungen gehen **direkt auf `main`**, ohne Pull Request | Konstantin |
| E25 | 08.11.2026 | **Kursübersicht mit Kacheln** statt vieler Reiter und Tabellen; Notizen, Hausaufgaben usw. müssen ohne Suchen erreichbar sein | Konstantin: Orga- und Hausaufgaben-Reiter in iDoceo hat er nie angeschaut |
| E24 | 08.11.2026 | **Schnelleingabe ist Kernanforderung**: Test anlegen und Noten eintragen in Sekunden, kein langes Scrollen, kein „OK“ je Zelle (siehe E27) | Konstantin: iDoceo-Eingabe ist „Frontend-Design aus der Hölle“ |
| E23 | 08.11.2026 | **Alles Ableitbare wird automatisch gepflegt** (Fehlzeiten je Halbjahr, Vorhalbjahresnote, Zähler) | Konstantin: niemand führt zehn Listen von Hand |
| E22 | 08.11.2026 | Technik nach **V3b**: FastAPI + PostgreSQL, SvelteKit als installierbare Web-App (PWA) für iOS, Android und Windows | Konstantin verlässt sich auf Claudes Urteil |
| E21 | 08.11.2026 | **Kurse leben über Halbjahre**; Entwicklung über Halbjahre und Jahre sichtbar machen ist ein Design-Fokus | Konstantin: in iDoceo jedes Halbjahr neu angelegt, dadurch keine Übersicht über frühere Leistungen |
| E20 | 08.11.2026 | **Mitarbeitsnoten frei im Rhythmus** (Stunde, Woche, Einheit, Monat, gar nicht) | Kollegen arbeiten unterschiedlich; Monatsnoten sind Konstantins Weg |
| E19 | 08.11.2026 | **Notensystem je Bildungsgang**: Berufsschule vs. FOS/DQ, Punkte 0–15 oder ganze Noten, eigene Notenspiegel. Standard: 50 % schriftlich, 50 % AT. Bei 0–15 nicht bestanden unter 5 Punkten | Schulvorgabe; IBA und WK noch offen |
| E18 | 08.11.2026 | Gewichtung **einzelner** Noten und Tests | Konstantin (z. B. Verspätungstests) |
| E17 | 08.11.2026 | ~~Rolle Schulleitung sieht Endnoten~~ → **ersetzt durch E29**. Admin sieht keine Noten (bleibt) | Konstantin zu V6 |
| E16 | 08.11.2026 | WebUntis-Weg wird **noch nicht** festgelegt. Gebaut wird hinter austauschbaren Adaptern, Start mit Datei-Export | Konstantin zu V5: zuerst ein Projekt für ihn allein, aber alles Spätere immer mitdenken |
| E15 | 08.11.2026 | **Pilot mit echten Daten auf dem Unraid-Server**: Konstantin und evtl. eine Kollegin, parallel zu iDoceo. Daten müssen gut geschützt sein (siehe PLANUNG 4.4) | Konstantin zu V4; Noten auf Endgeräten sind heute schon üblich (iDoceo, Excel) |
| E14 | 08.11.2026 | **PostgreSQL** | Konstantin zu V2 |
| E13 | 08.11.2026 | **Mandantenfähig** mit `schule_id` ab Tag 1; Ausrollen an andere Schulen ist ein mögliches Ziel | Konstantin zu V1 |
| E12 | 08.11.2026 | Rollen und Rechte als Fundament jetzt, Datenschutzkonzept später ausbauen | Konstantin zu V1 |
| E11 | 08.11.2026 | Keine echten Schülerdaten im Repo, keine Schülernamen an KI-Dienste | wie EWH |
| E10 | 08.11.2026 | Keine Design-Vorschläge in der Planungsphase | Konstantin |
| E9 | 08.11.2026 | Brainstorm-Inhalte kommen vollständig ins Backlog, nichts davon ist verpflichtend | Konstantin |
| E8 | 08.11.2026 | Keine Gutachten und Zeugnistexte | Brainstorm |
| E7 | 08.11.2026 | Sitzplan muss **einfach** sein | iDoceo-Sitzplan war so fummelig, dass er nicht genutzt wurde |
| E6 | 08.11.2026 | Anwesenheit und Mitarbeit wie in iDoceo als Kategorien mit Smiley, aber mit **Textbausteinen** statt Tippen | Konstantin: Tippen ist zu umständlich |
| E5 | 08.11.2026 | Notenbuch **genau nach Konstantins iDoceo-Vorlagen** (Analyse in [IDOCEO_ANALYSE.md](IDOCEO_ANALYSE.md)) | Brainstorm; Konstantin nutzt in iDoceo fast nur das Notenbuch mit selbst erstellten Vorlagen |
| E4 | 08.11.2026 | **Eigenständiges** Werkzeug. Von EWH nur Betriebs- und Sicherungskonzept, keine Inhalte | Brainstorm |
| E3 | 08.11.2026 | Ziel: Anmeldung per **IServ-SSO** | Konstantin; technisch möglich über OpenID Connect |
| E2 | 08.11.2026 | Ausgelegt für **schulweiten Betrieb** mit ca. 100 Lehrkräften | Konstantin |
| E1 | 08.11.2026 | Name **L.E.O.** – Leistung, Entwicklung, Organisation | Konstantin |

## Vorschläge (zu bestätigen)

Keine offenen Vorschläge.

## Erledigte Vorschläge (Details)

| # | Vorschlag | Begründung |
|---|---|---|
| V3b (→ E22) | **Technik neu (ersetzt V3):** Backend Python/FastAPI mit PostgreSQL. Frontend **SvelteKit (Svelte 5, TypeScript) als PWA**, Offline-Speicher im Browser (IndexedDB), ein Code für Smartphone, Tablet und PC. Details in PLANUNG 4.3 | Konstantin: Smartphone muss mit rein. Der EWH-Ansatz (eine große Alpine-Datei ohne Build) trägt eine App dieser Größe mit Offline-Betrieb und drei Bildschirmgrößen nicht gut |

## Erledigte Vorschläge (Übersicht)

| # | Ergebnis |
|---|---|
| V1 | angenommen → E12, E13 |
| V2 | angenommen → E14 |
| V3 | ersetzt durch V3b |
| V4 | angenommen mit Änderung → E15 |
| V5 | zurückgestellt → E16 |
| V6 | angenommen mit Ergänzung → E17 |
| V3b | angenommen → E22 |
