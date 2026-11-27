// Prüft die Übernahme aus WebUntis ohne Netz, mit erfundenen Daten (V11).
// Aufruf: npm test
import { artAusUntis, isoAusUntis, zeitAusUntis, einheiten, tabelleLesen, datumLesen, stammdatenEinlesen, uebernehmen, profilAus, geschlechtAus, kennungWaehlen, schuelerIndex, holen, untisKey, falscheKlasseEntfernen, type Paket } from '../src/lib/untisimport.ts';
import { beispielDaten } from '../src/lib/beispiel.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

// Status (E94, E95)
gleich('entsch.', artAusUntis('entsch.', 'K', 90), 'E');
gleich('entsch. aPP', artAusUntis('entsch. aPP', 'aPP', 90), 'E');
gleich('nicht entsch.', artAusUntis('nicht entsch.', 'UE', 90), 'UE');
gleich('Verspätung', artAusUntis('Verspätung', 'V (z)', 10), 'verspaetung');
gleich('Verspätung ohne Status', artAusUntis('', 'V (nicht z)', 5), 'verspaetung');
gleich('offen', artAusUntis('', 'Abw oM', 90), 'offen');
gleich('anwesend', artAusUntis(null, null, 0), null);

gleich('iso', isoAusUntis(20261118), '2026-11-18');
gleich('zeit', zeitAusUntis(815), '08:15');
gleich('einheiten Doppel', einheiten(800, 930), 2);
gleich('einheiten einzeln', einheiten(1015, 1100), 1);
gleich('profil', [profilAus('2FOS25-1'), profilAus('AM26-BI')], ['FOS', 'OSZ']);
gleich('geschlecht', [geschlechtAus('female'), geschlechtAus('male'), geschlechtAus('')], ['w', 'm', 'd']);

// Export lesen (Spalten wie der WebUntis-Bericht), Adressen werden ignoriert
const tsv = 'name\tlongName\tforeName\tgender\tbirthDate\tklasse.name\tid\taddress.email\tattribute.Nachteilsausgleich\n' +
  'Muster\tMuster\tAnna\tfemale\t05.02.2006\tAM26-BI\t9001\tanna@example.org\tja\n' +
  'Fremd\tFremd\tOtto\tmale\t01.01.2005\tXY\t9999\to@example.org\t\n';
gleich('tabelle', tabelleLesen(tsv).length, 2);
gleich('datum', [datumLesen('05.02.2006'), datumLesen('2006-02-05'), datumLesen('20060205'), datumLesen('x')], ['2006-02-05', '2006-02-05', '2006-02-05', '']);
gleich('csv Semikolon', tabelleLesen('a;b\n"1;2";3\n')[0], { a: '1;2', b: '3' });

// Übernahme mit erfundenem Paket
const d = beispielDaten(new Date('2026-11-18T10:00'));
const paket: Paket = {
  kuerzel: 'Abc', von: '2026-08-24', bis: '2027-01-29',
  kurse: [{ klasseId: 1, fachId: 2, name: 'AM26-BI Englisch', fach: 'Englisch', klasse: 'AM26-BI', raum: '2.14', gehalten: 40, anzahl: 20, schueler: new Set([9001, 9002]) }],
  schueler: [
    { untisId: 9001, vorname: 'Anna', nachname: 'Muster', geschlecht: 'w' },
    { untisId: 9002, vorname: 'Ben', nachname: 'Beispiel', geschlecht: 'm' }
  ],
  stunden: [{ key: '1-2', tag: 3, beginn: '08:00', ende: '09:30' }],
  fehlzeiten: [{ key: '1-2', untisId: 9002, datum: '2026-11-11', beginn: '08:00', stunden: 2, status: 'UE', grund: 'UE' }],
  verspaetungen: [{ key: '1-2', untisId: 9001, datum: '2026-11-04', ankunft: '08:09', minuten: 9 }],
  ausfaelle: [], stammdaten: []
};
const e = uebernehmen(d, paket, { beispielEntfernen: true, benutzer: 'x', schule: 'osz-lus' });
gleich('ergebnis', [e.kurse, e.kurseNeu, e.schueler, e.fehlzeiten, e.verspaetungen], [1, 1, 2, 1, 1]);
gleich('beispiel weg', d.kurse.length, 1);
gleich('stundenplan', d.stundenplan.length, 1);
gleich('sitzplan verteilt', Object.keys(d.kurse[0].sitzplan.belegung).length, 2);
// Note eintragen, erneut abgleichen: Note bleibt, Fehlzeit wird ersetzt, nicht verdoppelt
d.kurse[0].zellen[`${d.kurse[0].leistungen[0].id}:u9001`] = { wert: 12 };
const e2 = uebernehmen(d, paket, { beispielEntfernen: false, benutzer: 'x', schule: 'osz-lus' });
gleich('zweiter Abgleich', [e2.kurseNeu, e2.schuelerNeu, e2.fehlzeiten, d.kurse.length], [0, 0, 1, 1]);
gleich('Note bleibt', d.kurse[0].zellen[`${d.kurse[0].leistungen[0].id}:u9001`]?.wert, 12);
// Export: nur bekannte Schüler, keine Mail übernommen
const r = stammdatenEinlesen(d, tsv);
gleich('export', [r.gelesen, r.zugeordnet], [2, 1]);
const anna = d.schueler.find((s) => s.untisId === 9001)!;
gleich('geburt', anna.geburt, '2006-02-05');
gleich('keine Mail', [anna.mailPrivat, anna.mailDienst], [undefined, '']);
gleich('nta', !!anna.nta, true);

// Eigene Kennung im Klassenbuch (teacherIds): häufigste in den eigenen Stunden
const kn = new Map([['ABC', new Set(['1', '2', '3', '4'])], ['XYZ', new Set(['1'])], ['QRS', new Set(['2', '3'])]]);
gleich('Kennung: Kürzel passt', kennungWaehlen(kn, 4, ['ABC', '77']), 'ABC');
gleich('Kennung: Kürzel passt nicht, häufigste', kennungWaehlen(kn, 4, ['Müller', '77']), 'ABC');
gleich('Kennung: nichts eindeutig', kennungWaehlen(new Map([['XYZ', new Set(['1'])]]), 4, ['']), '');
gleich('Kennung: keine Stunden', kennungWaehlen(kn, 0, ['ABC']), '');

// Klassenbuch-Nummer (Text) zur Schülerliste
const fi = schuelerIndex([{ id: 5, key: 'S-17', name: 'Muster' }, { id: 6, key: 'S-18', name: 'Beispiel' }]);
gleich('Schüler über id (Text)', fi('5')?.id, 5);
gleich('Schüler über key', fi('S-18')?.id, 6);
gleich('Schüler unbekannt', fi('S-99'), undefined);

// Kurzer Abgleich (E119): ältere WebUntis-Fehlzeiten bleiben, im Fenster wird ersetzt
{
  const dk = beispielDaten(new Date('2026-11-18T10:00'));
  const voll: Paket = { ...paket, fehlzeiten: [
    { key: '1-2', untisId: 9002, datum: '2026-09-10', beginn: '08:00', stunden: 2, status: 'E', grund: 'K' },
    { key: '1-2', untisId: 9002, datum: '2026-11-11', beginn: '08:00', stunden: 2, status: 'offen', grund: '' }
  ], verspaetungen: [] };
  uebernehmen(dk, voll, { beispielEntfernen: true, benutzer: 'x', schule: 'osz-lus' });
  const vollZeit = dk.einstellungen.untis!.vollAbgerufen;
  gleich('voll merkt Zeitpunkt', !!vollZeit, true);
  const kurz: Paket = { ...voll, klassenbuchAb: '2026-10-21', fehlzeiten: [
    { key: '1-2', untisId: 9002, datum: '2026-11-11', beginn: '08:00', stunden: 2, status: 'UE', grund: 'UE' }
  ] };
  uebernehmen(dk, kurz, { beispielEntfernen: false, benutzer: 'x', schule: 'osz-lus' });
  gleich('alt bleibt, neu ersetzt', dk.fehlzeiten.filter((f) => f.quelle === 'untis').map((f) => [f.datum, f.status]).sort(), [['2026-09-10', 'E'], ['2026-11-11', 'UE']]);
  gleich('kurz behält vollen Zeitpunkt', dk.einstellungen.untis!.vollAbgerufen, vollZeit);
}

// Klassenzuordnung (Bug 27.11.): FOS-Schüler landeten in der KA-Klasse
{
  const tag = (n: number) => { const x = new Date(Date.now() - n * 864e5); return x.getFullYear() * 10000 + (x.getMonth() + 1) * 100 + x.getDate(); };
  const [t1, t2, t3, t4] = [8, 7, 6, 5].map(tag);
  const ich = { id: 77, name: 'Abc' };
  const KA = { id: 1, name: 'KA25' }, FOS = { id: 2, name: 'FOS25' };
  const EN = { id: 10, name: 'E', longname: 'Englisch' }, WI = { id: 11, name: 'WI', longname: 'Wirtschaft' };
  const stunde = (date: number, kl: any[], su: any, startTime: number, endTime: number, code?: string) => ({ date, kl, su: [su], te: [ich], ro: [], startTime, endTime, ...(code ? { code } : {}) });
  const plan = [
    // ausgefallene KA-Stunde steht absichtlich vor der Vertretung in FOS zur selben Zeit
    stunde(t4, [KA], EN, 800, 930, 'cancelled'), stunde(t4, [FOS], EN, 800, 930, 'irregular'),
    ...[t1, t2, t3].map((t) => stunde(t, [KA], EN, 800, 930)),
    ...[t1, t2, t3, t4].map((t) => stunde(t, [FOS], EN, 1000, 1130)),
    ...[t1, t2, t3].map((t) => stunde(t, [FOS, KA], WI, 1200, 1330)),
    ...[t1, t2, t3].map((t) => stunde(t, [KA], WI, 1400, 1530))
  ];
  const zeile = (studentId: string, date: number, startTime: number) => ({ studentId, date, startTime, teacherIds: ['Abc'], excuseStatus: 'nicht entsch.', absenceReason: 'UE', absentTime: 90 });
  const buch = [
    zeile('S1', t1, 800), // Anna (KA) in KA Englisch
    zeile('S2', t1, 1000), // Gilian (FOS) in FOS Englisch
    zeile('S2', t4, 800), // Gilian in der Vertretung, während KA Englisch ausfällt
    zeile('S2', t2, 1200), // Gilian in der zusammengelegten Stunde
    zeile('S3', t1, 1200), // Kai (KA) in der zusammengelegten Stunde
    zeile('S3', t2, 1400) // Kai in KA Wirtschaft
  ];
  // Kürzel S2 ist zufällig auch die id-Schreibweise eines anderen Schülers? Hier: key-Feld, ids sind Zahlen
  const schuelerListe = [
    { id: 501, key: 'S1', name: 'Muster', foreName: 'Anna', longName: 'Muster', gender: 'female' },
    { id: 502, key: 'S2', name: 'Neuwirt', foreName: 'Gilian', longName: 'Neuwirt', gender: 'male' },
    { id: 503, key: 'S3', name: 'Kraus', foreName: 'Kai', longName: 'Kraus', gender: 'male' }
  ];
  const sz: any = {
    schule: 'x', benutzer: 'abc', person: { typ: 2, id: 77 }, rechte: 0, abmelden: async () => {},
    rest: async () => { throw new Error('nicht da'); },
    r: async (m: string, p: any) => {
      if (m === 'getCurrentSchoolyear') return { startDate: tag(40), endDate: tag(-60) };
      if (m === 'getKlassen') return [KA, FOS];
      if (m === 'getSubjects') return [EN, WI].map((x) => ({ ...x, longName: x.longname }));
      if (m === 'getRooms' || m === 'getHolidays' || m === 'getExamTypes' || m === 'getExams') return [];
      if (m === 'getTimetable') return plan;
      if (m === 'getTimetableWithAbsences') return buch.filter((z) => z.date >= p.options.startDate && z.date <= p.options.endDate);
      if (m === 'getStudents') return schuelerListe;
      throw new Error(m);
    }
  };
  const pk = await holen(sz, () => {});
  const liste = (key: string) => [...(pk.kurse.find((k) => untisKey(k) === key)?.schueler ?? [])].sort();
  gleich('KA Englisch ohne FOS-Schüler', liste('1-10'), [501]);
  gleich('FOS Englisch mit Vertretung', liste('2-10'), [502]);
  gleich('zusammengelegt eigene Klasse', liste('1+2-11'), [502, 503]);
  gleich('KA Wirtschaft nur KA', liste('1-11'), [503]);
  gleich('Name zusammengelegt', pk.kurse.find((k) => untisKey(k) === '1+2-11')?.klasse, 'FOS25, KA25');

  // Alte Fehlzuordnung wird aufgeräumt, sobald die Klasse aus dem Export bekannt ist
  const dd = beispielDaten(new Date('2026-11-18T10:00'));
  uebernehmen(dd, pk, { beispielEntfernen: true, benutzer: 'x', schule: 'x' });
  const kaEn = dd.kurse.find((k) => k.untis && untisKey(k.untis) === '1-10')!;
  kaEn.schueler.push('u502'); // so sah es vorher aus
  kaEn.sitzplan.belegung[39] = 'u502';
  gleich('ohne Export nichts entfernt', falscheKlasseEntfernen(dd), 0);
  const gil = dd.schueler.find((s) => s.id === 'u502')!;
  gil.klasse = 'FOS25'; gil.klasseSicher = true;
  gleich('mit Export entfernt', falscheKlasseEntfernen(dd), 1);
  gleich('KA Englisch danach', kaEn.schueler, ['u501']);
  gleich('Sitzplan frei', kaEn.sitzplan.belegung[39], undefined);
  gleich('zusammengelegt behält ihn', dd.kurse.find((k) => k.untis && untisKey(k.untis) === '1+2-11')!.schueler.includes('u502'), true);
  // Unbekannte Klassenschreibweise im Export: nichts aussortieren
  gil.klasse = 'FOS 2025/1';
  kaEn.schueler.push('u502');
  gleich('fremde Schreibweise bleibt', falscheKlasseEntfernen(dd), 0);

  // Früherer Schlüssel einer zusammengelegten Klasse: Kurs wird weiterverwendet, nicht verdoppelt
  const da = beispielDaten(new Date('2026-11-18T10:00'));
  const alt = { ...pk, kurse: pk.kurse.map((k) => (k.klassen ? { ...k, klassen: undefined, klasseId: k.klasseId } : k)) };
  uebernehmen(da, alt as Paket, { beispielEntfernen: true, benutzer: 'x', schule: 'x' });
  const vorher = da.kurse.length;
  uebernehmen(da, pk, { beispielEntfernen: false, benutzer: 'x', schule: 'x' });
  gleich('kein doppelter Kurs', da.kurse.length, vorher);
}

// Klassenbuch-Nummer passt zum key-Feld, ist aber zufällig auch die id eines anderen Schülers
{
  const f = schuelerIndex([{ id: 5, key: '7' }, { id: 7, key: '9' }, { id: 8, key: '11' }], ['7', '9', '11']);
  gleich('Feld mit den meisten Treffern zuerst', f('7')?.id, 5);
}

console.log(`${ok} Übernahme-Prüfungen bestanden, ${fehler} fehlgeschlagen`);
if (fehler) process.exit(1);
