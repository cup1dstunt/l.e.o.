// Übernahme von Klausurnoten aus EWH Korrektur (optionales Modul, docs/MODUL_AUSWERTUNG.md Abschnitt 5, Backlog N4).
// Nur die Note wandert, keine EWH-Inhalte (E4): kein Erwartungshorizont, keine Kommentare, keine Teilpunkte.
// L.E.O. liest die CSV-Dateien, die EWH heute schon schreibt. EWH muss dafür nicht geändert werden:
//  1. „Notenliste als CSV“ einer Klausur (Statistik › Weitere):
//     LokalerCode;Nachname;Vorname;Stammklasse;Klausur;Status;Teil 1…;Inhalt;…;Gesamt (NP);Note
//     Zeilen „Klausur“ und „Nachschreibeklausur“; die Nachschreibenote zählt, wenn die Hauptklausur keine hat.
//  2. „Notenübersicht Halbjahr“ als CSV (Klassenansicht): LokalerCode;Nachname;Vorname;<Titel (TT.MM.JJJJ)>…;Schnitt
//     Zellen: Punkte, „n. t.“ (nicht teilgenommen), „NS“ (Nachschreiber), „–“ (keine Bewertung).

import type { Kurs, Leistung, Schueler, Zelle } from './typen.ts';
import { npZuNote, zellSchluessel } from './rechnen.ts';

export interface EwhWert {
  code: string; // LokalerCode aus der LUSD, nur zur Anzeige (L.E.O. kennt ihn nicht)
  nachname: string;
  vorname: string;
  np: number | null; // Notenpunkte 0–15
  fehlt: boolean; // nicht teilgenommen / Nachschreiber ohne Note
  bemerkung: string; // z. B. „Nachschreibeklausur“, „Täuschungsversuch“, „noch nicht fertig“
}

export interface EwhKlausur {
  titel: string;
  datum?: string; // ISO
  werte: EwhWert[];
}

export interface EwhDatei {
  art: 'klausur' | 'halbjahr';
  klausuren: EwhKlausur[];
}

/** CSV mit Semikolon und Anführungszeichen wie EWH sie schreibt (BOM, CRLF). */
export function csvZeilen(text: string): string[][] {
  const t = text.replace(/^﻿/, '');
  const zeilen: string[][] = [];
  let feld = '';
  let zeile: string[] = [];
  let inQ = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"' && t[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQ = false;
      else feld += c;
    } else if (c === '"') inQ = true;
    else if (c === ';') { zeile.push(feld); feld = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      zeile.push(feld); feld = '';
      if (zeile.some((x) => x.trim() !== '')) zeilen.push(zeile);
      zeile = [];
    } else feld += c;
  }
  zeile.push(feld);
  if (zeile.some((x) => x.trim() !== '')) zeilen.push(zeile);
  return zeilen.map((z) => z.map((x) => x.trim()));
}

const punkte = (x: string): number | null => {
  if (!/^\d{1,2}$/.test(x)) return null;
  const n = Number(x);
  return n >= 0 && n <= 15 ? n : null;
};

/** TT.MM.JJJJ (oder TT.MM.JJ) am Ende eines Titels in Klammern. */
function titelUndDatum(kopf: string): { titel: string; datum?: string } {
  const m = kopf.match(/^(.*?)\s*\((\d{1,2})\.(\d{1,2})\.(\d{2,4})\)\s*$/);
  if (!m) return { titel: kopf };
  const j = m[4].length === 2 ? '20' + m[4] : m[4];
  return { titel: m[1], datum: `${j}-${m[3].padStart(2, '0')}-${m[2].padStart(2, '0')}` };
}

/** Liest eine EWH-CSV. Erkennt die Art am Kopf. Gibt bei fremden Dateien eine verständliche Meldung zurück. */
export function ewhLesen(text: string, dateiname = ''): EwhDatei | { fehler: string } {
  const z = csvZeilen(text);
  if (z.length < 2) return { fehler: 'Die Datei ist leer oder hat nur eine Kopfzeile.' };
  const kopf = z[0];
  const ist = (i: number, name: string) => (kopf[i] ?? '').toLowerCase() === name.toLowerCase();
  if (!ist(0, 'LokalerCode') || !ist(1, 'Nachname') || !ist(2, 'Vorname'))
    return { fehler: 'Das sieht nicht nach einer CSV aus EWH Korrektur aus (erwartet: LokalerCode;Nachname;Vorname …).' };

  if (ist(3, 'Stammklasse') && ist(4, 'Klausur') && ist(5, 'Status')) {
    const iNP = kopf.findIndex((k) => k.toLowerCase() === 'gesamt (np)');
    if (iNP < 0) return { fehler: 'In der Notenliste fehlt die Spalte „Gesamt (NP)“.' };
    const haupt = new Map<string, EwhWert>();
    const nach = new Map<string, EwhWert>();
    for (const r of z.slice(1)) {
      const status = (r[5] ?? '').toLowerCase();
      const fertig = status === 'fertig' || status === 'täuschungsversuch';
      const np = fertig ? punkte(r[iNP] ?? '') : null;
      const w: EwhWert = {
        code: r[0] ?? '', nachname: r[1] ?? '', vorname: r[2] ?? '', np,
        fehlt: status === 'nicht teilgenommen' || status === 'nachschreiber',
        bemerkung: status === 'täuschungsversuch' ? 'Täuschungsversuch' : !fertig && !(status === 'nicht teilgenommen' || status === 'nachschreiber') ? 'noch nicht fertig korrigiert' : ''
      };
      const key = w.code || `${w.nachname}|${w.vorname}`;
      ((r[4] ?? '').toLowerCase().startsWith('nachschreib') ? nach : haupt).set(key, w);
    }
    const werte: EwhWert[] = [];
    for (const [key, w] of haupt) {
      const n = nach.get(key);
      if (w.np === null && n && n.np !== null) werte.push({ ...n, fehlt: false, bemerkung: 'Nachschreibeklausur' });
      else werte.push(w);
    }
    const titel = dateiname.replace(/\.csv$/i, '').replace(/^Noten\s+/, '') || 'Klausur aus EWH';
    return { art: 'klausur', klausuren: [{ titel, werte }] };
  }

  const letzte = kopf.length - 1;
  const ende = ist(letzte, 'Schnitt') ? letzte : kopf.length;
  if (ende <= 3) return { fehler: 'In der Notenübersicht stehen keine Klausuren.' };
  const zeilen = z.slice(1).filter((r) => (r[1] ?? '') !== 'Schnitt der Klausur' && (r[1] || r[2]));
  const klausuren: EwhKlausur[] = [];
  for (let i = 3; i < ende; i++) {
    const { titel, datum } = titelUndDatum(kopf[i]);
    klausuren.push({
      titel, datum,
      werte: zeilen.map((r) => {
        const c = r[i] ?? '';
        const np = punkte(c);
        const fehlt = c === 'n. t.' || c === 'NS';
        return { code: r[0] ?? '', nachname: r[1] ?? '', vorname: r[2] ?? '', np, fehlt, bemerkung: c === 'NS' ? 'Nachschreiber' : c === 'n. t.' ? 'nicht teilgenommen' : np === null ? 'keine Bewertung' : '' };
      })
    });
  }
  return { art: 'halbjahr', klausuren };
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z]/g, '');

export interface Zuordnung {
  wert: EwhWert;
  sid: string | null; // null = nicht gefunden, die Lehrkraft wählt von Hand
  sicher: boolean; // Vor- und Nachname gleich
}

/** Ordnet die EWH-Zeilen den Schülern der Klasse zu: erst Vor- und Nachname, dann eindeutiger Nachname. Niemand doppelt. */
export function zuordnen(werte: EwhWert[], schueler: Schueler[]): Zuordnung[] {
  const vergeben = new Set<string>();
  const erg: Zuordnung[] = werte.map((wert) => {
    const s = schueler.find((x) => !vergeben.has(x.id) && norm(x.nachname) === norm(wert.nachname) && norm(x.vorname) === norm(wert.vorname));
    if (s) vergeben.add(s.id);
    return { wert, sid: s?.id ?? null, sicher: !!s };
  });
  for (const z of erg) {
    if (z.sid) continue;
    const kand = schueler.filter((x) => !vergeben.has(x.id) && norm(x.nachname) === norm(z.wert.nachname));
    if (kand.length === 1) { z.sid = kand[0].id; vergeben.add(kand[0].id); }
  }
  return erg;
}

/** Wert für die Zelle im Profil der Klasse. OSZ-Klassen bekommen die Note nach dem Leistungsspiegel (15–13 = 1 … 0 = 6). */
export function zielZelle(kurs: Pick<Kurs, 'profil'>, w: EwhWert): Zelle | null {
  if (w.np !== null) return { wert: kurs.profil === 'FOS' ? w.np : npZuNote(w.np) };
  if (w.fehlt) return { status: 'offen' }; // E oder UE klärt L.E.O. mit den Fehlzeiten bzw. die Lehrkraft (E104)
  return null;
}

export type Aenderung = 'neu' | 'gleich' | 'aendert' | 'behalten' | 'ohne';
export interface Vorschau { z: Zuordnung; neu: Zelle | null; alt?: Zelle; aenderung: Aenderung }

const anzeige = (z?: Zelle | null) => (!z ? '' : z.status ?? (z.wert !== undefined ? String(z.wert) : ''));
export { anzeige as zellText };

/** Was beim Übernehmen in eine Spalte passieren würde. Eine schon geklärte Zelle (E/UE) wird nie durch „offen“ ersetzt. */
export function vorschau(kurs: Kurs, leistungId: string | null, zuordnung: Zuordnung[]): Vorschau[] {
  return zuordnung.map((z) => {
    const neu = zielZelle(kurs, z.wert);
    const alt = leistungId && z.sid ? kurs.zellen[zellSchluessel(leistungId, z.sid)] : undefined;
    let aenderung: Aenderung;
    if (!neu || !z.sid) aenderung = 'ohne';
    else if (!alt || anzeige(alt) === '') aenderung = 'neu';
    else if (neu.status === 'offen' && (alt.status || alt.wert !== undefined)) aenderung = 'behalten';
    else if (anzeige(alt) === anzeige(neu)) aenderung = 'gleich';
    else aenderung = 'aendert';
    return { z, neu, alt, aenderung };
  });
}

/** Übernimmt die Vorschau in die Spalte. Neue Spalte, wenn leistungId fehlt. Einzelgewicht und Stern einer Zelle bleiben. */
export function uebernehmen(
  kurs: Kurs,
  ziel: { leistungId: string } | { neu: { id: string; name: string; datum?: string } },
  v: Vorschau[],
  quelle: { titel: string; geholt: string }
): { leistung: Leistung; geschrieben: number } {
  let leistung: Leistung;
  if ('leistungId' in ziel) leistung = kurs.leistungen.find((l) => l.id === ziel.leistungId)!;
  else {
    leistung = { id: ziel.neu.id, name: ziel.neu.name, gruppe: 'klausuren', art: 'Klausur', gewicht: 1, datum: ziel.neu.datum };
    kurs.leistungen.push(leistung);
  }
  leistung.ewh = quelle;
  let geschrieben = 0;
  for (const x of v) {
    if (!x.z.sid || !x.neu || (x.aenderung !== 'neu' && x.aenderung !== 'aendert')) continue;
    const key = zellSchluessel(leistung.id, x.z.sid);
    const alt = kurs.zellen[key];
    const z: Zelle = { ...x.neu };
    if (alt?.gewicht !== undefined) z.gewicht = alt.gewicht;
    if (alt?.stern) z.stern = alt.stern;
    kurs.zellen[key] = z;
    geschrieben++;
  }
  return { leistung, geschrieben };
}
