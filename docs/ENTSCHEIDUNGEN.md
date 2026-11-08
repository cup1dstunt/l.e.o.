# Entscheidungen

Neue Entscheidungen oben anfügen, mit Datum. **Vorschläge** (V…) gelten erst, wenn Konstantin sie bestätigt.

## Festgelegt

| # | Datum | Entscheidung | Warum |
|---|---|---|---|
| E1 | 08.11.2026 | Name **L.E.O.** – Leistung, Entwicklung, Organisation (Anspielung auf die Leopold-Ullstein-Schule) | Wunsch Konstantin; ersetzt den Arbeitstitel „Pult“ und die Namensliste aus dem Brainstorm |
| E2 | 08.11.2026 | Ausgelegt für **schulweiten Betrieb** mit ca. 100 Lehrkräften | Wunsch Konstantin |
| E3 | 08.11.2026 | Ziel: Anmeldung per **IServ-SSO** | Wunsch Konstantin; technisch möglich über OpenID Connect |
| E4 | 08.11.2026 | **Eigenständiges** Werkzeug. Von EWH nur Betriebs- und Sicherungskonzept (Docker, Backups, Offline-Cache), keine Inhalte | Brainstorm |
| E5 | 08.11.2026 | Notenbuch **genau nach Konstantins iDoceo-Vorlagen**, keine eigenen Überlegungen | Brainstorm; Konstantin nutzt in iDoceo fast nur das Notenbuch mit selbst erstellten Vorlagen |
| E6 | 08.11.2026 | Anwesenheit und Mitarbeit wie in iDoceo als Kategorien mit Smiley, aber mit **Textbausteinen** statt Tippen | Konstantin: Tippen ist zu umständlich |
| E7 | 08.11.2026 | Sitzplan muss **einfach** sein | iDoceo-Sitzplan war so fummelig, dass er nicht genutzt wurde |
| E8 | 08.11.2026 | Keine Gutachten und Zeugnistexte | Brainstorm |
| E9 | 08.11.2026 | Brainstorm-Inhalte kommen vollständig ins Backlog, nichts davon ist verpflichtend | Konstantin |
| E10 | 08.11.2026 | Keine Design-Vorschläge in der Planungsphase | Konstantin |
| E11 | 08.11.2026 | Keine echten Schülerdaten im Repo, keine Schülernamen an KI-Dienste | wie EWH |

## Vorschläge (zu bestätigen)

| # | Vorschlag | Begründung |
|---|---|---|
| V1 | Rollen, Rechte und Mandant (`schule_id`) **jetzt** als Fundament anlegen, Datenschutzkonzept später ausbauen | Im Brainstorm „nachrangig“, aber bei 100 Nutzern später kaum nachrüstbar |
| V2 | **PostgreSQL** statt SQLite | viele gleichzeitige Schreiber, Zeilenrechte, Standard auf Schulservern |
| V3 | Technik wie EWH: Python/FastAPI, Alpine.js ohne Build, Docker | bekannt, wartbar, iPad und Windows |
| V4 | Entwicklung und Pilot mit Testdaten auf dem Unraid-Server, Echtbetrieb mit echten Daten auf einem Server der Schule | Verantwortung für Schülerdaten liegt bei der Schule |
| V5 | WebUntis schulweit über **eine zentrale Verbindung** (Ziel: offizielle Platform-API), Start mit Datei-Export | 100 private Logins sind weder sicher noch wartbar |
| V6 | Admin hat technischen Zugriff, aber **keinen Notenzugriff** in der Oberfläche | Vertrauen der Kollegen |
