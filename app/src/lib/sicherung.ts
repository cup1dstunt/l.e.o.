// Fundament F3 (docs/FUNDAMENT.md, E102): verschlüsselte Sicherung und automatische Stände im Gerät.
// Die Sicherungsdatei enthält den verpackten Datenschlüssel (Tresor) und die verschlüsselten Daten.
// Öffnen geht mit dem Passwort, das beim Herunterladen galt, auf demselben Gerät auch ohne Nachfrage.
import * as tresorFn from './tresor.ts';
import type { Tresor, Datenschluessel, GeheimText } from './tresor.ts';
import type { Daten } from './typen.ts';

export const STAENDE = 7; // so viele automatische Tagesstände behält das Gerät
const ZWECK_DATEI = 'leo-sicherung-2';
const ZWECK_STAND = 'leo-stand-1';

export interface SicherungsDatei extends GeheimText {
  format: 'leo-sicherung';
  v: 2;
  erstellt: string;
  tresor: Tresor;
}

/** Automatischer Stand im Gerät: id = Tag (JJJJ-MM-TT) oder „vor-…“ bei Stand vor einer Wiederherstellung. */
export interface Stand extends Partial<GeheimText> {
  id: string;
  erstellt: string;
  anlass: 'taeglich' | 'vorher';
  klar?: string; // nur ohne HTTPS: unverschlüsselt (dort gibt es keine Verschlüsselung im Browser)
}

export async function dateiBauen(k: Datenschluessel, tresor: Tresor, d: Daten, jetzt = new Date()): Promise<SicherungsDatei> {
  return { format: 'leo-sicherung', v: 2, erstellt: jetzt.toISOString(), tresor, ...(await tresorFn.textVerschluesseln(k, ZWECK_DATEI, JSON.stringify(d))) };
}

export const istVerschluesselteDatei = (x: any): x is SicherungsDatei => x?.format === 'leo-sicherung' && x?.v === 2 && typeof x.geheim === 'string';

/** Öffnet eine Sicherungsdatei: erst mit dem Schlüssel dieses Geräts, sonst mit dem Passwort. null = passt nicht. */
export async function dateiOeffnen(f: SicherungsDatei, k?: Datenschluessel, passwort?: string): Promise<Daten | null> {
  if (k) {
    try { return JSON.parse(await tresorFn.textEntschluesseln(k, ZWECK_DATEI, f)); } catch { /* anderer Schlüssel */ }
  }
  if (passwort === undefined) return null;
  const roh = await tresorFn.oeffnen(f.tresor, passwort);
  if (!roh) return null;
  try { return JSON.parse(await tresorFn.textEntschluesseln(await tresorFn.schluesselAus(roh), ZWECK_DATEI, f)); } catch { return null; }
}

export async function standBauen(k: Datenschluessel | undefined, d: Daten, anlass: Stand['anlass'], jetzt = new Date()): Promise<Stand> {
  const id = anlass === 'taeglich' ? tag(jetzt) : 'vor-' + jetzt.toISOString();
  const json = JSON.stringify(d);
  return k ? { id, erstellt: jetzt.toISOString(), anlass, ...(await tresorFn.textVerschluesseln(k, ZWECK_STAND + '|' + id, json)) } : { id, erstellt: jetzt.toISOString(), anlass, klar: json };
}

/** Denselben Stand (gleiche id) mit einem anderen Schlüssel verschlüsseln. */
export async function standMitSchluessel(s: Stand, d: Daten, k: Datenschluessel): Promise<Stand> {
  return { id: s.id, erstellt: s.erstellt, anlass: s.anlass, ...(await tresorFn.textVerschluesseln(k, ZWECK_STAND + '|' + s.id, JSON.stringify(d))) };
}

export async function standOeffnen(s: Stand, k?: Datenschluessel): Promise<Daten> {
  if (s.klar) return JSON.parse(s.klar);
  if (!k || !s.geheim || !s.iv) throw new Error('Stand ist verschlüsselt, Schlüssel fehlt.');
  return JSON.parse(await tresorFn.textEntschluesseln(k, ZWECK_STAND + '|' + s.id, s as GeheimText));
}

/** Lokales Datum JJJJ-MM-TT (nicht UTC, sonst springt der Tag nachts um 1 Uhr). */
export function tag(t: Date): string {
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** Welche Stände fallen weg? Behalten werden die neuesten 7 Tagesstände und die neuesten 3 „vorher“-Stände. */
export function ueberzaehlig(staende: Pick<Stand, 'id' | 'erstellt' | 'anlass'>[]): string[] {
  const neu = [...staende].sort((a, b) => b.erstellt.localeCompare(a.erstellt));
  const t = neu.filter((s) => s.anlass === 'taeglich').slice(STAENDE);
  const v = neu.filter((s) => s.anlass === 'vorher').slice(3);
  return [...t, ...v].map((s) => s.id);
}

export interface Ueberblick {
  klassen: string[];
  schueler: number;
  noten: number;
  muendlich: number;
  fehlzeiten: number;
  notizen: number;
}

/** Kurze Vorschau eines Stands, damit man vor dem Wiederherstellen sieht, was drin ist. */
export function ueberblick(d: Daten): Ueberblick {
  return {
    klassen: d.kurse.map((k) => `${k.klasse} ${k.fach}`.trim()),
    schueler: d.schueler.length,
    noten: d.kurse.reduce((n, k) => n + Object.values(k.zellen ?? {}).filter((z) => z.wert !== undefined || z.status).length, 0),
    muendlich: d.mitarbeit.length,
    fehlzeiten: d.fehlzeiten.length,
    notizen: d.notizen.length
  };
}
