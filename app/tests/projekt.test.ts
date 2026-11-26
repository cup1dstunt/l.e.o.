// Prüft die Gruppenarbeit (P9, E118). Aufruf: npm test
import { PROJEKT_VORLAGEN, gruppenErgebnis, projektErgebnis, einzelStufeSetzen, stufeZuNote, neuesProjekt, nichtEingeteilt, verschieben, satzAbgleichen, insNotenbuch, belegeMitglied, laufendesProjekt, projektHinweise, projektMailWerte, projektRasterAlle } from '../src/lib/projekt.ts';
import { satzKuerzen } from '../src/lib/gruppen.ts';
import { alleRaster } from '../src/lib/raster.ts';
import type { Kurs, Schueler } from '../src/lib/typen.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}
let n = 0;
const id = () => `x${n++}`;
const raster = PROJEKT_VORLAGEN[0]; // Präsentation: Inhalt ×2, sonst ×1

function kurs(profil: 'FOS' | 'OSZ'): Kurs {
  return {
    id: 'k', name: 'K', fach: 'Englisch', klasse: '2FOS', raum: '1', profil, schueler: ['a', 'b', 'c', 'd', 'e'],
    leistungen: [{ id: 't1', name: 'Test 1', art: 'Test', gruppe: 'sl', gewicht: 1 }],
    gewichte: { klausuren: 0.5, sonstige: 0.5, mitarbeit: 0.5, sl: 0.5 }, zellen: {}, endnoten: {}, stundenGehalten: 0,
    lernstoff: {}, uebergang: null, sitzplan: { vorlage: 'x', spalten: 1, reihen: 1, tische: [true], belegung: {} }
  };
}

// Präsentation: Handlungsprodukt Inhalt ×2, Aufbau, Medien; Arbeitsweise (je Person) Vortrag, Beteiligung
const alle4 = Object.fromEntries(raster.bereiche.flatMap((b) => b.kriterien).map((k) => [k.id, 4])) as Record<string, 4>;
{
  gleich('FOS beste', gruppenErgebnis(raster, { stufen: alle4 }, 'FOS', {}).note, 15);
  gleich('OSZ beste', gruppenErgebnis(raster, { stufen: alle4 }, 'OSZ', {}).note, 1);
  gleich('FOS Stufen', [1, 2, 3].map((st) => stufeZuNote('FOS', st).note), [3, 7, 11]);
  gleich('OSZ Stufen', [1, 2, 3].map((st) => stufeZuNote('OSZ', st).note), [5, 4, 2]);
  // Produkt: Inhalt 2 (×2), Aufbau 4, Medien 4 → 3; Arbeitsweise 4 → 50:50 = 3,5 → 3 + 4 × 2,5 = 13
  const e = gruppenErgebnis(raster, { stufen: { ...alle4, 'p-inhalt': 2 } }, 'FOS', {});
  gleich('Teile', [e.produkt.schnitt, e.arbeit.schnitt, e.anteil, e.note], [3, 4, 50, 13]);
  // Anteil 70 % Produkt: 3 × 0,7 + 4 × 0,3 = 3,3 → 12,2 → 12
  gleich('Anteil 70', gruppenErgebnis(raster, { stufen: { ...alle4, 'p-inhalt': 2 } }, 'FOS', { anteilProdukt: 70 }).note, 12);
  // eigenes Gewicht im Projekt: Inhalt ×0 → nur die anderen zählen
  gleich('Gewicht 0', gruppenErgebnis(raster, { stufen: { ...alle4, 'p-inhalt': 1 } }, 'FOS', { gewichte: { 'p-inhalt': 0 } }).note, 15);
  gleich('leer', gruppenErgebnis(raster, { stufen: {} }, 'FOS', {}).note, null);
  // nur Produkt bewertet: zählt allein
  gleich('nur Produkt', gruppenErgebnis(raster, { stufen: { 'p-inhalt': 3, 'p-aufbau': 3, 'p-medien': 3 } }, 'FOS', {}).note, 11);
  // Person mit eigener Beteiligung 1: Arbeitsweise (4 + 1) / 2 = 2,5; zusammen (4 + 2,5) / 2 = 3,25 → 12
  gleich('eigene Stufe', projektErgebnis(raster, { stufen: alle4 }, 'x', 'FOS', { einzelStufen: { x: { 'p-beteiligung': 1 } } }).note, 12);
}

// Eigene Stufe setzen: nochmal antippen oder gleiche Stufe wie die Gruppe nimmt sie zurück
{
  const p = {} as Parameters<typeof einzelStufeSetzen>[0];
  const g = { stufen: { 'p-beteiligung': 3 } } as unknown as Parameters<typeof einzelStufeSetzen>[1];
  einzelStufeSetzen(p, g, 'x', 'p-beteiligung', 4);
  gleich('gesetzt', p.einzelStufen, { x: { 'p-beteiligung': 4 } });
  einzelStufeSetzen(p, g, 'x', 'p-beteiligung', 4);
  gleich('zurück', p.einzelStufen, {});
  einzelStufeSetzen(p, g, 'x', 'p-beteiligung', 3);
  gleich('wie Gruppe = nichts', p.einzelStufen, {});
}

// Projekt anlegen, Nachzügler einteilen, Sitzplan-Satz abgleichen
{
  const k = kurs('FOS');
  const p = neuesProjekt({ titel: 'Podcast', von: '2026-11-02', bis: '2026-12-11', rasterId: raster.id, zaehltAls: 'sl' }, [['a', 'b'], ['c', 'd']], id);
  k.projekte = [p];
  gleich('Namen', p.gruppen.map((g) => g.name), ['G1', 'G2']);
  gleich('nicht eingeteilt', nichtEingeteilt(k, p), ['e']);
  verschieben(p, 'e', p.gruppen[0].id);
  verschieben(p, 'b', p.gruppen[1].id);
  gleich('verschoben', p.gruppen.map((g) => g.mitglieder), [['a', 'e'], ['c', 'd', 'b']]);
  const s = satzAbgleichen(k, p, id);
  gleich('Satz', s.gruppen, [['a', 'e'], ['c', 'd', 'b']]);
  gleich('Satz gehört zum Projekt', s.projektId, p.id);
  satzAbgleichen(k, p, id);
  gleich('kein zweiter Satz', k.gruppensaetze!.length, 1);
  gleich('läuft', laufendesProjekt(k, '2026-11-25')?.id, p.id);
  gleich('läuft nicht mehr', laufendesProjekt(k, '2026-12-12'), undefined);

  // Notenbuch: Spalte unter Tests/Sonstiges, Einzelnoten mit eigener Arbeitsweise, ohne Stufen bleibt leer
  p.gruppen[0].stufen = { ...alle4, 'p-inhalt': 2 }; // Gruppe 13
  p.einzelStufen = { a: { 'p-vortrag': 4, 'p-beteiligung': 4 }, e: { 'p-beteiligung': 1 } }; // a 13; e: Arbeitsweise 2,5, zusammen 2,75 → 10
  k.zellen['vorher:e'] = { wert: 3 };
  const r = insNotenbuch(k, p, raster, id);
  gleich('gesetzt/ohne', [r.gesetzt, r.ohne], [2, 3]);
  gleich('Spalte', [r.leistung.gruppe, r.leistung.art, r.leistung.name, k.leistungen.indexOf(r.leistung)], ['sl', 'Projekt', 'Podcast', 1]);
  gleich('Noten', [k.zellen[`${r.leistung.id}:a`]?.wert, k.zellen[`${r.leistung.id}:e`]?.wert, k.zellen[`${r.leistung.id}:c`]], [13, 10, undefined]);
  // zweites Übernehmen: gleiche Spalte, Wechsel zu mündlich verschiebt sie
  p.zaehltAls = 'mitarbeit';
  const r2 = insNotenbuch(k, p, raster, id);
  gleich('gleiche Spalte', r2.leistung.id, r.leistung.id);
  gleich('jetzt mündlich', r2.leistung.gruppe, 'mitarbeit');
  gleich('Hinweis mündlich', projektHinweise(k, 'a', '2026-11'), ['Projekt „Podcast“: G1, eigene Stufen Arbeitsweise 4, 4']);
  gleich('kein Hinweis anderer Monat', projektHinweise(k, 'a', '2027-01'), []);

  const s1: Schueler = { id: 'a', vorname: 'Ada', nachname: 'A', geburt: '', geschlecht: 'w', mailDienst: '' };
  const w = projektMailWerte(k, p, raster, s1);
  gleich('Mail Noten', [w.gruppennote, w.note, w.anteile], ['13 Punkte', '13 Punkte', 'Handlungsprodukt 50 %, Arbeitsweise 50 %']);
  gleich('Mail Kriterium', w.produkt.split('\n')[0], '- Fachlicher Inhalt: Stufe 2 von 4, lückenhaft oder mit Fehlern');
}

// Belege im Zeitraum
{
  const d = {
    fehlzeiten: [
      { id: '1', kursId: 'k', schuelerId: 'a', datum: '2026-11-10', stunden: 2, status: 'E' as const },
      { id: '2', kursId: 'k', schuelerId: 'a', datum: '2026-10-01', stunden: 2, status: 'UE' as const }
    ],
    mitarbeit: [{ id: 'm', kursId: 'k', schuelerId: 'a', zeit: '2026-11-12T09:00:00Z', stufe: 2 as const, bausteine: [] }],
    verspaetungen: []
  };
  gleich('Belege', belegeMitglied(d, 'k', { von: '2026-11-02', bis: '2026-12-11' }, 'a'), { fehlStunden: 2, fehlTage: ['2026-11-10'], smileys: 1, schnitt: 2, zuSpaet: 0 });
}

// Gruppensätze kürzen: Projektsätze bleiben
{
  const saetze = Array.from({ length: 15 }, (_, i) => ({ id: String(i), ...(i === 13 ? { projektId: 'p' } : {}) }));
  const k = satzKuerzen(saetze);
  gleich('gekürzt', k.length, 13);
  gleich('Projekt bleibt', k.some((s) => s.id === '13'), true);
}

// Projektraster stehen nicht im mündlichen Raster und umgekehrt
{
  const d = { einstellungen: { raster: [{ ...PROJEKT_VORLAGEN[1], id: 'eigen', vorlage: undefined }] } } as never;
  gleich('mündlich ohne Projektraster', alleRaster(d).some((r) => r.art === 'projekt'), false);
  gleich('Projektraster mit eigenem', projektRasterAlle(d).map((r) => r.id), ['eigen', 'pv-praesentation', 'pv-projekt']);
}

console.log(`projekt: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
