// Echte Stunden zu festen Zeiten, Teststunde daneben (E126).
// Echte Klassen folgen nur noch dem Stundenplan: Eine Stunde gehört zu einem Datum und einer Anfangszeit,
// alles, was man darin erfasst, bekommt dieses Datum. Den Zeitbalken „ab Öffnen“ gibt es nur noch in der Teststunde,
// und die läuft immer in einer Testklasse mit erfundenen Namen, damit echte Daten sauber bleiben.
import type { Daten, Kurs } from './typen.ts';
import { isoDatum, minuten, istAusfall, istTestKurs } from './hilfen.ts';
import { beispielDaten } from './beispiel.ts';
export { istTestKurs, echterPlan };
import { echterPlan } from './hilfen.ts';

export const TEST_DAUER = 90;
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export type Art =
  | 'live' // läuft gerade
  | 'bald' // heute, beginnt noch
  | 'vorbei' // heute, schon vorbei: Erfassen geht weiter, Datum bleibt heute
  | 'nachtrag' // an einem früheren Tag: Erfasstes bekommt das Datum der Stunde
  | 'vorab' // an einem späteren Tag
  | 'test' // Teststunde: Zeitbalken ab Start, nur in Testklassen
  | 'keine'; // heute keine Stunde dieser Klasse, nichts wird erfasst

export interface Termin { datum: string; beginn: string; ende: string; ausfall: boolean }
export interface StundenZeit extends Termin {
  art: Art;
  /** Zeitbalken zeigen (nur heute) */
  balken: boolean;
  /** Letzte und nächste Stunde der Klasse, für „keine Stunde heute“ */
  letzte?: Termin;
  naechste?: Termin;
}

/** Stunden einer Klasse an einem Tag laut Plan. */
function amTag(d: Daten, kursId: string, tag: Date): Termin[] {
  const iso = isoDatum(tag);
  return d.stundenplan.filter((s) => s.kursId === kursId && s.tag === tag.getDay())
    .sort((a, b) => minuten(a.beginn) - minuten(b.beginn))
    .map((s) => ({ datum: iso, beginn: s.beginn, ende: s.ende, ausfall: istAusfall(d, s, iso) }));
}

/** Letzte gehaltene (Richtung -1) oder nächste (Richtung 1) Stunde der Klasse, höchstens 21 Tage weit, ohne Ausfälle. */
export function nachbarStunde(d: Daten, kursId: string, jetzt: Date, richtung: 1 | -1): Termin | undefined {
  const min = jetzt.getHours() * 60 + jetzt.getMinutes();
  for (let i = 0; i <= 21; i++) {
    const tag = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + i * richtung);
    let liste = amTag(d, kursId, tag).filter((t) => !t.ausfall);
    if (i === 0) liste = liste.filter((t) => (richtung === 1 ? minuten(t.beginn) > min : minuten(t.ende) <= min));
    const t = richtung === 1 ? liste[0] : liste.at(-1);
    if (t) return t;
  }
  return undefined;
}

export interface Wunsch { datum?: string | null; beginn?: string | null; test?: string | null }

/**
 * Welche Stunde öffnet sich? `wunsch` kommt aus der Adresse (?datum=…&beginn=… vom Stundenplan, ?test=<Startzeit ms>).
 * Ohne Wunsch: die laufende Stunde, sonst die heutige Stunde der Klasse, sonst „keine“.
 */
export function stundeBestimmen(d: Daten, kurs: Kurs, jetzt: Date, wunsch: Wunsch = {}): StundenZeit {
  const heute = isoDatum(jetzt);
  const min = jetzt.getHours() * 60 + jetzt.getMinutes();
  if (wunsch.test && istTestKurs(kurs)) {
    const start = new Date(Number(wunsch.test));
    const b = isNaN(start.getTime()) || isoDatum(start) !== heute ? min : start.getHours() * 60 + start.getMinutes();
    return { art: 'test', datum: heute, beginn: hhmm(b), ende: hhmm(b + TEST_DAUER), ausfall: false, balken: true };
  }
  const zeitArt = (t: Termin): Art =>
    t.datum < heute ? 'nachtrag' : t.datum > heute ? 'vorab'
      : min < minuten(t.beginn) ? 'bald' : min < minuten(t.ende) ? 'live' : 'vorbei';
  if (wunsch.datum && /^\d{4}-\d{2}-\d{2}$/.test(wunsch.datum)) {
    const tag = new Date(wunsch.datum + 'T12:00:00');
    const liste = amTag(d, kurs.id, tag);
    const t = liste.find((x) => x.beginn === wunsch.beginn) ?? liste[0];
    if (t) return { ...t, art: zeitArt(t), balken: t.datum === heute };
  }
  const liste = amTag(d, kurs.id, jetzt);
  const t = liste.find((x) => !x.ausfall && minuten(x.beginn) <= min && min < minuten(x.ende)) // läuft
    ?? liste.find((x) => !x.ausfall && minuten(x.beginn) > min) // kommt noch
    ?? liste.filter((x) => !x.ausfall).at(-1) // war heute
    ?? liste[0]; // fällt heute aus
  if (t) return { ...t, art: zeitArt(t), balken: true };
  return {
    art: 'keine', datum: heute, beginn: hhmm(min), ende: hhmm(min), ausfall: false, balken: false,
    letzte: nachbarStunde(d, kurs.id, jetzt, -1), naechste: nachbarStunde(d, kurs.id, jetzt, 1)
  };
}

/** Darf man in dieser Stunde erfassen? Bei „keine“ nicht, sonst landet es auf einem Tag ohne Unterricht. */
export const erfassbar = (z: StundenZeit) => z.art !== 'keine';

/** Zeitstempel für Einträge: heute die echte Uhrzeit, an anderen Tagen der Stundenbeginn. */
export function zeitstempel(z: Termin, jetzt = new Date()) {
  if (z.datum === isoDatum(jetzt)) return jetzt.toISOString();
  return new Date(`${z.datum}T${z.beginn}:00`).toISOString();
}

/** Unterrichtsstunden für eine Fehlzeit: 45 Minuten je Stunde, mindestens 1. */
export const stundenZahl = (z: Termin) => Math.max(1, Math.round((minuten(z.ende) - minuten(z.beginn)) / 45));

/** Kurzer Text „Fr 27.11., 08:00–09:30“. */
export function terminText(t: Termin) {
  const tag = new Date(t.datum + 'T12:00:00');
  return `${WT[tag.getDay()]} ${String(tag.getDate()).padStart(2, '0')}.${String(tag.getMonth() + 1).padStart(2, '0')}., ${t.beginn}–${t.ende}`;
}

/** Adresse einer echten Stunde (für Stundenplan, Heute, Suche). */
export const stundenAdresse = (kursId: string, t?: { datum: string; beginn: string }) =>
  t ? `/stunde/${kursId}?datum=${t.datum}&beginn=${encodeURIComponent(t.beginn)}` : `/stunde/${kursId}`;

export const TESTKLASSE_ID = 'k-test';

/**
 * Testklasse anlegen (falls nötig) und ihre Kennung liefern. Erfundene Namen aus den Beispieldaten,
 * eigene Kennungen (t0, t1, …), damit sie nie mit echten oder Beispielschülern zusammenfällt. Kein Stundenplan.
 */
export function testklasse(d: Daten): string {
  const da = d.kurse.find((k) => k.id === TESTKLASSE_ID) ?? d.kurse.find((k) => k.test) ?? d.kurse.find(istTestKurs);
  if (da) return da.id;
  const b = beispielDaten();
  const vorlage = b.kurse.find((k) => k.id === 'k-fos')!;
  const umbenennen = (s: string) => s.replace(/k-fos/g, TESTKLASSE_ID).replace(/(["':])s(\d+)"/g, '$1t$2"');
  const kurs = JSON.parse(umbenennen(JSON.stringify(vorlage))) as Kurs;
  Object.assign(kurs, { name: 'Testklasse', klasse: 'Testklasse', fach: 'Test', raum: '–', test: true, projekte: [], gruppensaetze: [], gruppenAktiv: undefined, merker: [] });
  const ids = new Set(vorlage.schueler);
  for (const s of b.schueler.filter((x) => ids.has(x.id))) {
    const neu = JSON.parse(umbenennen(JSON.stringify(s)));
    if (!d.schueler.some((x) => x.id === neu.id)) d.schueler.push(neu);
  }
  d.mitarbeit.push(...b.mitarbeit.filter((e) => e.kursId === 'k-fos').map((e) => JSON.parse(umbenennen(JSON.stringify(e)))).map((e) => ({ ...e, id: 't' + e.id })));
  d.kurse.push(kurs);
  return kurs.id;
}

/** Testklasse mit allen ihren Einträgen entfernen. Echte Klassen bleiben unberührt. */
export function testklasseEntfernen(d: Daten, kursId: string) {
  const k = d.kurse.find((x) => x.id === kursId);
  if (!k || !istTestKurs(k)) return false;
  const bleiben = new Set(d.kurse.filter((x) => x.id !== kursId).flatMap((x) => x.schueler));
  const wegS = new Set(k.schueler.filter((s) => !bleiben.has(s)));
  d.kurse = d.kurse.filter((x) => x.id !== kursId);
  d.schueler = d.schueler.filter((s) => !wegS.has(s.id));
  d.mitarbeit = d.mitarbeit.filter((e) => e.kursId !== kursId);
  d.fehlzeiten = d.fehlzeiten.filter((e) => e.kursId !== kursId);
  d.verspaetungen = d.verspaetungen.filter((e) => e.kursId !== kursId);
  d.notizen = d.notizen.filter((n) => !wegS.has(n.schuelerId));
  d.stundenplan = d.stundenplan.filter((s) => s.kursId !== kursId);
  return true;
}
