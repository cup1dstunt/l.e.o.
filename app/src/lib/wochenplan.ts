// Stundenplan: welcher Tag gezeigt wird und wie weit der Tag ist (Feedback 28.11.2026, E125).
// Ist der Unterricht heute vorbei (oder Wochenende), zeigt der Stundenplan den nächsten Unterrichtstag
// und die Woche, in der er liegt. Der Tagesbalken füllt sich von Beginn der ersten bis Ende der letzten Stunde.
import type { Stunde } from './typen.ts';
import { isoDatum, minuten } from './hilfen.ts';

/** Wochentag 1 = Montag … 7 = Sonntag. */
const wt = (t: Date) => ((t.getDay() + 6) % 7) + 1;

/**
 * Der Tag, den der Stundenplan zuerst zeigt: heute, solange heute noch Unterricht kommt oder läuft,
 * sonst der nächste Tag mit Stunden im Wochenmuster (höchstens 14 Tage voraus). Ohne Stunden: heute.
 */
export function bezugstag(stunden: Pick<Stunde, 'tag' | 'ende'>[], jetzt: Date): { datum: string; versetzt: boolean } {
  const min = jetzt.getHours() * 60 + jetzt.getMinutes();
  const heute = stunden.filter((s) => s.tag === wt(jetzt));
  if (heute.some((s) => minuten(s.ende) > min) || !stunden.length) return { datum: isoDatum(jetzt), versetzt: false };
  for (let i = 1; i <= 14; i++) {
    const t = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + i, 12);
    if (stunden.some((s) => s.tag === wt(t))) return { datum: isoDatum(t), versetzt: true };
  }
  return { datum: isoDatum(jetzt), versetzt: false };
}

/** Wochenversatz (0 = diese Woche) vom heutigen Tag zur Woche des Datums. */
export function wochenVersatz(jetzt: Date, datum: string): number {
  const montag = (t: Date) => { const m = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12); m.setDate(m.getDate() - (wt(m) - 1)); return m; };
  return Math.round((montag(new Date(datum + 'T12:00')).getTime() - montag(jetzt).getTime()) / (7 * 864e5));
}

export interface TagesStand { prozent: number; text: string; zustand: 'vorher' | 'laeuft' | 'vorbei' | 'frei' }

/**
 * Fortschritt eines Tages für den Balken: 0 % vor der ersten Stunde, 100 % nach der letzten,
 * dazwischen nach Uhrzeit. Vergangene Tage voll, kommende leer. Ausgefallene Stunden zählen nicht.
 */
export function tagesStand(stunden: { beginn: string; ende: string; ausfall?: boolean }[], datum: string, jetzt: Date): TagesStand {
  const echt = stunden.filter((s) => !s.ausfall);
  if (!echt.length) return { prozent: 0, text: 'kein Unterricht', zustand: 'frei' };
  const heute = isoDatum(jetzt);
  const von = Math.min(...echt.map((s) => minuten(s.beginn)));
  const bis = Math.max(...echt.map((s) => minuten(s.ende)));
  const uhr = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const spanne = `${uhr(von)}–${uhr(bis)}`;
  if (datum < heute) return { prozent: 100, text: spanne, zustand: 'vorbei' };
  if (datum > heute) return { prozent: 0, text: spanne, zustand: 'vorher' };
  const min = jetzt.getHours() * 60 + jetzt.getMinutes();
  if (min < von) return { prozent: 0, text: `ab ${uhr(von)}`, zustand: 'vorher' };
  if (min >= bis) return { prozent: 100, text: `Schluss seit ${uhr(bis)}`, zustand: 'vorbei' };
  const rest = echt.filter((s) => minuten(s.ende) > min).length;
  return { prozent: Math.round(((min - von) / (bis - von)) * 100), text: `noch ${rest} ${rest === 1 ? 'Stunde' : 'Stunden'}, bis ${uhr(bis)}`, zustand: 'laeuft' };
}
