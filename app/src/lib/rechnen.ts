// Rechenkern des Notenbuchs: reine Logik ohne Oberfläche, deshalb einzeln testbar.
// Grundlage: docs/RECHENLOGIK.md, docs/UPZ_ANALYSE.md (E40, E41, E64, E65).
//
// FOS: Notenpunkte 0–15, kaufmännisch gerundet in jeder Stufe wie die UPZ-Datei (4.4).
// OSZ: Noten 1–6. Die UPZ rechnet hier mit Prozenten aus Rohpunkten. Weil im Prototyp ganze Noten
//      eingetragen werden (E65), rechnet er vereinfacht mit dem gewichteten Notenschnitt ohne
//      Zwischenrundung und schlägt am Ende die gerundete Note vor (bei ,50 entscheidet die Lehrkraft).

import type { Gruppe, Kurs, Profil, Zelle } from './typen.ts';

export const SKALA: Record<Profil, { min: number; max: number; werte: number[]; einheit: string }> = {
  FOS: { min: 0, max: 15, werte: [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0], einheit: 'NP' },
  OSZ: { min: 1, max: 6, werte: [1, 2, 3, 4, 5, 6], einheit: 'Note' }
};

/** Kaufmännisch runden wie Excel RUNDEN (x,5 → aufwärts). Kleiner Zuschlag gegen Gleitkommafehler. */
export function kaufm(x: number): number {
  return Math.floor(x + 0.5 + 1e-9);
}

export function bestanden(profil: Profil, wert: number): boolean {
  return profil === 'FOS' ? wert >= 5 - 1e-9 : wert <= 4 + 1e-9;
}

/** FOS-Notenpunkte in Note 1–6 (UPZ-Tabelle). */
export function npZuNote(np: number): number {
  const t = [6, 5, 5, 5, 5, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1];
  return t[Math.max(0, Math.min(15, Math.round(np)))];
}

/** Wert einer Zelle für die Rechnung: leer und E werden übersprungen, UE zählt als schlechtester Wert. */
export function zellWert(profil: Profil, z: Zelle | undefined): number | null {
  if (!z) return null;
  if (z.status === 'UE') return profil === 'FOS' ? 0 : 6;
  if (z.status === 'E') return null;
  return z.wert ?? null;
}

export interface Posten {
  wert: number | null;
  gewicht: number;
}

/** Gewichteter Mittelwert, leere Posten fallen samt Gewicht aus dem Nenner (E41, RECHENLOGIK 2). */
export function mittel(posten: Posten[]): number | null {
  let s = 0;
  let g = 0;
  for (const p of posten) {
    if (p.wert === null || p.gewicht <= 0) continue;
    s += p.wert * p.gewicht;
    g += p.gewicht;
  }
  return g > 0 ? s / g : null;
}

export interface Ergebnis {
  klausuren: number | null;
  sl: number | null;
  mitarbeit: number | null;
  sonstige: number | null;
  gesamt: number | null; // FOS: ganze Zeugnispunkte; OSZ: exakter Schnitt
  gesamtExakt: number | null; // ohne Zwischenrundung, nur zur Information
  vorschlag: number[]; // eine Note, bei ,50 zwei (OSZ)
  weg: string[]; // Rechenweg in Worten
  fehlend: number; // leere Zellen in diesem Halbjahr
  nachschreiben: string[]; // Leistungen mit E
}

export function zellSchluessel(leistungId: string, schuelerId: string) {
  return `${leistungId}:${schuelerId}`;
}

export function gruppenPosten(kurs: Kurs, schuelerId: string, gruppe: Gruppe): Posten[] {
  return kurs.leistungen
    .filter((l) => l.gruppe === gruppe)
    .map((l) => {
      const z = kurs.zellen[zellSchluessel(l.id, schuelerId)];
      return { wert: zellWert(kurs.profil, z), gewicht: z?.gewicht ?? l.gewicht };
    });
}

export const zahl = (x: number | null, stellen = 2) =>
  x === null ? '–' : x.toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

export function rechne(kurs: Kurs, schuelerId: string): Ergebnis {
  const fos = kurs.profil === 'FOS';
  const r = (x: number | null) => (x === null ? null : fos ? kaufm(x) : x);
  // Klausuren : AT ist fest 50 : 50 (E83), frei ist nur mündlich : Tests
  const g = { ...kurs.gewichte, klausuren: 0.5, sonstige: 0.5 };
  const weg: string[] = [];

  const kaRoh = mittel(gruppenPosten(kurs, schuelerId, 'klausuren'));
  const slRoh = mittel(gruppenPosten(kurs, schuelerId, 'sl'));
  const maRoh = mittel(gruppenPosten(kurs, schuelerId, 'mitarbeit'));
  const ka = r(kaRoh);
  const sl = r(slRoh);
  const ma = r(maRoh);

  const fmt = (roh: number | null, gerundet: number | null) =>
    roh === null ? 'leer, zählt nicht' : fos ? `${zahl(roh)} → ${gerundet}` : zahl(roh);

  weg.push(`Klausuren: ${fmt(kaRoh, ka)}`);
  weg.push(`Mündliche Leistungen: ${fmt(maRoh, ma)}`);
  weg.push(`Tests und Sonstiges: ${fmt(slRoh, sl)}`);

  const sonstRoh = mittel([
    { wert: ma, gewicht: g.mitarbeit },
    { wert: sl, gewicht: g.sl }
  ]);
  const sonstige = r(sonstRoh);
  weg.push(`AT = mündlich × ${g.mitarbeit} + Tests × ${g.sl}: ${fmt(sonstRoh, sonstige)}`);

  const gesRoh = mittel([
    { wert: ka, gewicht: g.klausuren },
    { wert: sonstige, gewicht: g.sonstige }
  ]);
  const gesamt = r(gesRoh);
  weg.push(`Gesamt = Klausuren 50 % + AT 50 %: ${fmt(gesRoh, gesamt)}`);

  // Zum Vergleich: dieselbe Rechnung ohne Zwischenrundung
  const sonstEx = mittel([
    { wert: maRoh, gewicht: g.mitarbeit },
    { wert: slRoh, gewicht: g.sl }
  ]);
  const gesamtExakt = mittel([
    { wert: kaRoh, gewicht: g.klausuren },
    { wert: sonstEx, gewicht: g.sonstige }
  ]);

  let vorschlag: number[] = [];
  if (gesamt !== null) {
    if (fos) vorschlag = [gesamt];
    else {
      const unten = Math.floor(gesamt + 1e-9);
      const genauHalb = Math.abs(gesamt - unten - 0.5) < 0.005;
      vorschlag = genauHalb ? [unten, unten + 1] : [kaufm(gesamt)];
    }
  }
  if (fos) weg.push('FOS-Profil: jede Stufe wird kaufmännisch gerundet (wie UPZ).');
  else weg.push('OSZ-Profil (vereinfacht): Notenschnitt ohne Zwischenrundung, bei ,50 entscheidest du.');

  let fehlend = 0;
  const nachschreiben: string[] = [];
  for (const l of kurs.leistungen) {
    const z = kurs.zellen[zellSchluessel(l.id, schuelerId)];
    if (!z || (z.wert === undefined && !z.status)) fehlend++;
    if (z?.status === 'E') nachschreiben.push(l.name);
  }

  return { klausuren: kaRoh, sl: slRoh, mitarbeit: maRoh, sonstige: sonstRoh, gesamt, gesamtExakt, vorschlag, weg, fehlend, nachschreiben };
}

/** Monatsnote aus Smileys vorschlagen (E68, E72): Mittel der Stufen = Note 1–5. FOS rechnet in Notenpunkte um. */
export function monatsVorschlag(profil: Profil, stufen: number[]): { note: number; wert: number } | null {
  if (stufen.length === 0) return null;
  const note = stufen.reduce((a, b) => a + b, 0) / stufen.length;
  // FOS: Note 1 → 14, 2 → 11, 3 → 8, 4 → 5, 5 → 2 (linear, Vorschlag, mit Konstantin abzustimmen)
  const wert = profil === 'FOS' ? Math.max(0, Math.min(15, kaufm(17 - 3 * note))) : kaufm(note);
  return { note, wert };
}

/** Was-wäre-wenn (I36): kleinster Wert in einer leeren Spalte, mit dem die Gesamtnote das Ziel erreicht. Speichert nichts. */
export function noetigeNote(kurs: Kurs, schuelerId: string, leistungId: string, ziel: number): number | null | 'schon' | 'unmoeglich' {
  const fos = kurs.profil === 'FOS';
  const erreicht = (x: number | null) => x !== null && (fos ? x >= ziel - 1e-9 : x <= ziel + 1e-9);
  const key = zellSchluessel(leistungId, schuelerId);
  const probe = (w: number) => {
    const k = { ...kurs, zellen: { ...kurs.zellen, [key]: { ...kurs.zellen[key], wert: w, status: undefined } } };
    const e = rechne(k, schuelerId);
    return fos ? e.gesamt : e.vorschlag.length ? Math.min(...e.vorschlag) : null;
  };
  // Reihenfolge vom schlechtesten zum besten Wert, der erste Treffer ist die nötige Note
  const werte = [...SKALA[kurs.profil].werte].reverse();
  for (const w of werte) if (erreicht(probe(w))) return w === werte[0] ? 'schon' : w;
  return 'unmoeglich';
}

export interface Warnung { art: 'unter' | 'kippe' | 'wenig' ; text: string }

/** Warnampel (I37, Q6): unter der Grenze, auf der Kippe (bis 1 Punkt bzw. 0,5 Noten darüber), zu wenige Noten. */
export function warnungen(kurs: Kurs, e: Ergebnis): Warnung[] {
  const w: Warnung[] = [];
  const x = kurs.profil === 'FOS' ? e.gesamtExakt : e.gesamt;
  if (x !== null) {
    if (!bestanden(kurs.profil, kurs.profil === 'FOS' ? (e.gesamt ?? x) : x)) w.push({ art: 'unter', text: 'unter der Grenze' });
    else if (kurs.profil === 'FOS' ? x < 6 : x > 3.5) w.push({ art: 'kippe', text: 'auf der Kippe' });
  }
  const anzahl = kurs.leistungen.filter((l) => l.gruppe !== 'mitarbeit').length;
  if (anzahl && e.fehlend > anzahl / 2) w.push({ art: 'wenig', text: 'wenige Noten' });
  return w;
}

/** Was-wäre-wenn mit mehreren angenommenen Werten und zusätzlichen Leistungen. Speichert nichts. */
export function rechneAngenommen(
  kurs: Kurs,
  schuelerId: string,
  werte: Record<string, number>,
  extra: { gruppe: Gruppe; wert: number; gewicht: number }[] = []
): Ergebnis {
  const zellen = { ...kurs.zellen };
  for (const [lid, w] of Object.entries(werte)) {
    const k = zellSchluessel(lid, schuelerId);
    zellen[k] = { ...zellen[k], wert: w, status: undefined };
  }
  const leistungen = [...kurs.leistungen];
  extra.forEach((x, i) => {
    const id = `__annahme${i}`;
    leistungen.push({ id, name: 'angenommen', art: 'Annahme', gruppe: x.gruppe, gewicht: x.gewicht });
    zellen[zellSchluessel(id, schuelerId)] = { wert: x.wert };
  });
  return rechne({ ...kurs, zellen, leistungen }, schuelerId);
}
