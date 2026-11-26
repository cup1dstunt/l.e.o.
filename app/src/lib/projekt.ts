// Gruppenarbeit (P9, E116): feste Gruppen über mehrere Stunden bis ein Halbjahr, z. B. Podcast oder Präsentation.
// Die Gruppe bekommt eine Note aus dem Projektraster, jedes Mitglied kann davon abweichen (besser oder schlechter,
// mit Grund). Die Einzelnoten landen als eine Spalte im Notenbuch, unter Tests/Sonstiges oder mündlich.
// Reine Logik ohne Oberfläche, deshalb einzeln testbar.
import type { Daten, Kurs, Leistung, Profil, Projekt, ProjektGruppe, Raster, RasterKriterium, Schueler } from './typen.ts';
import { rasterErgebnis, type RasterErgebnis } from './raster.ts';
import { zellSchluessel } from './rechnen.ts';

type Stufen4 = [string, string, string, string];
const k = (id: string, name: string, stufen: Stufen4, gewicht?: number): RasterKriterium => ({ id, name, stufen, ...(gewicht ? { gewicht } : {}) });

/** Eingebaute Projektraster: höchstens 5 Kriterien, Stufe 4 = beste. Texte beschreiben das Gruppenergebnis. */
export const PROJEKT_VORLAGEN: Raster[] = [
  {
    id: 'pv-praesentation', name: 'Präsentation', fach: '', vorlage: true, art: 'projekt',
    bereiche: [
      { name: 'Inhalt', gewicht: 1, kriterien: [
        k('p-inhalt', 'Fachlicher Inhalt', ['richtig, vollständig, eigenständig vertieft', 'richtig und weitgehend vollständig', 'lückenhaft oder mit Fehlern', 'kaum richtig, Wesentliches fehlt'], 2),
        k('p-aufbau', 'Aufbau', ['klarer roter Faden, Einstieg und Schluss', 'nachvollziehbar gegliedert', 'Gliederung schwer erkennbar', 'ohne erkennbaren Aufbau'])
      ] },
      { name: 'Vortrag', gewicht: 1, kriterien: [
        k('p-vortrag', 'Vortrag und Sprache', ['frei, sicher, gut verständlich', 'meist frei und verständlich', 'oft abgelesen oder schwer verständlich', 'nur abgelesen, kaum verständlich']),
        k('p-medien', 'Medien und Visualisierung', ['unterstützen den Vortrag treffend', 'passend und lesbar', 'überladen oder wenig hilfreich', 'fehlen oder stören']),
        k('p-fragen', 'Zeit und Rückfragen', ['Zeit eingehalten, Fragen sicher beantwortet', 'Zeit fast eingehalten, Fragen meist beantwortet', 'Zeit deutlich verfehlt oder Fragen unsicher', 'Fragen nicht beantwortet'])
      ] }
    ]
  },
  {
    id: 'pv-projekt', name: 'Projekt mit Produkt', fach: '', vorlage: true, art: 'projekt',
    bereiche: [
      { name: 'Ergebnis', gewicht: 1, kriterien: [
        k('q-inhalt', 'Fachlicher Inhalt', ['richtig, vollständig, eigenständig vertieft', 'richtig und weitgehend vollständig', 'lückenhaft oder mit Fehlern', 'kaum richtig, Wesentliches fehlt'], 2),
        k('q-produkt', 'Produkt', ['erfüllt alle Vorgaben, sorgfältig und ansprechend', 'erfüllt die Vorgaben', 'erfüllt Vorgaben nur teilweise', 'unvollständig oder fehlt'], 2),
        k('q-vorstellen', 'Vorstellung des Ergebnisses', ['überzeugend und verständlich', 'verständlich', 'unsicher oder unvollständig', 'kaum vorgestellt'])
      ] },
      { name: 'Prozess', gewicht: 1, kriterien: [
        k('q-planung', 'Planung und Termine', ['selbstständig geplant, alle Termine gehalten', 'Plan vorhanden, Termine meist gehalten', 'oft Hilfe nötig, Termine verpasst', 'kein Plan, Abgabe verspätet']),
        k('q-doku', 'Dokumentation', ['vollständig und nachvollziehbar', 'weitgehend vollständig', 'lückenhaft', 'fehlt'])
      ] }
    ]
  }
];

/** Gründe für eine Abweichung vom Gruppenergebnis, zum Antippen. */
export const GRUENDE_BESSER = ['trägt die Gruppe', 'großer eigener Anteil', 'hilft anderen'];
export const GRUENDE_SCHLECHTER = ['wenig eigener Anteil', 'Termine nicht eingehalten', 'oft gefehlt'];

/** Höchstens so viele Schritte (Punkte bzw. Noten) Abweichung von der Gruppennote. */
export const SCHRITT_MAX = 3;

export const projektRasterAlle = (d: Pick<Daten, 'einstellungen'>): Raster[] => [
  ...(d.einstellungen.raster ?? []).filter((r) => r.art === 'projekt'), ...PROJEKT_VORLAGEN
];

export const projektRaster = (d: Pick<Daten, 'einstellungen'>, p: Pick<Projekt, 'rasterId'>): Raster =>
  projektRasterAlle(d).find((r) => r.id === p.rasterId) ?? PROJEKT_VORLAGEN[0];

/** Ergebnis der Gruppe: gleiche Rechnung wie das mündliche Raster (E113), mit den Gewichten des Projekts. */
export function gruppenErgebnis(raster: Raster, g: Pick<ProjektGruppe, 'stufen'>, profil: Profil, p: Pick<Projekt, 'gewichte'>): RasterErgebnis {
  return rasterErgebnis(raster, g.stufen, profil, { muendlich: { rasterId: raster.id, mindestSmileys: 0, gewichte: p.gewichte } });
}

/** Einzelnote: Gruppennote plus Abweichung. „Besser“ heißt bei FOS mehr Punkte, bei OSZ eine kleinere Note. */
export function einzelNote(profil: Profil, gruppenNote: number | null, schritte = 0): number | null {
  if (gruppenNote === null) return null;
  return profil === 'FOS' ? Math.max(0, Math.min(15, gruppenNote + schritte)) : Math.max(1, Math.min(6, gruppenNote - schritte));
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
    id: neueId(), ...daten, abweichung: {},
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
    const gn = gruppenErgebnis(raster, g, kurs.profil, p).note;
    for (const sid of g.mitglieder) {
      const n = einzelNote(kurs.profil, gn, p.abweichung[sid]?.schritte ?? 0);
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
    const a = p.abweichung[sid];
    const abw = a?.schritte ? `, ${a.schritte > 0 ? 'besser' : 'schlechter'} als die Gruppe${a.grund ? ` (${a.grund})` : ''}` : '';
    out.push(`Projekt „${p.titel}“: ${g.name}${g.thema ? ` ${g.thema}` : ''}${abw}`);
  }
  return out;
}

// ---------- Rückmeldung per Mail (nur schulische Adresse, wie E105) ----------

export const PROJEKT_MAIL_STANDARD = {
  betreff: 'Rückmeldung {projekt} {fach}',
  text:
    'Hallo {vorname},\n\n' +
    'hier ist die Rückmeldung zu eurem Projekt „{projekt}“ ({gruppe}{thema}).\n\n' +
    'So habe ich euer Ergebnis eingeschätzt:\n{kriterien}\n\n' +
    'Gruppennote: {gruppennote}\nDeine Note: {note}{begruendung}\n\n' +
    'Wenn du Fragen dazu hast, sprich mich gern an.\n\n' +
    'Viele Grüße'
};

export const PROJEKT_PLATZHALTER = ['vorname', 'nachname', 'projekt', 'fach', 'klasse', 'gruppe', 'thema', 'kriterien', 'gruppennote', 'note', 'begruendung'] as const;

export function projektMailWerte(kurs: Kurs, p: Projekt, raster: Raster, s: Schueler): Record<string, string> {
  const g = gruppeVon(p, s.id);
  const gn = g ? gruppenErgebnis(raster, g, kurs.profil, p).note : null;
  const a = p.abweichung[s.id];
  const n = einzelNote(kurs.profil, gn, a?.schritte ?? 0);
  const einheit = (x: number | null) => (x === null ? 'noch offen' : kurs.profil === 'FOS' ? `${x} Punkte` : String(x));
  const kriterien = raster.bereiche.flatMap((b) => b.kriterien).map((kr) => {
    const st = g?.stufen[kr.id];
    return `- ${kr.name}: ${st ? `Stufe ${st} von 4, ${kr.stufen[4 - st]}` : 'nicht eingeschätzt'}`;
  }).join('\n');
  return {
    vorname: s.vorname, nachname: s.nachname, projekt: p.titel, fach: kurs.fach, klasse: kurs.klasse,
    gruppe: g?.name ?? '–', thema: g?.thema ? `, ${g.thema}` : '', kriterien,
    gruppennote: einheit(gn), note: einheit(n),
    begruendung: a?.schritte ? `\nAbweichung von der Gruppennote: ${a.schritte > 0 ? 'besser' : 'schlechter'}${a.grund ? `, weil: ${a.grund}` : ''}` : ''
  };
}
