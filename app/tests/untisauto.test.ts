// Prüft, wann der automatische WebUntis-Abgleich läuft und was die Hinweisleiste meldet (WU2).
// Aufruf: npm test
import { faellig, meldung, ABSTAND_MIN, PAUSE_NACH_FEHLER_MIN } from '../src/lib/untisauto.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

const jetzt = Date.parse('2026-11-20T10:00:00Z');
const vor = (min: number) => new Date(jetzt - min * 60_000).toISOString();
const basis = { an: true, zugangGemerkt: true, erstUebernahme: true, online: true, laeuft: false, abgerufen: vor(ABSTAND_MIN + 1) };

gleich('fällig nach 31 Minuten', faellig(basis, jetzt), true);
gleich('nicht fällig nach 10 Minuten', faellig({ ...basis, abgerufen: vor(10) }, jetzt), false);
gleich('genau 30 Minuten', faellig({ ...basis, abgerufen: vor(ABSTAND_MIN) }, jetzt), true);
gleich('ausgeschaltet', faellig({ ...basis, an: false }, jetzt), false);
gleich('ohne gemerkten Zugang', faellig({ ...basis, zugangGemerkt: false }, jetzt), false);
gleich('erste Übernahme nur von Hand', faellig({ ...basis, erstUebernahme: false, abgerufen: undefined }, jetzt), false);
gleich('offline', faellig({ ...basis, online: false }, jetzt), false);
gleich('läuft schon', faellig({ ...basis, laeuft: true }, jetzt), false);
gleich('Pause nach Fehler', faellig({ ...basis, letzterFehler: jetzt - 2 * 60_000 }, jetzt), false);
gleich('nach der Pause wieder', faellig({ ...basis, letzterFehler: jetzt - (PAUSE_NACH_FEHLER_MIN + 1) * 60_000 }, jetzt), true);
gleich('kaputter Zeitstempel', faellig({ ...basis, abgerufen: 'unsinn' }, jetzt), true);

const e = { kurseNeu: 0, kurse: 3, schuelerNeu: 0, schueler: 60, fehlzeiten: 12, offen: 2, verspaetungen: 4, stammdaten: 0 };
const v = { fehlzeiten: 12, offen: 2, verspaetungen: 4 };
gleich('nichts geändert: still', meldung(v, e), '');
gleich('neuer Schüler, Fehlzeiten', meldung(v, { ...e, schuelerNeu: 1, fehlzeiten: 16, offen: 3 }), 'WebUntis: 1 neuer Schüler, 4 Fehlzeiten neu (3 offen)');
gleich('Status geklärt', meldung(v, { ...e, offen: 0 }), 'WebUntis: Fehlzeiten aktualisiert');
gleich('Klassen und Verspätung', meldung({ ...v, offen: 0 }, { ...e, kurseNeu: 2, offen: 0, verspaetungen: 5 }), 'WebUntis: 2 neue Klassen, 1 Verspätung neu');

console.log(`${ok} Prüfungen zum automatischen Abgleich bestanden, ${fehler} fehlgeschlagen`);
if (fehler) process.exit(1);
