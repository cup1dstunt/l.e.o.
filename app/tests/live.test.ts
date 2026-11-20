// Prüft Live-Stunde und Anwesenheit: Ausfall (WU1), Verspätungen nach Wochentag (FB14), Trendpfeil (E88), eigene Sitzplan-Vorlagen (E86).
// Aufruf: npm test
import { stundenHeute, verspaetungenNachWochentag, mitarbeitTrend, isoDatum } from '../src/lib/hilfen.ts';
import { ausVorlage, ausEigener, alsVorlage } from '../src/lib/sitzplan.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

// Donnerstag, 19.11.2026, 10:15 Uhr
const jetzt = new Date(2026, 10, 19, 10, 15);
const d: any = {
  stundenplan: [
    { kursId: 'a', tag: 4, beginn: '09:45', ende: '11:15' },
    { kursId: 'b', tag: 4, beginn: '11:30', ende: '13:00' },
    { kursId: 'c', tag: 5, beginn: '08:00', ende: '09:30' }
  ],
  einstellungen: { untis: { ausfaelle: [] } },
  mitarbeit: []
};
let p = stundenHeute(d, jetzt);
gleich('läuft ohne Ausfall', p.laeuft?.kursId, 'a');
gleich('nächste ohne Ausfall', p.naechste?.kursId, 'b');

d.einstellungen.untis.ausfaelle = ['a|2026-11-19|09:45'];
p = stundenHeute(d, jetzt);
gleich('Ausfall läuft nicht', p.laeuft, undefined);
gleich('Ausfall gemeldet', p.ausfallJetzt?.kursId, 'a');
gleich('Ausfall in der Leiste markiert', p.heute.map((s) => s.ausfall), [true, false]);
gleich('nächste bleibt', p.naechste?.kursId, 'b');

d.einstellungen.untis.ausfaelle = ['a|2026-11-19|09:45', 'b|2026-11-19|11:30'];
p = stundenHeute(d, jetzt);
gleich('nächste überspringt Ausfall, nimmt morgen', [p.naechste?.kursId, p.naechste?.tagText], ['c', 'morgen']);
d.einstellungen.untis.ausfaelle.push('c|2026-11-20|08:00');
p = stundenHeute(d, jetzt);
gleich('Ausfall morgen übersprungen, nächste Woche', [p.naechste?.kursId, p.naechste?.tagText], ['a', 'Do']);
gleich('isoDatum lokal', isoDatum(new Date(2026, 0, 5, 23, 59)), '2026-01-05');

// Verspätungen: 16.11.2026 ist Montag
const v = verspaetungenNachWochentag([
  { datum: '2026-11-16', minuten: 5 }, { datum: '2026-11-23', minuten: 10 }, { datum: '2026-11-18', minuten: 3 }
]);
gleich('Wochentag Anzahl', v.map((x) => x.anzahl), [2, 0, 1, 0, 0]);
gleich('Wochentag Minuten', v.map((x) => x.minuten), [15, 0, 3, 0, 0]);

// Trend: niedrige Stufe = besser
const e = (zeit: string, stufe: number) => ({ kursId: 'a', schuelerId: 's', zeit, stufe });
d.mitarbeit = [e('2026-10-05T10:00', 4), e('2026-10-12T10:00', 4), e('2026-11-05T10:00', 2)];
gleich('Trend besser', mitarbeitTrend(d, 'a', 's'), 'besser');
d.mitarbeit = [e('2026-10-05T10:00', 2), e('2026-11-05T10:00', 4)];
gleich('Trend schlechter', mitarbeitTrend(d, 'a', 's'), 'schlechter');
d.mitarbeit = [e('2026-11-05T10:00', 2)];
gleich('Trend ohne Vormonat', mitarbeitTrend(d, 'a', 's'), '');

// Eigene Vorlage: Tische kopiert, keine Belegung
const plan = ausVorlage('u');
plan.belegung = { 3: 'x' };
const ev = alsVorlage(plan, 'eigen-1', 'Raum 204');
gleich('Vorlage ohne Belegung', 'belegung' in ev, false);
const neu = ausEigener(ev);
neu.tische[0] = !neu.tische[0];
gleich('Vorlage bleibt unverändert', ev.tische[0], plan.tische[0]);
gleich('Vorlage-ID', neu.vorlage, 'eigen-1');

console.log(`${ok} Live-Stunde-Prüfungen bestanden, ${fehler} fehlgeschlagen`);
if (fehler) process.exit(1);
