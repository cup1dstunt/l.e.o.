// Statistische Auswertung (Modul A1–A3, docs/MODUL_AUSWERTUNG.md): reine Rechenlogik, einzeln testbar.
// Alles rechnet das Gerät aus den eigenen Daten. Nichts verlässt das Gerät, Noten sieht nur die Lehrkraft (E29).
// Fehlzeiten und Verspätungen kommen hier nur als Kurzfassung vor, die Einzelheiten stehen im Reiter „Anwesenheit“.

import type { Daten, Einstellungen, Kurs, Leistung, Profil } from './typen.ts';
import { rechne, zellWert, zellSchluessel, bestanden, npZuNote, warnungen, SKALA } from './rechnen.ts';
import { fehlzeitenVon, verspaetungenVon } from './hilfen.ts';

/** Note 1–6 für den Notenspiegel. FOS-Punkte werden nach der UPZ-Tabelle umgesetzt, OSZ ganzzahlig gerundet. */
export const spiegelNote = (profil: Profil, wert: number) => (profil === 'FOS' ? npZuNote(wert) : Math.min(6, Math.max(1, Math.round(wert))));

export interface Spiegel {
  noten: number[]; // Anzahl je Note 1–6 (Index 0 = Note 1)
  werte: Record<number, string[]>; // genauer Wert (NP oder Note) → Schüler-ids
  anzahl: number;
  schnitt: number | null; // im Maß des Profils (NP bzw. Note)
  unter: number; // nicht bestanden (FOS unter 5 NP, OSZ schlechter als 4)
}

export function spiegel(profil: Profil, werte: { sid: string; wert: number }[]): Spiegel {
  const noten = [0, 0, 0, 0, 0, 0];
  const genau: Record<number, string[]> = {};
  let summe = 0;
  let unter = 0;
  for (const { sid, wert } of werte) {
    noten[spiegelNote(profil, wert) - 1]++;
    (genau[wert] ??= []).push(sid);
    summe += wert;
    if (!bestanden(profil, wert)) unter++;
  }
  return { noten, werte: genau, anzahl: werte.length, schnitt: werte.length ? summe / werte.length : null, unter };
}

export interface LeistungStat {
  leistung: Leistung;
  spiegel: Spiegel;
  E: string[];
  UE: string[];
  offen: string[];
  leer: string[];
}

/** Notenspiegel je Leistung (Klausuren, Tests, Präsentationen …). Monatsnoten der mündlichen Leistungen kommen in muendlichVerlauf. */
export function leistungsStatistik(kurs: Kurs, ids: string[]): LeistungStat[] {
  return kurs.leistungen
    .filter((l) => l.gruppe !== 'mitarbeit')
    .map((l) => {
      const st: LeistungStat = { leistung: l, spiegel: spiegel(kurs.profil, []), E: [], UE: [], offen: [], leer: [] };
      const werte: { sid: string; wert: number }[] = [];
      for (const sid of ids) {
        const z = kurs.zellen[zellSchluessel(l.id, sid)];
        if (z?.status === 'E') st.E.push(sid);
        else if (z?.status === 'offen') st.offen.push(sid);
        else if (z?.status === 'UE') st.UE.push(sid);
        else if (z?.wert === undefined) st.leer.push(sid);
        // UE zählt wie im Notenbuch als schlechtester Wert mit (zellWert)
        const w = zellWert(kurs.profil, z);
        if (w !== null) werte.push({ sid, wert: w });
      }
      st.spiegel = spiegel(kurs.profil, werte);
      return st;
    })
    .sort((a, b) => (a.leistung.datum ?? '9999').localeCompare(b.leistung.datum ?? '9999'));
}

export interface GesamtStat {
  spiegel: Spiegel; // vorläufige Gesamtnoten (FOS ganze Punkte, OSZ Schnitt)
  ohne: string[]; // noch keine Gesamtnote
  kippe: string[];
  unterIds: string[];
}

export function gesamtStatistik(kurs: Kurs, ids: string[]): GesamtStat {
  const werte: { sid: string; wert: number }[] = [];
  const ohne: string[] = [];
  const kippe: string[] = [];
  const unterIds: string[] = [];
  for (const sid of ids) {
    const e = rechne(kurs, sid);
    if (e.gesamt === null) { ohne.push(sid); continue; }
    werte.push({ sid, wert: e.gesamt });
    for (const w of warnungen(kurs, e)) {
      if (w.art === 'kippe') kippe.push(sid);
      if (w.art === 'unter') unterIds.push(sid);
    }
  }
  return { spiegel: spiegel(kurs.profil, werte), ohne, kippe, unterIds };
}

export interface MonatStat {
  monat: string; // JJJJ-MM
  eintraege: number;
  schnitt: number | null; // Ø Smiley (1 = sehr gut … 5)
  erreicht: number; // Schüler mit mindestens einem Eintrag
  verteilung: number[]; // Anzahl je Smiley 1–5
}

/** Mündliche Leistungen der Klasse je Monat: wie oft, wie gut, wie viele erreicht. */
export function muendlichVerlauf(d: Pick<Daten, 'mitarbeit'>, kurs: Kurs, ids: string[]): MonatStat[] {
  const set = new Set(ids);
  const m = new Map<string, { stufen: number[]; wer: Set<string> }>();
  for (const e of d.mitarbeit) {
    if (e.kursId !== kurs.id || !set.has(e.schuelerId)) continue;
    const k = e.zeit.slice(0, 7);
    const x = m.get(k) ?? { stufen: [], wer: new Set<string>() };
    x.stufen.push(e.stufe);
    x.wer.add(e.schuelerId);
    m.set(k, x);
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([monat, x]) => {
    const verteilung = [0, 0, 0, 0, 0];
    for (const s of x.stufen) verteilung[s - 1]++;
    return { monat, eintraege: x.stufen.length, schnitt: x.stufen.reduce((a, b) => a + b, 0) / x.stufen.length, erreicht: x.wer.size, verteilung };
  });
}

export interface AnwesenheitKurz {
  hoch: string[]; // über 30 %
  mittel: string[]; // 20 bis 30 %
  schnitt: number; // mittlere Fehlquote der Klasse
  verspaetungen: number;
  minuten: number;
}

export function anwesenheitKurz(d: Daten, kurs: Kurs, ids: string[], s: Schwellen = SCHWELLEN_STANDARD): AnwesenheitKurz {
  const r: AnwesenheitKurz = { hoch: [], mittel: [], schnitt: 0, verspaetungen: 0, minuten: 0 };
  let summe = 0;
  for (const sid of ids) {
    const fz = fehlzeitenVon(d, kurs.id, sid);
    summe += fz.quote;
    if (fz.quote > 0.3) r.hoch.push(sid);
    else if (fz.quote >= s.fehlzeitenAb / 100 - 1e-9) r.mittel.push(sid);
    const v = verspaetungenVon(d, kurs.id, sid);
    r.verspaetungen += v.length;
    r.minuten += v.reduce((a, x) => a + x.minuten, 0);
  }
  r.schnitt = ids.length ? summe / ids.length : 0;
  return r;
}

export type HinweisArt = 'abfall' | 'verstummt' | 'fehlzeiten' | 'kippe' | 'unter';
export interface Hinweis { sid: string; art: HinweisArt; text: string }

const TAG = 86_400_000;

/** Schwellen der leisen Hinweise. Die Lehrkraft kann sie in der Auswertung ändern (einstellungen.auswertung). */
export interface Schwellen {
  abfallNP: number; // FOS: letzte Note so viele Notenpunkte unter dem eigenen Schnitt davor
  abfallNote: number; // OSZ: so viele Notenstufen schlechter
  stillTage: number; // so viele Tage ohne Eintrag bei den mündlichen Leistungen
  fehlzeitenAb: number; // Fehlzeiten ab diesem Prozentwert
}
export const SCHWELLEN_STANDARD: Schwellen = { abfallNP: 3, abfallNote: 1, stillTage: 21, fehlzeitenAb: 20 };
/** Erlaubte Bereiche und Schritte für die Plus/Minus-Knöpfe. */
export const SCHWELLEN_BEREICH: Record<keyof Schwellen, { min: number; max: number; schritt: number }> = {
  abfallNP: { min: 1, max: 8, schritt: 1 },
  abfallNote: { min: 0.5, max: 3, schritt: 0.5 },
  stillTage: { min: 7, max: 60, schritt: 7 },
  fehlzeitenAb: { min: 5, max: 30, schritt: 5 }
};

/** Schwellen aus den Einstellungen, fehlende oder unsinnige Werte fallen auf den Standard zurück. */
export function schwellenVon(e: Pick<Einstellungen, 'auswertung'> | undefined): Schwellen {
  const raus = { ...SCHWELLEN_STANDARD };
  const eigen = e?.auswertung ?? {};
  for (const k of Object.keys(raus) as (keyof Schwellen)[]) {
    const w = eigen[k];
    const b = SCHWELLEN_BEREICH[k];
    if (typeof w === 'number' && Number.isFinite(w)) raus[k] = Math.min(b.max, Math.max(b.min, w));
  }
  return raus;
}

/** Eine Schwelle um einen Schritt verändern (Plus/Minus). Gibt den neuen, begrenzten Wert zurück. */
export function schwelleSchritt(s: Schwellen, k: keyof Schwellen, richtung: 1 | -1): number {
  const b = SCHWELLEN_BEREICH[k];
  return Math.min(b.max, Math.max(b.min, Math.round((s[k] + richtung * b.schritt) * 100) / 100));
}

export const istStandard = (s: Schwellen) => (Object.keys(SCHWELLEN_STANDARD) as (keyof Schwellen)[]).every((k) => s[k] === SCHWELLEN_STANDARD[k]);

/** Wer braucht einen zweiten Blick? Leise Hinweise, keine Bewertung (PLANUNG M „Mustererkennung“).
 *  Standard (einstellbar, Schwellen):
 *  - abfall: letzte Note deutlich schlechter als der eigene Schnitt davor (FOS 3 NP, OSZ 1 Note), mindestens 2 Noten davor
 *  - verstummt: früher mündliche Einträge, seit 21 Tagen keiner
 *  - fehlzeiten: ab 20 %
 *  - unter / kippe: wie die Warnampel im Notenbuch (fest) */
export function hinweise(d: Daten, kurs: Kurs, ids: string[], heute: string, s: Schwellen = SCHWELLEN_STANDARD): Hinweis[] {
  const fos = kurs.profil === 'FOS';
  const schwelle = fos ? s.abfallNP : s.abfallNote;
  const datiert = kurs.leistungen.filter((l) => l.gruppe !== 'mitarbeit' && l.datum).sort((a, b) => a.datum!.localeCompare(b.datum!));
  const raus: Hinweis[] = [];
  const zeigeNote = (x: number) => (fos ? `${Math.round(x)} NP` : x.toLocaleString('de-DE', { maximumFractionDigits: 1 }));
  for (const sid of ids) {
    const e = rechne(kurs, sid);
    for (const w of warnungen(kurs, e)) {
      if (w.art === 'unter') raus.push({ sid, art: 'unter', text: 'Gesamtnote unter der Grenze' });
      if (w.art === 'kippe') raus.push({ sid, art: 'kippe', text: 'Gesamtnote auf der Kippe' });
    }
    const reihe = datiert.map((l) => ({ l, w: zellWert(kurs.profil, kurs.zellen[zellSchluessel(l.id, sid)]) })).filter((x) => x.w !== null) as { l: Leistung; w: number }[];
    if (reihe.length >= 3) {
      const letzte = reihe[reihe.length - 1];
      const davor = reihe.slice(0, -1).reduce((a, x) => a + x.w, 0) / (reihe.length - 1);
      const schlechter = fos ? davor - letzte.w : letzte.w - davor;
      if (schlechter >= schwelle - 1e-9) raus.push({ sid, art: 'abfall', text: `${letzte.l.name}: ${zeigeNote(letzte.w)}, vorher im Schnitt ${zeigeNote(davor)}` });
    }
    const eigene = d.mitarbeit.filter((m) => m.kursId === kurs.id && m.schuelerId === sid);
    if (eigene.length) {
      const zuletzt = eigene.reduce((a, m) => (m.zeit > a ? m.zeit : a), '');
      const tage = Math.floor((Date.parse(heute + 'T12:00') - Date.parse(zuletzt.slice(0, 10) + 'T12:00')) / TAG);
      if (tage >= s.stillTage) raus.push({ sid, art: 'verstummt', text: `seit ${tage} Tagen kein Eintrag bei den mündlichen Leistungen` });
    }
    const fz = fehlzeitenVon(d, kurs.id, sid);
    if (fz.quote >= s.fehlzeitenAb / 100 - 1e-9) raus.push({ sid, art: 'fehlzeiten', text: `Fehlzeiten ${Math.round(fz.quote * 100)} %` });
  }
  return raus;
}

// ---------- Verlauf (A2): Noten der Klasse und eines Schülers über die Zeit ----------

export interface VerlaufPunkt {
  leistung: Leistung;
  klasse: number | null; // Schnitt der Klasse (UE zählt wie im Notenbuch)
  anzahl: number;
  schueler?: number | null; // Wert des gewählten Schülers
}

/** Alle datierten Leistungen (ohne Monatsnoten der mündlichen Leistungen) nach Datum, mit Klassenschnitt
 *  und, wenn `sid` gesetzt ist, dem Wert dieses Schülers. Leistungen ohne Datum stehen nicht im Verlauf. */
export function notenVerlauf(kurs: Kurs, ids: string[], sid?: string): VerlaufPunkt[] {
  return kurs.leistungen
    .filter((l) => l.gruppe !== 'mitarbeit' && l.datum)
    .sort((a, b) => a.datum!.localeCompare(b.datum!) || a.name.localeCompare(b.name))
    .map((l) => {
      const werte = ids.map((x) => zellWert(kurs.profil, kurs.zellen[zellSchluessel(l.id, x)])).filter((w): w is number => w !== null);
      const p: VerlaufPunkt = { leistung: l, klasse: werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : null, anzahl: werte.length };
      if (sid) p.schueler = zellWert(kurs.profil, kurs.zellen[zellSchluessel(l.id, sid)]);
      return p;
    });
}

/** Mündliche Leistungen eines Schülers je Monat (Ø Smiley, Anzahl), passend zu muendlichVerlauf der Klasse. */
export function muendlichSchueler(d: Pick<Daten, 'mitarbeit'>, kurs: Kurs, sid: string): { monat: string; schnitt: number; eintraege: number }[] {
  return muendlichVerlauf(d, kurs, [sid]).map((m) => ({ monat: m.monat, schnitt: m.schnitt ?? 0, eintraege: m.eintraege }));
}

/** Maßstab der Verlaufsgrafik: y-Wert 0 (schlecht, unten) bis 1 (gut, oben). FOS 0–15 NP, OSZ Note 6–1. */
export const hoeheVon = (profil: Profil, w: number) => (profil === 'FOS' ? w / 15 : (6 - w) / 5);
/** Bestehensgrenze in der Verlaufsgrafik (FOS 5 NP, OSZ Note 4). */
export const grenzeVon = (profil: Profil) => (profil === 'FOS' ? 5 : 4);

/** Hinweise je Schüler gebündelt, Schüler mit den meisten Hinweisen zuerst. */
export function hinweiseJeSchueler(h: Hinweis[]) {
  const m = new Map<string, Hinweis[]>();
  for (const x of h) m.set(x.sid, [...(m.get(x.sid) ?? []), x]);
  return [...m.entries()].map(([sid, liste]) => ({ sid, liste })).sort((a, b) => b.liste.length - a.liste.length);
}

export interface KlassenZeile {
  kurs: Kurs;
  schnitt: number | null;
  unter: number;
  kippe: number;
  ohne: number;
  hoch: number;
  muendlich: number | null; // Ø Smiley im letzten Monat mit Einträgen
  verspaetungen: number;
  leistungen: number;
}

/** Alle eigenen Klassen nebeneinander (Seite „Auswertung“). */
export function klassenVergleich(d: Daten, s: Schwellen = SCHWELLEN_STANDARD): KlassenZeile[] {
  return d.kurse.map((kurs) => {
    const ids = kurs.schueler;
    const g = gesamtStatistik(kurs, ids);
    const a = anwesenheitKurz(d, kurs, ids, s);
    const m = muendlichVerlauf(d, kurs, ids);
    return {
      kurs,
      schnitt: g.spiegel.schnitt,
      unter: g.unterIds.length,
      kippe: g.kippe.length,
      ohne: g.ohne.length,
      hoch: a.hoch.length,
      muendlich: m.length ? m[m.length - 1].schnitt : null,
      verspaetungen: a.verspaetungen,
      leistungen: kurs.leistungen.filter((l) => l.gruppe !== 'mitarbeit').length
    };
  });
}

/** Beschriftung der Notenspiegel-Spalten. FOS zeigt dazu den Punktebereich. */
export const SPIEGEL_BEREICH: Record<Profil, string[]> = {
  FOS: ['15–13', '12–10', '9–7', '6–5', '4–1', '0'],
  OSZ: ['1', '2', '3', '4', '5', '6']
};
export const einheit = (p: Profil) => SKALA[p].einheit;
