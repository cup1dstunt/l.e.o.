// Automatischer WebUntis-Abgleich (WU2): beim Entsperren, beim Zurückkehren in den Tab und alle 30 Minuten.
// Hier nur die reine Logik (wann ist er fällig, was meldet die Hinweisleiste); ohne Netz testbar.
// Ablauf im Browser: untisauto.svelte.ts. Die erste Übernahme macht die Lehrkraft immer selbst unter Mehr › WebUntis.
import type { Ergebnis } from './untisimport.ts';
import type { Fehlzeit } from './typen.ts';

export const ABSTAND_MIN = 30; // Abruf höchstens alle 30 Minuten (WEBUNTIS_ANBINDUNG.md, Abschnitt 4)
export const PAUSE_NACH_FEHLER_MIN = 10; // nach einem Fehler nicht gleich wieder versuchen

export interface AutoLage {
  an: boolean; // Einstellung „automatisch abgleichen“ (fehlt = an)
  zugangGemerkt: boolean; // Schule, Benutzer und Schlüssel liegen auf diesem Gerät
  erstUebernahme: boolean; // es gab schon eine Übernahme von Hand (Stand vorhanden)
  online: boolean;
  laeuft: boolean;
  abgerufen?: string; // ISO-Zeitpunkt des letzten erfolgreichen Abgleichs
  letzterFehler?: number; // ms-Zeitstempel des letzten fehlgeschlagenen Versuchs
}

/** Ist ein automatischer Abgleich jetzt dran? */
export function faellig(l: AutoLage, jetzt = Date.now()): boolean {
  if (!l.an || !l.zugangGemerkt || !l.erstUebernahme || !l.online || l.laeuft) return false;
  if (l.letzterFehler && jetzt - l.letzterFehler < PAUSE_NACH_FEHLER_MIN * 60_000) return false;
  const zuletzt = l.abgerufen ? Date.parse(l.abgerufen) : NaN;
  if (Number.isNaN(zuletzt)) return true;
  return jetzt - zuletzt >= ABSTAND_MIN * 60_000;
}

/**
 * Voller Abgleich (ganzes Halbjahr) höchstens einmal am Tag, sonst kurz (letzte Wochen, E119).
 * So kommen späte Statusänderungen der Klassenleitung trotzdem an, aber nicht alle 30 Minuten das ganze Halbjahr.
 */
export function abgleichArt(vollAbgerufen: string | undefined, jetzt = new Date()): 'voll' | 'kurz' {
  if (!vollAbgerufen) return 'voll';
  const v = new Date(vollAbgerufen);
  if (Number.isNaN(v.getTime())) return 'voll';
  return v.toDateString() === jetzt.toDateString() ? 'kurz' : 'voll';
}

/** ISO-Datum `tage` vor `jetzt` (lokal). */
export function tageZurueck(tage: number, jetzt = new Date()): string {
  const d = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() - tage, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface Vorher {
  fehlzeiten: number;
  offen: number;
  verspaetungen: number;
  status?: Record<string, Fehlzeit['status']>; // WebUntis-Fehlzeiten vor dem Abgleich (id → Status)
}

export const statusVorher = (f: Fehlzeit[]): Record<string, Fehlzeit['status']> =>
  Object.fromEntries(f.filter((x) => x.quelle === 'untis').map((x) => [x.id, x.status]));

/** Was die Klassenleitung seit dem letzten Abgleich entschieden hat (offen → E oder UE, auch Wechsel E ↔ UE). */
export function statusWechsel(vorher: Record<string, Fehlzeit['status']>, nachher: Fehlzeit[]): { entschuldigt: number; unentschuldigt: number } {
  let entschuldigt = 0, unentschuldigt = 0;
  for (const f of nachher) {
    if (f.quelle !== 'untis') continue;
    const alt = vorher[f.id];
    if (!alt || alt === f.status) continue;
    if (f.status === 'E') entschuldigt++;
    else if (f.status === 'UE') unentschuldigt++;
  }
  return { entschuldigt, unentschuldigt };
}

/** Text für die ruhige Hinweisleiste, leer wenn sich nichts geändert hat (dann sagt L.E.O. nichts). */
export function meldung(v: Vorher, e: Ergebnis, nachher?: Fehlzeit[]): string {
  const teile: string[] = [];
  if (e.kurseNeu) teile.push(e.kurseNeu === 1 ? '1 neue Klasse' : `${e.kurseNeu} neue Klassen`);
  if (e.schuelerNeu) teile.push(e.schuelerNeu === 1 ? '1 neuer Schüler' : `${e.schuelerNeu} neue Schüler`);
  if (e.umgezogen) teile.push(e.umgezogen === 1 ? '1 Schüler aus falscher Klasse genommen' : `${e.umgezogen} Schüler aus falscher Klasse genommen`);
  if (e.aufgeraeumt) teile.push(e.aufgeraeumt === 1 ? '1 Schüler nicht mehr zugeordnet' : `${e.aufgeraeumt} Schüler nicht mehr zugeordnet`);
  const df = e.fehlzeiten - v.fehlzeiten;
  const w = v.status && nachher ? statusWechsel(v.status, nachher) : { entschuldigt: 0, unentschuldigt: 0 };
  if (df > 0) teile.push(df === 1 ? '1 Fehlzeit neu' : `${df} Fehlzeiten neu`);
  if (w.entschuldigt) teile.push(`${w.entschuldigt} jetzt entschuldigt`);
  if (w.unentschuldigt) teile.push(`${w.unentschuldigt} jetzt unentschuldigt`);
  if (df <= 0 && !w.entschuldigt && !w.unentschuldigt && (df < 0 || e.offen !== v.offen)) teile.push('Fehlzeiten aktualisiert');
  const dv = e.verspaetungen - v.verspaetungen;
  if (dv > 0) teile.push(dv === 1 ? '1 Verspätung neu' : `${dv} Verspätungen neu`);
  const p = e.pruefungen;
  if (p?.neu) teile.push(p.neu === 1 ? '1 Prüfung neu im Kalender' : `${p.neu} Prüfungen neu im Kalender`);
  else if (p && (p.geaendert || p.entfallen)) teile.push('Prüfungen im Kalender aktualisiert');
  if (!teile.length) return '';
  return `WebUntis: ${teile.join(', ')}${e.offen ? ` (${e.offen} offen)` : ''}`;
}
