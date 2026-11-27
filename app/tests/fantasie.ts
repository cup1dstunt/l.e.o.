// Fantasieklassen für die Testrunde über alle Module (27.11.2026).
// Alle Namen sind erfunden und bunt gemischt; keine echten Schülerdaten (CLAUDE.md, Datenschutz).
// Absichtlich mit Grenzfällen: große Klasse, leere Klasse, zusammengelegte Klassen, dieselbe Klasse in zwei Fächern,
// Doppelnamen, Akzente, Geschlecht d, fehlendes Geburtsdatum, NTA, >30 % Fehlzeiten, alle Klausuren verpasst, Gewicht 0.
import { BAUSTEINE } from '../src/lib/bausteine.ts';
import { ausVorlage, verteilen } from '../src/lib/sitzplan.ts';
import { monatsVorschlag } from '../src/lib/rechnen.ts';
import type { Daten, Fehlzeit, Kurs, Leistung, MitarbeitEintrag, Profil, Schueler, Stufe, Verspaetung } from '../src/lib/typen.ts';

function zufall(start: number) {
  let s = start;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296), s / 4294967296);
}

const VOR_W = ['Amira', 'Bea', 'Céline', 'Dilara', 'Esra', 'Fiona', 'Gül', 'Hira', 'Inés', 'Jule', 'Kaja', 'Lotta', 'Mavi', 'Nele', 'Olga', 'Pia', 'Rana', 'Sena', 'Tilda', 'Uma', 'Vivi', 'Wanda', 'Yara', 'Zoé'];
const VOR_M = ['Adem', 'Bastian', 'Cem', 'Dario', 'Eren', 'Fynn', 'Goran', 'Hakan', 'Ilyas', 'Jannik', 'Kerem', 'Lasse', 'Milo', 'Nils', 'Ole', 'Piotr', 'Rafael', 'Sami', 'Theo', 'Ugur', 'Vito', 'Wim', 'Yannick', 'Zeno'];
const NACH = ['Albrecht', 'Bayram', 'Czerny', 'Dąbrowski', 'Engel', 'Fuchs', 'Gümüş', 'Haas', 'Iwanow', 'Jäger', 'Kılıç', 'Lorenz', 'Möller', 'Nguyen', 'Özdemir', 'Pohl', 'Quast', 'Rahimi', 'Seidel', 'Tran', 'Ulbrich', 'Voß', 'Winter', 'Yıldız', 'Ziegler', 'Brückner', 'Celik', 'Dietrich', 'Ehlers', 'Frank'];

const tag = (d: Date) => d.toISOString().slice(0, 10);

export function fantasieDaten(heute = new Date('2026-11-27T10:00:00')): Daten {
  const rnd = zufall(2711);
  let nr = 0;
  const schueler: Schueler[] = [];
  function neu(klasse: string, i: number): Schueler {
    const g: 'w' | 'm' | 'd' = i % 17 === 11 ? 'd' : rnd() < 0.5 ? 'w' : 'm';
    const vor = g === 'm' ? VOR_M[(nr * 7) % VOR_M.length] : VOR_W[(nr * 5) % VOR_W.length];
    const nach = NACH[(nr * 11 + 3) % NACH.length];
    const s: Schueler = {
      id: `f${nr}`,
      vorname: vor,
      nachname: nach,
      geschlecht: g,
      geburt: nr % 13 === 4 ? '' : `${2002 + Math.floor(rnd() * 7)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`,
      mailDienst: nr % 9 === 7 ? '' : `${vor.toLowerCase()}.${nach.toLowerCase()}@osz-lus.de`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ą/g, 'a'),
      nta: nr % 19 === 6 ? 'Zeitverlängerung 25 %' : undefined,
      klasse,
      klasseSicher: true
    };
    nr++;
    schueler.push(s);
    return s;
  }
  const klasse = (name: string, n: number) => Array.from({ length: n }, (_, i) => neu(name, i));

  const bka = klasse('BKA 24-1', 28); // Kaufleute für Büromanagement, 3. Ausbildungsjahr
  const eh = klasse('EH 25-3', 22); // Einzelhandel, Blockunterricht
  const fos11 = klasse('1FOS 26-2', 31); // FOS 11, große Klasse
  const fos12 = klasse('2FOS 25-1', 17); // FOS 12, Abschlussjahr
  const gh1 = klasse('GH 25-1', 9);
  const gh2 = klasse('GH 25-2', 8); // GH 25-1 + 25-2 in Politik zusammengelegt

  // Grenzfälle an einzelnen Schülern
  bka[0].vorname = 'Anna-Lena Marie';
  bka[0].nachname = 'von Hohenstein-Kowalczyk';
  bka[0].mailDienst = 'anna-lena.vonhohenstein-kowalczyk@osz-lus.de';
  fos11[3].vorname = 'Zoé';
  fos11[4].vorname = fos11[5].vorname; // zwei mit gleichem Vornamen
  fos11[4].nachname = fos11[5].nachname; // und gleichem Nachnamen (Geschwister? Zwillinge?)
  fos11[4].geburt = fos11[5].geburt;
  fos11[4].mailDienst = fos11[5].mailDienst.replace('@', '2@');

  const monate = ['2026-09', '2026-10', '2026-11'];
  const monatsName = (m: string) => new Date(m + '-01').toLocaleDateString('de-DE', { month: 'short' }).replace('.', '');

  function kurs(id: string, fach: string, kl: string, raum: string, profil: Profil, sch: Schueler[], niveau: number, opt: { k2Vorbei?: boolean; ohneTests?: boolean; vorlage?: string } = {}): Kurs {
    const fos = profil === 'FOS';
    const leistungen: Leistung[] = [
      { id: `${id}-k1`, name: 'Klausur 1', art: 'Klausur', gruppe: 'klausuren', gewicht: 1, datum: '2026-10-07' },
      { id: `${id}-k2`, name: 'Klausur 2', art: 'Klausur', gruppe: 'klausuren', gewicht: 1, datum: opt.k2Vorbei ? '2026-11-18' : '2026-12-09' },
      ...monate.map((m) => ({ id: `${id}-m${m}`, name: monatsName(m), art: 'Monatsnote', gruppe: 'mitarbeit' as const, gewicht: 1, monat: m })),
      ...(opt.ohneTests ? [] : [
        { id: `${id}-t1`, name: 'Test 1', art: 'Test', gruppe: 'sl' as const, gewicht: 1, datum: '2026-09-23' },
        { id: `${id}-t2`, name: 'Referat', art: 'Präsentation', gruppe: 'sl' as const, gewicht: 2 },
        { id: `${id}-t3`, name: 'Probetest (zählt nicht)', art: 'Test', gruppe: 'sl' as const, gewicht: 0, datum: '2026-11-04' }
      ])
    ];
    const zellen: Kurs['zellen'] = {};
    sch.forEach((s, i) => {
      const staerke = niveau + (rnd() - 0.5) * 0.8;
      const wert = () => {
        const x = Math.max(0, Math.min(1, staerke + (rnd() - 0.5) * 0.35));
        return fos ? Math.round(x * 15) : Math.min(6, Math.max(1, Math.round(6 - x * 5)));
      };
      const setz = (lid: string) => (zellen[`${id}-${lid}:${s.id}`] = { wert: wert() });
      setz('k1');
      if (opt.k2Vorbei) setz('k2');
      if (!opt.ohneTests) { setz('t1'); setz('t2'); setz('t3'); }
      if (i === 1) zellen[`${id}-k1:${s.id}`] = { status: 'E' };
      if (i === 2) zellen[`${id}-k1:${s.id}`] = { status: 'UE' };
      if (i === 3 && opt.k2Vorbei) { zellen[`${id}-k1:${s.id}`] = { status: 'E' }; zellen[`${id}-k2:${s.id}`] = { status: 'offen' }; } // beide Klausuren verpasst
      if (i === 5) zellen[`${id}-k1:${s.id}`].stern = 'Täuschungsversuch? Mit Klassenleitung klären';
      if (i === 6 && !opt.ohneTests) zellen[`${id}-t2:${s.id}`].gewicht = 0.5;
      if (i === sch.length - 1) for (const k of Object.keys(zellen)) if (k.endsWith(`:${s.id}`)) delete zellen[k]; // neu in der Klasse, noch nichts
    });
    const sitz = ausVorlage(opt.vorlage ?? (fos ? 'reihen' : 'gruppen'));
    verteilen(sitz, [...sch].sort((a, b) => a.nachname.localeCompare(b.nachname, 'de')).map((x) => x.id));
    return {
      id, name: `${kl} ${fach}`, fach, klasse: kl, raum, profil, schueler: sch.map((s) => s.id), leistungen, zellen, endnoten: {},
      gewichte: { klausuren: 0.5, sonstige: 0.5, mitarbeit: fos ? 0.6 : 0.5, sl: fos ? 0.4 : 0.5 },
      stundenGehalten: 40, lernstoff: {}, sitzplan: sitz, uebergang: null
    };
  }

  const kurse = [
    kurs('f-bka', 'Wirtschafts- und Sozialprozesse', 'BKA 24-1', '1.12', 'OSZ', bka, 0.55, { k2Vorbei: true }),
    kurs('f-eh', 'Englisch', 'EH 25-3', '3.02', 'OSZ', eh, 0.45),
    kurs('f-fos11e', 'Englisch', '1FOS 26-2', '2.14', 'FOS', fos11, 0.6, { vorlage: 'reihen' }),
    kurs('f-fos11w', 'Wirtschaft', '1FOS 26-2', '2.14', 'FOS', fos11, 0.5),
    kurs('f-fos12', 'Englisch', '2FOS 25-1', '2.03', 'FOS', fos12, 0.7, { k2Vorbei: true }),
    kurs('f-gh', 'Politik', 'GH 25-1, GH 25-2', '0.08', 'OSZ', [...gh1, ...gh2], 0.5, { ohneTests: true }),
    { ...kurs('f-bos', 'Deutsch', 'BOS 26-1', '1.01', 'FOS', [], 0.5), uebergang: null } // neue Klasse, noch ohne Schüler
  ];
  kurse[5].untis = { klasseId: 501, fachId: 12, klassen: [501, 502] };
  kurse[0].endnoten[bka[10].id] = 2; // schon festgelegt
  kurse[4].endnoten[fos12[8].id] = 11;

  const mitarbeit: MitarbeitEintrag[] = [];
  const fehlzeiten: Fehlzeit[] = [];
  const verspaetungen: Verspaetung[] = [];
  let n = 0;
  for (const k of kurse) {
    k.schueler.forEach((sid, i) => {
      const grund = 1 + ((i * 7) % 5) * 0.6 + rnd() * 0.6;
      const stumm = i === 7; // fast nie bewertet → Raster springt ein
      for (let d = new Date('2026-09-01'); d < heute; d.setDate(d.getDate() + 1)) {
        const wt = d.getDay();
        if (wt === 0 || wt === 6 || rnd() > (stumm ? 0.03 : 0.25)) continue;
        if (k.id === 'f-eh' && Math.floor(d.getDate() / 7) % 2 === 1) continue; // Block: nur jede zweite Woche
        const stufe = Math.max(1, Math.min(5, Math.round(grund + (rnd() - 0.5) * 1.8))) as Stufe;
        const passend = BAUSTEINE.filter((b) => b.stufe === stufe);
        mitarbeit.push({ id: `fm${n++}`, kursId: k.id, schuelerId: sid, zeit: new Date(d.getTime() + 8.5 * 3600e3).toISOString(), stufe, bausteine: rnd() < 0.4 && passend.length ? [passend[Math.floor(rnd() * passend.length)].text] : [], kommentar: rnd() < 0.03 ? 'hat Hausaufgaben der Gruppe vorgestellt' : undefined });
      }
      const viel = i === 4 && k.profil === 'FOS'; // >30 % Fehlzeiten (auch entschuldigt)
      const fehltage = viel ? 8 : Math.floor(rnd() * 4);
      for (let f = 0; f < fehltage; f++) {
        const d = new Date('2026-09-01');
        d.setDate(d.getDate() + Math.floor(rnd() * 80));
        while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
        const frisch = heute.getTime() - d.getTime() < 10 * 864e5;
        fehlzeiten.push({ id: `ff${n++}`, kursId: k.id, schuelerId: sid, datum: tag(d), stunden: 2, status: frisch ? 'offen' : viel || rnd() < 0.75 ? 'E' : 'UE', quelle: rnd() < 0.7 ? 'untis' : undefined, beginn: '08:00' });
      }
      if (i === 1 || i === 2) fehlzeiten.push({ id: `ff${n++}`, kursId: k.id, schuelerId: sid, datum: '2026-10-07', stunden: 2, status: i === 1 ? 'E' : 'UE', quelle: 'untis', beginn: '08:00' });
      const zuSpaet = i === 9 ? 6 : Math.floor(rnd() * 2.5);
      for (let v = 0; v < zuSpaet; v++) {
        const d = new Date('2026-09-01');
        d.setDate(d.getDate() + Math.floor(rnd() * 80));
        while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
        if (i === 9 && v < 4) while (d.getDay() !== 1) d.setDate(d.getDate() + 1); // immer montags
        const min = 2 + Math.floor(rnd() * 25);
        verspaetungen.push({ id: `fv${n++}`, kursId: k.id, schuelerId: sid, datum: tag(d), ankunft: `08:${String(min).padStart(2, '0')}`, minuten: min });
      }
    });
    for (const m of monate.slice(0, 2)) for (const sid of k.schueler) {
      const st = mitarbeit.filter((e) => e.kursId === k.id && e.schuelerId === sid && e.zeit.startsWith(m)).map((e) => e.stufe);
      const v = monatsVorschlag(k.profil, st);
      if (v) k.zellen[`${k.id}-m${m}:${sid}`] = { wert: v.wert };
    }
  }

  // Semesterplanung: in zwei Klassen geplant, in den anderen nicht
  kurse[2].reihen = [
    { id: 'r1', titel: 'Unit 1 · Starting out', bloecke: 18 },
    { id: 'r2', titel: 'Unit 2 · Digital lives', bloecke: 24 },
    { id: 'r3', titel: 'Unit 3 · Job applications', bloecke: 30 },
    { id: 'r4', titel: 'Wiederholung Klausur 2', bloecke: 4 }
  ];
  kurse[0].reihen = [
    { id: 'r1', titel: 'Personalwirtschaft', bloecke: 20 },
    { id: 'r2', titel: 'Entgeltabrechnung', bloecke: 30 },
    { id: 'r3', titel: 'Prüfungsvorbereitung AP 2', bloecke: 200 } // überplant
  ];
  kurse[2].lernstoff['2026-11-26'] = { text: 'Unit 2 Listening', hausaufgabe: 'Workbook S. 22', stand: 'Listening Teil 2 fehlt noch' };
  kurse[2].uebergang = { text: 'Listening Teil 2 fehlt noch', datum: '2026-11-26' };

  const material = [
    { id: 'fmat1', kursId: 'f-fos11e', ort: 'reihe' as const, reiheId: 'r2', titel: 'Unit 2 Wortliste', art: 'link' as const, url: 'https://moodle.example.org/unit2', erstellt: '2026-11-01T08:00:00.000Z' },
    { id: 'fmat2', kursId: 'f-fos11e', ort: 'stunde' as const, datum: '2026-11-30', titel: 'Listening Audio', art: 'link' as const, url: 'https://iserv.example.org/dateien/audio', erstellt: '2026-11-20T08:00:00.000Z' },
    { id: 'fmat3', kursId: 'f-bka', ort: 'klasse' as const, titel: 'Lösung Lohnabrechnung', art: 'link' as const, url: 'https://iserv.example.org/dateien/loesung', loesung: true, erstellt: '2026-11-02T08:00:00.000Z' }
  ];

  const termine = [
    { id: 'ft1', datum: '2026-12-02', titel: 'Betriebsbesichtigung', art: 'ausflug' as const, kursIds: ['f-bka'], unterrichtFrei: true },
    { id: 'ft2', datum: '2026-12-21', bis: '2027-01-02', titel: 'Weihnachtsferien', art: 'frei' as const, unterrichtFrei: true },
    { id: 'ft3', datum: '2026-12-01', beginn: '15:00', ende: '16:30', titel: 'Bildungsgangkonferenz FOS', art: 'konferenz' as const, quelle: 'iserv' as const, kalender: 'osz-info' }
  ];

  // Stundenplan: Mo–Fr, die FOS 11 in zwei Fächern, GH nur donnerstags
  const s = (kursId: string, t: number, beginn: string, ende: string) => ({ kursId, tag: t, beginn, ende });
  const stundenplan = [
    s('f-fos11e', 1, '08:00', '09:30'), s('f-bka', 1, '09:45', '11:15'), s('f-eh', 1, '11:45', '13:15'),
    s('f-fos12', 2, '08:00', '09:30'), s('f-fos11w', 2, '09:45', '11:15'), s('f-bka', 2, '13:30', '15:00'),
    s('f-fos11e', 3, '08:00', '09:30'), s('f-eh', 3, '09:45', '11:15'), s('f-bos', 3, '11:45', '13:15'),
    s('f-gh', 4, '08:00', '09:30'), s('f-fos12', 4, '09:45', '11:15'), s('f-fos11w', 4, '11:45', '13:15'),
    s('f-fos11e', 5, '08:00', '09:30'), s('f-fos12', 5, '09:45', '11:15'), s('f-bka', 5, '11:45', '13:15')
  ];

  return {
    version: 1, schueler, kurse, mitarbeit, fehlzeiten, verspaetungen, notizen: [
      { id: 'fn1', schuelerId: fos11[4].id, datum: '2026-11-10', text: 'Lange krank, Attest liegt vor. Fehlzeiten im Blick behalten (30 %).' }
    ], nachschreiben: [], termine, material, stundenplan,
    einstellungen: { navigation: 'links', theme: 'system', stundenendeHinweis: true, liveAnsicht: 'liste', sperreMinuten: 15, eingerichtet: true, herkunft: 'idoceo' }
  };
}
