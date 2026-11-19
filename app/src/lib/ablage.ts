// Fundament F1 (E97, docs/FUNDAMENT.md): Daten je Objektart, jeder Datensatz mit Schema-Version, Herkunft und Änderungszeit.
// Die Oberfläche arbeitet weiter mit einem Daten-Objekt; hier wird es zerlegt, verglichen und wieder zusammengesetzt.
import type { Daten } from './typen.ts';

export const SCHEMA = 1;
export const ARTEN = ['schueler', 'kurse', 'mitarbeit', 'fehlzeiten', 'verspaetungen', 'notizen', 'stundenplan', 'einstellungen'] as const;
export type Art = (typeof ARTEN)[number];

export interface Datensatz {
  id: string;
  v: number; // Schema-Version
  quelle: 'eigen' | 'untis' | 'import';
  geaendert: string; // ISO-Zeit der letzten Änderung
  pos: number; // Reihenfolge in der Liste
  daten: unknown;
}

/** Schlüssel eines Datensatzes je Art. Stundenplan-Einträge haben keine eigene id. */
export function schluessel(art: Art, x: any): string {
  if (art === 'einstellungen') return 'einstellungen';
  if (art === 'stundenplan') return `${x.kursId}|${x.tag}|${x.beginn}`;
  return String(x.id);
}

/** Zerlegt die Daten in Art → (id → JSON-Text). Der Text dient zum Vergleich und wird so gespeichert. */
export function zerlegen(d: Daten): Map<Art, Map<string, string>> {
  const out = new Map<Art, Map<string, string>>();
  for (const art of ARTEN) {
    const m = new Map<string, string>();
    const liste = art === 'einstellungen' ? [d.einstellungen] : ((d as any)[art] ?? []);
    for (const x of liste) m.set(schluessel(art, x), JSON.stringify(x));
    out.set(art, m);
  }
  return out;
}

/** Was hat sich seit dem letzten Schreiben geändert? */
export function unterschied(alt: Map<Art, Map<string, string>>, neu: Map<Art, Map<string, string>>) {
  const schreiben: { art: Art; id: string; json: string; pos: number }[] = [];
  const loeschen: { art: Art; id: string }[] = [];
  for (const art of ARTEN) {
    const a = alt.get(art) ?? new Map();
    const n = neu.get(art) ?? new Map();
    let pos = 0;
    for (const [id, json] of n) { if (a.get(id) !== json) schreiben.push({ art, id, json, pos }); pos++; }
    for (const id of a.keys()) if (!n.has(id)) loeschen.push({ art, id });
  }
  return { schreiben, loeschen };
}

export function datensatz(id: string, json: string, pos: number, jetzt = new Date()): Datensatz {
  const daten = JSON.parse(json);
  return { id, v: SCHEMA, quelle: daten?.quelle === 'untis' || daten?.untis || daten?.untisId ? 'untis' : 'eigen', geaendert: jetzt.toISOString(), pos, daten };
}

/** Setzt Datensätze wieder zu Daten zusammen, in der gespeicherten Reihenfolge. */
export function zusammensetzen(saetze: Map<Art, Datensatz[]>): Daten | undefined {
  const e = saetze.get('einstellungen')?.[0]?.daten as Daten['einstellungen'] | undefined;
  if (!e) return undefined;
  const liste = (art: Art) => [...(saetze.get(art) ?? [])].sort((a, b) => a.pos - b.pos).map((s) => s.daten) as any[];
  return {
    version: 1,
    schueler: liste('schueler'), kurse: liste('kurse'), mitarbeit: liste('mitarbeit'),
    fehlzeiten: liste('fehlzeiten'), verspaetungen: liste('verspaetungen'), notizen: liste('notizen'),
    stundenplan: liste('stundenplan'), einstellungen: e
  };
}
