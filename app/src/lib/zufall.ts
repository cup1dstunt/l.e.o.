// Fairer Zufall (P5, E109): nur Anwesende, über mehrere Stunden, bis alle dran waren.
// Gewichtet bekommt, wer mündlich mittel oder schwächer steht oder zwischen zwei Noten liegt, mehr Lose je Runde.
import type { Kurs, MitarbeitEintrag, ZufallStand } from './typen.ts';
import { rechne } from './rechnen.ts';

export const MAX_PROTOKOLL = 400;

export function neuerStand(gewichtet = true): ZufallStand {
  return { runde: {}, rundeSeit: new Date().toISOString(), gewichtet, protokoll: [] };
}

/** Lose je Runde (1 bis 3) mit Begründung. */
export function lose(kurs: Kurs, mitarbeit: MitarbeitEintrag[], schuelerId: string): { anzahl: number; gruende: string[] } {
  const gruende: string[] = [];
  const stufen = mitarbeit.filter((e) => e.kursId === kurs.id && e.schuelerId === schuelerId).map((e) => e.stufe);
  if (!stufen.length) gruende.push('noch keine mündliche Bewertung');
  else if (stufen.reduce((a, b) => a + b, 0) / stufen.length >= 2.5) gruende.push('mündlich mittel oder schwächer');
  if (zwischenZweiNoten(kurs, schuelerId)) gruende.push('zwischen zwei Noten');
  return { anzahl: 1 + gruende.length, gruende };
}

/** Liegt die vorläufige Gesamtnote nah an der Mitte zwischen zwei Noten (Nachkomma 0,35 bis 0,65)? */
export function zwischenZweiNoten(kurs: Kurs, schuelerId: string): boolean {
  const e = rechne(kurs, schuelerId);
  const x = kurs.profil === 'FOS' ? e.gesamtExakt : e.gesamt;
  if (x === null) return false;
  const rest = x - Math.floor(x);
  return rest >= 0.35 && rest <= 0.65;
}

/** Zieht eine Person. `lose` liefert die Lose je Schüler (ungewichtet immer 1). Niemand zweimal hintereinander,
 *  solange jemand anderes noch Lose hat. Ist die Runde leer, beginnt eine neue. */
export function ziehe(stand: ZufallStand, anwesend: string[], losVon: (id: string) => number, rnd = Math.random, jetzt = new Date()): string | null {
  if (!anwesend.length) return null;
  const offen = () => anwesend.map((id) => ({ id, rest: (stand.gewichtet ? losVon(id) : 1) - (stand.runde[id] ?? 0) })).filter((x) => x.rest > 0);
  let pool = offen();
  if (!pool.length) {
    stand.runde = {};
    stand.rundeSeit = jetzt.toISOString();
    pool = offen();
  }
  const zuletzt = stand.protokoll.at(-1)?.schuelerId;
  if (pool.length > 1) pool = pool.filter((x) => x.id !== zuletzt);
  const summe = pool.reduce((a, x) => a + x.rest, 0);
  let r = rnd() * summe;
  let wahl = pool[pool.length - 1].id;
  for (const x of pool) { if ((r -= x.rest) < 0) { wahl = x.id; break; } }
  stand.runde[wahl] = (stand.runde[wahl] ?? 0) + 1;
  stand.protokoll.push({ schuelerId: wahl, zeit: jetzt.toISOString() });
  if (stand.protokoll.length > MAX_PROTOKOLL) stand.protokoll.splice(0, stand.protokoll.length - MAX_PROTOKOLL);
  return wahl;
}

/** Letzten Aufruf zurücknehmen (z. B. „passt gerade nicht“): zählt dann nicht. */
export function zuruecknehmen(stand: ZufallStand): string | null {
  const a = stand.protokoll.pop();
  if (!a) return null;
  const n = (stand.runde[a.schuelerId] ?? 0) - 1;
  if (n > 0) stand.runde[a.schuelerId] = n;
  else delete stand.runde[a.schuelerId];
  return a.schuelerId;
}

/** Wie viele der Anwesenden in dieser Runde schon dran waren. */
export function rundenStand(stand: ZufallStand, anwesend: string[]) {
  return { dran: anwesend.filter((id) => (stand.runde[id] ?? 0) > 0).length, von: anwesend.length };
}
