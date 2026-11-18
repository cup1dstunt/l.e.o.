// Vorlagen für Tischaufstellungen (E86). Jede Vorlage ist ein Raster; Tische lassen sich danach einzeln ein- und ausschalten.
import type { Sitzplan } from './typen.ts';

export const VORLAGEN: { id: string; name: string; spalten: number; reihen: number; tisch: (s: number, r: number) => boolean }[] = [
  { id: 'reihen', name: 'Reihen (2er-Tische)', spalten: 8, reihen: 5, tisch: (s) => s !== 2 && s !== 5 },
  { id: 'u', name: 'U-Form', spalten: 9, reihen: 6, tisch: (s, r) => (r >= 1 && (s === 0 || s === 8)) || r === 5 },
  { id: 'gruppen', name: 'Gruppentische (4er)', spalten: 8, reihen: 8, tisch: (s, r) => s % 3 !== 2 && r % 3 !== 2 },
  { id: 'doppel-u', name: 'Doppel-U', spalten: 10, reihen: 7, tisch: (s, r) => ((s === 0 || s === 9) && r >= 1) || r === 6 || ((s === 3 || s === 6) && r >= 2 && r <= 4) || (r === 4 && s >= 3 && s <= 6) },
  { id: 'leer', name: 'Eigene (leer)', spalten: 8, reihen: 6, tisch: () => false }
];

export function ausVorlage(id: string): Sitzplan {
  const v = VORLAGEN.find((x) => x.id === id) ?? VORLAGEN[0];
  const tische: boolean[] = [];
  for (let r = 0; r < v.reihen; r++) for (let s = 0; s < v.spalten; s++) tische.push(v.tisch(s, r));
  return { vorlage: v.id, spalten: v.spalten, reihen: v.reihen, tische, belegung: {} };
}

/** Schüler der Reihe nach auf freie Tische setzen (vorne zuerst). */
export function verteilen(plan: Sitzplan, schuelerIds: string[]) {
  plan.belegung = {};
  const frei = plan.tische.map((t, i) => (t ? i : -1)).filter((i) => i >= 0);
  schuelerIds.forEach((id, i) => {
    if (i < frei.length) plan.belegung[frei[i]] = id;
  });
}

/** Reihenfolge der Plätze in Lehrersicht (E91): um 180° gedreht, vorne ist unten, links und rechts aus Sicht der Lehrkraft. */
export function lehrersicht(anzahl: number): number[] {
  return Array.from({ length: anzahl }, (_, i) => anzahl - 1 - i);
}
