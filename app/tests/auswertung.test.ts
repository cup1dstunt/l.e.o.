// Prüft das Modul Auswertung (Notenspiegel, Leistungen, mündlich je Monat, Hinweise) und die EWH-Übernahme (N4).
// Aufruf: npm test. Alle Namen erfunden.
import { spiegel, leistungsStatistik, gesamtStatistik, muendlichVerlauf, hinweise, klassenVergleich, spiegelNote, schwellenVon, schwelleSchritt, istStandard, SCHWELLEN_STANDARD, notenVerlauf, muendlichSchueler, hoeheVon, anwesenheitKurz } from '../src/lib/auswertung.ts';
import { ewhLesen, zuordnen, vorschau, uebernehmen, csvZeilen } from '../src/lib/ewh.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

// ---------- Notenspiegel ----------
gleich('FOS-Spiegel', spiegel('FOS', [{ sid: 'a', wert: 15 }, { sid: 'b', wert: 9 }, { sid: 'c', wert: 4 }, { sid: 'd', wert: 0 }]).noten, [1, 0, 1, 0, 1, 1]);
gleich('FOS unter', spiegel('FOS', [{ sid: 'a', wert: 5 }, { sid: 'b', wert: 4 }]).unter, 1);
gleich('OSZ unter', spiegel('OSZ', [{ sid: 'a', wert: 4 }, { sid: 'b', wert: 5 }]).unter, 1);
gleich('OSZ Schnitt', spiegel('OSZ', [{ sid: 'a', wert: 2 }, { sid: 'b', wert: 3 }]).schnitt, 2.5);
gleich('spiegelNote FOS 6', spiegelNote('FOS', 6), 4);
gleich('spiegelNote OSZ 2,4', spiegelNote('OSZ', 2.4), 2);

// ---------- Klasse ----------
const kurs: any = {
  id: 'k', name: '2FOS Englisch', profil: 'FOS', schueler: ['a', 'b', 'c'],
  gewichte: { klausuren: 0.5, sonstige: 0.5, mitarbeit: 1, sl: 1 },
  stundenGehalten: 40,
  leistungen: [
    { id: 'k1', name: 'Klausur 1', gruppe: 'klausuren', art: 'Klausur', gewicht: 1, datum: '2026-09-20' },
    { id: 't1', name: 'Test 1', gruppe: 'sl', art: 'Test', gewicht: 1, datum: '2026-10-05' },
    { id: 'k2', name: 'Klausur 2', gruppe: 'klausuren', art: 'Klausur', gewicht: 1, datum: '2026-11-10' }
  ],
  zellen: {
    'k1:a': { wert: 12 }, 't1:a': { wert: 11 }, 'k2:a': { wert: 6 }, // Abfall: 6 gegen Ø 11,5
    'k1:b': { wert: 3 }, 't1:b': { status: 'UE' }, 'k2:b': { status: 'E' },
    'k1:c': { wert: 9 }, 't1:c': { wert: 9 }
  },
  endnoten: {}
};
const d: any = {
  kurse: [kurs],
  mitarbeit: [
    { id: 'm1', kursId: 'k', schuelerId: 'a', zeit: '2026-10-02T09:00', stufe: 2, bausteine: [] },
    { id: 'm2', kursId: 'k', schuelerId: 'b', zeit: '2026-10-09T09:00', stufe: 4, bausteine: [] },
    { id: 'm3', kursId: 'k', schuelerId: 'a', zeit: '2026-11-20T09:00', stufe: 1, bausteine: [] }
  ],
  fehlzeiten: [{ id: 'f1', kursId: 'k', schuelerId: 'c', datum: '2026-11-02', stunden: 10, status: 'E' }],
  verspaetungen: [{ id: 'v1', kursId: 'k', schuelerId: 'a', datum: '2026-11-03', ankunft: '08:10', minuten: 10 }]
};
const st = leistungsStatistik(kurs, kurs.schueler);
gleich('Leistungen nach Datum', st.map((x) => x.leistung.id), ['k1', 't1', 'k2']);
gleich('Klausur 2: E und leer', [st[2].E, st[2].leer, st[2].spiegel.anzahl], [['b'], ['c'], 1]);
gleich('Test: UE zählt als 0', [st[1].UE, st[1].spiegel.unter], [['b'], 1]);
const g = gesamtStatistik(kurs, kurs.schueler);
gleich('Gesamt: alle mit Note', g.spiegel.anzahl + g.ohne.length, 3);
gleich('Gesamt: b unter der Grenze', g.unterIds, ['b']);
const mv = muendlichVerlauf(d, kurs, kurs.schueler);
gleich('mündlich je Monat', mv.map((m) => [m.monat, m.eintraege, m.erreicht, m.schnitt]), [['2026-10', 2, 2, 3], ['2026-11', 1, 1, 1]]);
const h = hinweise(d, kurs, kurs.schueler, '2026-11-26');
gleich('Abfall bei a', h.some((x) => x.sid === 'a' && x.art === 'abfall'), true);
gleich('b mündlich still (seit 9.10.)', h.some((x) => x.sid === 'b' && x.art === 'verstummt'), true);
gleich('a nicht still (20.11.)', h.some((x) => x.sid === 'a' && x.art === 'verstummt'), false);
gleich('c Fehlzeiten 25 %', h.find((x) => x.sid === 'c' && x.art === 'fehlzeiten')?.text, 'Fehlzeiten 25 %');
const kv = klassenVergleich(d)[0];
gleich('Vergleich', [kv.unter, kv.verspaetungen, kv.muendlich, kv.leistungen], [1, 1, 1, 3]);

// ---------- Schwellen der Hinweise (einstellbar) ----------
gleich('Schwellen Standard', schwellenVon({}), { abfallNP: 3, abfallNote: 1, stillTage: 21, fehlzeitenAb: 20, grenzeNP: 5, grenzeNote: 4 });
gleich('Schwellen begrenzt, Unsinn = Standard', schwellenVon({ auswertung: { stillTage: 999, fehlzeitenAb: NaN, abfallNP: 0 } }), { abfallNP: 1, abfallNote: 1, stillTage: 60, fehlzeitenAb: 20, grenzeNP: 5, grenzeNote: 4 });
gleich('Schritt Tage +7', schwelleSchritt(SCHWELLEN_STANDARD, 'stillTage', 1), 28);
gleich('Schritt Note −0,5 am Rand', schwelleSchritt({ ...SCHWELLEN_STANDARD, abfallNote: 0.5 }, 'abfallNote', -1), 0.5);
gleich('istStandard', [istStandard(SCHWELLEN_STANDARD), istStandard({ ...SCHWELLEN_STANDARD, fehlzeitenAb: 25 })], [true, false]);
const streng = { abfallNP: 6, abfallNote: 1, stillTage: 60, fehlzeitenAb: 30, grenzeNP: 5, grenzeNote: 4 };
const h2 = hinweise(d, kurs, kurs.schueler, '2026-11-26', streng);
gleich('Abfall 5,5 NP < 6: kein Hinweis', h2.some((x) => x.sid === 'a' && x.art === 'abfall'), false);
gleich('b 48 Tage < 60: nicht still', h2.some((x) => x.sid === 'b' && x.art === 'verstummt'), false);
gleich('c 25 % < 30 %: kein Fehlzeitenhinweis', h2.some((x) => x.sid === 'c' && x.art === 'fehlzeiten'), false);
gleich('feste Ampel bleibt (b unter der Grenze)', h2.some((x) => x.sid === 'b' && x.art === 'unter'), true);
gleich('Fehlzeiten ab 25 % trifft c genau', hinweise(d, kurs, kurs.schueler, '2026-11-26', { ...SCHWELLEN_STANDARD, fehlzeitenAb: 25 }).some((x) => x.sid === 'c' && x.art === 'fehlzeiten'), true);
gleich('Kurzfassung 20–30 % folgt der Schwelle', [anwesenheitKurz(d, kurs, kurs.schueler).mittel, anwesenheitKurz(d, kurs, kurs.schueler, streng).mittel], [['c'], []]);

// ---------- Vorwarnung: letzte Note an der Grenze ----------
gleich('a: Klausur 2 mit 6 NP > 5: keine Vorwarnung', h.some((x) => x.sid === 'a' && x.art === 'grenze'), false);
gleich('a: bei Grenze 6 NP Vorwarnung', hinweise(d, kurs, kurs.schueler, '2026-11-26', { ...SCHWELLEN_STANDARD, grenzeNP: 6 }).find((x) => x.sid === 'a' && x.art === 'grenze')?.text, 'Klausur 2: 6 NP');
gleich('b: letzte Note UE (0 NP) im Test, Vorwarnung', h.some((x) => x.sid === 'b' && x.art === 'grenze'), true);
const oszKurs: any = { ...kurs, id: 'o', profil: 'OSZ', zellen: { 'k1:a': { wert: 2 }, 'k2:a': { wert: 4 }, 'k1:c': { wert: 3 }, 'k2:c': { wert: 3.5 } } };
const ho = hinweise({ ...d, kurse: [oszKurs] }, oszKurs, ['a', 'c'], '2026-11-26');
gleich('OSZ: Note 4 = Vorwarnung, 3,5 nicht', [ho.some((x) => x.sid === 'a' && x.art === 'grenze'), ho.some((x) => x.sid === 'c' && x.art === 'grenze')], [true, false]);
gleich('OSZ: Grenze 3,5 trifft auch c', hinweise({ ...d, kurse: [oszKurs] }, oszKurs, ['c'], '2026-11-26', { ...SCHWELLEN_STANDARD, grenzeNote: 3.5 }).some((x) => x.art === 'grenze'), true);

// ---------- Verlauf (A2) ----------
const vl = notenVerlauf(kurs, kurs.schueler, 'a');
gleich('Verlauf nach Datum', vl.map((p) => p.leistung.id), ['k1', 't1', 'k2']);
gleich('Verlauf Klassenschnitt K1', vl[0].klasse, 8);
gleich('Verlauf Test: UE zählt als 0', [vl[1].klasse, vl[1].anzahl], [(11 + 0 + 9) / 3, 3]);
gleich('Verlauf Schüler a', vl.map((p) => p.schueler), [12, 11, 6]);
gleich('Verlauf ohne Schüler', notenVerlauf(kurs, kurs.schueler)[0].schueler, undefined);
gleich('Verlauf c ohne Klausur 2', notenVerlauf(kurs, kurs.schueler, 'c')[2].schueler, null);
gleich('Leistung ohne Datum fehlt im Verlauf', notenVerlauf({ ...kurs, leistungen: [...kurs.leistungen, { id: 'x', name: 'ohne', gruppe: 'sl', art: 'Test', gewicht: 1 }] }, kurs.schueler).length, 3);
gleich('mündlich je Monat für a', muendlichSchueler(d, kurs, 'a'), [{ monat: '2026-10', schnitt: 2, eintraege: 1 }, { monat: '2026-11', schnitt: 1, eintraege: 1 }]);
gleich('Höhe FOS/OSZ', [hoeheVon('FOS', 15), hoeheVon('FOS', 0), hoeheVon('OSZ', 1), hoeheVon('OSZ', 6)], [1, 0, 1, 0]);

// ---------- EWH: Notenliste einer Klausur ----------
const notenliste = '﻿LokalerCode;Nachname;Vorname;Stammklasse;Klausur;Status;Teil 1;Teil 2;Format Teil 1;Format Teil 2;Inhalt;Wortschatz;Satzbau/Grammatik;Textgestaltung;Sprache;Gesamt (NP);Note\r\n'
  + 'X1;Muster;Anna;2FOS;Klausur;fertig;10;8;Outline;Comment;9,2;9;8;9;8,67;9;3\r\n'
  + 'X2;Beispiel;Ben;2FOS;Klausur;Nachschreiber;;;;;;;;;;;\r\n'
  + 'X3;Probe;Cem;2FOS;Klausur;in Arbeit;5;;;;;;;;;4;5\r\n'
  + 'X2;Beispiel;Ben;2FOS;Nachschreibeklausur;fertig;12;12;;;12;12;12;12;12;12;2\r\n'
  + 'X4;Übel;Jörg;2FOS;Klausur;nicht teilgenommen;;;;;;;;;;;\r\n';
const r1 = ewhLesen(notenliste, 'Noten Klausur 2.csv') as any;
gleich('Notenliste erkannt', [r1.art, r1.klausuren[0].titel, r1.klausuren[0].werte.length], ['klausur', 'Klausur 2', 4]);
gleich('Werte', r1.klausuren[0].werte.map((w: any) => [w.nachname, w.np, w.fehlt, w.bemerkung]), [
  ['Muster', 9, false, ''], ['Beispiel', 12, false, 'Nachschreibeklausur'], ['Probe', null, false, 'noch nicht fertig korrigiert'], ['Übel', null, true, '']
]);
gleich('fremde Datei', 'fehler' in (ewhLesen('Name;Note\nA;1') as any), true);
gleich('CSV mit Anführungszeichen', csvZeilen('a;"b;c";"d ""e"""\n'), [['a', 'b;c', 'd "e"']]);

// ---------- EWH: Notenübersicht Halbjahr ----------
const hj = '﻿LokalerCode;Nachname;Vorname;Klausur 1 (20.09.2026);Klausur 2 (10.11.2026);Schnitt\r\nX1;Muster;Anna;12;9;10,5\r\nX2;Beispiel;Ben;n. t.;NS;\r\n;Schnitt der Klausur;;12;9;\r\n';
const r2 = ewhLesen(hj) as any;
gleich('Halbjahr erkannt', [r2.art, r2.klausuren.map((k: any) => [k.titel, k.datum])], ['halbjahr', [['Klausur 1', '2026-09-20'], ['Klausur 2', '2026-11-10']]]);
gleich('Halbjahr Zellen', r2.klausuren[1].werte.map((w: any) => [w.np, w.fehlt]), [[9, false], [null, true]]);

// ---------- Zuordnung und Übernahme ----------
const schueler: any[] = [
  { id: 'a', vorname: 'Anna', nachname: 'Muster' },
  { id: 'b', vorname: 'Benjamin', nachname: 'Beispiel' }, // Vorname anders, Nachname eindeutig
  { id: 'j', vorname: 'Jorg', nachname: 'Uebel' } // Schreibweise ohne Umlaut: nicht sicher
];
const zu = zuordnen(r1.klausuren[0].werte, schueler);
gleich('Zuordnung', zu.map((z) => [z.sid, z.sicher]), [['a', true], ['b', false], [null, false], [null, false]]);
const k2: any = { ...kurs, zellen: { 'k2:a': { wert: 6, stern: 'Attest' }, 'k2:b': { status: 'E' } }, leistungen: [...kurs.leistungen] };
const v = vorschau(k2, 'k2', zu);
gleich('Vorschau', v.map((x) => x.aenderung), ['aendert', 'aendert', 'ohne', 'ohne']);
const u = uebernehmen(k2, { leistungId: 'k2' }, v, { titel: 'Klausur 2', geholt: '2026-11-26' });
gleich('übernommen', [u.geschrieben, k2.zellen['k2:a'], k2.zellen['k2:b'], u.leistung.ewh?.titel], [2, { wert: 9, stern: 'Attest' }, { wert: 12 }, 'Klausur 2']);
// „offen“ überschreibt nie eine geklärte Zelle
const k3: any = { ...kurs, zellen: { 'k2:j': { status: 'UE' } } };
const v3 = vorschau(k3, 'k2', [{ wert: r1.klausuren[0].werte[3], sid: 'j', sicher: false }]);
gleich('offen bleibt UE', v3[0].aenderung, 'behalten');
// OSZ: Punkte → Note
const osz: any = { ...kurs, profil: 'OSZ', zellen: {}, leistungen: [] };
const v4 = vorschau(osz, null, [zu[0]]);
const u4 = uebernehmen(osz, { neu: { id: 'n', name: 'Klausur 2', datum: '2026-11-10' } }, v4, { titel: 'Klausur 2', geholt: '2026-11-26' });
gleich('OSZ neue Spalte, 9 NP = Note 3', [osz.leistungen.length, osz.zellen['n:a'], u4.leistung.gruppe], [1, { wert: 3 }, 'klausuren']);

console.log(`Auswertung/EWH: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
