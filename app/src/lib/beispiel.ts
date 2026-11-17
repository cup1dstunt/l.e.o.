// Erfundene Beispieldaten. Keine echten Schülerdaten (CLAUDE.md, Datenschutz).
import { BAUSTEINE } from './bausteine.ts';
import type { Daten, Kurs, Leistung, MitarbeitEintrag, Fehlzeit, Notiz, Schueler, Stufe } from './typen.ts';
import { monatsVorschlag } from './rechnen.ts';

function zufall(start: number) {
  let s = start;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const NAMEN: [string, string, 'w' | 'm'][] = [
  ['Aylin', 'Demir', 'w'], ['Ben', 'Hoffmann', 'm'], ['Chiara', 'Lange', 'w'], ['Deniz', 'Yilmaz', 'm'],
  ['Elif', 'Şahin', 'w'], ['Felix', 'Brandt', 'm'], ['Greta', 'Wolf', 'w'], ['Hamza', 'Okafor', 'm'],
  ['Ida', 'Petrović', 'w'], ['Jonas', 'Krüger', 'm'], ['Lena', 'Marx', 'w'], ['Mert', 'Arslan', 'm'],
  ['Nora', 'Hessel', 'w'], ['Paul', 'Schubert', 'm'], ['Sophie', 'Baumann', 'w'], ['Tim', 'Richter', 'm'],
  ['Zeynep', 'Tekin', 'w'], ['Luca', 'Vogel', 'm'], ['Mia', 'Castro', 'w'], ['Finn', 'Weber', 'm'],
  ['Hannah', 'Kowalski', 'w'], ['Emil', 'Nowak', 'm'], ['Leyla', 'Aydın', 'w'], ['Noah', 'Fischer', 'm'],
  ['Clara', 'Neumann', 'w'], ['Yusuf', 'Kaya', 'm']
];

const tag = (d: Date) => d.toISOString().slice(0, 10);
const neueId = (p: string, i: number) => `${p}${i}`;

export function beispielDaten(heute = new Date()): Daten {
  const rnd = zufall(42);
  const schueler: Schueler[] = NAMEN.map(([v, n, g], i) => ({
    id: neueId('s', i),
    vorname: v,
    nachname: n,
    geschlecht: g,
    geburt: `${2005 + Math.floor(rnd() * 4)}-0${1 + Math.floor(rnd() * 9)}-1${Math.floor(rnd() * 9)}`,
    mailDienst: `${v.toLowerCase()}.${n.toLowerCase().replace(/[^a-z]/g, '')}@schule.example`,
    mailPrivat: i % 3 === 0 ? undefined : `${v.toLowerCase()}${i}@mail.example`,
    nta: i === 2 || i === 3 ? 'Zeitverlängerung 25 %' : undefined
  }));

  // Halbjahr: Monate Sep bis zum aktuellen Monat (Prototyp startet im 1. Halbjahr 2026/27)
  const monate = ['2026-09', '2026-10', '2026-11'];
  const monatsName = (m: string) => new Date(m + '-01').toLocaleDateString('de-DE', { month: 'short' }).replace('.', '');

  function kurs(id: string, name: string, fach: string, klasse: string, raum: string, profil: 'FOS' | 'OSZ', sch: Schueler[], niveau: number): Kurs {
    const fos = profil === 'FOS';
    const leistungen: Leistung[] = [
      { id: `${id}-k1`, name: 'Klausur 1', art: 'Klausur', gruppe: 'klausuren', gewicht: 1, datum: '2026-10-08' },
      { id: `${id}-k2`, name: 'Klausur 2', art: 'Klausur', gruppe: 'klausuren', gewicht: 1, datum: '2026-12-10' },
      ...monate.map((m) => ({ id: `${id}-m${m}`, name: monatsName(m), art: 'Monatsnote', gruppe: 'mitarbeit' as const, gewicht: 1, monat: m })),
      { id: `${id}-t1`, name: 'Test 1', art: 'Test', gruppe: 'sl', gewicht: 1, datum: '2026-09-24' },
      { id: `${id}-t2`, name: 'Präsentation', art: 'Präsentation', gruppe: 'sl', gewicht: 1, datum: '2026-10-29' },
      { id: `${id}-t3`, name: 'Vokabeltest', art: 'Test', gruppe: 'sl', gewicht: 0.5, datum: '2026-11-12' }
    ];
    const zellen: Kurs['zellen'] = {};
    sch.forEach((s, i) => {
      const staerke = niveau + (rnd() - 0.5) * 0.7; // 0 schwach … 1 stark
      const wert = () => {
        const x = Math.max(0, Math.min(1, staerke + (rnd() - 0.5) * 0.35));
        return fos ? Math.round(x * 15) : Math.min(6, Math.max(1, Math.round(6 - x * 5)));
      };
      const setz = (lid: string) => (zellen[`${id}-${lid}:${s.id}`] = { wert: wert() });
      setz('k1');
      setz('t1');
      setz('t2');
      setz('t3');
      if (i === 4) zellen[`${id}-k1:${s.id}`] = { status: 'E' };
      if (i === 5) zellen[`${id}-k1:${s.id}`] = { status: 'UE' };
      if (i === 6) zellen[`${id}-k1:${s.id}`].stern = 'knapp, wenn die Vokabelliste kommt, eher besser';
      if (i === 7) delete zellen[`${id}-t3:${s.id}`];
      if (i === 8) zellen[`${id}-t2:${s.id}`].gewicht = 0.5;
    });
    return {
      id, name, fach, klasse, raum, profil, schueler: sch.map((s) => s.id), leistungen, zellen, endnoten: {},
      gewichte: { klausuren: 0.5, sonstige: 0.5, mitarbeit: 0.6, sl: 0.4 },
      stundenGehalten: 48,
      lernstoff: {},
      uebergang: { text: fos ? 'Unit 6 Reading bis Absatz 3, Vokabeln S. 84 offen' : 'Angebotsvergleich begonnen, Aufgabe 2 fehlt noch', datum: '2026-11-13' }
    };
  }

  const kurse = [
    kurs('k-fos', '2FOS 25-1 Englisch', 'Englisch', '2FOS 25-1', '2.14', 'FOS', schueler.slice(0, 14), 0.6),
    kurs('k-osz', 'KBM 25-2 Wirtschaft', 'Wirtschaft', 'KBM 25-2', '1.07', 'OSZ', schueler.slice(14), 0.55)
  ];

  // Mitarbeit: Smiley-Einträge seit September, 1–2 pro Woche und Schüler
  const mitarbeit: MitarbeitEintrag[] = [];
  const fehlzeiten: Fehlzeit[] = [];
  let n = 0;
  for (const k of kurse) {
    k.schueler.forEach((sid, i) => {
      const grund = 1 + ((i * 7) % 5) * 0.6 + rnd() * 0.6; // typische Stufe je Schüler
      for (let d = new Date('2026-09-01'); d < heute; d.setDate(d.getDate() + 1)) {
        const wt = d.getDay();
        if (wt === 0 || wt === 6 || rnd() > 0.32) continue;
        const stufe = Math.max(1, Math.min(5, Math.round(grund + (rnd() - 0.5) * 1.8))) as Stufe;
        const passend = BAUSTEINE.filter((b) => Math.abs(b.stufe - stufe) <= 0);
        const bausteine = rnd() < 0.45 && passend.length ? [passend[Math.floor(rnd() * passend.length)].text] : [];
        mitarbeit.push({ id: neueId('m', n++), kursId: k.id, schuelerId: sid, zeit: new Date(d.getTime() + 9 * 3600e3).toISOString(), stufe, bausteine });
      }
      // Fehlzeiten (WebUntis würde sie später liefern)
      const fehltage = i === 3 ? 9 : Math.floor(rnd() * 5);
      for (let f = 0; f < fehltage; f++) {
        const d = new Date('2026-09-01');
        d.setDate(d.getDate() + Math.floor(rnd() * 70));
        if (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 2);
        if (i === 3 && f < 4) while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
        fehlzeiten.push({ id: neueId('f', n++), kursId: k.id, schuelerId: sid, datum: tag(d), stunden: 2, status: rnd() < 0.8 ? 'E' : 'UE' });
      }
    });
    // Monatsnoten Sep und Okt aus den Smileys vorschlagen und übernehmen, November bleibt offen
    for (const m of monate.slice(0, 2)) {
      for (const sid of k.schueler) {
        const stufen = mitarbeit.filter((e) => e.kursId === k.id && e.schuelerId === sid && e.zeit.startsWith(m)).map((e) => e.stufe);
        const v = monatsVorschlag(k.profil, stufen);
        if (v) k.zellen[`${k.id}-m${m}:${sid}`] = { wert: v.wert };
      }
    }
  }

  const notizen: Notiz[] = [
    { id: 'n1', schuelerId: 's3', datum: '2026-10-12', text: 'Gespräch nach der Stunde: Praktikum ist stressig, Abgabe verschoben.' },
    { id: 'n2', schuelerId: 's3', datum: '2026-09-28', text: 'Mitarbeit stark bei Gruppenarbeit, übernimmt gern die Präsentation.' },
    { id: 'n3', schuelerId: 's5', datum: '2026-10-21', text: 'Klausur 1 unentschuldigt verpasst, Mail an Klassenleitung.' }
  ];

  // Stundenplan: beide Kurse jeden Tag, damit „Läuft gerade“ beim Testen oft etwas zeigt
  const stundenplan = [1, 2, 3, 4, 5].flatMap((t) => [
    { kursId: 'k-fos', tag: t, beginn: t % 2 ? '08:00' : '09:45', ende: t % 2 ? '09:30' : '11:15' },
    { kursId: 'k-osz', tag: t, beginn: t % 2 ? '11:45' : '13:30', ende: t % 2 ? '13:15' : '15:00' }
  ]);

  return {
    version: 1, schueler, kurse, mitarbeit, fehlzeiten, notizen, stundenplan,
    einstellungen: { navigation: 'links', theme: 'system', stundenendeHinweis: true }
  };
}
