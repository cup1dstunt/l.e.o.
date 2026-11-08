# Entscheidungen

Neue Entscheidungen oben anfügen, mit Datum. **Vorschläge** (V…) gelten erst, wenn Konstantin sie bestätigt.

## Festgelegt

| # | Datum | Entscheidung | Warum |
|---|---|---|---|
| E17 | 08.11.2026 | **Rolle Schulleitung**: sieht Endnoten, aber keine Teilnoten (wie heute). Admin sieht keine Noten | Konstantin zu V6 |
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

| # | Vorschlag | Begründung |
|---|---|---|
| V3b | **Technik neu (ersetzt V3):** Backend Python/FastAPI mit PostgreSQL. Frontend **SvelteKit (Svelte 5, TypeScript) als PWA**, Offline-Speicher im Browser (IndexedDB), ein Code für Smartphone, Tablet und PC. Details in PLANUNG 4.3 | Konstantin: Smartphone muss mit rein. Der EWH-Ansatz (eine große Alpine-Datei ohne Build) trägt eine App dieser Größe mit Offline-Betrieb und drei Bildschirmgrößen nicht gut |

## Erledigte Vorschläge

| # | Ergebnis |
|---|---|
| V1 | angenommen → E12, E13 |
| V2 | angenommen → E14 |
| V3 | ersetzt durch V3b |
| V4 | angenommen mit Änderung → E15 |
| V5 | zurückgestellt → E16 |
| V6 | angenommen mit Ergänzung → E17 |
