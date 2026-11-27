// Modul „Wo wir stehengeblieben sind“ (PB1, PF10, E70, V18, docs/MODUL_STUNDENSTAND.md).
// Der Stand hängt an der Klasse (Kurs = Klasse + Fach) und am Tag: `kurs.lernstoff[datum].stand`.
// `kurs.uebergang` bleibt als „neuester Stand“ erhalten (ältere Daten, Abgleich), wird aber hieraus nachgeführt.
import type { Kurs, Material, Merker } from './typen.ts';

export interface StandEintrag { datum: string; text: string }

type MitStand = Pick<Kurs, 'lernstoff' | 'uebergang'>;

/** Alle Stände einer Klasse, neueste zuerst. Ein alter `uebergang` ohne Tageseintrag zählt mit. */
export function staende(kurs: MitStand): StandEintrag[] {
  const m = new Map<string, string>();
  for (const [datum, l] of Object.entries(kurs.lernstoff ?? {})) if (l?.stand?.trim()) m.set(datum, l.stand.trim());
  const u = kurs.uebergang;
  if (u?.text?.trim() && !m.has(u.datum)) m.set(u.datum, u.text.trim());
  return [...m].map(([datum, text]) => ({ datum, text })).sort((a, b) => b.datum.localeCompare(a.datum));
}

/** Neuester Stand vor einem Tag (ohne `vor`: der neueste überhaupt). */
export function letzterStand(kurs: MitStand, vor?: string): StandEintrag | undefined {
  return staende(kurs).find((e) => !vor || e.datum < vor);
}

/** Stand eines Tages setzen oder (leerer Text) entfernen. Führt `kurs.uebergang` nach. */
export function standSetzen(kurs: MitStand, datum: string, text: string) {
  const t = text.trim();
  const l = kurs.lernstoff[datum];
  if (t) {
    if (l) l.stand = t;
    else kurs.lernstoff[datum] = { text: '', hausaufgabe: '', stand: t };
  } else if (l) delete l.stand;
  if (!t && kurs.uebergang?.datum === datum) kurs.uebergang = null;
  const neu = letzterStand(kurs);
  kurs.uebergang = neu ? { text: neu.text, datum: neu.datum } : null;
}

/** Die letzte Stunde vor `vor` mit Inhalt (Thema, Hausaufgabe oder Stand) und der neueste Stand davor.
 *  Fehlt in der letzten Stunde ein Stand, bleibt der ältere stehen (`standDatum` sagt, von wann er ist). */
export function letzteStunde(kurs: MitStand, vor: string) {
  const daten = Object.keys(kurs.lernstoff ?? {}).filter((x) => x < vor && hatInhalt(kurs.lernstoff[x])).sort();
  const st = letzterStand(kurs, vor);
  const datum = [daten.at(-1), st?.datum].filter((x): x is string => !!x).sort().at(-1);
  if (!datum) return undefined;
  const l = kurs.lernstoff[datum];
  return { datum, thema: l?.text?.trim() ?? '', hausaufgabe: l?.hausaufgabe?.trim() ?? '', stand: st?.text ?? '', standDatum: st?.datum ?? datum };
}

const hatInhalt = (l: { text?: string; hausaufgabe?: string; stand?: string } | undefined) =>
  !!(l && (l.text?.trim() || l.hausaufgabe?.trim() || l.stand?.trim()));

/** Tage zwischen zwei ISO-Daten (ohne Zeitzonen-Sprünge). */
export function tageZwischen(von: string, bis: string) {
  const t = (iso: string) => { const [j, m, d] = iso.split('-').map(Number); return Date.UTC(j, m - 1, d); };
  return Math.round((t(bis) - t(von)) / 86_400_000);
}

/** „heute“, „gestern“, „vor 3 Tagen“, „vor 2 Wochen“. */
export function seitText(datum: string, heute: string) {
  const n = tageZwischen(datum, heute);
  if (n <= 0) return 'heute';
  if (n === 1) return 'gestern';
  if (n < 7) return `vor ${n} Tagen`;
  const w = Math.round(n / 7);
  if (n < 60) return w === 1 ? 'vor einer Woche' : `vor ${w} Wochen`;
  const mo = Math.round(n / 30);
  return `vor ${mo} Monaten`;
}

/** Ab so vielen Tagen Pause (Blockunterricht, Ferien) zeigt L.E.O. auch die Stunden davor. */
export const LANGE_PAUSE = 14;

/** Verlauf einer Klasse bis einschließlich `bis`, neueste zuerst: Thema, Hausaufgabe, Stand und was gezeigt wurde. */
export function verlauf(kurs: MitStand & Pick<Kurs, 'id'>, material: Material[], bis: string, anzahl = 6) {
  const daten = new Set<string>();
  for (const [datum, l] of Object.entries(kurs.lernstoff ?? {})) if (datum <= bis && hatInhalt(l)) daten.add(datum);
  for (const e of staende(kurs)) if (e.datum <= bis) daten.add(e.datum);
  for (const m of material) if (m.kursId === kurs.id) for (const g of m.gezeigt ?? []) if (g <= bis) daten.add(g);
  const st = new Map(staende(kurs).map((e) => [e.datum, e.text]));
  return [...daten].sort().reverse().slice(0, anzahl).map((datum) => {
    const l = kurs.lernstoff[datum];
    return {
      datum,
      thema: l?.text?.trim() ?? '',
      hausaufgabe: l?.hausaufgabe?.trim() ?? '',
      stand: st.get(datum) ?? '',
      gezeigt: material.filter((m) => m.kursId === kurs.id && m.gezeigt?.includes(datum)).map((m) => m.titel)
    };
  });
}

/** Antippen statt eintippen: Vorschläge aus dem, was für heute geplant war. */
export function vorschlaege(thema: string): { text: string; wert: string; offen: boolean }[] {
  const t = thema.trim().replace(/[.\s]+$/, '');
  if (!t) return [];
  return [
    { text: 'Wie geplant', wert: `${t} geschafft`, offen: false },
    { text: 'Nur zum Teil', wert: `${t} angefangen, weiter bei `, offen: true }
  ];
}

// ---------- Merker „Nicht vergessen“ (für die nächste Stunde der Klasse) ----------

/** Merker, die in einer Stunde am Tag `heute` oben erscheinen: alle, die vor heute notiert wurden. */
export const faelligeMerker = (kurs: Pick<Kurs, 'merker'>, heute: string) => (kurs.merker ?? []).filter((m) => m.seit < heute);

export function merkerDazu(kurs: Pick<Kurs, 'merker'>, text: string, id: string, heute: string): Merker | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const m: Merker = { id, text: t, seit: heute };
  kurs.merker = [...(kurs.merker ?? []), m];
  return m;
}

/** Merker abhaken (entfernt ihn). Gibt eine Funktion zum Zurücknehmen zurück. */
export function merkerWeg(kurs: Pick<Kurs, 'merker'>, id: string): (() => void) | undefined {
  const liste = kurs.merker ?? [];
  const i = liste.findIndex((m) => m.id === id);
  if (i < 0) return undefined;
  const m = liste[i];
  kurs.merker = liste.filter((x) => x.id !== id);
  return () => {
    const jetzt = kurs.merker ?? [];
    if (jetzt.some((x) => x.id === m.id)) return;
    kurs.merker = [...jetzt.slice(0, i), m, ...jetzt.slice(i)];
  };
}

// ---------- Heute: Stunden, die vorbei sind und noch keinen Stand haben ----------

interface Slot { kursId: string; beginn: string; ende: string; ausfall?: boolean }

/** Je Klasse die heutigen Stunden zusammengefasst; offen, wenn die letzte vorbei ist und kein Stand für heute da ist. */
export function ohneStand(kurse: Pick<Kurs, 'id' | 'lernstoff'>[], heuteSlots: Slot[], minJetzt: number, heute: string) {
  const min = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const je = new Map<string, { kursId: string; beginn: string; ende: string }>();
  for (const s of heuteSlots) {
    if (s.ausfall) continue;
    const a = je.get(s.kursId);
    if (!a) je.set(s.kursId, { kursId: s.kursId, beginn: s.beginn, ende: s.ende });
    else {
      if (min(s.beginn) < min(a.beginn)) a.beginn = s.beginn;
      if (min(s.ende) > min(a.ende)) a.ende = s.ende;
    }
  }
  return [...je.values()]
    .filter((x) => min(x.ende) <= minJetzt)
    .filter((x) => { const k = kurse.find((k) => k.id === x.kursId); return k && !k.lernstoff[heute]?.stand?.trim(); })
    .sort((a, b) => min(a.beginn) - min(b.beginn));
}

/** Häufige Merker zum Antippen (eigene kommen über das Feld dazu). */
export const MERKER_VORSCHLAEGE = ['Hausaufgabe kontrollieren', 'Arbeiten zurückgeben', 'Kopien mitbringen'];
