// Prüft das Kriterienraster der mündlichen Leistungen (FB7, E110). Aufruf: npm test
import { VORLAGEN, rasterTexteUmstellen, rasterErgebnis, belege, monatsSpalte, rasterFuer, rasterKopie, mindestSmileys, rasterDerEinschaetzung, MAX_KRITERIEN, kriteriumGewicht } from '../src/lib/raster.ts';
import { BAUSTEINE } from '../src/lib/bausteine.ts';
import { verspaetungenImMonat, verspaetungText } from '../src/lib/hilfen.ts';
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
    { name: 'A', gewicht: 2, kriterien: [{ id: 'a1', name: 'Qualität der Beiträge', stufen: ['', '', '', ''] }, { id: 'a2', name: 'X', stufen: ['', '', '', ''] }] },
    { name: 'B', gewicht: 1, kriterien: [{ id: 'b1', name: 'Pünktlichkeit', stufen: ['', '', '', ''] }] }
  ]
};

// Alles Stufe 4 = Smiley 1 = Note 1 (OSZ) bzw. 14 Punkte (FOS); alles Stufe 1 = Note 5 bzw. 2 Punkte
gleich('alles 4 OSZ', rasterErgebnis(r, { a1: 4, a2: 4, b1: 4 }, 'OSZ').note, 1);
gleich('alles 4 FOS', rasterErgebnis(r, { a1: 4, a2: 4, b1: 4 }, 'FOS').note, 14);
gleich('alles 1 OSZ', rasterErgebnis(r, { a1: 1, a2: 1, b1: 1 }, 'OSZ').note, 5);
gleich('alles 1 FOS', rasterErgebnis(r, { a1: 1, a2: 1, b1: 1 }, 'FOS').note, 2);
// Gewichtung je Kriterium (E113): a1 = 3 × 2, a2 = 3 × 1, b1 = 1 × 1 → 10 / 4 = 2,5 → Smiley 3 → Note 3
{
  const kg = { muendlich: { rasterId: 't', mindestSmileys: 3, gewichte: { a1: 2 } } };
  const e = rasterErgebnis(r, { a1: 3, a2: 3, b1: 1 }, 'OSZ', kg);
  gleich('gewichtet Schnitt', e.schnitt, 2.5);
  gleich('gewichtet Note', e.note, 3);
  gleich('Rechenweg hat Zeilen', e.weg.length, 4);
  gleich('Gewicht aus der Klasse', [kriteriumGewicht(kg, r.bereiche[0].kriterien[0]), kriteriumGewicht(kg, r.bereiche[0].kriterien[1])], [2, 1]);
  gleich('Gewicht aus dem Raster', kriteriumGewicht(undefined, { id: 'x', name: 'x', stufen: ['', '', '', ''], gewicht: 2 }), 2);
  // Gewicht 0 lässt b1 weg: (3 + 3) / 2 = 3 → Smiley 2,33 → Note 2
  gleich('Gewicht 0 zählt nicht', rasterErgebnis(r, { a1: 3, a2: 3, b1: 1 }, 'OSZ', { muendlich: { rasterId: 't', mindestSmileys: 3, gewichte: { b1: 0 } } }).note, 2);
}
// Leere Kriterien zählen nicht, leerer Bereich fällt raus
{
  const e = rasterErgebnis(r, { a1: 4 }, 'OSZ');
  gleich('nur ein Kriterium', [e.note, e.offen], [1, 2]);
  gleich('nichts gewählt', rasterErgebnis(r, {}, 'OSZ').note, null);
}
// Optionale Kriterien zählen nur eingeschaltet (E112)
{
  const ro: Raster = { ...r, bereiche: [r.bereiche[0], { name: 'B', gewicht: 1, kriterien: [{ id: 'ha', name: 'Hausaufgaben', stufen: ['', '', '', ''], optional: true }] }] };
  gleich('optional aus', rasterErgebnis(ro, { a1: 4, a2: 4, ha: 1 }, 'OSZ').note, 1);
  gleich('optional an', rasterErgebnis(ro, { a1: 4, a2: 4, ha: 1 }, 'OSZ', { muendlich: { rasterId: 't', mindestSmileys: 3, zusatz: ['ha'] } }).note, 2);
}
// Vorlagen vollständig und kurz: höchstens 5 feste Kriterien, Beteiligung und Qualität getrennt: jedes Kriterium hat 4 Stufentexte, ids je Raster eindeutig
for (const v of VORLAGEN) {
  const ks = v.bereiche.flatMap((b) => b.kriterien);
  gleich(`${v.name} Stufentexte`, ks.every((k) => k.stufen.length === 4 && k.stufen.every((t) => t.length > 0)), true);
  gleich(`${v.name} ids eindeutig`, new Set(ks.map((k) => k.id)).size, ks.length);
  gleich(`${v.name} höchstens ${MAX_KRITERIEN}`, ks.filter((k) => !k.optional).length <= MAX_KRITERIEN, true);
  gleich(`${v.name} Häufigkeit und Qualität`, ['beteiligung', 'qualitaet'].every((id) => ks.some((k) => k.id === id)), true);
  gleich(`${v.name} Qualität zählt doppelt`, ks.find((k) => k.id === 'qualitaet')?.gewicht, 2);
  gleich(`${v.name} Hausaufgaben optional`, ks.find((k) => k.id === 'hausaufgaben')?.optional, true);
}

// Belege: Bausteine mit passendem Kriterium im Monat, Verspätungen bei Pünktlichkeit
{
  const d = {
    mitarbeit: [
      { id: '1', kursId: 'k', schuelerId: 's', zeit: '2026-11-03T09:00:00Z', stufe: 2 as const, bausteine: ['begründet schlüssig und eigenständig', 'wirkt abgelenkt'] },
      { id: '2', kursId: 'k', schuelerId: 's', zeit: '2026-11-10T09:00:00Z', stufe: 2 as const, bausteine: ['begründet schlüssig und eigenständig'] },
      { id: '3', kursId: 'k', schuelerId: 's', zeit: '2026-10-10T09:00:00Z', stufe: 2 as const, bausteine: ['Beiträge meist treffend'] }
    ],
    verspaetungen: [{ id: 'v', kursId: 'k', schuelerId: 's', datum: '2026-11-04', ankunft: '08:10', minuten: 10 }]
  };
  gleich('Belege Qualität', belege(d, BAUSTEINE, 'k', 's', '2026-11', r.bereiche[0].kriterien[0]), ['2× „begründet schlüssig und eigenständig“']);
  gleich('Belege Pünktlichkeit', belege(d, BAUSTEINE, 'k', 's', '2026-11', r.bereiche[1].kriterien[0]), ['1× zu spät, 10 Min. (04.11.)']);
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


// Alte Kopien mit Ich-Sätzen als Lehrkrafttext werden umgestellt, eigene Texte bleiben (E125)
{
  const alt: Raster = { id: 'a', name: 'Alt', fach: '', bereiche: [{ name: 'B', gewicht: 1, kriterien: [
    { id: 'beteiligung', name: 'Beteiligung', stufen: ['Ich melde mich oft von selbst.', 'Ich beteilige mich regelmäßig.', 'Ich sage meist nur etwas, wenn ich gefragt werde.', 'Ich beteilige mich kaum.'] },
    { id: 'x', name: 'Eigen', stufen: ['Ich bin toll.', 'b', 'c', 'd'] }
  ] }] };
  gleich('Umstellen: Anzahl', rasterTexteUmstellen([alt]), 1);
  gleich('Umstellen: Lehrkrafttext', alt.bereiche[0].kriterien[0].stufen[0], 'meldet sich oft von selbst');
  gleich('Umstellen: Ich-Form bleibt für Schüler', alt.bereiche[0].kriterien[0].selbst?.[0], 'Ich melde mich oft von selbst.');
  gleich('Umstellen: eigener Text bleibt', alt.bereiche[0].kriterien[1].stufen[0], 'Ich bin toll.');
  gleich('Umstellen: zweimal ändert nichts', rasterTexteUmstellen([alt]), 0);
  gleich('Bausteine: je Stufe 5 bis 6', [1, 2, 3, 4, 5].map((s) => BAUSTEINE.filter((b) => b.stufe === s).length).every((n) => n >= 5 && n <= 6), true);
  gleich('Bausteine: alle mit Kriterium', BAUSTEINE.every((b) => !!b.kriterium), true);
}

// Verspätungen im Monat für Stunde und Monatsnote (E125)
{
  const d = { verspaetungen: [
    { id: '1', kursId: 'k', schuelerId: 's', datum: '2026-11-18', ankunft: '08:20', minuten: 20 },
    { id: '2', kursId: 'k', schuelerId: 's', datum: '2026-11-04', ankunft: '08:10', minuten: 10 },
    { id: '3', kursId: 'k', schuelerId: 's', datum: '2026-10-28', ankunft: '08:05', minuten: 5 },
    { id: '4', kursId: 'x', schuelerId: 's', datum: '2026-11-05', ankunft: '08:05', minuten: 5 }
  ] } as unknown as Parameters<typeof verspaetungenImMonat>[0];
  gleich('Verspätungen im Monat', verspaetungText(verspaetungenImMonat(d, 'k', 's', '2026-11')), '2× zu spät, 30 Min. (04.11., 18.11.)');
  gleich('keine Verspätung', verspaetungText(verspaetungenImMonat(d, 'k', 's', '2026-12')), '');
}

console.log(`raster: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
