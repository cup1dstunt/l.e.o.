# L.E.O.

**Leistung · Entwicklung · Organisation**

L.E.O. ist ein selbst gehostetes Werkzeug für Lehrkräfte an der Leopold-Ullstein-Schule: Notenbuch, Anwesenheit und Mitarbeit
mit Textbausteinen, Sitzplan, Zufall und Gruppen, Fehlzeiten aus WebUntis, Stundenablauf mit Timer und ein persönlicher Kalender.
Es soll iDoceo ersetzen und so gebaut sein, dass es **schulweit von etwa 100 Lehrkräften** genutzt werden kann,
mit Anmeldung über **IServ (Single-Sign-On)**.

> **Stand:** Planung. Es gibt noch keinen Code und kein Design.

## Dokumente

| Datei | Inhalt |
|---|---|
| [docs/PLANUNG.md](docs/PLANUNG.md) | Zielbild, Module, Grundgerüst für den schulweiten Betrieb, Anbindungen, Fahrplan |
| [docs/IDOCEO_ANALYSE.md](docs/IDOCEO_ANALYSE.md) | Aufbau des iDoceo-Notenbuchs als Vorlage für L.E.O. |
| [docs/RECHENLOGIK.md](docs/RECHENLOGIK.md) | Rechenregeln des Notenbuchs mit Testfällen (Entwurf) |
| [docs/NOTENBUCH_BEDIENUNG.md](docs/NOTENBUCH_BEDIENUNG.md) | Vorschläge zur Bedienung des Notenbuchs (zu entscheiden) |
| [docs/konzept/](docs/konzept/) | Konzeptbilder des Notenbuchs (PC, Tablet, Handy) und klickbare Skizze |
| [docs/konzept/logo/](docs/konzept/logo/) | Logo: Entwürfe A–C und das gewählte Doppellogo (`doppellogo/`, E47) |
| [docs/BEWERTUNGSBOEGEN.md](docs/BEWERTUNGSBOEGEN.md) | Selbst- und Fremdeinschätzung, Bibliothek, Entwurf Mitarbeit Englisch |
| [docs/IDEEN.md](docs/IDEEN.md) | Ideensammlung: Features, Design, QoL, Onboarding |
| [docs/BACKLOG.md](docs/BACKLOG.md) | alle Ideen und Wünsche mit Herkunft und Priorität |
| [docs/ENTSCHEIDUNGEN.md](docs/ENTSCHEIDUNGEN.md) | was schon festgelegt ist und warum |
| [docs/FRAGEN_SCHULE.md](docs/FRAGEN_SCHULE.md) | offene Fragen an Schulleitung, Untis- und IServ-Admin, Datenschutz |

## Grundsätze in Kürze

- Eigenständiges Werkzeug. Von EWH Korrektur wird nur das Betriebs- und Sicherungskonzept übernommen, keine Inhalte.
- Nichts doppelt eintippen: Schüler, Stundenplan und Fehlzeiten kommen aus WebUntis.
- Ein Tipp statt eines Formulars: Anwesenheit, Mitarbeit und Hausaufgaben gehen mit einem Finger auf dem iPad.
- Keine echten Schülerdaten im Repo, keine Schülernamen an KI-Dienste.
