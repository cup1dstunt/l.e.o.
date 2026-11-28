// Import-Modul (docs/MODUL_IMPORT.md, Vorschlag V20): Klassen und Noten aus der UPZ oder einer eigenen Excel-Tabelle.
// Ein iDoceo-Import ist bewusst nicht dabei (E123): kaum jemand an der Schule nutzt iDoceo. Ein Excel-Export aus iDoceo geht trotzdem als eigene Tabelle.
// Reine Logik ohne Oberfläche, damit alles testbar ist. Oberfläche: /import.
//
// Grundsätze:
//  - Erst Vorschau, dann übernehmen. Nichts Bestehendes wird überschrieben, solange die Lehrkraft es nicht ausdrücklich einschaltet.
//  - Werte werden in die Skala der Zielklasse umgerechnet (FOS: Notenpunkte 0–15, OSZ: Noten 1–6), mit den Schlüsseln der UPZ.
//  - Zwischenergebnisse der Datei (Gesamtnote, Durchschnitte) werden nicht übernommen: L.E.O. rechnet selbst und zeigt zum Vergleich,
//    was die Datei ausgerechnet hatte.
//  - Klausuren : AT bleibt fest 50 : 50 (E83). Übernommen werden nur die Gewichte, die L.E.O. frei kennt (mündlich : Tests, Einzelgewichte).
//  - Fehlzeiten werden nicht übernommen, sie kommen aus WebUntis (E23).
//  - Nur Name und Geschlecht der Schüler. Keine Bemerkungen aus der Datei (können Persönliches enthalten).
import type { Gruppe, Kurs, Leistung, Profil, Schueler, Zelle } from './typen.ts';
import { kaufm, npZuNote, zellSchluessel } from './rechnen.ts';
import { nameNorm } from './stammdaten.ts';
import { ausVorlage } from './sitzplan.ts';
import { excelDatum, spaltenName, zelle, type Blatt, type Mappe, type Wert } from './xlsx.ts';

export type Quelle = 'upz' | 'tabelle';
export type Skala = 'np' | 'note' | 'prozent';
export type Schluessel = 'OSZ' | 'IHK' | 'FOS';

/** Ein Wert aus der Datei, noch in ihrer eigenen Skala. */
export type IWert =
  | { zahl: number; tendenz?: number } // tendenz: +1 / −1 bei „2+“ / „2-“
  | { status: 'E' | 'UE' | 'offen'; text?: string };

export interface ISchueler {
  nachname: string;
  vorname: string;
  geschlecht?: Schueler['geschlecht'];
}

export interface ISpalte {
  id: string; // stabil innerhalb der Datei, z. B. „upz-ka1“ oder „sp-E“
  titel: string; // so wie in der Datei
  name: string; // Vorschlag für die Spalte in L.E.O.
  gruppe: Gruppe | null; // null = nicht übernehmen
  art: string;
  gewicht: number;
  datum?: string;
  monat?: string;
  skala: Skala;
  prozentAlsZahl?: boolean; // Prozent als 0–100 statt 0–1 eingetragen
  werte: (IWert | null)[]; // je Schüler der Datei
  herkunft: string; // wo in der Datei, z. B. „Blatt Klassenarbeit 1“
  grund?: string; // warum vorgeschlagen bzw. nicht übernommen
}

export interface Paket {
  quelle: Quelle;
  dateiname: string;
  blatt?: string; // gelesenes Tabellenblatt (eigene Tabelle)
  klasse?: string;
  fach?: string;
  profil?: Profil;
  schluessel: Schluessel;
  halbjahr?: string; // z. B. „1. Hj. 2025/26“
  schueler: ISchueler[];
  spalten: ISpalte[];
  gewichte?: { mitarbeit: number; sl: number };
  namenEinspaltig?: boolean; // Vor- und Nachname in einer Spalte ohne Komma: Reihenfolge geraten, umstellbar
  zeugnis?: (number | null)[]; // Zeugnisnote bzw. -punkte, die die Datei ausgerechnet hatte (nur zum Vergleich)
  hinweise: string[];
}

// ---------- Notenschlüssel (UPZ 10.1, Blatt Einstellungen; docs/UPZ_ANALYSE.md 2) ----------

const SCHLUESSEL: Record<'OSZ' | 'IHK', number[]> = {
  OSZ: [0, 0.09, 0.45, 0.55, 0.7, 0.85], // → Note 6, 5, 4, 3, 2, 1
  IHK: [0, 0.3, 0.5, 0.67, 0.81, 0.92]
};
const FOS_AB = [0, 0.09, 0.18, 0.27, 0.36, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]; // → 0 … 15 Punkte

/** Abrunden auf zwei Nachkommastellen wie ABRUNDEN(x;2) in der UPZ, mit Zuschlag gegen Gleitkommafehler. */
export const abrunden2 = (x: number) => Math.floor(x * 100 + 1e-7) / 100;

/** Anteil 0–1 → Notenpunkte nach FOS-Schlüssel. */
export function prozentZuNp(anteil: number): number {
  const p = abrunden2(anteil);
  let np = 0;
  for (let i = 0; i < FOS_AB.length; i++) if (p >= FOS_AB[i] - 1e-9) np = i;
  return np;
}

/** Anteil 0–1 → Note 1–6 nach OSZ- bzw. IHK-Schlüssel. */
export function prozentZuNote(anteil: number, s: 'OSZ' | 'IHK' = 'OSZ'): number {
  const p = abrunden2(anteil);
  let i = 0;
  for (let k = 0; k < 6; k++) if (p >= SCHLUESSEL[s][k] - 1e-9) i = k;
  return 6 - i;
}

/** Note mit Tendenz → Notenpunkte (1+ = 15, 1 = 14, 1− = 13 … 5− = 1, 6 = 0). Dezimalnoten werden gerundet. */
export function noteZuNp(note: number, tendenz = 0): number {
  if (note >= 6 - 1e-9) return 0;
  return Math.max(0, Math.min(15, kaufm(17 - 3 * note) + tendenz));
}

/** Wert aus der Datei → Zelle in der Skala der Zielklasse. */
export function umrechnen(w: IWert | null, spalte: Pick<ISpalte, 'skala' | 'prozentAlsZahl'>, profil: Profil, schluessel: Schluessel): Zelle | null {
  if (!w) return null;
  if ('status' in w) return { status: w.status };
  const fos = profil === 'FOS';
  const z = w.zahl;
  if (spalte.skala === 'prozent') {
    const anteil = Math.max(0, spalte.prozentAlsZahl ? z / 100 : z);
    return { wert: fos ? prozentZuNp(anteil) : prozentZuNote(anteil, schluessel === 'IHK' ? 'IHK' : 'OSZ') };
  }
  if (spalte.skala === 'np') {
    const np = Math.max(0, Math.min(15, kaufm(z)));
    return { wert: fos ? np : npZuNote(np) };
  }
  // Note 1–6
  const note = Math.max(1, Math.min(6, z));
  return { wert: fos ? noteZuNp(note, w.tendenz ?? 0) : Math.max(1, Math.min(6, kaufm(note))) };
}

// ---------- Werte aus Zellen ----------

const zahlAus = (v: Wert | undefined): number | null => {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
};
const textAus = (v: Wert | undefined) => (v === undefined || typeof v === 'boolean' ? '' : String(v).trim());

/** Eine Zelle einer eigenen Tabelle deuten. „text“ = nicht lesbar (z. B. Smiley, Kommentar). */
export function wertLesen(v: Wert | undefined): (IWert & { prozent?: boolean }) | null | 'text' {
  if (v === undefined || v === '') return null;
  if (typeof v === 'number') return { zahl: v };
  if (typeof v === 'boolean') return 'text';
  const s = v.trim();
  if (/^(\.|-|–|—|\/|x|n\.?\s?b\.?)$/i.test(s)) return null; // nicht bewertet
  if (/^(ue|u\.?e\.?|unentschuldigt|unent\.?)$/i.test(s)) return { status: 'UE' };
  if (/^(e|ent\.?|entschuldigt|krank|k|attest)$/i.test(s)) return { status: 'E', text: s };
  if (/^(fehlt|gefehlt|abw\.?|abwesend|n\.?\s?t\.?|nicht teilgenommen|ns)$/i.test(s)) return { status: 'offen', text: s };
  let m = /^(\d+(?:[.,]\d+)?)\s*%$/.exec(s);
  if (m) return { zahl: Number(m[1].replace(',', '.')), prozent: true };
  m = /^([1-6])\s*([+-])$/.exec(s);
  if (m) return { zahl: Number(m[1]), tendenz: m[2] === '+' ? 1 : -1 };
  const n = zahlAus(s);
  return n === null ? 'text' : { zahl: n };
}

// ---------- UPZ ----------

/** Ist das eine UPZ-Datei (Notenorganisation der Schule)? */
export function istUpz(m: Mappe): boolean {
  const namen = new Set(m.blaetter.map((b) => b.name));
  return namen.has('Einstellungen') && namen.has('Namen') && (namen.has('Zeugnis') || namen.has('Zeugnis (FOS)'));
}

const sauber = (t: string) => t.replace(/\s+/g, ' ').replace(/(\p{Ll})-\s?(\p{Ll})/gu, '$1$2').replace(/:$/, '').trim();

function datumAus(v: Wert | undefined): string | undefined {
  if (typeof v === 'number' && v > 20000 && v < 80000) return excelDatum(v);
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/.exec(textAus(v));
  if (!m) return undefined;
  const j = m[3].length === 2 ? '20' + m[3] : m[3];
  return `${j}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const SPALTEN_TEIL = Array.from({ length: 16 }, (_, i) => spaltenName(3 + i)); // C … R: Teilpunkte je Aufgabe

/**
 * Ein Arbeitsblatt der UPZ (Klassenarbeit, Klausur, SL) lesen. L.E.O. rechnet die Prozente selbst aus den Teilpunkten
 * (wie die Datei: Summe ÷ Höchstpunktzahl, abgerundet auf zwei Stellen), damit es auch ohne gespeicherte Formelwerte geht.
 * Status wie in der Datei: „ue“ in Spalte W = 0 %, Text in „Bem.“ (Spalte X) = übersprungen, „.“ = noch nicht bewertet.
 */
function upzArbeit(b: Blatt, zeilen: number[]): { werte: (IWert | null)[]; benutzt: boolean; max: number } {
  const max = SPALTEN_TEIL.reduce((s, c) => s + (zahlAus(zelle(b, c + 4)) ?? 0), 0);
  let benutzt = false;
  const werte = zeilen.map((r): IWert | null => {
    const z = r + 2;
    if (/^ue$/i.test(textAus(zelle(b, 'W' + z)))) { benutzt = true; return { status: 'UE' }; }
    const bem = textAus(zelle(b, 'X' + z));
    if (bem === '.') return null;
    if (bem) { benutzt = true; return { status: 'E', text: bem }; }
    const punkte = SPALTEN_TEIL.map((c) => zahlAus(zelle(b, c + z))).filter((x): x is number => x !== null);
    if (!punkte.length || max <= 0) return null;
    benutzt = true;
    return { zahl: abrunden2(punkte.reduce((a, x) => a + x, 0) / max) };
  });
  return { werte, benutzt, max };
}

/** UPZ-Datei lesen: Einstellungen, Namen, Klassenarbeiten/Klausuren, SL 1–4, freie SL-Spalten, mündliche Mitarbeit. */
export function upzLesen(m: Mappe, dateiname: string): Paket {
  const blatt = (n: string) => m.blaetter.find((b) => b.name === n);
  const E = blatt('Einstellungen');
  const N = blatt('Namen')!;
  const art = zahlAus(zelle(E, 'D10'));
  const fos = art === 3;
  const schluessel: Schluessel = fos ? 'FOS' : art === 2 ? 'IHK' : 'OSZ';
  const hinweise: string[] = [];
  if (art !== 1 && art !== 2 && art !== 3) hinweise.push('In den Einstellungen der Datei ist keine Klassenart gewählt. L.E.O. nimmt den OSZ-Schlüssel (Noten 1–6).');
  if (art === 2) hinweise.push('Die Datei nutzt den IHK-Schlüssel. Die Prozente werden damit in Noten umgerechnet.');
  const jahr = zahlAus(zelle(E, 'D21'));
  const hj = zahlAus(zelle(E, 'D22'));

  // Schüler: Blatt „Namen“, Zeilen 3–32. Die Zeile bestimmt die Zeile in allen anderen Blättern.
  const schueler: ISchueler[] = [];
  const zeilen: number[] = [];
  for (let r = 3; r <= 32; r++) {
    const nach = textAus(zelle(N, 'B' + r));
    if (!nach) continue;
    const g = textAus(zelle(N, 'D' + r)).toLowerCase();
    schueler.push({ nachname: nach, vorname: textAus(zelle(N, 'C' + r)), geschlecht: g === 'w' ? 'w' : g === 'm' ? 'm' : undefined });
    zeilen.push(r);
  }
  const Z = blatt(fos ? 'Zeugnis (FOS)' : 'Zeugnis');
  const S = blatt(fos ? 'SL zus. (FOS)' : 'SL zus.');
  const spalten: ISpalte[] = [];

  // Klassenarbeiten bzw. Klausuren 1–3, Gewichte aus dem Zeugnisblatt
  const kaGewicht = fos ? ['C4', 'J4', 'Q4'] : ['C4', 'I4', 'O4'];
  for (let k = 1; k <= 3; k++) {
    const name = fos ? `Klausur ${k}` : `Klassenarbeit ${k}`;
    const b = blatt(name);
    if (!b) continue;
    const a = upzArbeit(b, zeilen);
    if (!a.benutzt) continue;
    spalten.push({
      id: `upz-ka${k}`, titel: name, name: `Klausur ${k}`, gruppe: 'klausuren', art: 'Klausur',
      gewicht: zahlAus(zelle(Z, kaGewicht[k - 1])) ?? (k === 3 ? 0 : 0.5), datum: datumAus(zelle(b, 'Y1')),
      skala: 'prozent', werte: a.werte, herkunft: `Blatt „${name}“, Höchstpunktzahl ${String(a.max).replace('.', ',')}`
    });
  }

  // Sonstige Leistungen 1–4 (eigene Blätter) und 5–10 (Prozentspalten in „SL zus.“), Gewichte aus „SL zus.“ Zeile 4
  const slGewicht = ['C4', 'I4', 'O4', 'U4'];
  const namen = new Map<string, number>();
  const eindeutig = (n: string) => { const c = (namen.get(n) ?? 0) + 1; namen.set(n, c); return c === 1 ? n : `${n} ${c}`; };
  const artVon = (t: string) => (/test|lzk|kontrolle|vokabel/i.test(t) ? 'Test' : /referat|präsent|vortrag/i.test(t) ? 'Präsentation' : /hausaufgabe|hefter|abgabe|mappe/i.test(t) ? 'Abgabe' : 'Sonstige');
  for (let k = 1; k <= 4; k++) {
    const n = fos ? `SL ${k} (FOS)` : `SL ${k}`;
    const b = blatt(n);
    if (!b) continue;
    const a = upzArbeit(b, zeilen);
    if (!a.benutzt) continue;
    const titel = sauber(textAus(zelle(b, 'P1'))) || `SL ${k}`;
    spalten.push({
      id: `upz-sl${k}`, titel: `SL ${k}: ${titel}`, name: eindeutig(titel), gruppe: 'sl', art: artVon(titel),
      gewicht: zahlAus(zelle(S, slGewicht[k - 1])) ?? 0, datum: datumAus(zelle(b, 'Y1')),
      skala: 'prozent', werte: a.werte, herkunft: `Blatt „${n}“, Höchstpunktzahl ${String(a.max).replace('.', ',')}`
    });
  }
  const frei = ['AA', 'AG', 'AM', 'AS', 'AY', 'BE'];
  frei.forEach((c, i) => {
    if (!S) return;
    const nr = adresseSpalte(c);
    const titel = sauber(textAus(zelle(S, spaltenName(nr + 1) + 3))) || `SL ${i + 5}`;
    const bSp = spaltenName(nr + 3);
    let benutzt = false;
    const werte = zeilen.map((r): IWert | null => {
      const z = r + 3;
      if (/^ue$/i.test(textAus(zelle(S, bSp + z)))) { benutzt = true; return { status: 'UE' }; }
      const p = zahlAus(zelle(S, c + z));
      if (p === null) return null;
      benutzt = true;
      return { zahl: p };
    });
    if (!benutzt) return;
    spalten.push({
      id: `upz-sl${i + 5}`, titel: `SL ${i + 5}: ${titel}`, name: eindeutig(titel), gruppe: 'sl', art: artVon(titel),
      gewicht: zahlAus(zelle(S, c + 4)) ?? 0, skala: 'prozent', prozentAlsZahl: werte.some((w) => w && 'zahl' in w && w.zahl > 1.5),
      werte, herkunft: `Blatt „${S.name}“, Spalte ${c}`
    });
  });

  // Mündliche Mitarbeit: ein Prozentwert je Schüler im Zeugnisblatt
  const mdl = fos ? 'AJ' : 'AC';
  const mWerte = zeilen.map((r): IWert | null => { const p = zahlAus(zelle(Z, mdl + (r + 3))); return p === null ? null : { zahl: p }; });
  if (mWerte.some(Boolean)) {
    spalten.push({
      id: 'upz-mdl', titel: 'mdl. Mitarbeit', name: 'Mündlich (aus UPZ)', gruppe: 'mitarbeit', art: 'Halbjahresnote', gewicht: 1,
      skala: 'prozent', prozentAlsZahl: mWerte.some((w) => w && 'zahl' in w && w.zahl > 1.5), werte: mWerte,
      herkunft: `Blatt „${Z?.name}“, Spalte ${mdl}`, grund: 'In der UPZ ist mündlich ein Wert fürs Halbjahr. In L.E.O. kommen Monatsnoten dazu.'
    });
  }

  // Gewichte übrige SL : mündlich und Klausuren : SL
  const gSl = zahlAus(zelle(Z, fos ? 'AD4' : 'X4'));
  const gMdl = zahlAus(zelle(Z, fos ? 'AJ4' : 'AC4'));
  const gewichte = gSl !== null && gMdl !== null && gSl + gMdl > 0 ? { sl: gSl, mitarbeit: gMdl } : undefined;
  const gKa = zahlAus(zelle(Z, fos ? 'AA5' : 'W5'));
  if (gKa !== null && Math.abs(gKa - 0.5) > 1e-6)
    hinweise.push(`In der Datei zählen die Klausuren ${Math.round(gKa * 100)} %. In L.E.O. ist das fest 50 : 50 (Schulvorgabe), das bleibt so.`);
  if (spalten.some((s) => s.gruppe === 'sl' && s.gewicht === 0))
    hinweise.push('Einige sonstige Leistungen haben in der Datei das Gewicht 0. Sie werden übernommen, zählen aber nicht, bis du ein Gewicht einträgst.');

  // Zeugnisnote der Datei zum Vergleich (nur gespeicherte Werte, auch von Hand überschriebene)
  const zSp = fos ? 'BB' : 'AS';
  const zeugnis = zeilen.map((r) => zahlAus(zelle(Z, zSp + (r + 3))));
  const vorher = fos ? ['AV', 'AW', 'AX', 'AY', 'AZ'] : ['AM', 'AN', 'AO', 'AP', 'AQ'];
  if (zeilen.some((r) => vorher.some((c) => zahlAus(zelle(Z, c + (r + 3))) !== null)))
    hinweise.push('Die Noten früherer Halbjahre aus der Datei übernimmt L.E.O. noch nicht. Sie bleiben in der Datei.');
  hinweise.push('Fehlzeiten übernimmt L.E.O. nicht aus der Datei, sie kommen aus WebUntis.');

  return {
    quelle: 'upz', dateiname,
    klasse: textAus(zelle(E, 'D7')) || undefined, fach: textAus(zelle(E, 'D8')) || undefined,
    profil: fos ? 'FOS' : 'OSZ', schluessel,
    halbjahr: hj && jahr ? `${hj}. Hj. ${jahr}/${String(jahr + 1).slice(2)}` : undefined,
    schueler, spalten, gewichte, zeugnis: zeugnis.some((x) => x !== null) ? zeugnis : undefined, hinweise
  };
}

function adresseSpalte(c: string) {
  let s = 0;
  for (const x of c) s = s * 26 + (x.charCodeAt(0) - 64);
  return s;
}

// ---------- Eigene Tabelle ----------

const kopfNorm = (k: string) => nameNorm(k).replace(/[^a-z0-9 ]/g, '').trim();
const NACHNAME = /^(nachname|familienname|name|schueler(in)?|schuelername|schueler innen|lernende|apellidos?|surname|last ?name|student)$/;
const VORNAME = /^(vorname|rufname|nombre|first ?name|given ?name)$/;
const SUMMENZEILE = /^(durchschnitt|mittelwert|schnitt|klassenschnitt|summe|anzahl|media|average|max|min|o|notenspiegel)\b/;
// Spalten, die in der Datei aus anderen Spalten berechnet werden (Gesamtnote, Durchschnitte, Gruppensummen): L.E.O. rechnet selbst
const ERGEBNIS = /^(gesamt|gesamtnote|endnote|zeugnis|zeugnisnote|halbjahresnote|schnitt|durchschnitt|o|summe|klausuren|klassenarbeiten|sonstige leistungen|sonstige|tests und sonstiges|tests sonstiges|mitarbeit|muendlich|muendliche leistungen|at|sl|note|noten|abitur|abiturpruefung|gesamtnote \d+ halbjahr|\d+ halbjahr|vorhalbjahr)$/;
const FEHLZEIT = /(fehlzeit|fehlstunde|fehltag|anwesenheit|verspaet|abwesen)/;
const MONATE = ['jan', 'feb', 'maer', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dez'];

export interface TabellenOptionen {
  nachnameZuerst?: boolean; // eine Namensspalte ohne Komma: „Müller Anna“ statt „Anna Müller“
  schuljahr?: number; // Startjahr des Schuljahres, für Monatsnoten
}

/** Spaltentitel deuten: Gruppe, Art, Gewicht („Test 2 (50 %)“), Datum, Monat. */
export function titelDeuten(titel: string, schuljahr: number): Pick<ISpalte, 'name' | 'gruppe' | 'art' | 'gewicht' | 'datum' | 'monat' | 'grund'> {
  let name = titel.replace(/\s+/g, ' ').trim();
  let gewicht = 1;
  const g = /\(?\s*(\d{1,3}(?:[.,]\d+)?)\s*%\s*\)?/.exec(name);
  if (g) { gewicht = Number(g[1].replace(',', '.')) / 100; name = name.replace(g[0], '').trim(); }
  const datum = datumAus(name);
  if (datum) name = name.replace(/,?\s*\(?\d{1,2}\.\d{1,2}\.\d{2,4}\)?/, '').trim();
  const n = kopfNorm(name);
  if (FEHLZEIT.test(n) && !/test/.test(n)) return { name, gruppe: null, art: '', gewicht, datum, grund: 'Fehlzeiten kommen aus WebUntis.' };
  if (ERGEBNIS.test(n)) return { name, gruppe: null, art: '', gewicht, datum, grund: 'Zwischenergebnis der Datei. L.E.O. rechnet es selbst.' };
  const mi = MONATE.findIndex((m) => n === m || (n.startsWith(m) && /^[a-z]{3,9}( \d{2,4})?$/.test(n) && n.length <= 13));
  if (mi >= 0 && !/\d/.test(n.replace(/ \d{2,4}$/, ''))) {
    const jahr = /(\d{2,4})$/.exec(n)?.[1];
    const j = jahr ? Number(jahr.length === 2 ? '20' + jahr : jahr) : mi >= 7 ? schuljahr : schuljahr + 1;
    return { name, gruppe: 'mitarbeit', art: 'Monatsnote', gewicht, datum, monat: `${j}-${String(mi + 1).padStart(2, '0')}` };
  }
  if (/(klausur|klassenarbeit|\bka\b|schulaufgabe|kursarbeit|pruefungsarbeit|exam)/.test(n)) return { name, gruppe: 'klausuren', art: 'Klausur', gewicht, datum };
  if (/(muendlich|mitarbeit|beteiligung|epo|unterrichtsbeitr)/.test(n)) return { name, gruppe: 'mitarbeit', art: 'Mündlich', gewicht, datum };
  const art = /(test|lzk|kontrolle|vokabel|quiz)/.test(n) ? 'Test' : /(praesent|referat|vortrag|pitch)/.test(n) ? 'Präsentation' : /(abgabe|hausaufgabe|portfolio|hefter|mappe|projekt)/.test(n) ? 'Abgabe' : 'Sonstige';
  return { name, gruppe: 'sl', art, gewicht, datum };
}

/** Skala einer Spalte aus ihren Zahlen schätzen. „unsicher“: nur ganze Zahlen 1–6, die Lehrkraft prüft. */
export function skalaSchaetzen(zahlen: { zahl: number; tendenz?: number; prozent?: boolean }[], titel = ''): { skala: Skala; prozentAlsZahl?: boolean; unsicher?: boolean } {
  const t = kopfNorm(titel);
  if (zahlen.some((z) => z.prozent) || /(prozent|%)/.test(titel.toLowerCase())) return { skala: 'prozent', prozentAlsZahl: zahlen.some((z) => z.zahl > 1.5) };
  const max = Math.max(...zahlen.map((z) => z.zahl));
  const min = Math.min(...zahlen.map((z) => z.zahl));
  if (max > 15) return { skala: 'prozent', prozentAlsZahl: true };
  if (max <= 1 && zahlen.some((z) => !Number.isInteger(z.zahl))) return { skala: 'prozent' };
  if (zahlen.some((z) => z.tendenz)) return { skala: 'note' };
  if (/(punkte|np|notenpunkte)/.test(t)) return { skala: 'np' };
  if (max > 6 || min < 1) return { skala: 'np' };
  if (/(note|zensur)/.test(t) || zahlen.some((z) => !Number.isInteger(z.zahl))) return { skala: 'note' };
  return { skala: 'note', unsicher: true };
}

/** Kopfzeile finden: erste Zeile (bis 15) mit einem Namensfeld, sonst die erste Zeile mit Inhalt. */
function kopfZeile(b: Blatt): number {
  for (let r = 1; r <= Math.min(15, b.zeilen); r++)
    for (let c = 1; c <= b.spalten; c++) {
      const k = kopfNorm(textAus(zelle(b, spaltenName(c) + r)));
      if (NACHNAME.test(k) || VORNAME.test(k)) return r;
    }
  for (let r = 1; r <= b.zeilen; r++) for (let c = 1; c <= b.spalten; c++) if (zelle(b, spaltenName(c) + r) !== undefined) return r;
  return 1;
}

/** Ein Tabellenblatt einer eigenen Excel-Datei lesen. */
export function tabelleLesen(b: Blatt, dateiname: string, opt: TabellenOptionen = {}): Paket {
  const heute = new Date();
  const schuljahr = opt.schuljahr ?? (heute.getMonth() >= 7 ? heute.getFullYear() : heute.getFullYear() - 1);
  const kz = kopfZeile(b);
  const kopf = (c: number) => {
    const v = zelle(b, spaltenName(c) + kz);
    return typeof v === 'number' && v > 20000 && v < 80000 ? excelDatum(v).split('-').reverse().join('.') : textAus(v);
  };
  let cNach = 0, cVor = 0;
  for (let c = 1; c <= b.spalten; c++) {
    const k = kopfNorm(kopf(c));
    if (!cVor && VORNAME.test(k)) cVor = c;
    else if (!cNach && NACHNAME.test(k)) cNach = c;
  }
  const hinweise: string[] = [];
  if (!cNach && !cVor) {
    // Keine Namensspalte erkannt: erste Spalte mit Text in den Zeilen darunter
    for (let c = 1; c <= b.spalten && !cNach; c++)
      for (let r = kz + 1; r <= Math.min(b.zeilen, kz + 5); r++) if (wertLesen(zelle(b, spaltenName(c) + r)) === 'text') { cNach = c; break; }
    hinweise.push('Keine Spalte „Name“ gefunden. L.E.O. nimmt die erste Spalte mit Text als Namen. Bitte in der Vorschau prüfen.');
  }
  if (!cNach) { cNach = cVor; cVor = 0; }

  const schueler: ISchueler[] = [];
  const zeilen: number[] = [];
  let einspaltig = false;
  for (let r = kz + 1; r <= b.zeilen; r++) {
    const roh = textAus(zelle(b, spaltenName(cNach) + r));
    if (!roh || SUMMENZEILE.test(kopfNorm(roh)) || zahlAus(roh) !== null) continue;
    let nachname = roh, vorname = cVor ? textAus(zelle(b, spaltenName(cVor) + r)) : '';
    if (!cVor) {
      if (roh.includes(',')) [nachname, vorname] = roh.split(',', 2).map((x) => x.trim());
      else {
        const teile = roh.split(/\s+/);
        if (teile.length > 1) {
          einspaltig = true;
          if (opt.nachnameZuerst) { nachname = teile[0]; vorname = teile.slice(1).join(' '); }
          else { nachname = teile[teile.length - 1]; vorname = teile.slice(0, -1).join(' '); }
        }
      }
    }
    schueler.push({ nachname, vorname });
    zeilen.push(r);
  }

  const spalten: ISpalte[] = [];
  let ohneZahlen = 0;
  for (let c = 1; c <= b.spalten; c++) {
    if (c === cNach || c === cVor) continue;
    const titel = kopf(c);
    const k = kopfNorm(titel);
    if (/^(nr|nummer|n|lfd nr|id|geschlecht|geburtsdatum|alter|klasse|mail|email|e mail|bemerkung|notiz|kommentar|anmerkung)$/.test(k)) continue;
    const roh = zeilen.map((r) => wertLesen(zelle(b, spaltenName(c) + r)));
    const zahlen = roh.filter((w): w is { zahl: number; tendenz?: number; prozent?: boolean } => !!w && w !== 'text' && 'zahl' in w);
    if (!zahlen.length) { if (titel) ohneZahlen++; continue; }
    const d = titelDeuten(titel || `Spalte ${spaltenName(c)}`, schuljahr);
    const sk = skalaSchaetzen(zahlen, d.name);
    const text = roh.filter((w) => w === 'text').length;
    spalten.push({
      id: `sp-${spaltenName(c)}`, titel: titel || `Spalte ${spaltenName(c)}`, ...d, skala: sk.skala, prozentAlsZahl: sk.prozentAlsZahl,
      werte: roh.map((w) => (w === 'text' || w === null ? null : 'zahl' in w && w.prozent !== undefined ? { zahl: w.zahl } : w)),
      herkunft: `Spalte ${spaltenName(c)}${text ? `, ${text} Einträge ohne Zahl übergangen` : ''}`,
      grund: d.grund ?? (sk.unsicher ? 'Nur ganze Zahlen von 1 bis 6: als Noten gelesen. Wenn es Punkte sind, umstellen.' : undefined)
    });
  }
  if (ohneZahlen) hinweise.push(`${ohneZahlen} ${ohneZahlen === 1 ? 'Spalte enthält' : 'Spalten enthalten'} keine Zahlen (z. B. Smileys oder Kommentare) und ${ohneZahlen === 1 ? 'wird' : 'werden'} nicht übernommen.`);

  // Profil: überwiegend Notenpunkte → FOS, Noten → OSZ; Klassenname mit FOS gewinnt
  const zaehl = (s: Skala) => spalten.filter((x) => x.gruppe && x.skala === s).length;
  const profil: Profil = /fos/i.test(dateiname + b.name) ? 'FOS' : zaehl('np') > zaehl('note') ? 'FOS' : 'OSZ';
  // Ganze Zahlen 1–6 in einer Punkte-Tabelle sind auch Punkte
  if (profil === 'FOS') for (const s of spalten) if (s.skala === 'note' && s.grund?.startsWith('Nur ganze Zahlen')) { s.skala = 'np'; s.grund = undefined; }
  return { quelle: 'tabelle', dateiname, blatt: b.name, profil, schluessel: profil === 'FOS' ? 'FOS' : 'OSZ', schueler, spalten, hinweise, namenEinspaltig: einspaltig || undefined };
}

/** Welches Blatt einer Mappe passt am besten? Das mit den meisten Zahlen, ein Blatt „Noten“ zuerst. */
export function blattVorschlag(m: Mappe): number {
  let best = 0, punkte = -1;
  m.blaetter.forEach((b, i) => {
    let p = [...b.zellen.values()].filter((v) => typeof v === 'number' || zahlAus(v) !== null).length;
    if (/^(noten|grades|notas|notenbuch)/i.test(b.name)) p += 1000;
    if (/(anwesenheit|mitarbeit|attendance|asistencia)/i.test(b.name)) p -= 500;
    if (p > punkte) { punkte = p; best = i; }
  });
  return best;
}

/** Datei verstehen: UPZ oder eigene Tabelle. */
export function paketAus(m: Mappe, dateiname: string, blattNr?: number, opt: TabellenOptionen = {}): Paket {
  if (istUpz(m)) return upzLesen(m, dateiname);
  const b = m.blaetter[blattNr ?? blattVorschlag(m)] ?? m.blaetter[0];
  return tabelleLesen(b, dateiname, opt);
}

// ---------- Zuordnung zur Klasse in L.E.O. ----------

/** Klasse in L.E.O., die zur Datei passt (gleiche Klasse und gleiches Fach), sonst null. */
export function kursVorschlag(kurse: Kurs[], p: Paket, alle: Schueler[] = []): string | null {
  if (!p.klasse) {
    // Ohne Klassenangabe: die Klasse, in der mindestens die Hälfte der Namen schon steht
    let best: { id: string; n: number } | null = null;
    for (const k of kurse) {
      const liste = alle.filter((s) => k.schueler.includes(s.id));
      const n = schuelerZuordnen(p.schueler, liste, false).filter((z) => z.sicher).length;
      if (n * 2 >= p.schueler.length && n > 0 && (!best || n > best.n)) best = { id: k.id, n };
    }
    return best?.id ?? null;
  }
  const k = nameNorm(p.klasse).replace(/\s/g, '');
  const f = nameNorm(p.fach ?? '');
  const passend = kurse.filter((x) => x.klasse.split(/[,+]/).some((t) => nameNorm(t).replace(/\s/g, '') === k));
  return (passend.find((x) => f && (nameNorm(x.fach).startsWith(f) || f.startsWith(nameNorm(x.fach)))) ?? (passend.length === 1 ? passend[0] : undefined))?.id ?? null;
}

/** Ziel je Schüler der Datei: id in L.E.O., „+“ = neu anlegen, „“ = nicht übernehmen. */
export type SchuelerZiel = string;

/** Schüler der Datei den Schülern der Klasse zuordnen: Vor- und Nachname, auch vertauscht, dann eindeutiger Nachname. Niemand doppelt. */
export function schuelerZuordnen(datei: ISchueler[], klasse: Schueler[], neueKlasse: boolean): { ziel: SchuelerZiel; sicher: boolean }[] {
  const vergeben = new Set<string>();
  const n = nameNorm;
  const erg = datei.map((s) => {
    const t = klasse.find((x) => !vergeben.has(x.id) && ((n(x.nachname) === n(s.nachname) && n(x.vorname) === n(s.vorname)) || (n(x.nachname) === n(s.vorname) && n(x.vorname) === n(s.nachname))));
    if (t) vergeben.add(t.id);
    return { ziel: t?.id ?? '', sicher: !!t };
  });
  erg.forEach((e, i) => {
    if (e.ziel) return;
    const kand = klasse.filter((x) => !vergeben.has(x.id) && n(x.nachname) === n(datei[i].nachname));
    if (kand.length === 1) { e.ziel = kand[0].id; vergeben.add(kand[0].id); }
    else if (neueKlasse) e.ziel = '+';
  });
  return erg;
}

/** Spalte in der Klasse, in die eine Spalte der Datei passt (gleicher Name und gleiche Gruppe, bei Monatsnoten gleicher Monat). */
export function spalteVorschlag(kurs: Kurs | null, s: ISpalte): string | null {
  if (!kurs || !s.gruppe) return null;
  const l = kurs.leistungen.find((x) => x.gruppe === s.gruppe && ((s.monat && x.monat === s.monat) || kopfNorm(x.name) === kopfNorm(s.name)));
  return l?.id ?? null;
}

export type Aenderung = 'neu' | 'gleich' | 'abweichend' | 'leer';
export interface ZellVorschau { i: number; sid: string; neu: Zelle; alt?: Zelle; aenderung: Aenderung }
export interface SpaltenVorschau { spalte: ISpalte; leistungId: string | null; zellen: ZellVorschau[]; neu: number; gleich: number; abweichend: number }

export const zellText = (z?: Zelle | null) => (!z ? '' : z.status ?? (z.wert !== undefined ? String(z.wert) : ''));

/**
 * Was beim Übernehmen passieren würde. `ziele` = Schüler-Ziele (id, „+“, „“). Neu anzulegende Schüler bekommen in der
 * Vorschau den Platzhalter `+i`. Eine Zelle, die schon einen Wert hat, ist „abweichend“ und wird nur mit `ueberschreiben` geändert.
 */
export function vorschau(kurs: Kurs | null, p: Paket, ziele: SchuelerZiel[], spaltenZiele: Record<string, string | null>, profil: Profil): SpaltenVorschau[] {
  return p.spalten.filter((s) => s.gruppe).map((s) => {
    const lid = spaltenZiele[s.id] ?? null;
    const zellen: ZellVorschau[] = [];
    s.werte.forEach((w, i) => {
      const ziel = ziele[i];
      if (!ziel) return;
      const neu = umrechnen(w, s, profil, p.schluessel);
      if (!neu) return;
      const sid = ziel === '+' ? `+${i}` : ziel;
      const alt = kurs && lid && ziel !== '+' ? kurs.zellen[zellSchluessel(lid, sid)] : undefined;
      const a = zellText(alt);
      zellen.push({ i, sid, neu, alt, aenderung: !a ? 'neu' : a === zellText(neu) ? 'gleich' : 'abweichend' });
    });
    return {
      spalte: s, leistungId: lid, zellen,
      neu: zellen.filter((z) => z.aenderung === 'neu').length,
      gleich: zellen.filter((z) => z.aenderung === 'gleich').length,
      abweichend: zellen.filter((z) => z.aenderung === 'abweichend').length
    };
  });
}

/** Neue, leere Klasse für den Import (ohne WebUntis). Der Sitzplan wird beim Übernehmen gefüllt. */
export function kursAnlegen(id: string, a: { name: string; fach: string; klasse: string; profil: Profil }): Kurs {
  return {
    id, name: a.name, fach: a.fach, klasse: a.klasse, raum: '', profil: a.profil, schueler: [], leistungen: [],
    gewichte: { klausuren: 0.5, sonstige: 0.5, mitarbeit: 0.6, sl: 0.4 },
    zellen: {}, endnoten: {}, stundenGehalten: 0, lernstoff: {}, uebergang: null, sitzplan: ausVorlage('reihen')
  };
}

export interface Ergebnis { schuelerNeu: number; schuelerDazu: number; spaltenNeu: number; zellen: number; uebersprungen: number }

/**
 * Übernimmt die Vorschau. Legt neue Schüler (herkunft „datei“, der WebUntis-Abgleich ordnet sie später über den Namen zu) und
 * neue Spalten an, schreibt neue Zellen und nur mit `ueberschreiben` auch abweichende. Einzelgewicht und Stern einer Zelle bleiben.
 */
export function anwenden(
  alleSchueler: Schueler[], kurs: Kurs, p: Paket, ziele: SchuelerZiel[], v: SpaltenVorschau[],
  opt: { ueberschreiben: boolean; gewichte: boolean; neueId: () => string; heute: string }
): Ergebnis {
  const erg: Ergebnis = { schuelerNeu: 0, schuelerDazu: 0, spaltenNeu: 0, zellen: 0, uebersprungen: 0 };
  const sid = new Map<number, string>();
  ziele.forEach((z, i) => {
    if (!z) return;
    let id = z;
    if (z === '+') {
      const s = p.schueler[i];
      id = opt.neueId();
      alleSchueler.push({ id, nachname: s.nachname, vorname: s.vorname, geburt: '', geschlecht: s.geschlecht ?? 'd', mailDienst: '', klasse: kurs.klasse || undefined, herkunft: 'datei' });
      erg.schuelerNeu++;
    }
    sid.set(i, id);
    if (!kurs.schueler.includes(id)) { kurs.schueler.push(id); if (z !== '+') erg.schuelerDazu++; }
  });
  for (const sv of v) {
    let lid = sv.leistungId;
    const s = sv.spalte;
    if (!lid || !kurs.leistungen.some((l) => l.id === lid)) {
      const l: Leistung = { id: opt.neueId(), name: s.name, gruppe: s.gruppe!, art: s.art || 'Sonstige', gewicht: s.gewicht };
      if (s.datum) l.datum = s.datum;
      if (s.monat) l.monat = s.monat;
      kurs.leistungen.push(l);
      lid = l.id;
      erg.spaltenNeu++;
    }
    for (const z of sv.zellen) {
      const id = sid.get(z.i);
      if (!id) continue;
      if (z.aenderung === 'gleich') continue;
      if (z.aenderung === 'abweichend' && !opt.ueberschreiben) { erg.uebersprungen++; continue; }
      const key = zellSchluessel(lid, id);
      const alt = kurs.zellen[key];
      const neu: Zelle = { ...z.neu };
      if (alt?.gewicht !== undefined) neu.gewicht = alt.gewicht;
      if (alt?.stern) neu.stern = alt.stern;
      kurs.zellen[key] = neu;
      erg.zellen++;
    }
  }
  const summe = p.gewichte ? p.gewichte.mitarbeit + p.gewichte.sl : 0;
  if (opt.gewichte && p.gewichte && summe > 0) { // beide 0 (leere Zellen in der Datei) ergäbe NaN-Gewichte
    kurs.gewichte.mitarbeit = Math.round((p.gewichte.mitarbeit / summe) * 100) / 100;
    kurs.gewichte.sl = Math.round((p.gewichte.sl / summe) * 100) / 100;
  }
  return erg;
}
