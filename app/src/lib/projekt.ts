// Gruppenarbeit (P9, E118): feste Gruppen über mehrere Stunden bis ein Halbjahr, z. B. Podcast oder Präsentation.
// Bewertet werden das Handlungsprodukt (einmal je Gruppe) und die Arbeitsweise (je Person, mit der Beteiligung),
// Anteil frei. Die Einzelnoten landen als eine Spalte im Notenbuch, Standard Tests/Sonstiges, normale Skala.
// Reine Logik ohne Oberfläche, deshalb einzeln testbar.
import type { Daten, Kurs, Leistung, Profil, Projekt, ProjektGruppe, Raster, RasterKriterium, Schueler } from './typen.ts';
import { zellSchluessel, kaufm } from './rechnen.ts';

type Stufen4 = [string, string, string, string];
const k = (id: string, name: string, stufen: Stufen4, gewicht?: number): RasterKriterium => ({ id, name, stufen, ...(gewicht ? { gewicht } : {}) });

/** Eingebaute Projektraster (E118): Handlungsprodukt einmal je Gruppe, Arbeitsweise je Person (die Beteiligung
 *  der Einzelnen gehört zur Arbeitsweise). Höchstens 5 Kriterien, Stufe 4 = beste. Eigene Raster als Kopie. */
export const PROJEKT_VORLAGEN: Raster[] = [
  {
    id: 'pv-praesentation', name: 'Präsentation', fach: '', vorlage: true, art: 'projekt',
    bereiche: [
      { name: 'Handlungsprodukt', gewicht: 1, kriterien: [
        k('p-inhalt', 'Fachlicher Inhalt', ['richtig, vollständig, eigenständig vertieft', 'richtig und weitgehend vollständig', 'lückenhaft oder mit Fehlern', 'kaum richtig, Wesentliches fehlt'], 2),
        k('p-aufbau', 'Aufbau', ['klarer roter Faden, Einstieg und Schluss', 'nachvollziehbar gegliedert', 'Gliederung schwer erkennbar', 'ohne erkennbaren Aufbau']),
        k('p-medien', 'Medien und Visualisierung', ['unterstützen den Vortrag treffend', 'passend und lesbar', 'überladen oder wenig hilfreich', 'fehlen oder stören'])
      ] },
      { name: 'Arbeitsweise', gewicht: 1, einzeln: true, kriterien: [
        k('p-vortrag', 'Vortrag und Rückfragen', ['frei, sicher, Fragen souverän beantwortet', 'meist frei, Fragen meist beantwortet', 'oft abgelesen oder unsicher bei Fragen', 'nur abgelesen, Fragen nicht beantwortet']),
        k('p-beteiligung', 'Beteiligung und Zusammenarbeit', ['trägt die Gruppe, übernimmt Verantwortung', 'bringt sich zuverlässig ein', 'macht nur auf Aufforderung mit', 'kaum eigener Anteil'])
      ] }
    ]
  },
  {
    id: 'pv-projekt', name: 'Projekt mit Produkt', fach: '', vorlage: true, art: 'projekt',
    bereiche: [
      { name: 'Handlungsprodukt', gewicht: 1, kriterien: [
        k('q-inhalt', 'Fachlicher Inhalt', ['richtig, vollständig, eigenständig vertieft', 'richtig und weitgehend vollständig', 'lückenhaft oder mit Fehlern', 'kaum richtig, Wesentliches fehlt'], 2),
        k('q-produkt', 'Produkt', ['erfüllt alle Vorgaben, sorgfältig und ansprechend', 'erfüllt die Vorgaben', 'erfüllt Vorgaben nur teilweise', 'unvollständig oder fehlt'], 2),
        k('q-vorstellen', 'Vorstellung des Ergebnisses', ['überzeugend und verständlich', 'verständlich', 'unsicher oder unvollständig', 'kaum vorgestellt'])
      ] },
      { name: 'Arbeitsweise', gewicht: 1, einzeln: true, kriterien: [
        k('q-planung', 'Planung und Termine', ['selbstständig geplant, alle Termine gehalten', 'Plan vorhanden, Termine meist gehalten', 'oft Hilfe nötig, Termine verpasst', 'kein Plan, Abgabe verspätet']),
        k('q-beteiligung', 'Beteiligung und Zusammenarbeit', ['trägt die Gruppe, übernimmt Verantwortung', 'bringt sich zuverlässig ein', 'macht nur auf Aufforderung mit', 'kaum eigener Anteil'])
      ] }
    ]
  }
];

export const STANDARD_ANTEIL_PRODUKT = 50;

export const projektRasterAlle = (d: Pick<Daten, 'einstellungen'>): Raster[] => [
  ...(d.einstellungen.raster ?? []).filter((r) => r.art === 'projekt'), ...PROJEKT_VORLAGEN
];

export const projektRaster = (d: Pick<Daten, 'einstellungen'>, p: Pick<Projekt, 'rasterId'>): Raster =>
  projektRasterAlle(d).find((r) => r.id === p.rasterId) ?? PROJEKT_VORLAGEN[0];

/** Kriterien des Handlungsprodukts (einmal je Gruppe) und der Arbeitsweise (je Person). */
export const produktKriterien = (r: Raster) => r.bereiche.filter((b) => !b.einzeln).flatMap((b) => b.kriterien);
export const arbeitKriterien = (r: Raster) => r.bereiche.filter((b) => b.einzeln).flatMap((b) => b.kriterien);

export const kriteriumGewichtP = (p: Pick<Projekt, 'gewichte'>, kr: RasterKriterium) => p.gewichte?.[kr.id] ?? kr.gewicht ?? 1;
export const anteilProdukt = (r: Raster, p: Pick<Projekt, 'anteilProdukt'>) =>
  !arbeitKriterien(r).length ? 100 : !produktKriterien(r).length ? 0 : p.anteilProdukt ?? STANDARD_ANTEIL_PRODUKT;

/** Stufe eines Kriteriums für eine Person: eigene Stufe (nur Arbeitsweise), sonst die der Gruppe. */
export function stufeFuer(p: Pick<Projekt, 'einzelStufen'>, g: Pick<ProjektGruppe, 'stufen'>, sid: string | null, kid: string): number | undefined {
  return (sid ? p.einzelStufen?.[sid]?.[kid] : undefined) ?? g.stufen[kid];
}

const fmt = (x: number) => x.toLocaleString('de-DE', { maximumFractionDigits: 2 });

/** Stufen-Schnitt 1–4 in eine Note: FOS Stufe 4 = 15, 3 = 11, 2 = 7, 1 = 3 Punkte (Konstantin 26.11.: 15 muss gehen),
 *  OSZ wie das mündliche Raster (Stufe 4 → 1, Stufe 1 → 5). Linear, kaufmännisch gerundet. */
export function stufeZuNote(profil: Profil, schnitt: number): { note: number; text: string } {
  if (profil === 'FOS') {
    const roh = 3 + 4 * (schnitt - 1);
    const note = Math.max(0, Math.min(15, kaufm(roh)));
    return { note, text: `In Notenpunkte: 3 + 4 × (${fmt(schnitt)} − 1) = ${fmt(roh)} → ${note} Punkte (Stufe 4 = 15, 3 = 11, 2 = 7, 1 = 3)` };
  }
  const roh = 1 + ((4 - schnitt) * 4) / 3;
  const note = Math.max(1, Math.min(6, kaufm(roh)));
  return { note, text: `In die Note: 1 + (4 − ${fmt(schnitt)}) × 4/3 = ${fmt(roh)} → ${note} (Stufe 4 = 1, Stufe 1 = 5)` };
}

export interface TeilErgebnis { schnitt: number | null; offen: number; formel: string }

function teil(krit: RasterKriterium[], stufe: (kid: string) => number | undefined, p: Pick<Projekt, 'gewichte'>): TeilErgebnis {
  const gew = krit.filter((kr) => stufe(kr.id) !== undefined && kriteriumGewichtP(p, kr) > 0);
  const offen = krit.filter((kr) => stufe(kr.id) === undefined).length;
  const summe = gew.reduce((a, kr) => a + kriteriumGewichtP(p, kr), 0);
  if (!summe) return { schnitt: null, offen, formel: 'noch keine Stufe' };
  const schnitt = gew.reduce((a, kr) => a + stufe(kr.id)! * kriteriumGewichtP(p, kr), 0) / summe;
  return { schnitt, offen, formel: `(${gew.map((kr) => `${kr.name} ${stufe(kr.id)} × ${fmt(kriteriumGewichtP(p, kr))}`).join(' + ')}) : ${fmt(summe)} = ${fmt(schnitt)}` };
}

export interface ProjektErgebnis { produkt: TeilErgebnis; arbeit: TeilErgebnis; anteil: number; schnitt: number | null; note: number | null; offen: number; weg: string[] }

/**
 * Note einer Person (sid) oder der Gruppe ohne eigene Stufen (sid = null), E118:
 * Handlungsprodukt (Stufen der Gruppe) und Arbeitsweise (eigene Stufen, sonst die der Gruppe) je als gewichteter
 * Durchschnitt der Stufen, dann nach dem Anteil der Lehrkraft zusammen (Standard 50 : 50). Fehlt ein Teil, zählt der andere allein.
 */
export function projektErgebnis(raster: Raster, g: Pick<ProjektGruppe, 'stufen'>, sid: string | null, profil: Profil, p: Pick<Projekt, 'gewichte' | 'anteilProdukt' | 'einzelStufen'>): ProjektErgebnis {
  const produkt = teil(produktKriterien(raster), (kid) => g.stufen[kid], p);
  const arbeit = teil(arbeitKriterien(raster), (kid) => stufeFuer(p, g, sid, kid), p);
  const anteil = anteilProdukt(raster, p);
  const offen = produkt.offen + arbeit.offen;
  const weg: string[] = [];
  if (produktKriterien(raster).length) weg.push(`Handlungsprodukt: ${produkt.formel}`);
  if (arbeitKriterien(raster).length) weg.push(`Arbeitsweise${sid ? '' : ' (Vorgabe der Gruppe)'}: ${arbeit.formel}`);
  let schnitt: number | null = null;
  if (produkt.schnitt !== null && arbeit.schnitt !== null && anteil > 0 && anteil < 100) {
    schnitt = (produkt.schnitt * anteil + arbeit.schnitt * (100 - anteil)) / 100;
    weg.push(`Zusammen: ${fmt(produkt.schnitt)} × ${anteil} % + ${fmt(arbeit.schnitt)} × ${100 - anteil} % = ${fmt(schnitt)}`);
  } else {
    schnitt = anteil === 0 ? arbeit.schnitt : anteil === 100 ? produkt.schnitt : produkt.schnitt ?? arbeit.schnitt;
    if (schnitt !== null && anteil > 0 && anteil < 100) weg.push('Nur ein Teil bewertet, er zählt allein.');
  }
  if (schnitt === null) return { produkt, arbeit, anteil, schnitt, note: null, offen, weg: [...weg, 'Noch keine Note.'] };
  const n = stufeZuNote(profil, schnitt);
  weg.push(n.text);
  return { produkt, arbeit, anteil, schnitt, note: n.note, offen, weg };
}

/** Note der Gruppe (ohne eigene Stufen der Mitglieder), z. B. für die Gruppenliste. */
export const gruppenErgebnis = (raster: Raster, g: Pick<ProjektGruppe, 'stufen'>, profil: Profil, p: Pick<Projekt, 'gewichte' | 'anteilProdukt' | 'einzelStufen'>) =>
  projektErgebnis(raster, g, null, profil, p);

/** Eigene Stufe einer Person setzen; gleiche Stufe wie die Gruppe oder erneutes Antippen nimmt sie zurück. */
export function einzelStufeSetzen(p: Projekt, g: ProjektGruppe, sid: string, kid: string, st: 1 | 2 | 3 | 4) {
  p.einzelStufen ??= {};
  const eigen = { ...(p.einzelStufen[sid] ?? {}) };
  if (eigen[kid] === st || (eigen[kid] === undefined && g.stufen[kid] === st)) delete eigen[kid];
  else eigen[kid] = st;
  if (Object.keys(eigen).length) p.einzelStufen[sid] = eigen; else delete p.einzelStufen[sid];
}

export const gruppeVon = (p: Projekt, sid: string) => p.gruppen.find((g) => g.mitglieder.includes(sid));

/** Klassenmitglieder ohne Gruppe (z. B. bei der Einteilung abwesend oder neu in der Klasse). */
export const nichtEingeteilt = (kurs: Pick<Kurs, 'schueler'>, p: Projekt) => kurs.schueler.filter((id) => !gruppeVon(p, id));

export const laeuft = (p: Projekt, heute: string) => !p.abgeschlossen && p.von <= heute && heute <= p.bis;

/** Projekt, das heute läuft (das zuletzt angelegte, wenn mehrere). */
export const laufendesProjekt = (kurs: Pick<Kurs, 'projekte'>, heute: string) => kurs.projekte?.find((p) => laeuft(p, heute));

/** Neues Projekt aus Gruppen (Schüler-ids je Gruppe). */
export function neuesProjekt(
  daten: { titel: string; von: string; bis: string; rasterId: string; zaehltAls: Projekt['zaehltAls'] },
  gruppen: string[][], neueId: () => string
): Projekt {
  return {
    id: neueId(), ...daten,
    gruppen: gruppen.map((m, i) => ({ id: neueId(), name: `G${i + 1}`, thema: '', mitglieder: [...m], stufen: {}, notizen: [] }))
  };
}

/** Hält den Gruppensatz für den Sitzplan auf dem Stand des Projekts (legt ihn bei Bedarf an). */
export function satzAbgleichen(kurs: Kurs, p: Projekt, neueId: () => string) {
  kurs.gruppensaetze ??= [];
  let s = p.satzId ? kurs.gruppensaetze.find((x) => x.id === p.satzId) : undefined;
  if (!s) {
    s = { id: neueId(), name: '', datum: p.von, gruppen: [], projektId: p.id };
    kurs.gruppensaetze.unshift(s);
    p.satzId = s.id;
  }
  s.name = `Projekt: ${p.titel}`;
  s.projektId = p.id;
  s.gruppen = p.gruppen.map((g) => [...g.mitglieder]);
  return s;
}

/** Ein Mitglied in eine andere Gruppe verschieben (oder aus „nicht eingeteilt“ hinzufügen). */
export function verschieben(p: Projekt, sid: string, zielId: string) {
  for (const g of p.gruppen) g.mitglieder = g.mitglieder.filter((x) => x !== sid);
  p.gruppen.find((g) => g.id === zielId)?.mitglieder.push(sid);
}

export interface Beleg { fehlStunden: number; fehlTage: string[]; smileys: number; schnitt: number | null; zuSpaet: number }

/** Was L.E.O. im Projektzeitraum über ein Mitglied weiß: Fehlzeiten (E und UE), Smileys, Verspätungen. */
export function belegeMitglied(d: Pick<Daten, 'fehlzeiten' | 'mitarbeit' | 'verspaetungen'>, kursId: string, p: Pick<Projekt, 'von' | 'bis'>, sid: string): Beleg {
  const imZeitraum = (iso: string) => iso.slice(0, 10) >= p.von && iso.slice(0, 10) <= p.bis;
  const f = d.fehlzeiten.filter((x) => x.kursId === kursId && x.schuelerId === sid && imZeitraum(x.datum));
  const m = d.mitarbeit.filter((x) => x.kursId === kursId && x.schuelerId === sid && imZeitraum(x.zeit));
  const v = d.verspaetungen.filter((x) => x.kursId === kursId && x.schuelerId === sid && imZeitraum(x.datum));
  return {
    fehlStunden: f.reduce((a, x) => a + x.stunden, 0),
    fehlTage: [...new Set(f.map((x) => x.datum))].sort(),
    smileys: m.length,
    schnitt: m.length ? m.reduce((a, x) => a + x.stufe, 0) / m.length : null,
    zuSpaet: v.length
  };
}

/** Notenbuchspalte des Projekts suchen oder anlegen (hinter den anderen Spalten der Gruppe). */
export function projektSpalte(kurs: Kurs, p: Projekt, neueId: () => string): Leistung {
  let l = p.leistungId ? kurs.leistungen.find((x) => x.id === p.leistungId) : undefined;
  if (!l) {
    l = { id: neueId(), name: p.titel, art: 'Projekt', gruppe: p.zaehltAls, gewicht: 1, datum: p.bis };
    const letzte = kurs.leistungen.filter((x) => x.gruppe === p.zaehltAls).at(-1);
    kurs.leistungen.splice(letzte ? kurs.leistungen.indexOf(letzte) + 1 : kurs.leistungen.length, 0, l);
    p.leistungId = l.id;
  }
  l.name = p.titel;
  l.datum = p.bis;
  if (l.gruppe !== p.zaehltAls) l.gruppe = p.zaehltAls;
  return l;
}

/** Alle Einzelnoten ins Notenbuch schreiben. Wer (noch) keine Note hat, bleibt unverändert. */
export function insNotenbuch(kurs: Kurs, p: Projekt, raster: Raster, neueId: () => string): { leistung: Leistung; gesetzt: number; ohne: number } {
  const l = projektSpalte(kurs, p, neueId);
  let gesetzt = 0, ohne = 0;
  for (const g of p.gruppen) {
    for (const sid of g.mitglieder) {
      const n = projektErgebnis(raster, g, sid, kurs.profil, p).note;
      if (n === null) { ohne++; continue; }
      const key = zellSchluessel(l.id, sid);
      kurs.zellen[key] = { ...kurs.zellen[key], wert: n, status: undefined };
      gesetzt++;
    }
  }
  return { leistung: l, gesetzt, ohne };
}

/** Hinweise für die mündlichen Leistungen (Kriterium Zusammenarbeit): Projekte, die den Monat berühren. */
export function projektHinweise(kurs: Pick<Kurs, 'projekte'>, sid: string, monat: string): string[] {
  const out: string[] = [];
  for (const p of kurs.projekte ?? []) {
    if (p.von.slice(0, 7) > monat || p.bis.slice(0, 7) < monat) continue;
    const g = gruppeVon(p, sid);
    if (!g) continue;
    const eigen = Object.values(p.einzelStufen?.[sid] ?? {});
    const zusatz = eigen.length ? `, eigene Stufen Arbeitsweise ${eigen.join(', ')}` : '';
    out.push(`Projekt „${p.titel}“: ${g.name}${g.thema ? ` ${g.thema}` : ''}${zusatz}`);
  }
  return out;
}

// ---------- Rückmeldung per Mail (nur schulische Adresse, wie E105) ----------

export const PROJEKT_MAIL_STANDARD = {
  betreff: 'Rückmeldung {projekt} {fach}',
  text:
    'Hallo {vorname},\n\n' +
    'hier ist die Rückmeldung zu eurem Projekt „{projekt}“ ({gruppe}{thema}).\n\n' +
    'Handlungsprodukt (für die ganze Gruppe):\n{produkt}\n\n' +
    'Deine Arbeitsweise:\n{arbeitsweise}\n\n' +
    'Gewichtung: {anteile}\nDeine Note: {note}\n\n' +
    'Wenn du Fragen dazu hast, sprich mich gern an.\n\n' +
    'Viele Grüße'
};

export const PROJEKT_PLATZHALTER = ['vorname', 'nachname', 'projekt', 'fach', 'klasse', 'gruppe', 'thema', 'produkt', 'arbeitsweise', 'anteile', 'gruppennote', 'note'] as const;

export function projektMailWerte(kurs: Kurs, p: Projekt, raster: Raster, s: Schueler): Record<string, string> {
  const g = gruppeVon(p, s.id);
  const e = g ? projektErgebnis(raster, g, s.id, kurs.profil, p) : null;
  const gn = g ? gruppenErgebnis(raster, g, kurs.profil, p).note : null;
  const einheit = (x: number | null) => (x === null ? 'noch offen' : kurs.profil === 'FOS' ? `${x} Punkte` : String(x));
  const liste = (krit: RasterKriterium[], sid: string | null) => krit.map((kr) => {
    const st = g ? stufeFuer(p, g, sid, kr.id) : undefined;
    return `- ${kr.name}: ${st ? `Stufe ${st} von 4, ${kr.stufen[4 - st]}` : 'nicht eingeschätzt'}`;
  }).join('\n') || '- (keine Kriterien)';
  const anteil = anteilProdukt(raster, p);
  return {
    vorname: s.vorname, nachname: s.nachname, projekt: p.titel, fach: kurs.fach, klasse: kurs.klasse,
    gruppe: g?.name ?? '–', thema: g?.thema ? `, ${g.thema}` : '',
    produkt: liste(produktKriterien(raster), null), arbeitsweise: liste(arbeitKriterien(raster), s.id),
    anteile: `Handlungsprodukt ${anteil} %, Arbeitsweise ${100 - anteil} %`,
    gruppennote: einheit(gn), note: einheit(e?.note ?? null)
  };
}
