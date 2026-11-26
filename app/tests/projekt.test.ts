// Prüft die Gruppenarbeit (P9, E118). Aufruf: npm test
import { PROJEKT_VORLAGEN, gruppenErgebnis, einzelNote, neuesProjekt, nichtEingeteilt, verschieben, satzAbgleichen, insNotenbuch, belegeMitglied, laufendesProjekt, projektHinweise, projektMailWerte, projektRasterAlle } from '../src/lib/projekt.ts';
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

// Gruppennote wie das mündliche Raster: alle Stufe 4 → Smiley 1 → FOS 14, OSZ 1
{
  const alle4 = Object.fromEntries(raster.bereiche.flatMap((b) => b.kriterien).map((k) => [k.id, 4])) as Record<string, 4>;
  gleich('FOS beste', gruppenErgebnis(raster, { stufen: alle4 }, 'FOS', {}).note, 14);
  gleich('OSZ beste', gruppenErgebnis(raster, { stufen: alle4 }, 'OSZ', {}).note, 1);
  // Inhalt 2 (×2), Rest 4: (2·2 + 4·4) / 6 = 3,33 → Smiley 1,89 → FOS 17 − 5,67 = 11,33 → 11
  gleich('gewichtet', gruppenErgebnis(raster, { stufen: { ...alle4, 'p-inhalt': 2 } }, 'FOS', {}).note, 11);
  // eigenes Gewicht im Projekt: Inhalt ×0 → nur die anderen zählen
  gleich('Gewicht 0', gruppenErgebnis(raster, { stufen: { ...alle4, 'p-inhalt': 1 } }, 'FOS', { gewichte: { 'p-inhalt': 0 } }).note, 14);
  gleich('leer', gruppenErgebnis(raster, { stufen: {} }, 'FOS', {}).note, null);
}

// Abweichung: besser = mehr Punkte (FOS) bzw. kleinere Note (OSZ), mit Grenzen
gleich('FOS besser', einzelNote('FOS', 11, 2), 13);
gleich('FOS Grenze', einzelNote('FOS', 14, 3), 15);
gleich('FOS schlechter', einzelNote('FOS', 2, -3), 0);
gleich('OSZ besser', einzelNote('OSZ', 3, 1), 2);
gleich('OSZ Grenze', einzelNote('OSZ', 5, -3), 6);
gleich('ohne Gruppennote', einzelNote('OSZ', null, 1), null);

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

  // Notenbuch: Spalte unter Tests/Sonstiges, Einzelnoten mit Abweichung, ohne Gruppennote bleibt leer
  const alle4 = Object.fromEntries(raster.bereiche.flatMap((b) => b.kriterien).map((kr) => [kr.id, 4]));
  p.gruppen[0].stufen = { ...alle4, 'p-inhalt': 2 }; // 11
  p.abweichung = { a: { schritte: 1, grund: 'trägt die Gruppe' }, e: { schritte: -2 } };
  k.zellen['vorher:e'] = { wert: 3 };
  const r = insNotenbuch(k, p, raster, id);
  gleich('gesetzt/ohne', [r.gesetzt, r.ohne], [2, 3]);
  gleich('Spalte', [r.leistung.gruppe, r.leistung.art, r.leistung.name, k.leistungen.indexOf(r.leistung)], ['sl', 'Projekt', 'Podcast', 1]);
  gleich('Noten', [k.zellen[`${r.leistung.id}:a`]?.wert, k.zellen[`${r.leistung.id}:e`]?.wert, k.zellen[`${r.leistung.id}:c`]], [12, 9, undefined]);
  // zweites Übernehmen: gleiche Spalte, Wechsel zu mündlich verschiebt sie
  p.zaehltAls = 'mitarbeit';
  const r2 = insNotenbuch(k, p, raster, id);
  gleich('gleiche Spalte', r2.leistung.id, r.leistung.id);
  gleich('jetzt mündlich', r2.leistung.gruppe, 'mitarbeit');
  gleich('Hinweis mündlich', projektHinweise(k, 'a', '2026-11'), ['Projekt „Podcast“: G1, besser als die Gruppe (trägt die Gruppe)']);
  gleich('kein Hinweis anderer Monat', projektHinweise(k, 'a', '2027-01'), []);

  const s1: Schueler = { id: 'a', vorname: 'Ada', nachname: 'A', geburt: '', geschlecht: 'w', mailDienst: '' };
  const w = projektMailWerte(k, p, raster, s1);
  gleich('Mail Noten', [w.gruppennote, w.note], ['11 Punkte', '12 Punkte']);
  gleich('Mail Kriterium', w.kriterien.split('\n')[0], '- Fachlicher Inhalt: Stufe 2 von 4, lückenhaft oder mit Fehlern');
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
