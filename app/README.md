# L.E.O. Prototyp (Browser-App)

SvelteKit-App ohne Server-Teil: Daten liegen im Browser (IndexedDB), als PWA installierbar, später mit Tauri/Capacitor verpackbar (E79).
Betrieb auf Unraid und alle Funktionen: [docs/PROTOTYP_UNRAID.md](../docs/PROTOTYP_UNRAID.md).

| Pfad | Inhalt |
|---|---|
| `src/lib/rechnen.ts` | Rechenkern (FOS/OSZ, Was-wäre-wenn, Warnungen), reine Logik |
| `src/lib/beispiel.ts` | erfundene Beispieldaten |
| `src/lib/speicher.svelte.ts` | lokaler Speicher, Sicherung, Hinweisleiste |
| `src/lib/sicherheit.ts` | lokales Passwort (SHA-256 mit Salz, läuft auch ohne HTTPS) |
| `src/lib/sitzplan.ts` | Sitzplan-Vorlagen und Verteilen |
| `src/lib/ui/` | Anmeldung, Suche, Ø-Kachel, Was-wäre-wenn, Kopf der Klasse |
| `src/routes/` | Heute, Klassen, Notenbuch (`kurs`), Live-Stunde (`stunde`), Sitzplan, Planung, Schüler, Mehr |
| `tests/rechnen.test.ts` | Tests gegen RECHENLOGIK.md und `docs/testfaelle/upz_referenzwerte.json` |

Farben kommen aus `../design/tokens.css` (E48), keine neuen Farben außer den Mitarbeitsfarben aus E60.
