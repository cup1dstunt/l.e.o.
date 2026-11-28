// Prüft echte Stunden zu festen Zeiten und die Teststunde (E126).
// Aufruf: npm test
import { stundeBestimmen, erfassbar, zeitstempel, stundenZahl, terminText, testklasse, testklasseEntfernen, istTestKurs, echterPlan } from '../src/lib/stundenzeit.ts';
import { stundenHeute } from '../src/lib/hilfen.ts';
import { beispielDaten } from '../src/lib/beispiel.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

const kurs = (id: string, extra: object = {}) => ({ id, untis: { klasseId: 1, fachId: 1 }, ...extra }) as any;
const d: any = {
  kurse: [kurs('a'), kurs('b')],
  schueler: [], mitarbeit: [], fehlzeiten: [], verspaetungen: [], notizen: [],
  stundenplan: [
    { kursId: 'a', tag: 5, beginn: '08:00', ende: '09:30', quelle: 'untis' },
    { kursId: 'a', tag: 1, beginn: '11:45', ende: '13:15', quelle: 'untis' },
    { kursId: 'b', tag: 3, beginn: '08:00', ende: '09:30', quelle: 'untis' }
  ],
  einstellungen: { untis: { ausfaelle: [] } }
};
const A = d.kurse[0];

// Samstag, 28.11.2026, 14:40: Konstantins Fall. Ohne Angabe: keine Stunde, nichts erfassbar.
const sa = new Date(2026, 10, 28, 14, 40);
let z = stundeBestimmen(d, A, sa);
gleich('Samstag ohne Angabe: keine', z.art, 'keine');
gleich('keine: nicht erfassbar', erfassbar(z), false);
gleich('letzte Stunde = Freitag 8:00', [z.letzte?.datum, z.letzte?.beginn], ['2026-11-27', '08:00']);
gleich('nächste Stunde = Montag 11:45', [z.naechste?.datum, z.naechste?.beginn], ['2026-11-30', '11:45']);

// Freitagsstunde aus dem Stundenplan am Samstag öffnen: Nachtrag mit Datum Freitag, feste Zeiten, kein Balken
z = stundeBestimmen(d, A, sa, { datum: '2026-11-27', beginn: '08:00' });
gleich('Nachtrag Art', z.art, 'nachtrag');
gleich('Nachtrag Zeiten', [z.datum, z.beginn, z.ende, z.balken], ['2026-11-27', '08:00', '09:30', false]);
gleich('Nachtrag Zeitstempel am Freitag', zeitstempel(z, sa), new Date(2026, 10, 27, 8, 0).toISOString());
gleich('Fehlzeit 90 min = 2 Std.', stundenZahl(z), 2);
gleich('Text', terminText(z), 'Fr 27.11., 08:00–09:30');

// Freitag selbst: vorher bald, in der Stunde live, danach vorbei
gleich('Fr 7:50 bald', stundeBestimmen(d, A, new Date(2026, 10, 27, 7, 50)).art, 'bald');
gleich('Fr 8:30 live', stundeBestimmen(d, A, new Date(2026, 10, 27, 8, 30)).art, 'live');
gleich('Fr 10:00 vorbei, Datum heute', [stundeBestimmen(d, A, new Date(2026, 10, 27, 10, 0)).art, stundeBestimmen(d, A, new Date(2026, 10, 27, 10, 0)).datum], ['vorbei', '2026-11-27']);
gleich('Zukunft: vorab', stundeBestimmen(d, A, sa, { datum: '2026-11-30', beginn: '11:45' }).art, 'vorab');
// Ein Datum ohne Stunde dieser Klasse fällt auf die automatische Wahl zurück
gleich('falsches Datum: keine', stundeBestimmen(d, A, sa, { datum: '2026-11-25', beginn: '08:00' }).art, 'keine');

// Teststunde nur in Testklassen; in echten Klassen wird ?test ignoriert
gleich('echte Klasse ignoriert test', stundeBestimmen(d, A, sa, { test: String(sa.getTime()) }).art, 'keine');
const id = testklasse(d);
const T = d.kurse.find((k: any) => k.id === id);
gleich('Testklasse angelegt', [id, T.test, istTestKurs(T), T.schueler.length > 5], ['k-test', true, true, true]);
gleich('Testschüler mit eigener Kennung', T.schueler.every((s: string) => /^t\d+$/.test(s) && d.schueler.some((x: any) => x.id === s)), true);
gleich('Zellen umbenannt', Object.keys(T.zellen).every((k) => k.startsWith('k-test-') && /:t\d+$/.test(k)), true);
gleich('zweiter Aufruf legt nichts neu an', [testklasse(d), d.kurse.length], ['k-test', 3]);
const start = new Date(2026, 10, 28, 14, 40);
z = stundeBestimmen(d, T, new Date(2026, 10, 28, 15, 0), { test: String(start.getTime()) });
gleich('Teststunde ab Start, 90 min', [z.art, z.datum, z.beginn, z.ende, z.balken], ['test', '2026-11-28', '14:40', '16:10', true]);
gleich('Teststunde von gestern startet neu', stundeBestimmen(d, T, new Date(2026, 10, 29, 9, 5), { test: String(start.getTime()) }).beginn, '09:05');

// Heute und Wochenplan: Beispielklassen fallen heraus, sobald echte Stunden da sind
const b: any = beispielDaten(new Date(2026, 10, 27));
gleich('nur Beispiel: Plan bleibt', echterPlan(b).length, b.stundenplan.length);
b.kurse.push({ ...kurs('echt'), schueler: [] });
b.stundenplan.push({ kursId: 'echt', tag: 5, beginn: '08:00', ende: '09:30', quelle: 'untis' });
gleich('mit echter Klasse: nur echte Stunden', echterPlan(b).map((s: any) => s.kursId), ['echt']);
gleich('Heute zeigt die echte Stunde', stundenHeute(b, new Date(2026, 10, 27, 8, 30)).laeuft?.kursId, 'echt');

// Entfernen trifft nur Testklassen
gleich('echte Klasse nicht entfernbar', testklasseEntfernen(d, 'a'), false);
d.mitarbeit.push({ id: 'x', kursId: 'a', schuelerId: 's', zeit: '', stufe: 3, bausteine: [] });
gleich('Testklasse entfernt', [testklasseEntfernen(d, 'k-test'), d.kurse.map((k: any) => k.id), d.schueler.length, d.mitarbeit.map((e: any) => e.id)], [true, ['a', 'b'], 0, ['x']]);

console.log(`stundenzeit: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
