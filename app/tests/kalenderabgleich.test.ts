// Prüft den Kalenderabgleich (K3, K10, V15): Wiederholungen, Abgleich je Quelle, WebUntis-Prüfungen, IServ-Link.
// Alles mit erfundenen Daten, ohne Netz. Aufruf: npm test
import { ausIcs, wiederholungen, quelleAbgleichen, abgleichText, eintraege, alsIcs } from '../src/lib/kalender.ts';
import { semesterPlan } from '../src/lib/semester.ts';
import { pruefungenZuordnen, pruefungenAlsTermine } from '../src/lib/untisimport.ts';
import { linkPruefen, serverPasst, antwortPruefen, durchreicherPfad } from '../src/lib/iserv.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

// ---------- Wiederholungen ----------
gleich('wöchentlich mit COUNT', wiederholungen('2026-11-02', 'FREQ=WEEKLY;COUNT=3', '2026-01-01', '2027-12-31'), ['2026-11-02', '2026-11-09', '2026-11-16']);
gleich('wöchentlich BYDAY + UNTIL', wiederholungen('2026-11-02', 'FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261111T235959Z', '2026-01-01', '2027-12-31'),
  ['2026-11-02', '2026-11-04', '2026-11-09', '2026-11-11']);
gleich('alle 2 Wochen im Fenster', wiederholungen('2026-09-01', 'FREQ=WEEKLY;INTERVAL=2', '2026-10-01', '2026-10-31'), ['2026-10-13', '2026-10-27']);
gleich('täglich', wiederholungen('2026-11-30', 'FREQ=DAILY;COUNT=3', '2026-01-01', '2027-12-31'), ['2026-11-30', '2026-12-01', '2026-12-02']);
gleich('monatlich am 31. lässt Monate aus', wiederholungen('2027-01-31', 'FREQ=MONTHLY;COUNT=3', '2027-01-01', '2027-12-31'), ['2027-01-31', '2027-03-31', '2027-05-31']);
gleich('jährlich', wiederholungen('2026-12-24', 'FREQ=YEARLY', '2026-01-01', '2028-12-31'), ['2026-12-24', '2027-12-24', '2028-12-24']);
gleich('seltene Form: nur erster Termin', wiederholungen('2026-11-03', 'FREQ=MONTHLY;BYDAY=1TU', '2026-01-01', '2027-12-31'), ['2026-11-03']);
gleich('ohne Ende bleibt im Fenster', wiederholungen('2020-01-06', 'FREQ=WEEKLY', '2026-11-01', '2026-11-30').length, 5);

const ics = [
  'BEGIN:VCALENDAR', 'VERSION:2.0',
  'BEGIN:VEVENT', 'UID:konf@iserv', 'DTSTART;TZID=Europe/Berlin:20261104T143000', 'DTEND;TZID=Europe/Berlin:20261104T160000',
  'RRULE:FREQ=WEEKLY;COUNT=4', 'EXDATE;TZID=Europe/Berlin:20261111T143000', 'SUMMARY:Fachkonferenz Englisch', 'LOCATION:Raum 204',
  'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Erinnerung', 'END:VALARM', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:konf@iserv', 'RECURRENCE-ID;TZID=Europe/Berlin:20261118T143000', 'DTSTART;TZID=Europe/Berlin:20261119T100000',
  'DTEND;TZID=Europe/Berlin:20261119T113000', 'SUMMARY:Fachkonferenz Englisch (verschoben)', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:tag@iserv', 'DTSTART;VALUE=DATE:20261123', 'DTEND;VALUE=DATE:20261125', 'SUMMARY:Projekttage', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:weg@iserv', 'DTSTART;VALUE=DATE:20261126', 'STATUS:CANCELLED', 'SUMMARY:Abgesagt', 'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');
const t = ausIcs(ics, '2026-10-01', '2027-07-31', 'iserv');
gleich('Serie aufgelöst, EXDATE und RECURRENCE-ID beachtet', t.map((x) => `${x.datum} ${x.beginn} ${x.titel}`), [
  '2026-11-04 14:30 Fachkonferenz Englisch', '2026-11-25 14:30 Fachkonferenz Englisch',
  '2026-11-19 10:00 Fachkonferenz Englisch (verschoben)', '2026-11-23 undefined Projekttage'
]);
gleich('VALARM-Text nicht als Notiz', t[0].notiz, undefined);
gleich('Ort', t[0].ort, 'Raum 204');
gleich('Quelle', t.every((x) => x.quelle === 'iserv'), true);
gleich('mehrtägig ganztägig', t[3].bis, '2026-11-24');
gleich('eindeutige uid je Termin der Serie', new Set(t.map((x) => x.uid)).size, 4);
gleich('ohne Serie bleibt die UID', t[3].uid, 'tag@iserv');
// mehrtägiger Termin, der vor dem Fenster beginnt, aber hineinreicht
gleich('hineinragend', ausIcs(ics, '2026-11-24', '2026-11-24', 'iserv').map((x) => x.titel), ['Projekttage']);

// ---------- Abgleich je Quelle ----------
const kurs: any = { id: 'k', klasse: '2FOS', fach: 'Englisch', leistungen: [
  { id: 'l1', name: 'Klausur 1', art: 'Klausur', gruppe: 'klausuren', datum: '2026-11-10' },
  { id: 'l2', name: 'Klausur 2', art: 'Klausur', gruppe: 'klausuren' }
] };
const d: any = {
  kurse: [kurs], stundenplan: [{ kursId: 'k', tag: 2, beginn: '08:00', ende: '09:30' }, { kursId: 'k', tag: 4, beginn: '10:00', ende: '11:30' }],
  einstellungen: { untis: { ausfaelle: ['k|2026-11-12|10:00'], halbjahrVon: '2026-08-31', halbjahrBis: '2027-07-07', abgerufen: '' }, ferien: [{ name: 'Herbstferien', von: '2026-10-19', bis: '2026-10-31' }] },
  termine: [{ id: 'eigen', datum: '2026-11-20', titel: 'Elternsprechtag', art: 'sprechtag' }], nachschreiben: []
};
let z = quelleAbgleichen(d, 'iserv', t);
gleich('erster Abgleich', z, { neu: 4, geaendert: 0, entfallen: 0, gesamt: 4 });
// Lehrkraft legt fest: Projekttage = unterrichtsfrei für 2FOS
const pt = d.termine.find((x: any) => x.uid === 'tag@iserv');
Object.assign(pt, { art: 'frei', unterrichtFrei: true, kursIds: ['k'], angepasst: true });
// IServ ändert den Titel, eine Konferenz fällt weg
const t2 = ausIcs(ics.replace('SUMMARY:Projekttage', 'SUMMARY:Projekttage Berufsorientierung').replace('COUNT=4', 'COUNT=3'), '2026-10-01', '2027-07-31', 'iserv');
z = quelleAbgleichen(d, 'iserv', t2);
gleich('zweiter Abgleich', z, { neu: 0, geaendert: 1, entfallen: 1, gesamt: 3 });
const pt2 = d.termine.find((x: any) => x.uid === 'tag@iserv');
gleich('Titel aus der Quelle, Festlegung bleibt', [pt2.titel, pt2.art, pt2.unterrichtFrei, pt2.kursIds], ['Projekttage Berufsorientierung', 'frei', true, ['k']]);
gleich('eigener Termin unberührt', d.termine.some((x: any) => x.id === 'eigen' && !x.quelle), true);
gleich('Hinweistext', abgleichText('IServ', z), 'IServ: 1 Termin geändert, 1 Termin entfallen');
gleich('nichts Neues = kein Text', abgleichText('IServ', { neu: 0, geaendert: 0, entfallen: 0, gesamt: 3 }), '');

// ---------- WebUntis-Prüfungen ----------
const kursRef = [{ key: '7-3', klasseId: 7, fachId: 3, klasse: '2FOS', fach: 'Englisch', fachKurz: 'EN' }];
const roh = [
  // JSON-RPC-Form: ids
  { id: 11, classes: [7], teachers: [99], students: [1, 2, 3], subject: 3, date: 20261201, startTime: 800, endTime: 930, name: 'Klausur 2' },
  // Web-Schnittstelle: Namen
  { id: 12, examType: 'Klausur', name: 'Mathe', studentClass: ['2FOS'], subject: 'MA', examDate: 20261203, startTime: 1000, endTime: 1130 },
  // fremde Klasse: verworfen
  { id: 13, classes: [8], subject: 3, date: 20261204 },
  // dieselbe Klausur wie im Notenbuch (10.11.)
  { id: 14, classes: [7], subject: 3, date: 20261110, startTime: 800, endTime: 930 }
];
const p = pruefungenZuordnen(roh, kursRef, new Map([[7, '2FOS'], [8, '3BS']]), new Map([[3, 'Englisch']]));
gleich('nur eigene Klassen', p.map((x) => x.id), ['11', '14', '12'].sort((a, b) => roh.findIndex((r) => String(r.id) === a) - roh.findIndex((r) => String(r.id) === b)));
gleich('eigen vs. fremd', p.map((x) => x.fremd), [false, true, false]);
gleich('keine Schülerliste', JSON.stringify(p).includes('students'), false);
gleich('Titel fremd', p[1].titel, 'Klausur MA (andere Lehrkraft)');
const ut = pruefungenAlsTermine(p, new Map([['7-3', 'k']]));
gleich('Termine', ut.map((x) => [x.datum, x.beginn, x.kursIds, !!x.fremd]), [['2026-12-01', '08:00', ['k'], false], ['2026-12-03', '10:00', ['k'], true], ['2026-11-10', '08:00', ['k'], false]]);
quelleAbgleichen(d, 'untis', ut);

let e = eintraege(d, '2026-11-01', '2026-12-31');
gleich('Klausur aus Notenbuch nur einmal, mit Hinweis', e.filter((x) => x.datum === '2026-11-10').map((x) => [x.art, x.auchUntis]), [['klausur', true]]);
gleich('Datum ins Notenbuch übernehmbar', e.find((x) => x.datum === '2026-12-01')?.klausurOhneDatum?.name, 'Klausur 2');
gleich('Ausfall laut WebUntis im Kalender', e.filter((x) => x.art === 'ausfall').map((x) => [x.datum, x.klasse, x.quelle]), [['2026-11-12', '2FOS Englisch', 'untis']]);
gleich('IServ unterrichtsfrei', e.find((x) => x.titel.startsWith('Projekttage'))?.frei, true);
d.einstellungen.kalender = { fremdePruefungen: false };
gleich('fremde abschaltbar', eintraege(d, '2026-12-01', '2026-12-31').some((x) => x.termin?.fremd), false);
d.einstellungen.kalender = { untisPruefungen: false };
gleich('Prüfungen abschaltbar', eintraege(d, '2026-12-01', '2026-12-31').some((x) => x.quelle === 'untis' && x.art === 'pruefung'), false);
d.einstellungen.kalender = {};
const ausgeblendet = d.termine.find((x: any) => x.uid === '12');
ausgeblendet.ausgeblendet = true;
gleich('ausgeblendet', eintraege(d, '2026-12-03', '2026-12-03').length, 0);
ausgeblendet.ausgeblendet = false;
gleich('Export ohne Abgeglichenes', /Fachkonferenz|Projekttage|andere Lehrkraft/.test(alsIcs(d, '2026-11-01', '2026-12-31')), false);
gleich('Export mit eigenem Termin', alsIcs(d, '2026-11-01', '2026-12-31').includes('Elternsprechtag'), true);

// ---------- Semesterplanung ----------
const hj = { nr: 1 as const, name: '1. Halbjahr', von: '2026-11-23', bis: '2026-12-04' };
let plan = semesterPlan(d, kurs, hj, '2026-11-01');
gleich('IServ-Projekttage fallen aus (Di 24.11.)', plan.bloecke.filter((b) => b.datum === '2026-11-24').map((b) => b.zustand), ['ausfall']);
gleich('WebUntis-Prüfung belegt den Block (Di 1.12.)', plan.bloecke.filter((b) => b.datum === '2026-12-01').map((b) => b.klausur), [true]);
gleich('fremde Prüfung belegt keinen Block (Do 3.12.)', plan.bloecke.filter((b) => b.datum === '2026-12-03').map((b) => b.klausur), [false]);
pt2.ausgeblendet = true;
plan = semesterPlan(d, kurs, hj, '2026-11-01');
gleich('ausgeblendet zählt nicht als Ausfall', plan.bloecke.filter((b) => b.datum === '2026-11-24').map((b) => b.zustand), ['unterricht']);

// ---------- IServ-Link ----------
gleich('webcal wird https', linkPruefen('webcal://iserv.schule.de/iserv/calendar/feed/abc?key=1'), { ok: true, host: 'iserv.schule.de', pfad: '/iserv/calendar/feed/abc?key=1' });
gleich('http abgelehnt', linkPruefen('http://iserv.schule.de/x.ics').ok, false);
gleich('nur Startseite abgelehnt', linkPruefen('https://iserv.schule.de/').ok, false);
gleich('Zugangsdaten im Link abgelehnt', linkPruefen('https://a:b@iserv.schule.de/x.ics').ok, false);
gleich('Durchreicher-Pfad', durchreicherPfad('/iserv/x.ics?k=1'), '/iserv/iserv/x.ics?k=1');
gleich('Server passt', serverPasst('iserv.schule.de', 'ISERV.schule.de\n'), '');
gleich('Server fehlt', serverPasst('iserv.schule.de', '').includes('ISERV_SERVER=iserv.schule.de'), true);
gleich('Anmeldeseite erkannt', antwortPruefen(200, '<!DOCTYPE html><html>Login').length > 0, true);
gleich('Kalender ok', antwortPruefen(200, 'BEGIN:VCALENDAR\r\n'), '');

console.log(`Kalenderabgleich: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
