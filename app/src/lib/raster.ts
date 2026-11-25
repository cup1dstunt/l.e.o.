// Kriterienraster für die mündlichen Leistungen (FB7, E110, Weg 2):
// Die Monatsnote kommt aus den Smileys. Sind es zu wenige (vergessen, Gruppenphase), bietet L.E.O. das Raster an,
// und dessen Ergebnis wird die Monatsnote. Freiwillig geht das Raster immer.
import type { Baustein, Daten, Kurs, Leistung, Profil, Raster, RasterEinschaetzung, RasterKriterium } from './typen.ts';
import { monatsVorschlag } from './rechnen.ts';

type Stufen4 = [string, string, string, string];
const k = (id: string, name: string, stufen: Stufen4): RasterKriterium => ({ id, name, stufen });

/** Eingebaute Vorlagen. Englisch nach Konstantins Kompetenzraster (BEWERTUNGSBOEGEN.md 6), Ich-Form. */
export const VORLAGEN: Raster[] = [
  {
    id: 'v-englisch', name: 'Englisch mündlich', fach: 'Englisch', vorlage: true,
    bereiche: [
      { name: 'Mündliches Sprachkönnen', gewicht: 2, kriterien: [
        k('beitraege', 'Beiträge', ['Ich bringe eigene Ideen ein und gebe dem Gespräch Impulse.', 'Ich mache vollständige, sachbezogene Beiträge.', 'Ich sage meist nur etwas, wenn ich gefragt werde.', 'Ich sage kaum etwas, auch auf Nachfrage.']),
        k('fluessigkeit', 'Flüssigkeit', ['Ich spreche auch längere Zeit flüssig.', 'Ich spreche meist flüssig, manchmal auch länger.', 'Ich spreche in kurzen Sätzen.', 'Ich sage nur einzelne Wörter.']),
        k('wortschatz', 'Wortschatz', ['Ich nutze neue Vokabeln präzise und treffend.', 'Ich nutze neue Vokabeln meistens richtig.', 'Ich bleibe bei einfachen, bekannten Wörtern.', 'Mir fehlen oft die Wörter.']),
        k('grammatik', 'Grammatik', ['Ich nutze auch schwierige Strukturen sicher.', 'Zeitformen und linking words sitzen meistens.', 'Ich baue einfache Sätze.', 'Mein Satzbau ist oft unklar.']),
        k('verstaendlichkeit', 'Verständlichkeit', ['Man versteht mich immer, auch spontan.', 'Fehler stören das Verstehen kaum.', 'Fehler stören das Verstehen manchmal.', 'Man versteht mich oft nicht.']),
        k('verstehen', 'Verstehen', ['Ich verstehe Texte und Aufgaben sofort.', 'Ich verstehe Texte und Aufgaben meistens.', 'Ich verstehe das Wichtigste.', 'Ich verstehe Aufgaben oft nicht.'])
      ] },
      { name: 'Allgemeine Kompetenzen', gewicht: 1, kriterien: ALLGEMEIN() }
    ]
  },
  {
    id: 'v-allgemein', name: 'Mündlich fachübergreifend', fach: '', vorlage: true,
    bereiche: [
      { name: 'Fachliche Beiträge', gewicht: 2, kriterien: [
        k('beitraege', 'Beiträge', ['Ich bringe eigene Ideen ein und gebe dem Gespräch Impulse.', 'Ich mache vollständige, sachbezogene Beiträge.', 'Ich sage meist nur etwas, wenn ich gefragt werde.', 'Ich sage kaum etwas, auch auf Nachfrage.']),
        k('fachsprache', 'Fachsprache', ['Ich nutze Fachbegriffe sicher und erkläre sie.', 'Ich nutze Fachbegriffe meistens richtig.', 'Ich umschreibe Fachbegriffe oft.', 'Mir fehlen die Fachbegriffe.']),
        k('verstehen', 'Verstehen', ['Ich verstehe Inhalte und Aufgaben sofort.', 'Ich verstehe Inhalte und Aufgaben meistens.', 'Ich verstehe das Wichtigste.', 'Ich verstehe Aufgaben oft nicht.'])
      ] },
      { name: 'Allgemeine Kompetenzen', gewicht: 1, kriterien: ALLGEMEIN() }
    ]
  }
];

function ALLGEMEIN(): RasterKriterium[] {
  return [
    k('konzentration', 'Konzentration', ['Ich arbeite immer zügig und störe nie.', 'Ich arbeite meist konzentriert.', 'Ich arbeite langsam und brauche Aufforderung.', 'Ich arbeite kaum und lenke andere ab.']),
    k('beteiligung', 'Beteiligung', ['Ich melde mich oft von selbst.', 'Ich arbeite phasenweise aktiv mit.', 'Ich beteilige mich nur, wenn ich aufgefordert werde.', 'Ich beteilige mich nicht.']),
    k('zusammenarbeit', 'Zusammenarbeit', ['Ich übernehme Verantwortung und helfe anderen.', 'Ich bringe mich in Gruppen ein.', 'Ich mache in Gruppen nur auf Aufforderung mit.', 'Ich bringe mich in Gruppen nicht ein.']),
    k('material', 'Material', ['Mein Material ist immer da und geordnet.', 'Mein Material ist meistens da.', 'Mir fehlt oft Material.', 'Ich habe fast nie Material dabei.']),
    k('hausaufgaben', 'Hausaufgaben', ['Immer vollständig und gut.', 'Meistens vollständig.', 'Oft lückenhaft.', 'Fast nie gemacht.']),
    k('puenktlichkeit', 'Pünktlichkeit', ['Ich bin immer pünktlich und bleibe bis zum Ende.', 'Ich komme selten zu spät.', 'Ich komme manchmal zu spät oder packe früher ein.', 'Ich komme oft zu spät.'])
  ];
}

export const STANDARD_MINDEST = 3;

/** Alle Raster: eigene zuerst, dann die Vorlagen. */
export const alleRaster = (d: Pick<Daten, 'einstellungen'>): Raster[] => [...(d.einstellungen.raster ?? []), ...VORLAGEN];

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

export interface RasterErgebnis {
  schnitt: number | null; // gewichtete Stufe 1–4 (4 = beste)
  smiley: number | null; // umgerechnet auf die Smiley-Skala 1–5 (1 = beste)
  note: number | null; // Vorschlag für die Monatsnote im Profil der Klasse
  bereiche: { name: string; gewicht: number; schnitt: number | null; gezaehlt: number; von: number }[];
  offen: number; // Kriterien ohne Stufe
  weg: string[];
}

const fmt = (x: number) => x.toLocaleString('de-DE', { maximumFractionDigits: 2 });

/**
 * Ergebnis einer Einschätzung: je Bereich Mittel der gewählten Stufen, Bereiche nach Gewicht.
 * Leere Kriterien zählen nicht. Stufe 4 → Smiley 1, Stufe 1 → Smiley 5 (linear), danach wie die Smiley-Monatsnote (E68).
 */
export function rasterErgebnis(raster: Raster, stufen: Record<string, number>, profil: Profil): RasterErgebnis {
  const weg: string[] = [];
  let offen = 0;
  const bereiche = raster.bereiche.map((b) => {
    const w = b.kriterien.map((kr) => stufen[kr.id]).filter((x): x is number => typeof x === 'number');
    offen += b.kriterien.length - w.length;
    const schnitt = w.length ? w.reduce((a, x) => a + x, 0) / w.length : null;
    weg.push(`${b.name}: ${w.length ? `(${w.join(' + ')}) / ${w.length} = ${fmt(schnitt!)}` : 'noch nichts gewählt'}`);
    return { name: b.name, gewicht: b.gewicht, schnitt, gezaehlt: w.length, von: b.kriterien.length };
  });
  const mit = bereiche.filter((b) => b.schnitt !== null && b.gewicht > 0);
  const summe = mit.reduce((a, b) => a + b.gewicht, 0);
  if (!summe) return { schnitt: null, smiley: null, note: null, bereiche, offen, weg };
  const schnitt = mit.reduce((a, b) => a + b.schnitt! * b.gewicht, 0) / summe;
  if (mit.length > 1) weg.push(`Gewichtet: ${mit.map((b) => `${fmt(b.schnitt!)} × ${fmt(b.gewicht)}`).join(' + ')} / ${fmt(summe)} = ${fmt(schnitt)}`);
  const smiley = 1 + ((4 - schnitt) * 4) / 3;
  weg.push(`Auf die Smiley-Skala: 1 + (4 − ${fmt(schnitt)}) × 4/3 = ${fmt(smiley)}`);
  const v = monatsVorschlag(profil, [smiley])!;
  weg.push(profil === 'FOS' ? `In Notenpunkte wie bei den Smileys: ${v.wert} Punkte` : `Monatsnote: ${v.wert}`);
  return { schnitt, smiley, note: v.wert, bereiche, offen, weg };
}

export const einschaetzungSchluessel = (monat: string, sid: string) => `${monat}:${sid}`;

export function einschaetzungVon(kurs: Kurs, monat: string, sid: string): RasterEinschaetzung | undefined {
  return kurs.einschaetzungen?.[einschaetzungSchluessel(monat, sid)];
}

/** Smileys eines Schülers in einem Monat (Stufen 1–5). */
export const smileysImMonat = (d: Pick<Daten, 'mitarbeit'>, kursId: string, sid: string, monat: string) =>
  d.mitarbeit.filter((e) => e.kursId === kursId && e.schuelerId === sid && e.zeit.startsWith(monat));

/** Belege je Kriterium aus dem Monat: Bausteine mit passendem Kriterium, Verspätungen bei Pünktlichkeit. */
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
  if (name === 'pünktlichkeit') {
    const v = d.verspaetungen.filter((x) => x.kursId === kursId && x.schuelerId === sid && x.datum.startsWith(monat));
    out.push(v.length ? `${v.length} Verspätung${v.length > 1 ? 'en' : ''}, ${v.reduce((a, x) => a + x.minuten, 0)} Min.` : 'keine Verspätung');
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
