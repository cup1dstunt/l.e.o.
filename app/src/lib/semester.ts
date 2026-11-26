// Semesterplanung (PB16, E114): Wie viele Blöcke habe ich mit der Klasse im Halbjahr, und wie passen meine
// Unterrichtsreihen hinein? Quelle der Termine ist WebUntis (echte Termine inkl. Blockwochen), sonst das Wochenmuster.
// Ferien und Feiertage kommen aus WebUntis, ohne Abgleich aus der Beispielliste unten. Unterrichtsfreie Termine
// aus dem Kalender (Exkursion, Zeugniskonferenz) zählen als Ausfall.
import type { Daten, FreieZeit, Kurs, Leistung, Reihe, Termin } from './typen.ts';
import { isoDatum, minuten } from './hilfen.ts';

/** Beispiel Berlin 2026/27 (bitte prüfen). Nur Herbst-, Weihnachts- und Winterferien und die gesetzlichen Feiertage. */
export const BEISPIEL_FREI: FreieZeit[] = [
  { name: 'Herbstferien', von: '2026-10-19', bis: '2026-10-31' },
  { name: 'Weihnachtsferien', von: '2026-12-21', bis: '2027-01-02' },
  { name: 'Winterferien', von: '2027-02-01', bis: '2027-02-06' },
  { name: 'Frauentag', von: '2027-03-08', bis: '2027-03-08' },
  { name: 'Karfreitag', von: '2027-03-26', bis: '2027-03-26' },
  { name: 'Ostermontag', von: '2027-03-29', bis: '2027-03-29' },
  { name: 'Christi Himmelfahrt', von: '2027-05-06', bis: '2027-05-06' },
  { name: 'Pfingstmontag', von: '2027-05-17', bis: '2027-05-17' }
];

export function freieZeiten(d: Daten): { liste: FreieZeit[]; beispiel: boolean } {
  const f = d.einstellungen.ferien;
  return f?.length ? { liste: f, beispiel: false } : { liste: BEISPIEL_FREI, beispiel: true };
}

const tagDanach = (iso: string, n = 1) => { const t = new Date(iso + 'T12:00'); t.setDate(t.getDate() + n); return isoDatum(t); };

export function schuljahr(d: Daten) {
  return { von: d.einstellungen.untis?.halbjahrVon || '2026-08-31', bis: d.einstellungen.untis?.halbjahrBis || '2027-07-07' };
}

export interface Halbjahr { nr: 1 | 2; name: string; von: string; bis: string }

/** Beide Halbjahre des Schuljahres. Grenze: erster Tag des 2. Halbjahres, Standard 1. Februar (einstellbar). */
export function halbjahre(d: Daten): Halbjahr[] {
  const sj = schuljahr(d);
  const grenze = d.einstellungen.halbjahrGrenze || `${Number(sj.von.slice(0, 4)) + 1}-02-01`;
  return [
    { nr: 1, name: '1. Halbjahr', von: sj.von, bis: tagDanach(grenze, -1) },
    { nr: 2, name: '2. Halbjahr', von: grenze, bis: sj.bis }
  ];
}
export function aktuellesHalbjahr(d: Daten, heute: string): Halbjahr {
  const h = halbjahre(d);
  return heute >= h[1].von ? h[1] : h[0];
}

/** Gilt ein Termin für diese Klasse an diesem Tag zu dieser Zeit als unterrichtsfrei? */
export function freiDurchTermin(t: Termin, kursId: string, datum: string, beginn: string, ende: string) {
  if (!t.unterrichtFrei || t.ausgeblendet) return false;
  if (t.kursIds?.length && !t.kursIds.includes(kursId)) return false;
  if (datum < t.datum || datum > (t.bis || t.datum)) return false;
  if (t.beginn && t.ende && (minuten(t.ende) <= minuten(beginn) || minuten(t.beginn) >= minuten(ende))) return false;
  return true;
}

export interface Block {
  datum: string;
  beginn: string;
  ende: string;
  einheiten: number; // Unterrichtsstunden zu 45 Minuten
  zustand: 'unterricht' | 'ausfall' | 'frei';
  grund?: string; // Ferienname, „Ausfall laut WebUntis“ oder Termin-Titel
  terminId?: string; // eigener Ausfall-Termin, zum Zurücknehmen
  leistungen: Leistung[];
}

const einheitenVon = (b: string, e: string) => Math.max(1, Math.round((minuten(e) - minuten(b)) / 45));

/**
 * Alle Blöcke einer Klasse im Zeitraum. Zusammenhängende Stunden am selben Tag (Pause höchstens 5 Minuten)
 * sind ein Block. Ein Block fällt aus, wenn alle seine Stunden laut WebUntis ausfallen oder ein unterrichtsfreier
 * Termin ihn trifft. In Ferien liegen nur Blöcke aus dem Wochenmuster (WebUntis plant dort nichts).
 */
export function bloecke(d: Daten, kurs: Kurs, von: string, bis: string): Block[] {
  const ausfaelle = new Set(d.einstellungen.untis?.ausfaelle ?? []);
  const roh: { datum: string; beginn: string; ende: string }[] = [];
  if (kurs.untisStunden?.length) {
    for (const z of kurs.untisStunden) {
      const [datum, beginn, ende] = z.split('|');
      if (datum >= von && datum <= bis) roh.push({ datum, beginn, ende });
    }
  } else {
    const plan = d.stundenplan.filter((s) => s.kursId === kurs.id);
    for (let t = new Date(von + 'T12:00'); isoDatum(t) <= bis; t.setDate(t.getDate() + 1)) {
      for (const s of plan) if (s.tag === t.getDay()) roh.push({ datum: isoDatum(t), beginn: s.beginn, ende: s.ende });
    }
  }
  roh.sort((a, b) => (a.datum + a.beginn).localeCompare(b.datum + b.beginn));

  const { liste: frei } = freieZeiten(d);
  const termine = d.termine ?? [];
  const out: Block[] = [];
  let teile: typeof roh = [];
  const abschliessen = () => {
    if (!teile.length) return;
    const datum = teile[0].datum, beginn = teile[0].beginn, ende = teile[teile.length - 1].ende;
    const einheiten = teile.reduce((a, x) => a + einheitenVon(x.beginn, x.ende), 0);
    const b: Block = { datum, beginn, ende, einheiten, zustand: 'unterricht', leistungen: kurs.leistungen.filter((l) => l.datum === datum) };
    const f = frei.find((x) => datum >= x.von && datum <= x.bis);
    const t = termine.find((x) => freiDurchTermin(x, kurs.id, datum, beginn, ende));
    if (f) { b.zustand = 'frei'; b.grund = f.name; }
    else if (teile.every((x) => ausfaelle.has(`${kurs.id}|${x.datum}|${x.beginn}`))) { b.zustand = 'ausfall'; b.grund = 'Ausfall laut WebUntis'; }
    else if (t) { b.zustand = 'ausfall'; b.grund = t.titel; b.terminId = t.id; }
    out.push(b);
    teile = [];
  };
  for (const r of roh) {
    const letzte = teile[teile.length - 1];
    if (letzte && (letzte.datum !== r.datum || minuten(r.beginn) - minuten(letzte.ende) > 5)) abschliessen();
    if (letzte && letzte.datum === r.datum && letzte.beginn === r.beginn) continue; // doppelt (Doppelsteckung)
    teile.push(r);
  }
  abschliessen();
  return out;
}

export interface PlanBlock extends Block {
  klausur: boolean; // Klausur an diesem Tag: der Block gehört keiner Reihe
  reihe?: Reihe;
  nr?: number; // Block nr von reihe.bloecke
}

export interface ReiheStand {
  reihe: Reihe;
  von?: string; // erster Block
  bis?: string; // letzter Block
  fertig: number; // Blöcke vor heute
  fehlt: number; // Blöcke, die im Halbjahr keinen Platz mehr haben
}

/** Reihen der Reihe nach auf die freien Unterrichtsblöcke legen und alles zählen. */
export function semesterPlan(d: Daten, kurs: Kurs, hj: Halbjahr, heute: string) {
  const alle = bloecke(d, kurs, hj.von, hj.bis);
  const reihen = kurs.reihen ?? [];
  // Eine Klausur belegt den ersten Unterrichtsblock ihres Tages, weitere Blöcke am selben Tag bleiben frei
  // Auch eine Prüfung der eigenen Klasse aus WebUntis (V15) belegt den Block, wenn sie im Notenbuch noch kein Datum hat
  const untisKlausur = new Set((d.termine ?? []).filter((t) => t.quelle === 'untis' && t.art === 'pruefung' && !t.fremd && !t.ausgeblendet && t.kursIds?.includes(kurs.id)).map((t) => t.datum));
  const klausurTage = new Set<string>();
  const plan: PlanBlock[] = alle.map((b) => {
    const k = b.zustand === 'unterricht' && !klausurTage.has(b.datum) && (b.leistungen.some((l) => l.art === 'Klausur') || untisKlausur.has(b.datum));
    if (k) klausurTage.add(b.datum);
    return { ...b, klausur: k };
  });
  let ri = 0, nr = 0;
  for (const b of plan) {
    if (b.zustand !== 'unterricht' || b.klausur) continue;
    while (ri < reihen.length && nr >= reihen[ri].bloecke) { ri++; nr = 0; }
    if (ri >= reihen.length) break;
    nr++;
    b.reihe = reihen[ri];
    b.nr = nr;
  }
  const unterricht = plan.filter((b) => b.zustand === 'unterricht');
  const frei = unterricht.filter((b) => !b.klausur).length;
  const geplant = reihen.reduce((a, r) => a + r.bloecke, 0);
  const stand: ReiheStand[] = reihen.map((r) => {
    const eig = plan.filter((b) => b.reihe === r);
    return { reihe: r, von: eig[0]?.datum, bis: eig[eig.length - 1]?.datum, fertig: eig.filter((b) => b.datum < heute).length, fehlt: r.bloecke - eig.length };
  });
  return {
    bloecke: plan,
    gesamt: plan.filter((b) => b.zustand !== 'frei').length, // laut Stundenplan in der Schulzeit
    ferien: plan.filter((b) => b.zustand === 'frei').length,
    ausfall: plan.filter((b) => b.zustand === 'ausfall').length,
    unterricht: unterricht.length,
    einheiten: unterricht.reduce((a, b) => a + b.einheiten, 0),
    klausuren: unterricht.filter((b) => b.klausur).length,
    gehalten: unterricht.filter((b) => b.datum < heute).length,
    uebrig: unterricht.filter((b) => b.datum >= heute).length,
    geplant,
    puffer: frei - geplant, // > 0: Blöcke ohne Reihe, < 0: Reihen passen nicht
    naechster: unterricht.find((b) => b.datum >= heute),
    stand
  };
}

/** Der Plan-Block einer Klasse an einem Tag (für Live-Stunde und Heute), im passenden Halbjahr. */
export function blockAm(d: Daten, kurs: Kurs, datum: string, heute = datum) {
  const p = semesterPlan(d, kurs, aktuellesHalbjahr(d, datum), heute);
  return p.bloecke.find((b) => b.datum === datum && b.zustand === 'unterricht');
}

/** Nächster Unterrichtsblock ab einem Tag (auch nach Ferien), mit Reihe. */
export function naechsterBlock(d: Daten, kurs: Kurs, ab: string) {
  const hj = aktuellesHalbjahr(d, ab);
  const p = semesterPlan(d, kurs, hj, ab);
  return p.bloecke.find((b) => b.datum >= ab && b.zustand === 'unterricht');
}

export const reiheText = (b: PlanBlock | undefined) =>
  b?.klausur ? 'Klausur' : b?.reihe ? `${b.reihe.titel} · Block ${b.nr} von ${b.reihe.bloecke}` : '';
