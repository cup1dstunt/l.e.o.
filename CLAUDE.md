# CLAUDE.md

L.E.O. (Leistung, Entwicklung, Organisation): selbst gehostetes Werkzeug für Lehrkräfte der Leopold-Ullstein-Schule (OSZ Berlin),
iDoceo-Ersatz, ausgelegt für ca. 100 Lehrkräfte mit IServ-SSO. Stand: Planung; abgespeckter Prototyp 0.4 in `app/` (lokal-first, E79), Betrieb siehe `docs/PROTOTYP_UNRAID.md`.

Vor jeder Arbeit lesen: `docs/PLANUNG.md`, `docs/ENTSCHEIDUNGEN.md`, `docs/BACKLOG.md`, `docs/FRAGEN_SCHULE.md`.

## Zusammenarbeit
- Sprache Deutsch, Anrede du. Alle Texte, Kommentare und Doku auf Deutsch.
- Ideen kommen ins Backlog (mit Herkunft K/B/C). Gebaut wird erst auf Ansage.
- Neue Entscheidungen mit Datum in `docs/ENTSCHEIDUNGEN.md`.
- Notenbuch: Aufbau und Rechenlogik nach Konstantins iDoceo-Vorlagen. Design und Farben auf keinen Fall an iDoceo orientieren (E34).
- Gestaltung nach `docs/DESIGN.md` und `design/tokens.css` (E48), Logo nach E47. Keine neuen Farben ohne Grund.
- Noten sieht nur die eigene Lehrkraft; einzige Ausnahme Doppelsteckung im selben Fach (E29, E31).
- Keine EWH-Inhalte übernehmen, nur das Betriebs- und Sicherungskonzept.
- Funktionen sollen Arbeit abnehmen: antippen statt eintippen, keine unterbrechenden Dialoge.
- Datenschutz: keine echten Schülerdaten im Repo, keine Schülernamen an KI-Dienste.
- Ehrlich sein bei Ungetestetem.
