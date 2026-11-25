// Prüft das Kriterienraster der mündlichen Leistungen (FB7, E110). Aufruf: npm test
import { VORLAGEN, rasterErgebnis, belege, monatsSpalte, rasterFuer, rasterKopie, mindestSmileys, rasterDerEinschaetzung } from '../src/lib/raster.ts';
import { BAUSTEINE } from '../src/lib/bausteine.ts';
import { kursMischen } from '../src/lib/abgleich.ts';
import type { Kurs, Raster } from '../src/lib/typen.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

const r: Raster = {
  id: 't', name: 'Test', fach: '', bereiche: [
    { name: 'A', gewicht: 2, kriterien: [{ id: 'a1', name: 'Beiträge', stufen: ['', '', '', ''] }, { id: 'a2', name: 'X', stufen: ['', '', '', ''] }] },
    { name: 'B', gewicht: 1, kriterien: [{ id: 'b1', name: 'Pünktlichkeit', stufen: ['', '', '', ''] }] }
  ]
};

// Alles Stufe 4 = Smiley 1 = Note 1 (OSZ) bzw. 14 Punkte (FOS); alles Stufe 1 = Note 5 bzw. 2 Punkte
gleich('alles 4 OSZ', rasterErgebnis(r, { a1: 4, a2: 4, b1: 4 }, 'OSZ').note, 1);
gleich('alles 4 FOS', rasterErgebnis(r, { a1: 4, a2: 4, b1: 4 }, 'FOS').note, 14);
gleich('alles 1 OSZ', rasterErgebnis(r, { a1: 1, a2: 1, b1: 1 }, 'OSZ').note, 5);
gleich('alles 1 FOS', rasterErgebnis(r, { a1: 1, a2: 1, b1: 1 }, 'FOS').note, 2);
// Gewichtung: A = 3 (Gewicht 2), B = 1 (Gewicht 1) → (6 + 1) / 3 = 2,333 → Smiley 1 + 1,667 × 4/3 = 3,22 → Note 3
{
  const e = rasterErgebnis(r, { a1: 3, a2: 3, b1: 1 }, 'OSZ');
  gleich('gewichtet Schnitt', Math.round(e.schnitt! * 1000) / 1000, 2.333);
  gleich('gewichtet Note', e.note, 3);
  gleich('Rechenweg hat Zeilen', e.weg.length, 5);
}
// Leere Kriterien zählen nicht, leerer Bereich fällt raus
{
  const e = rasterErgebnis(r, { a1: 4 }, 'OSZ');
  gleich('nur ein Kriterium', [e.note, e.offen], [1, 2]);
  gleich('nichts gewählt', rasterErgebnis(r, {}, 'OSZ').note, null);
}
// Vorlagen vollständig: jedes Kriterium hat 4 Stufentexte, ids je Raster eindeutig
for (const v of VORLAGEN) {
  const ks = v.bereiche.flatMap((b) => b.kriterien);
  gleich(`${v.name} Stufentexte`, ks.every((k) => k.stufen.length === 4 && k.stufen.every((t) => t.length > 0)), true);
  gleich(`${v.name} ids eindeutig`, new Set(ks.map((k) => k.id)).size, ks.length);
}

// Belege: Bausteine mit passendem Kriterium im Monat, Verspätungen bei Pünktlichkeit
{
  const d = {
    mitarbeit: [
      { id: '1', kursId: 'k', schuelerId: 's', zeit: '2026-11-03T09:00:00Z', stufe: 2 as const, bausteine: ['bringt eigene Ideen ein', 'wirkt abgelenkt'] },
      { id: '2', kursId: 'k', schuelerId: 's', zeit: '2026-11-10T09:00:00Z', stufe: 2 as const, bausteine: ['bringt eigene Ideen ein'] },
      { id: '3', kursId: 'k', schuelerId: 's', zeit: '2026-10-10T09:00:00Z', stufe: 2 as const, bausteine: ['Beiträge meistens treffend'] }
    ],
    verspaetungen: [{ id: 'v', kursId: 'k', schuelerId: 's', datum: '2026-11-04', ankunft: '08:10', minuten: 10 }]
  };
  gleich('Belege Beiträge', belege(d, BAUSTEINE, 'k', 's', '2026-11', r.bereiche[0].kriterien[0]), ['2× „bringt eigene Ideen ein“']);
  gleich('Belege Pünktlichkeit', belege(d, BAUSTEINE, 'k', 's', '2026-11', r.bereiche[1].kriterien[0]), ['1 Verspätung, 10 Min.']);
  gleich('keine Belege', belege(d, BAUSTEINE, 'k', 's', '2026-11', r.bereiche[0].kriterien[1]), []);
}

// Monatsspalte anlegen und nach Monat einsortieren
const kurs = (): Kurs => ({
  id: 'k', name: 'BFS Englisch', fach: 'Englisch', klasse: 'BFS', raum: '1', profil: 'OSZ', schueler: ['s'],
  leistungen: [
    { id: 'k1', name: 'Klausur 1', gruppe: 'klausuren', art: 'Klausur', gewicht: 1 },
    { id: 'm9', name: 'Sep', gruppe: 'mitarbeit', art: 'Monatsnote', gewicht: 1, monat: '2026-09' },
    { id: 'm11', name: 'Nov', gruppe: 'mitarbeit', art: 'Monatsnote', gewicht: 1, monat: '2026-11' },
    { id: 't1', name: 'Test', gruppe: 'sl', art: 'Test', gewicht: 1 }
  ],
  gewichte: { klausuren: 0.5, sonstige: 0.5, mitarbeit: 1, sl: 1 }, zellen: {}, endnoten: {}, stundenGehalten: 0, lernstoff: {}, uebergang: null,
  sitzplan: { vorlage: '', spalten: 1, reihen: 1, tische: [true], belegung: {} }
});
{
  const k = kurs();
  gleich('vorhandene Spalte', monatsSpalte(k, '2026-11')?.id, 'm11');
  gleich('ohne anlegen', monatsSpalte(k, '2026-10'), undefined);
  monatsSpalte(k, '2026-10', () => 'm10');
  gleich('Okt zwischen Sep und Nov', k.leistungen.map((l) => l.id), ['k1', 'm9', 'm10', 'm11', 't1']);
}
// Raster der Klasse: Fach passt zur Vorlage, sonst fachübergreifend; Kopie bekommt neue id
{
  const d = { einstellungen: {} as any };
  const k = kurs();
  gleich('Englisch-Vorlage', rasterFuer(d, k).id, 'v-englisch');
  k.fach = 'Wirtschaft';
  gleich('fachübergreifend', rasterFuer(d, k).id, 'v-allgemein');
  const kopie = rasterKopie(VORLAGEN[0], 'neu');
  d.einstellungen.raster = [kopie];
  k.fach = 'Englisch';
  gleich('Kopie wird nicht still gewählt', rasterFuer(d, k).id, 'v-englisch');
  gleich('Einschätzung behält ihr Raster', rasterDerEinschaetzung(d, k, { rasterId: 'neu', stufen: {}, zeit: '' }).id, 'neu');
  k.muendlich = { rasterId: 'neu', mindestSmileys: 2 };
  gleich('eingestelltes Raster', [rasterFuer(d, k).id, kopie.vorlage, mindestSmileys(k)], ['neu', undefined, 2]);
  gleich('Vorlage unverändert', VORLAGEN[0].vorlage, true);
}
// Abgleich: Einschätzungen zweier Geräte gehen nicht verloren
{
  const basis = kurs();
  const a = { ...kurs(), einschaetzungen: { '2026-11:s': { rasterId: 't', stufen: { a1: 4 as const }, zeit: '1' } } };
  const b = { ...kurs(), einschaetzungen: { '2026-10:s': { rasterId: 't', stufen: { a1: 2 as const }, zeit: '2' } } };
  gleich('gemischt', Object.keys(kursMischen(a, b, true, basis).einschaetzungen ?? {}).sort(), ['2026-10:s', '2026-11:s']);
}

console.log(`raster: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
