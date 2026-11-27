// Prüft Semesterplanung (E114) und Kalender (E115): Blockzählung, Ferien, Ausfälle, Reihen, ICS hin und zurück.
// Aufruf: npm test
import { bloecke, semesterPlan, halbjahre, aktuellesHalbjahr, reiheText } from '../src/lib/semester.ts';
import { eintraege, alsIcs, ausIcs, icsUebernehmen, amTag } from '../src/lib/kalender.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

const kurs: any = { id: 'k', klasse: '2FOS', fach: 'Englisch', leistungen: [{ id: 'l1', name: 'Klausur 1', art: 'Klausur', gruppe: 'klausuren', datum: '2026-11-10' }] };
const d: any = {
  kurse: [kurs],
  // Dienstag 08:00–08:45 + 08:45–09:30 (ein Block), Donnerstag 10:00–11:30
  stundenplan: [
    { kursId: 'k', tag: 2, beginn: '08:00', ende: '08:45' },
    { kursId: 'k', tag: 2, beginn: '08:45', ende: '09:30' },
    { kursId: 'k', tag: 4, beginn: '10:00', ende: '11:30' }
  ],
  einstellungen: {
    untis: { ausfaelle: ['k|2026-11-12|10:00'], halbjahrVon: '2026-08-31', halbjahrBis: '2027-07-07' },
    ferien: [{ name: 'Herbstferien', von: '2026-10-19', bis: '2026-10-31' }]
  },
  termine: [{ id: 't', datum: '2026-11-17', titel: 'Exkursion', art: 'ausflug', kursIds: ['k'], unterrichtFrei: true }],
  nachschreiben: []
};

// Zwei Wochen im November: Di 3., Do 5., Di 10. (Klausur), Do 12. (Ausfall WebUntis), Di 17. (Exkursion), Do 19.
let b = bloecke(d, kurs, '2026-11-02', '2026-11-20');
gleich('Doppelstunde ist ein Block', b.length, 6);
gleich('Einheiten Doppelstunde', b[0].einheiten, 2);
gleich('Ausfall WebUntis', b[3].zustand + '|' + b[3].grund, 'ausfall|Ausfall laut WebUntis');
gleich('Ausfall durch Termin', b[4].zustand + '|' + b[4].terminId, 'ausfall|t');
gleich('Klausur hängt am Block', b[2].leistungen.map((l: any) => l.name), ['Klausur 1']);

// Ferien
b = bloecke(d, kurs, '2026-10-19', '2026-10-31');
gleich('Ferienblöcke frei', b.map((x) => x.zustand), ['frei', 'frei', 'frei', 'frei']);

// Halbjahre
const hj = halbjahre(d);
gleich('HJ1 endet vor 1. Februar', hj[0].bis, '2027-01-31');
gleich('HJ2 ab 1. Februar', aktuellesHalbjahr(d, '2027-02-10').nr, 2);
d.einstellungen.halbjahrGrenze = '2027-01-30';
gleich('Grenze einstellbar', halbjahre(d)[0].bis, '2027-01-29');

// Reihen verteilen: Klausur- und Ausfallblöcke gehören keiner Reihe
kurs.reihen = [{ id: 'r1', titel: 'Unit 5', bloecke: 2 }, { id: 'r2', titel: 'Unit 6', bloecke: 2 }];
const hjTest = { nr: 1 as const, name: 'Test', von: '2026-11-02', bis: '2026-11-20' };
let p = semesterPlan(d, kurs, hjTest, '2026-11-11');
gleich('Unterrichtsblöcke', p.unterricht, 4);
gleich('Ausfälle', p.ausfall, 2);
gleich('Klausuren', p.klausuren, 1);
gleich('Puffer = frei - geplant', p.puffer, 3 - 4);
gleich('Reihenzuordnung', p.bloecke.map((x) => reiheText(x)), ['Unit 5 · Block 1 von 2', 'Unit 5 · Block 2 von 2', 'Klausur', '', '', 'Unit 6 · Block 1 von 2']);
gleich('Reihe passt nicht ganz', p.stand[1].fehlt, 1);
gleich('gehalten vor heute', p.gehalten, 3);
gleich('nächster Block', p.naechster?.datum, '2026-11-19');
// +1 Block für Unit 5 verschiebt Unit 6
kurs.reihen[0].bloecke = 3;
p = semesterPlan(d, kurs, hjTest, '2026-11-11');
gleich('nach +1 Block', reiheText(p.bloecke[5]), 'Unit 5 · Block 3 von 3');

// Echte WebUntis-Termine gehen vor dem Wochenmuster (z. B. Blockwoche)
kurs.untisStunden = ['2026-11-02|08:00|09:30', '2026-11-03|08:00|09:30', '2026-11-04|08:00|09:30'];
b = bloecke(d, kurs, '2026-11-02', '2026-11-20');
gleich('Blockwoche aus WebUntis', b.map((x) => x.datum), ['2026-11-02', '2026-11-03', '2026-11-04']);
delete kurs.untisStunden;

// Kalender
const e = eintraege(d, '2026-10-01', '2026-11-30');
gleich('Kalender: Ferien, Klausur, Ausfall laut WebUntis, Termin', e.map((x) => x.art), ['ferien', 'klausur', 'ausfall', 'ausflug']);
gleich('mehrtägig an jedem Tag', amTag(e, '2026-10-25').map((x) => x.titel), ['Herbstferien']);

// ICS hin und zurück
d.termine.push({ id: 'k1', datum: '2026-11-26', beginn: '14:30', ende: '16:00', titel: 'Fachkonferenz; Englisch', art: 'konferenz', notiz: 'Raum 2.14' });
const ics = alsIcs(d, '2026-11-01', '2026-11-30', new Date('2026-11-25T12:00:00Z'));
gleich('ICS ohne Ferien', ics.includes('Herbstferien'), false);
gleich('ICS mit Uhrzeit', ics.includes('DTSTART;TZID=Europe/Berlin:20261126T143000'), true);
gleich('ICS ganztägig exklusiv', ics.includes('DTEND;VALUE=DATE:20261118'), true);
const zurueck = ausIcs(ics);
gleich('ICS gelesen', zurueck.length, 3);
const konf = zurueck.find((t) => t.uid === 'k1@leo')!;
gleich('ICS Felder', [konf.titel, konf.datum, konf.beginn, konf.ende, konf.notiz], ['Fachkonferenz; Englisch', '2026-11-26', '14:30', '16:00', 'Raum 2.14']);
gleich('ICS ganztägig ohne bis', zurueck.find((t) => t.uid === 't@leo')!.bis, undefined);
const iserv = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:abc\r\nSUMMARY:Gesamtkonferenz mit sehr langem Ti\r\n tel\r\nDTSTART:20261201T130000Z\r\nDTEND:20261201T150000Z\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:x2\r\nSUMMARY:Projekttage\r\nDTSTART;VALUE=DATE:20261207\r\nDTEND;VALUE=DATE:20261210\r\nEND:VEVENT\r\nEND:VCALENDAR';
const imp = ausIcs(iserv);
gleich('gefaltete Zeile', imp[0].titel, 'Gesamtkonferenz mit sehr langem Titel');
gleich('UTC in Ortszeit (Winter +1)', imp[0].beginn, '14:00');
gleich('mehrtägig ganztägig', imp[1].bis, '2026-12-09');
icsUebernehmen(d, imp);
icsUebernehmen(d, imp);
gleich('Import ersetzt gleiche UID', d.termine.filter((t: any) => t.quelle === 'ics').length, 2);

console.log(`semester: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
