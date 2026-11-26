// Automatischer WebUntis-Abgleich (WU2): beim Entsperren, beim Zurückkehren in den Tab und alle 30 Minuten.
// Hier nur die reine Logik (wann ist er fällig, was meldet die Hinweisleiste); ohne Netz testbar.
// Ablauf im Browser: untisauto.svelte.ts. Die erste Übernahme macht die Lehrkraft immer selbst unter Mehr › WebUntis.
import type { Ergebnis } from './untisimport.ts';

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

export interface Vorher {
  fehlzeiten: number;
  offen: number;
  verspaetungen: number;
}

/** Text für die ruhige Hinweisleiste, leer wenn sich nichts geändert hat (dann sagt L.E.O. nichts). */
export function meldung(v: Vorher, e: Ergebnis): string {
  const teile: string[] = [];
  if (e.kurseNeu) teile.push(e.kurseNeu === 1 ? '1 neue Klasse' : `${e.kurseNeu} neue Klassen`);
  if (e.schuelerNeu) teile.push(e.schuelerNeu === 1 ? '1 neuer Schüler' : `${e.schuelerNeu} neue Schüler`);
  const df = e.fehlzeiten - v.fehlzeiten;
  if (df > 0) teile.push(df === 1 ? '1 Fehlzeit neu' : `${df} Fehlzeiten neu`);
  else if (df < 0 || e.offen !== v.offen) teile.push('Fehlzeiten aktualisiert');
  const dv = e.verspaetungen - v.verspaetungen;
  if (dv > 0) teile.push(dv === 1 ? '1 Verspätung neu' : `${dv} Verspätungen neu`);
  const p = e.pruefungen;
  if (p?.neu) teile.push(p.neu === 1 ? '1 Prüfung neu im Kalender' : `${p.neu} Prüfungen neu im Kalender`);
  else if (p && (p.geaendert || p.entfallen)) teile.push('Prüfungen im Kalender aktualisiert');
  if (!teile.length) return '';
  return `WebUntis: ${teile.join(', ')}${e.offen ? ` (${e.offen} offen)` : ''}`;
}
