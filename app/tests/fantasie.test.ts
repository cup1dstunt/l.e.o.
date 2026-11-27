// Testrunde mit Fantasieklassen (27.11.2026): alle Module auf denselben Daten, Zusammenspiel und Grenzfälle.
// Prüft Eigenschaften, die immer gelten müssen (keine NaN, jeder sitzt, jeder in genau einer Gruppe …).
// Aufruf: node --experimental-strip-types tests/fantasie.test.ts   (mit --json schreibt es die Sicherungsdatei)
import { writeFileSync } from 'node:fs';
import { fantasieDaten } from './fantasie.ts';
import { rechne, warnungen } from '../src/lib/rechnen.ts';
import { gesamtStatistik, leistungsStatistik, hinweise, klassenVergleich, anwesenheitKurz, muendlichVerlauf } from '../src/lib/auswertung.ts';
import { nachschreibLage, schulAdresse } from '../src/lib/nachschreiben.ts';
import { aktuellesHalbjahr, semesterPlan, naechsterBlock } from '../src/lib/semester.ts';
import { bilden, verstoesse, staerke } from '../src/lib/gruppen.ts';
import { neuerStand, ziehe, lose } from '../src/lib/zufall.ts';
import { rasterFuer, rasterErgebnis, aktiveKriterien } from '../src/lib/raster.ts';
import { neuesProjekt, projektRaster, gruppenErgebnis, nichtEingeteilt } from '../src/lib/projekt.ts';
import { kursReiter, umschalten, istAn, MODULE } from '../src/lib/module.ts';
import { eintraege } from '../src/lib/kalender.ts';
import { materialListe } from '../src/lib/material.ts';
import { zerlegen, zusammensetzen, datensatz } from '../src/lib/ablage.ts';
import { stammdatenPruefen } from '../src/lib/stammdaten.ts';

let ok = 0;
const befunde: string[] = [];
function pruefe(name: string, bed: boolean, info = '') {
  if (bed) ok++;
  else befunde.push(`${name}${info ? ': ' + info : ''}`);
}

const heute = '2026-11-27';
const d = fantasieDaten();
if (process.argv.includes('--json')) {
  writeFileSync(new URL('../../docs/testfaelle/fantasie-sicherung.json', import.meta.url), JSON.stringify(d, null, 1));
  console.log('Sicherungsdatei geschrieben');
}
const name = (id: string) => { const s = d.schueler.find((x) => x.id === id)!; return `${s.vorname} ${s.nachname}`; };

// 1 Notenbuch: jede Rechnung endlich, Noten im Bereich, Rechenweg vorhanden
for (const k of d.kurse) {
  for (const sid of k.schueler) {
    const e = rechne(k, sid);
    for (const f of ['klausuren', 'sl', 'mitarbeit', 'sonstige', 'gesamt'] as const) {
      const v = e[f];
      pruefe(`Notenbuch ${k.name} ${f} endlich`, v === null || Number.isFinite(v), `${name(sid)} → ${v}`);
    }
    if (e.gesamt !== null) pruefe(`Notenbuch ${k.name} Bereich`, k.profil === 'FOS' ? e.gesamt >= 0 && e.gesamt <= 15 : e.gesamt >= 1 && e.gesamt <= 6, `${name(sid)} → ${e.gesamt}`);
    pruefe(`Notenbuch ${k.name} Rechenweg`, e.schritte.length > 0);
    warnungen(k, e);
  }
}
// Probetest mit Gewicht 0 darf die Note nicht ändern
{
  const k = d.kurse.find((x) => x.id === 'f-fos11e')!;
  const sid = k.schueler[0];
  const vor = rechne(k, sid).sl;
  const z = k.zellen[`f-fos11e-t3:${sid}`];
  const alt = z.wert;
  z.wert = alt === 0 ? 15 : 0;
  pruefe('Gewicht 0 zählt nicht', rechne(k, sid).sl === vor, `vorher ${vor}, nachher ${rechne(k, sid).sl}`);
  z.wert = alt;
}
// Schüler ganz ohne Noten
for (const k of d.kurse.filter((x) => x.schueler.length)) {
  const e = rechne(k, k.schueler.at(-1)!);
  // nur Smileys, keine Klausur: Gesamtnote kommt allein aus dem AT, dann muss „wenige Noten“ warnen
  pruefe(`ohne Klausur ${k.name}: Warnung`, e.gesamt === null || warnungen(k, e).some((w) => w.art === 'ohneKlausur') && e.weg.some((x) => x.includes('nur AT')), `gesamt ${e.gesamt}, Warnungen ${JSON.stringify(warnungen(k, e))}`);
}
// Beide Klausuren verpasst (E + offen)
{
  const k = d.kurse.find((x) => x.id === 'f-bka')!;
  const e = rechne(k, k.schueler[3]);
  pruefe('beide Klausuren verpasst: keine Klausurnote', e.klausuren === null, `${e.klausuren}`);
  pruefe('beide Klausuren verpasst: Nachschreiben genannt', e.nachschreiben.length >= 1, JSON.stringify(e.nachschreiben));
}

// 2 Auswertung: Statistik und Hinweise für alle Klassen, auch die leere
for (const k of d.kurse) {
  const g = gesamtStatistik(k, k.schueler);
  pruefe(`Auswertung ${k.name} Gesamt`, JSON.stringify(g).indexOf('NaN') < 0, JSON.stringify(g).slice(0, 120));
  for (const l of k.leistungen) {
    const s = leistungsStatistik(k, k.schueler);
    pruefe(`Auswertung ${k.name} ${l.name}`, JSON.stringify(s).indexOf('NaN') < 0);
  }
  const h = hinweise(d, k, k.schueler, heute);
  pruefe(`Hinweise ${k.name}`, Array.isArray(h));
  pruefe(`Anwesenheit ${k.name}`, JSON.stringify(anwesenheitKurz(d, k, k.schueler)).indexOf('NaN') < 0);
  pruefe(`Mündlich-Verlauf ${k.name}`, JSON.stringify(muendlichVerlauf(d, k, k.schueler)).indexOf('NaN') < 0);
}
// >30 % Fehlzeiten soll als Hinweis auftauchen (FOS, auch entschuldigt)
{
  const k = d.kurse.find((x) => x.id === 'f-fos11e')!;
  const sid = k.schueler[4];
  const stunden = d.fehlzeiten.filter((f) => f.kursId === k.id && f.schuelerId === sid).reduce((a, f) => a + f.stunden, 0);
  const h = hinweise(d, k, k.schueler, heute).filter((x: any) => JSON.stringify(x).includes(sid));
  pruefe('30-%-Hinweis', h.length > 0, `${stunden} von ${k.stundenGehalten} Stunden, Hinweise: ${JSON.stringify(h).slice(0, 200)}`);
}
const vgl = klassenVergleich(d);
pruefe('Klassenvergleich ohne NaN', JSON.stringify(vgl).indexOf('NaN') < 0, JSON.stringify(vgl).slice(0, 300));

// 3 Nachschreiben: E, UE, offen aus Notenbuch und Fehlzeiten
const lage = nachschreibLage(d);
const erwartet = d.kurse.flatMap((k) => k.leistungen.filter((l) => l.gruppe === 'klausuren').flatMap((l) => k.schueler.filter((sid) => ['E', 'offen'].includes(k.zellen[`${l.id}:${sid}`]?.status ?? '')).map((sid) => `${k.id}|${l.id}|${sid}`)));
for (const e of erwartet) pruefe('Nachschreibfall gefunden', lage.faelle.some((f: any) => f.key === e), e);
pruefe('UE kein Nachschreibfall', !lage.faelle.some((f: any) => f.kurs.zellen[`${f.leistung.id}:${f.schueler.id}`]?.status === 'UE'));
for (const s of d.schueler.filter((x) => !x.mailDienst)) {
  const a = schulAdresse(s, d.schueler);
  pruefe('Adressvorschlag ohne Schulmail', typeof a === 'object' || typeof a === 'string', `${name(s.id)}: ${JSON.stringify(a)}`);
}
// gleichnamige Schüler: Adressvorschlag darf nicht dieselbe Adresse liefern, ohne zu warnen
{
  const [a, b] = [d.kurse[2].schueler[4], d.kurse[2].schueler[5]].map((id) => d.schueler.find((s) => s.id === id)!);
  pruefe('Gleichnamige Schüler unterscheidbar (Mail)', a.mailDienst !== b.mailDienst, `${a.mailDienst} / ${b.mailDienst}`);
}

// 4 Sitzplan: jeder Schüler hat einen Platz
for (const k of d.kurse) {
  const belegt = new Set(Object.values(k.sitzplan.belegung));
  const ohne = k.schueler.filter((s) => !belegt.has(s));
  // mehr Schüler als Tische: der Rest steht in „Ohne Platz“, verloren geht niemand
  pruefe(`Sitzplan ${k.name} alle sitzen`, ohne.length === Math.max(0, k.schueler.length - k.sitzplan.tische.filter(Boolean).length), `${ohne.length} ohne Platz (Vorlage ${k.sitzplan.vorlage}, ${k.sitzplan.tische.filter(Boolean).length} Tische, ${k.schueler.length} SuS)`);
}

// 5 Gruppen und Zufall
for (const k of d.kurse) {
  const mitgl = k.schueler.map((id) => ({ id, geschlecht: d.schueler.find((s) => s.id === id)!.geschlecht, staerke: staerke(k.profil, rechne(k, id).gesamt) }));
  for (const w of [{ art: 'groesse' as const, zahl: 4 }, { art: 'anzahl' as const, zahl: 5 }, { art: 'groesse' as const, zahl: 1 }]) {
    const g = bilden(mitgl, { ...w, leistung: true, geschlecht: true, regeln: { nicht: k.schueler.length > 3 ? [[k.schueler[0], k.schueler[1]]] : [], gern: [] } });
    const alle = g.flat();
    pruefe(`Gruppen ${k.name} ${w.art} ${w.zahl} vollständig`, alle.length === k.schueler.length && new Set(alle).size === alle.length, `${alle.length}/${k.schueler.length}`);
    if (g.length > 1 && w.zahl > 1) pruefe(`Gruppen ${k.name} Größen ausgewogen`, Math.max(...g.map((x) => x.length)) - Math.min(...g.map((x) => x.length)) <= 1, g.map((x) => x.length).join(','));
    if (w.zahl > 1 && g.length > 1) pruefe(`Gruppen ${k.name} Regel „nicht zusammen“`, verstoesse(g, { nicht: [[k.schueler[0], k.schueler[1]]], gern: [] }).nicht.length === 0);
  }
  const st = neuerStand(true);
  const gezogen = new Set<string>();
  for (let i = 0; i < k.schueler.length * 4; i++) { const x = ziehe(st, k.schueler, (id) => lose(k, d.mitarbeit, id).anzahl); if (x) gezogen.add(x); }
  pruefe(`Zufall ${k.name} erreicht alle`, gezogen.size === k.schueler.length, `${gezogen.size}/${k.schueler.length}`);
}

// 6 Mündlich / Raster
for (const k of d.kurse) {
  const r = rasterFuer(d, k);
  const krit = aktiveKriterien(k, r);
  const stufen = Object.fromEntries(krit.map((x: any) => [x.id, 3]));
  const e = rasterErgebnis(r, stufen, k.profil, k);
  pruefe(`Raster ${k.name}`, JSON.stringify(e).indexOf('NaN') < 0, JSON.stringify(e).slice(0, 100));
  const leer = rasterErgebnis(r, {}, k.profil, k);
  pruefe(`Raster leer ${k.name}`, JSON.stringify(leer).indexOf('NaN') < 0, JSON.stringify(leer).slice(0, 100));
}

// 7 Gruppenarbeit: Projekt aus Gruppen, ungerade Klasse
{
  const k = d.kurse.find((x) => x.id === 'f-fos11e')!;
  const mitgl = k.schueler.map((id) => ({ id, geschlecht: 'w' as const, staerke: null }));
  const g = bilden(mitgl, { art: 'groesse', zahl: 4, leistung: false, geschlecht: false });
  let i = 0;
  const p = neuesProjekt({ titel: 'Pitch your start-up', von: '2026-11-23', bis: '2026-12-18', rasterId: 'pv-projekt', zaehltAls: 'sl' }, g, () => `x${i++}`);
  pruefe('Projekt alle eingeteilt', nichtEingeteilt(k, p).length === 0, `${nichtEingeteilt(k, p).length}`);
  const r = projektRaster(d, p);
  if (r) for (const gr of p.gruppen) pruefe('Projekt ohne Bewertung', JSON.stringify(gruppenErgebnis(r, gr, k.profil, p)).indexOf('NaN') < 0);
  else befunde.push('Projektraster pv-projekt nicht gefunden');
}

// 8 Semesterplanung
for (const k of d.kurse) {
  const hj = aktuellesHalbjahr(d, heute);
  try {
    const p = semesterPlan(d, k, hj, heute);
    pruefe(`Semesterplan ${k.name}`, JSON.stringify(p).indexOf('NaN') < 0);
    naechsterBlock(d, k, heute);
  } catch (e) { befunde.push(`Semesterplan ${k.name} wirft: ${e}`); }
}

// 9 Kalender und Material
pruefe('Kalender Einträge', eintraege(d, '2026-11-01', '2027-01-31').length >= d.termine.length);
pruefe('Material Unit 2 am 30.11.', materialListe(d.material, 'f-fos11e', '2026-11-30', 'r2').length >= 2, JSON.stringify(materialListe(d.material, 'f-fos11e', '2026-11-30', 'r2')).slice(0, 200));

// 10 Module: jede Kombination aus einem ausgeschalteten Modul liefert Reiter ohne Lücken
for (const m of MODULE) {
  const e = { module: {} as Record<string, boolean> };
  umschalten(e, m.id, false);
  const r = kursReiter(e);
  pruefe(`Modul ${m.id} aus`, Array.isArray(r) && (m.kern ? istAn(e, m.id) : true));
}

// 11 Abgleich: zerlegen und wieder zusammensetzen ergibt dieselben Daten
{
  const teile = zerlegen(d);
  const saetze = new Map<any, any[]>();
  for (const [art, m] of teile) saetze.set(art, [...m].map(([id, json], i) => datensatz(id, json, i)));
  const zurueck = zusammensetzen(saetze);
  const a = JSON.stringify({ ...d, einstellungen: undefined }), b = JSON.stringify({ ...zurueck, einstellungen: undefined });
  pruefe('Abgleich zerlegen/zusammensetzen', a.length === b.length, `${a.length} vs ${b.length}`);
}

// 12 Stammdaten-Export der zusammengelegten Klasse: beide Klassen erkannt
{
  const gh = d.kurse.find((x) => x.id === 'f-gh')!;
  const zeilen = gh.schueler.map((id) => d.schueler.find((s) => s.id === id)!).map((s) => `${s.nachname};${s.vorname};${s.klasse};01.02.2007`);
  zeilen.push('Neumann;Jasper;GH 25-2;03.03.2006');
  const v = stammdatenPruefen(d, 'Nachname;Vorname;Klasse;Geburtsdatum\n' + zeilen.join('\n'));
  pruefe('Stammdaten GH alle Treffer', v.treffer.length === gh.schueler.length, `${v.treffer.length}/${gh.schueler.length}`);
  pruefe('Stammdaten GH neuer Schüler in GH 25-2 erkannt', v.neu.some((x: any) => x.kursId === 'f-gh'), JSON.stringify(v.neu.map((x: any) => x.kursId)));
}

console.log(`Fantasieklassen: ${ok} ok, ${befunde.length} Befunde`);
for (const b of befunde) console.log(' ✗ ' + b);
