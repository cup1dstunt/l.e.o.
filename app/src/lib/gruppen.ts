// Gruppen bilden (P7): zufällig oder leistungsgemischt, auf Wunsch nach Geschlecht ausgewogen,
// mit „nicht zusammen“ und „gern zusammen“. Erst verteilen, dann durch Tauschen verbessern.
import type { GruppenRegeln } from './typen.ts';

export interface Mitglied {
  id: string;
  geschlecht: 'w' | 'm' | 'd';
  staerke: number | null; // 0 (schwach) … 1 (stark), null = keine Noten
}

export interface GruppenWahl {
  art: 'groesse' | 'anzahl';
  zahl: number;
  leistung: boolean; // leistungsgemischt nach Gesamtnote
  geschlecht: boolean; // nach Geschlecht ausgewogen
  regeln?: GruppenRegeln;
}

export function gruppenAnzahl(n: number, w: Pick<GruppenWahl, 'art' | 'zahl'>) {
  if (n === 0) return 0;
  const k = w.art === 'anzahl' ? w.zahl : Math.round(n / Math.max(1, w.zahl));
  return Math.min(n, Math.max(1, k));
}

/** Stärke aus der Gesamtnote: FOS 0–15 Punkte, OSZ Note 1–6 (1 = stark). */
export function staerke(profil: 'FOS' | 'OSZ', wert: number | null): number | null {
  if (wert === null) return null;
  return profil === 'FOS' ? wert / 15 : (6 - wert) / 5;
}

const paarIn = (g: string[], [a, b]: [string, string]) => g.includes(a) && g.includes(b);

/** Wie schlecht eine Einteilung ist: Konflikte zählen am meisten, dann getrennte Wünsche, dann Mischung. */
export function kosten(gruppen: string[][], m: Map<string, Mitglied>, w: GruppenWahl): number {
  let k = 0;
  const ids = gruppen.flat();
  for (const p of w.regeln?.nicht ?? []) if (gruppen.some((g) => paarIn(g, p))) k += 1000;
  for (const p of w.regeln?.gern ?? []) if (ids.includes(p[0]) && ids.includes(p[1]) && !gruppen.some((g) => paarIn(g, p))) k += 100;
  if (w.leistung) {
    const werte = ids.map((id) => m.get(id)?.staerke).filter((x): x is number => x != null);
    const mittel = werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : 0.5;
    for (const g of gruppen) {
      const s = g.map((id) => m.get(id)?.staerke ?? mittel);
      const gm = s.reduce((a, b) => a + b, 0) / (s.length || 1);
      k += 40 * (gm - mittel) ** 2 * g.length;
    }
  }
  if (w.geschlecht) {
    for (const ges of ['w', 'm'] as const) {
      const anteil = ids.filter((id) => m.get(id)?.geschlecht === ges).length / (ids.length || 1);
      for (const g of gruppen) k += 3 * Math.abs(g.filter((id) => m.get(id)?.geschlecht === ges).length - anteil * g.length);
    }
  }
  return k;
}

/** Bildet Gruppen. Größen unterscheiden sich höchstens um eins. */
export function bilden(mitglieder: Mitglied[], w: GruppenWahl, rnd = Math.random): string[][] {
  const anzahl = gruppenAnzahl(mitglieder.length, w);
  if (!anzahl) return [];
  const m = new Map(mitglieder.map((x) => [x.id, x]));
  const pool = [...mitglieder];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  if (w.leistung) pool.sort((a, b) => (b.staerke ?? 0.5) - (a.staerke ?? 0.5));
  // Schlangenreihenfolge: 1 2 3 3 2 1 …, damit jede Gruppe Starke und Schwächere bekommt
  const g: string[][] = Array.from({ length: anzahl }, () => []);
  pool.forEach((x, i) => { const runde = Math.floor(i / anzahl); const j = i % anzahl; g[runde % 2 ? anzahl - 1 - j : j].push(x.id); });
  if (anzahl < 2) return g;
  // Verbessern durch Tauschen zweier Personen aus verschiedenen Gruppen
  let k = kosten(g, m, w);
  for (let t = 0; t < 3000 && k > 0; t++) {
    const a = Math.floor(rnd() * anzahl);
    let b = Math.floor(rnd() * (anzahl - 1)); if (b >= a) b++;
    const i = Math.floor(rnd() * g[a].length), j = Math.floor(rnd() * g[b].length);
    [g[a][i], g[b][j]] = [g[b][j], g[a][i]];
    const neu = kosten(g, m, w);
    if (neu <= k) k = neu;
    else [g[a][i], g[b][j]] = [g[b][j], g[a][i]];
  }
  return g;
}

/** Welche Regeln die Einteilung verletzt (zum Anzeigen). */
export function verstoesse(gruppen: string[][], regeln?: GruppenRegeln) {
  const ids = gruppen.flat();
  return {
    nicht: (regeln?.nicht ?? []).filter((p) => gruppen.some((g) => paarIn(g, p))),
    gern: (regeln?.gern ?? []).filter((p) => ids.includes(p[0]) && ids.includes(p[1]) && !gruppen.some((g) => paarIn(g, p)))
  };
}

/** Zwei Personen tauschen (auch innerhalb derselben Gruppe harmlos). */
export function tauschen(gruppen: string[][], a: string, b: string): string[][] {
  return gruppen.map((g) => g.map((id) => (id === a ? b : id === b ? a : id)));
}

/** Regel hinzufügen oder entfernen; ein Paar steht nie gleichzeitig in beiden Listen. */
export function regelUmschalten(r: GruppenRegeln, art: 'nicht' | 'gern', a: string, b: string): GruppenRegeln {
  const gleich = (p: [string, string]) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a);
  const andere = art === 'nicht' ? 'gern' : 'nicht';
  const war = r[art].some(gleich);
  return {
    ...r,
    [art]: war ? r[art].filter((p) => !gleich(p)) : [...r[art], [a, b]],
    [andere]: r[andere].filter((p) => !gleich(p))
  } as GruppenRegeln;
}

/** Gespeicherte Gruppensätze kürzen: höchstens max ohne Projekt, Sätze eines Projekts (P9) bleiben immer. */
export function satzKuerzen<T extends { projektId?: string }>(saetze: T[], max = 12): T[] {
  let n = 0;
  return saetze.filter((s) => !!s.projektId || n++ < max);
}
