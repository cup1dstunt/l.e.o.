// Fundament F4 (docs/FUNDAMENT.md, E103): Abgleich zwischen Geräten über den Dienst auf dem Unraid.
// Hier steht nur, was ohne Browser prüfbar ist: Entscheidungsregeln, Zusammenführen einer Klasse, Aufrufe an den Dienst.
// Speichern und Einspielen macht speicher.svelte.ts.
import type { GeheimSatz, Tresor } from './tresor.ts';
import type { Kurs } from './typen.ts';

/** Ein Datensatz, wie er zwischen Gerät und Dienst wandert. Inhalt immer verschlüsselt. */
export interface FernSatz {
  art: string;
  id: string;
  geaendert: string;
  geloescht?: true;
  satz?: GeheimSatz;
  rev?: number;
}

/** Was mit einem Datensatz vom Server passiert.
 *  - übernehmen: Server-Stand gilt
 *  - behalten: eigener, noch nicht gesendeter Stand ist neuer und wird gesendet
 *  - mischen: beide geändert, Klasse → Noten-Zellen einzeln zusammenführen
 *  - nichts: derselbe Stand (z. B. eigene Änderung kommt zurück) */
export function entscheiden(art: string, fern: Pick<FernSatz, 'geaendert' | 'geloescht'>, lokal: { geaendert: string; geloescht?: boolean } | undefined, ausstehend: boolean): 'uebernehmen' | 'behalten' | 'mischen' | 'nichts' {
  if (lokal && lokal.geaendert === fern.geaendert) return 'nichts';
  if (!ausstehend || !lokal) return 'uebernehmen';
  if (art === 'kurse' && !fern.geloescht && !lokal.geloescht) return 'mischen';
  return fern.geaendert > lokal.geaendert ? 'uebernehmen' : 'behalten';
}

const gleichJ = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);

/** Dreiwege-Entscheidung für einen Wert: wer ihn seit dem gemeinsamen Stand geändert hat, gewinnt; beide: der neuere. */
function wahl<T>(basis: T | undefined, lokal: T | undefined, fern: T | undefined, fernNeuer: boolean, mitBasis: boolean): T | undefined {
  if (mitBasis) {
    if (gleichJ(lokal, basis)) return fern;
    if (gleichJ(fern, basis)) return lokal;
  } else if (fern === undefined || lokal === undefined) {
    return lokal ?? fern; // ohne gemeinsamen Stand: lieber ein Eintrag zu viel als einer verloren
  }
  return fernNeuer ? fern : lokal;
}

function mischenNachSchluessel<T>(b: Record<string, T> | undefined, l: Record<string, T> = {}, f: Record<string, T> = {}, fernNeuer: boolean): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of new Set([...Object.keys(l), ...Object.keys(f), ...Object.keys(b ?? {})])) {
    const w = wahl(b?.[k], l[k], f[k], fernNeuer, !!b);
    if (w !== undefined) out[k] = w;
  }
  return out;
}

function mischenListe<T>(b: T[] | undefined, l: T[], f: T[], id: (x: T) => string, fernNeuer: boolean): T[] {
  const nb = new Map((b ?? []).map((x) => [id(x), x]));
  const nl = new Map(l.map((x) => [id(x), x]));
  const nf = new Map(f.map((x) => [id(x), x]));
  const reihe = [...(fernNeuer ? f : l), ...(fernNeuer ? l : f)].map(id);
  const out: T[] = [];
  for (const k of new Set(reihe)) {
    const w = wahl(nb.get(k), nl.get(k), nf.get(k), fernNeuer, !!b);
    if (w !== undefined) out.push(w);
  }
  return out;
}

/** Eine Klasse, auf zwei Geräten geändert: Noten-Zellen, Endnoten, Lernstoff, Leistungen und Schülerliste je Eintrag
 *  zusammenführen, übrige Felder je Feld. Mit gemeinsamem Stand (basis) gewinnt, wer etwas geändert hat; ändern beide
 *  dieselbe Zelle, gewinnt die neuere Änderung. Ohne basis gehen keine Einträge verloren (Gelöschtes kann zurückkommen). */
export function kursMischen(lokal: Kurs, fern: Kurs, fernNeuer: boolean, basis?: Kurs): Kurs {
  const out: any = {};
  const b = basis as any, l = lokal as any, f = fern as any;
  for (const k of new Set([...Object.keys(l), ...Object.keys(f)])) {
    const w = wahl(b?.[k], l[k], f[k], fernNeuer, !!b);
    if (w !== undefined) out[k] = w;
  }
  out.zellen = mischenNachSchluessel(basis?.zellen, lokal.zellen, fern.zellen, fernNeuer);
  out.endnoten = mischenNachSchluessel(basis?.endnoten, lokal.endnoten, fern.endnoten, fernNeuer);
  out.lernstoff = mischenNachSchluessel(basis?.lernstoff, lokal.lernstoff, fern.lernstoff, fernNeuer);
  out.leistungen = mischenListe(basis?.leistungen, lokal.leistungen, fern.leistungen, (x) => x.id, fernNeuer);
  out.schueler = mischenListe(basis?.schueler, lokal.schueler, fern.schueler, (x) => x, fernNeuer);
  if (lokal.einschaetzungen || fern.einschaetzungen)
    out.einschaetzungen = mischenNachSchluessel(basis?.einschaetzungen, lokal.einschaetzungen, fern.einschaetzungen, fernNeuer);
  if (lokal.selbst || fern.selbst) // Selbsteinschätzung je Monat (E116)
    out.selbst = mischenNachSchluessel(basis?.selbst, lokal.selbst, fern.selbst, fernNeuer);
  return out as Kurs;
}

// ---------- Aufrufe an den Dienst ----------
export class DienstFehler extends Error {
  status: number;
  constructor(status: number, text: string) { super(text); this.status = status; }
}

export async function rufen<T>(pfad: string, opt: { token?: string; body?: unknown; basis?: string } = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch((opt.basis ?? '') + '/abgleich/' + pfad, {
      method: opt.body === undefined ? 'GET' : 'POST',
      headers: { ...(opt.body === undefined ? {} : { 'content-type': 'application/json' }), ...(opt.token ? { authorization: 'Bearer ' + opt.token } : {}) },
      body: opt.body === undefined ? undefined : JSON.stringify(opt.body),
      cache: 'no-store'
    });
  } catch {
    throw new DienstFehler(0, 'Server nicht erreichbar (offline?)');
  }
  let j: any = {};
  try { j = await r.json(); } catch { /* keine JSON-Antwort, z. B. Dienst fehlt */ }
  if (!r.ok) throw new DienstFehler(r.status, j.fehler ?? (r.status === 404 || r.status === 502 ? 'Abgleich-Dienst auf dem Server nicht gefunden' : `Fehler ${r.status}`));
  return j as T;
}

export interface Anmeldung { token: string; tresor: Tresor; tresorRev: number; stand?: number }
export interface Aenderungen { stand: number; mehr: boolean; tresorRev: number; tresor: Tresor; saetze: FernSatz[] }
export interface Senden { stand: number; angenommen: number; abgelehnt: string[] }

/** Gerätename für die Geräteliste auf dem Server, ohne persönliche Angaben. */
export function geraetName(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): string {
  const sys = /iPad/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Gerät';
  const br = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${sys}, ${br}`;
}
