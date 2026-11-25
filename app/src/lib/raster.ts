// Kriterienraster für die mündlichen Leistungen (FB7, E110, Weg 2):
// Die Monatsnote kommt aus den Smileys. Sind es zu wenige (vergessen, Gruppenphase), bietet L.E.O. das Raster an,
// und dessen Ergebnis wird die Monatsnote. Freiwillig geht das Raster immer.
import type { Baustein, Daten, Kurs, Leistung, Profil, Raster, RasterEinschaetzung, RasterKriterium } from './typen.ts';
import { monatsVorschlag } from './rechnen.ts';

type Stufen4 = [string, string, string, string];
const k = (id: string, name: string, stufen: Stufen4, gewicht?: number): RasterKriterium => ({ id, name, stufen, ...(gewicht ? { gewicht } : {}) });

/** Eingebaute Vorlagen (E112): höchstens 5 Kriterien, damit eine Einschätzung etwa 10 Sekunden dauert.
 *  Häufigkeit und Qualität der Beiträge sind getrennt, Qualität und Sprache zählen doppelt (E113, je Klasse änderbar).
 *  Hausaufgaben ist optional und je Klasse zuschaltbar. */
export const MAX_KRITERIEN = 5;

const BETEILIGUNG = k('beteiligung', 'Beteiligung', ['Ich melde mich oft von selbst.', 'Ich beteilige mich regelmäßig.', 'Ich sage meist nur etwas, wenn ich gefragt werde.', 'Ich beteilige mich kaum.']);
const QUALITAET_ = k('qualitaet', 'Qualität der Beiträge', ['Meine Beiträge sind treffend und bringen das Gespräch weiter.', 'Meine Beiträge sind meist richtig und sachbezogen.', 'Meine Beiträge sind oft ungenau oder kurz.', 'Meine Beiträge passen selten zum Thema.']);
const QUALITAET: RasterKriterium = { ...QUALITAET_, gewicht: 2 };
const ARBEIT = k('arbeitsverhalten', 'Arbeitsverhalten', ['Ich arbeite konzentriert, habe mein Material dabei und bin pünktlich.', 'Ich arbeite meist konzentriert, bin vorbereitet und selten zu spät.', 'Ich brauche oft Aufforderung, bin nicht vorbereitet oder komme manchmal zu spät.', 'Ich arbeite kaum mit, lenke andere ab oder komme oft zu spät.']);
const ZUSAMMEN = k('zusammenarbeit', 'Zusammenarbeit', ['Ich übernehme Verantwortung in der Gruppe und helfe anderen.', 'Ich bringe mich in Gruppen ein.', 'Ich mache in Gruppen nur auf Aufforderung mit.', 'Ich bringe mich in Gruppen nicht ein.']);
const HAUSAUFGABEN: RasterKriterium = { ...k('hausaufgaben', 'Hausaufgaben', ['Immer vollständig und gut.', 'Meistens vollständig.', 'Oft lückenhaft.', 'Fast nie gemacht.']), optional: true };

export const VORLAGEN: Raster[] = [
  {
    id: 'v-englisch', name: 'Englisch mündlich', fach: 'Englisch', vorlage: true,
    bereiche: [
      { name: 'Beiträge', gewicht: 1, kriterien: [
        BETEILIGUNG, QUALITAET,
        k('sprache', 'Sprache', ['Ich spreche flüssig, mit treffenden Wörtern und sicherer Grammatik.', 'Man versteht mich gut, Fehler stören kaum.', 'Ich spreche in kurzen, einfachen Sätzen, Fehler stören manchmal.', 'Mir fehlen oft die Wörter, man versteht mich schwer.'], 2)
      ] },
      { name: 'Arbeitsweise', gewicht: 1, kriterien: [ARBEIT, ZUSAMMEN, HAUSAUFGABEN] }
    ]
  },
  {
    id: 'v-allgemein', name: 'Mündlich fachübergreifend', fach: '', vorlage: true,
    bereiche: [
      { name: 'Beiträge', gewicht: 1, kriterien: [
        BETEILIGUNG, QUALITAET,
        k('fachsprache', 'Fachsprache und Verstehen', ['Ich nutze Fachbegriffe sicher und verstehe Aufgaben sofort.', 'Ich nutze Fachbegriffe meist richtig und verstehe das meiste.', 'Ich umschreibe Fachbegriffe und verstehe das Wichtigste.', 'Mir fehlen Fachbegriffe, Aufgaben verstehe ich oft nicht.'], 2)
      ] },
      { name: 'Arbeitsweise', gewicht: 1, kriterien: [ARBEIT, ZUSAMMEN, HAUSAUFGABEN] }
    ]
  }
];

export const STANDARD_MINDEST = 3;

/** Alle Raster: eigene zuerst, dann die Vorlagen. */
export const alleRaster = (d: Pick<Daten, 'einstellungen'>): Raster[] => [...(d.einstellungen.raster ?? []).filter((r) => r.art !== 'projekt'), ...VORLAGEN];

/** Raster der Klasse: eingestellt, sonst Vorlage passend zum Fach, sonst fachübergreifend.
 *  Eigene Raster gelten nur, wenn sie für die Klasse gewählt sind (eine neue Kopie ändert nichts still). */
export function rasterFuer(d: Pick<Daten, 'einstellungen'>, kurs: Kurs): Raster {
  const gewaehlt = kurs.muendlich?.rasterId && alleRaster(d).find((r) => r.id === kurs.muendlich!.rasterId);
  if (gewaehlt) return gewaehlt;
  const f = kurs.fach.toLowerCase();
  return VORLAGEN.find((r) => r.fach && f.includes(r.fach.toLowerCase())) ?? VORLAGEN[1];
}

/** Raster, mit dem eine Einschätzung gemacht wurde (falls es noch existiert), sonst das der Klasse. */
export function rasterDerEinschaetzung(d: Pick<Daten, 'einstellungen'>, kurs: Kurs, ein?: RasterEinschaetzung): Raster {
  return (ein && alleRaster(d).find((r) => r.id === ein.rasterId)) || rasterFuer(d, kurs);
}

export const mindestSmileys = (kurs: Kurs) => kurs.muendlich?.mindestSmileys ?? STANDARD_MINDEST;

/** Optionale Kriterien (z. B. Hausaufgaben) zählen nur, wenn die Klasse sie eingeschaltet hat. */
export const kriteriumAktiv = (kurs: Pick<Kurs, 'muendlich'>, kr: RasterKriterium) => !kr.optional || !!kurs.muendlich?.zusatz?.includes(kr.id);
export const aktiveKriterien = (kurs: Pick<Kurs, 'muendlich'>, r: Raster) => r.bereiche.flatMap((b) => b.kriterien).filter((kr) => kriteriumAktiv(kurs, kr));

export interface RasterErgebnis {
  schnitt: number | null; // gewichtete Stufe 1–4 (4 = beste)
  smiley: number | null; // umgerechnet auf die Smiley-Skala 1–5 (1 = beste)
  note: number | null; // Vorschlag für die Monatsnote im Profil der Klasse
  offen: number; // aktive Kriterien ohne Stufe
  weg: string[];
}

const fmt = (x: number) => x.toLocaleString('de-DE', { maximumFractionDigits: 2 });

/** Gewicht eines Kriteriums in der Klasse (E113): eigene Einstellung der Klasse, sonst aus dem Raster, sonst 1. */
export const kriteriumGewicht = (kurs: Pick<Kurs, 'muendlich'> | undefined, kr: RasterKriterium) => kurs?.muendlich?.gewichte?.[kr.id] ?? kr.gewicht ?? 1;

/**
 * Ergebnis einer Einschätzung (E113): gewichteter Durchschnitt der gewählten Stufen über die aktiven Kriterien.
 * Leere Kriterien und Gewicht 0 zählen nicht. Stufe 4 → Smiley 1, Stufe 1 → Smiley 5 (linear), danach wie die Smiley-Monatsnote (E68).
 */
export function rasterErgebnis(raster: Raster, stufen: Record<string, number>, profil: Profil, kurs?: Pick<Kurs, 'muendlich'>): RasterErgebnis {
  const weg: string[] = [];
  const ks = raster.bereiche.flatMap((b) => b.kriterien).filter((kr) => kriteriumAktiv(kurs ?? {}, kr));
  const gewertet = ks.filter((kr) => typeof stufen[kr.id] === 'number' && kriteriumGewicht(kurs, kr) > 0);
  const offen = ks.filter((kr) => typeof stufen[kr.id] !== 'number').length;
  const summe = gewertet.reduce((a, kr) => a + kriteriumGewicht(kurs, kr), 0);
  if (!summe) return { schnitt: null, smiley: null, note: null, offen, weg: ['Noch keine Stufe gewählt.'] };
  const schnitt = gewertet.reduce((a, kr) => a + stufen[kr.id] * kriteriumGewicht(kurs, kr), 0) / summe;
  weg.push(`Stufen × Gewicht: ${gewertet.map((kr) => `${kr.name} ${stufen[kr.id]} × ${fmt(kriteriumGewicht(kurs, kr))}`).join(' + ')}`);
  weg.push(`Geteilt durch die Summe der Gewichte ${fmt(summe)} = ${fmt(schnitt)}`);
  const smiley = 1 + ((4 - schnitt) * 4) / 3;
  weg.push(`Auf die Smiley-Skala: 1 + (4 − ${fmt(schnitt)}) × 4/3 = ${fmt(smiley)}`);
  const v = monatsVorschlag(profil, [smiley])!;
  weg.push(profil === 'FOS' ? `In Notenpunkte wie bei den Smileys: ${v.wert} Punkte` : `Monatsnote: ${v.wert}`);
  return { schnitt, smiley, note: v.wert, offen, weg };
}

export const einschaetzungSchluessel = (monat: string, sid: string) => `${monat}:${sid}`;

export function einschaetzungVon(kurs: Kurs, monat: string, sid: string): RasterEinschaetzung | undefined {
  return kurs.einschaetzungen?.[einschaetzungSchluessel(monat, sid)];
}

/** Smileys eines Schülers in einem Monat (Stufen 1–5). */
export const smileysImMonat = (d: Pick<Daten, 'mitarbeit'>, kursId: string, sid: string, monat: string) =>
  d.mitarbeit.filter((e) => e.kursId === kursId && e.schuelerId === sid && e.zeit.startsWith(monat));

/** Belege je Kriterium aus dem Monat: Bausteine mit passendem Kriterium, Verspätungen bei Arbeitsverhalten bzw. Pünktlichkeit. */
export function belege(
  d: Pick<Daten, 'mitarbeit' | 'verspaetungen'>, bausteine: Baustein[], kursId: string, sid: string, monat: string, kriterium: RasterKriterium
): string[] {
  const name = kriterium.name.toLowerCase();
  const zaehler = new Map<string, number>();
  for (const e of smileysImMonat(d, kursId, sid, monat))
    for (const t of e.bausteine) {
      const b = bausteine.find((x) => x.text === t);
      if (b?.kriterium?.toLowerCase() === name) zaehler.set(t, (zaehler.get(t) ?? 0) + 1);
    }
  const out = [...zaehler.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${n}× „${t}“`);
  if (name === 'pünktlichkeit' || name === 'arbeitsverhalten') {
    const v = d.verspaetungen.filter((x) => x.kursId === kursId && x.schuelerId === sid && x.datum.startsWith(monat));
    const tage = v.map((x) => x.datum.slice(8, 10) + '.' + x.datum.slice(5, 7) + '.').sort().join(', ');
    out.push(v.length ? `${v.length}× zu spät, ${v.reduce((a, x) => a + x.minuten, 0)} Min. (${tage})` : 'keine Verspätung');
  }
  return out;
}

export const monatsName = (m: string) => new Date(m + '-01T12:00').toLocaleDateString('de-DE', { month: 'short' }).replace('.', '');
export const monatsNameLang = (m: string) => new Date(m + '-01T12:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

/** Spalte für die Monatsnote suchen, auf Wunsch anlegen (wie „Monatsnote vorschlagen“ im Notenbuch). */
export function monatsSpalte(kurs: Kurs, monat: string, neueId?: () => string): Leistung | undefined {
  let l = kurs.leistungen.find((x) => x.gruppe === 'mitarbeit' && x.monat === monat);
  if (!l && neueId) {
    l = { id: neueId(), name: monatsName(monat), art: 'Monatsnote', gruppe: 'mitarbeit', gewicht: 1, monat };
    // nach Monat einsortieren
    const ma = kurs.leistungen.filter((x) => x.gruppe === 'mitarbeit');
    const nach = ma.filter((x) => !x.monat || x.monat < monat).at(-1) ?? kurs.leistungen.filter((x) => x.gruppe !== 'mitarbeit').at(-1);
    kurs.leistungen.splice(nach ? kurs.leistungen.indexOf(nach) + 1 : kurs.leistungen.length, 0, l);
  }
  return l;
}

/** Leeres eigenes Raster bzw. Kopie einer Vorlage (neue ids, damit Einschätzungen eindeutig bleiben). */
export function rasterKopie(r: Raster, id: string): Raster {
  const kopie: Raster = JSON.parse(JSON.stringify(r));
  delete kopie.vorlage;
  kopie.id = id;
  kopie.name = r.vorlage ? r.name : `${r.name} (Kopie)`;
  return kopie;
}
