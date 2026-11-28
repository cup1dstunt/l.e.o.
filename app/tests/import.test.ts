// Prüft das Import-Modul (docs/MODUL_IMPORT.md): Excel-Leser, UPZ-Datei, eigene Tabelle, Vorschau, Übernehmen.
// Aufruf: npm test. Alle Namen erfunden. Die echte UPZ-Vorlage liegt nicht im Repo; die Test-Mappe hat nur die Zellen,
// die L.E.O. liest, an denselben Stellen wie UPZ 10.1. Mit der echten Vorlage (gefüllt mit den Referenzwerten aus
// docs/testfaelle/upz_referenzwerte.json, in LibreOffice neu berechnet) stimmten am 27.11.2026 alle 98 Einzelwerte.
import { deflateRawSync } from 'node:zlib';
import { xlsxLesen, csvAlsBlatt, mappeAusDatei, excelDatum, spaltenName, type Mappe } from '../src/lib/xlsx.ts';
import {
  paketAus, upzLesen, istUpz, umrechnen, prozentZuNp, prozentZuNote, noteZuNp, wertLesen, titelDeuten, skalaSchaetzen,
  schuelerZuordnen, spalteVorschlag, vorschau, anwenden, kursAnlegen, kursVorschlag, tabelleLesen
} from '../src/lib/import.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

// ---------- kleine .xlsx bauen (ZIP, teils gespeichert, teils komprimiert) ----------
const enc = new TextEncoder();
function zip(dateien: Record<string, string>, komprimieren = true): Uint8Array {
  const teile: Uint8Array[] = [];
  const verzeichnis: Uint8Array[] = [];
  let pos = 0;
  for (const [name, text] of Object.entries(dateien)) {
    const roh = enc.encode(text);
    const methode = komprimieren && name.includes('sheet') ? 8 : 0;
    const daten = methode === 8 ? new Uint8Array(deflateRawSync(roh)) : roh;
    const n = enc.encode(name);
    const lokal = new Uint8Array(30 + n.length);
    const dv = new DataView(lokal.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(8, methode, true);
    dv.setUint32(18, daten.length, true); dv.setUint32(22, roh.length, true); dv.setUint16(26, n.length, true);
    lokal.set(n, 30);
    const zentral = new Uint8Array(46 + n.length);
    const dz = new DataView(zentral.buffer);
    dz.setUint32(0, 0x02014b50, true); dz.setUint16(10, methode, true);
    dz.setUint32(20, daten.length, true); dz.setUint32(24, roh.length, true); dz.setUint16(28, n.length, true); dz.setUint32(42, pos, true);
    zentral.set(n, 46);
    teile.push(lokal, daten);
    verzeichnis.push(zentral);
    pos += lokal.length + daten.length;
  }
  const groesse = verzeichnis.reduce((a, x) => a + x.length, 0);
  const ende = new Uint8Array(22);
  const de = new DataView(ende.buffer);
  de.setUint32(0, 0x06054b50, true); de.setUint16(8, verzeichnis.length, true); de.setUint16(10, verzeichnis.length, true);
  de.setUint32(12, groesse, true); de.setUint32(16, pos, true);
  const alle = [...teile, ...verzeichnis, ende];
  const out = new Uint8Array(alle.reduce((a, x) => a + x.length, 0));
  let p = 0;
  for (const x of alle) { out.set(x, p); p += x.length; }
  return out;
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** Mappe aus { Blatt: { A1: Wert } }. Texte als gemeinsame Zeichenketten, außer sie beginnen mit „~“ (dann inlineStr). */
function mappe(blaetter: Record<string, Record<string, string | number>>, komprimieren = true): Uint8Array {
  const geteilt: string[] = [];
  const idx = (s: string) => { let i = geteilt.indexOf(s); if (i < 0) { i = geteilt.length; geteilt.push(s); } return i; };
  const dateien: Record<string, string> = {};
  const namen = Object.keys(blaetter);
  namen.forEach((n, i) => {
    const zeilen = new Map<number, string[]>();
    for (const [r, v] of Object.entries(blaetter[n])) {
      const z = Number(/\d+/.exec(r)![0]);
      const c = typeof v === 'number' ? `<c r="${r}"><v>${v}</v></c>`
        : v.startsWith('~') ? `<c r="${r}" t="inlineStr"><is><t>${esc(v.slice(1))}</t></is></c>`
        : `<c r="${r}" t="s"><v>${idx(v)}</v></c>`;
      zeilen.set(z, [...(zeilen.get(z) ?? []), c]);
    }
    // eine Formel ohne gespeicherten Wert und eine leere formatierte Zelle dürfen nicht stören
    const extra = `<row r="999"><c r="A999" s="3"/><c r="B999"><f>SUM(A1:A2)</f></c></row>`;
    dateien[`xl/worksheets/sheet${i + 1}.xml`] = `<?xml version="1.0"?><worksheet><sheetData>${[...zeilen].sort((a, b) => a[0] - b[0]).map(([z, c]) => `<row r="${z}">${c.join('')}</row>`).join('')}${extra}</sheetData></worksheet>`;
  });
  dateien['xl/workbook.xml'] = `<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${namen.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`;
  dateien['xl/_rels/workbook.xml.rels'] = `<?xml version="1.0"?><Relationships>${namen.map((_, i) => `<Relationship Id="rId${i + 1}" Type="x" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`;
  dateien['xl/sharedStrings.xml'] = `<?xml version="1.0"?><sst>${geteilt.map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`;
  return zip(dateien, komprimieren);
}

// ---------- Hilfen ----------
gleich('Spaltenname', [spaltenName(1), spaltenName(26), spaltenName(27), spaltenName(57)], ['A', 'Z', 'AA', 'BE']);
gleich('Excel-Datum', excelDatum(46000), '2025-12-09');

// ---------- Schlüssel (UPZ 10.1) ----------
gleich('OSZ 45 % = 4', prozentZuNote(0.45), 4);
gleich('OSZ 54 % = 4', prozentZuNote(0.54), 4);
gleich('OSZ 55 % = 3', prozentZuNote(0.55), 3);
gleich('OSZ 8 % = 6', prozentZuNote(0.08), 6);
gleich('IHK 65 % = 4', prozentZuNote(0.65, 'IHK'), 4);
gleich('FOS 44 % = 4 NP', prozentZuNp(0.44), 4);
gleich('FOS 45 % = 5 NP', prozentZuNp(0.45), 5);
gleich('FOS 100 % = 15 NP', prozentZuNp(1), 15);
gleich('FOS Gleitkomma 0,7', prozentZuNp(0.7000000001 - 0.0000000002), 10);
gleich('Note→NP', [noteZuNp(1, 1), noteZuNp(1), noteZuNp(2, -1), noteZuNp(4), noteZuNp(5, -1), noteZuNp(6)], [15, 14, 10, 5, 1, 0]);
gleich('umrechnen NP→OSZ', umrechnen({ zahl: 9 }, { skala: 'np' }, 'OSZ', 'OSZ'), { wert: 3 });
gleich('umrechnen Note→FOS', umrechnen({ zahl: 2, tendenz: 1 }, { skala: 'note' }, 'FOS', 'OSZ'), { wert: 12 });
gleich('umrechnen Note 2,4→OSZ', umrechnen({ zahl: 2.4 }, { skala: 'note' }, 'OSZ', 'OSZ'), { wert: 2 });
gleich('umrechnen 75 (Prozentzahl)→FOS', umrechnen({ zahl: 75 }, { skala: 'prozent', prozentAlsZahl: true }, 'FOS', 'FOS'), { wert: 11 });
gleich('umrechnen Status', umrechnen({ status: 'UE' }, { skala: 'np' }, 'FOS', 'FOS'), { status: 'UE' });

// ---------- Zellen deuten ----------
gleich('wertLesen', ['12', '2,5', '3-', '85 %', 'ue', 'krank', 'n. t.', '.', '☺'].map((x) => wertLesen(x)),
  [{ zahl: 12 }, { zahl: 2.5 }, { zahl: 3, tendenz: -1 }, { zahl: 85, prozent: true }, { status: 'UE' }, { status: 'E', text: 'krank' }, { status: 'offen', text: 'n. t.' }, null, 'text']);

// ---------- Titel deuten ----------
gleich('Titel Klausur', titelDeuten('Klausur 1', 2026).gruppe, 'klausuren');
gleich('Titel Test mit Gewicht', (({ name, gruppe, art, gewicht }) => ({ name, gruppe, art, gewicht }))(titelDeuten('Verspätungstest 2 (50 %)', 2026)), { name: 'Verspätungstest 2', gruppe: 'sl', art: 'Test', gewicht: 0.5 });
gleich('Titel Monat', (({ gruppe, monat }) => ({ gruppe, monat }))(titelDeuten('Oktober', 2026)), { gruppe: 'mitarbeit', monat: '2026-10' });
gleich('Titel Monat 2. Hj.', titelDeuten('März', 2026).monat, '2027-03');
gleich('Titel Datum', (({ name, datum }) => ({ name, datum }))(titelDeuten('Test 1, 10.12.2025', 2025)), { name: 'Test 1', datum: '2025-12-10' });
gleich('Titel Gesamtnote übergehen', titelDeuten('Gesamtnote', 2026).gruppe, null);
gleich('Titel Fehlzeiten übergehen', titelDeuten('Fehlzeiten', 2026).gruppe, null);
gleich('Skala Punkte', skalaSchaetzen([{ zahl: 12 }, { zahl: 3 }]).skala, 'np');
gleich('Skala Noten unsicher', skalaSchaetzen([{ zahl: 2 }, { zahl: 3 }]), { skala: 'note', unsicher: true });
gleich('Skala Prozent', skalaSchaetzen([{ zahl: 85 }, { zahl: 40 }]).skala, 'prozent');

// ---------- UPZ ----------
// OSZ-Klasse, Zeilen wie in der Vorlage: Namen ab Zeile 3, Arbeiten ab Zeile 5, SL zus. und Zeugnis ab Zeile 6
const upz = {
  Einstellungen: { B2: '~Angaben zur Klasse … UpZ-Version 10.1', D7: 'KA 22-m', D8: 'Englisch', D10: 1, D21: 2025, D22: 1 },
  Namen: { B2: 'Name', B3: 'Ahlers', C3: 'Mia', D3: 'w', B4: 'Brandt', C4: 'Jonas', D4: 'm', B5: 'Celik', C5: 'Ela', D5: 'w', B6: 'Dorn', C6: 'Tim', D6: 'm' },
  'Klassenarbeit 1': {
    C4: 30, D4: 20, Y1: 46000,
    C5: 20, D5: 7, // 27 von 50 = 54 % → 4
    C6: 22.5, // 22,5 von 50 = 45 % → 4
    W7: 'ue', X7: '.', // unentschuldigt → UE
    X8: 'krank' // entschuldigt → E
  },
  'Klassenarbeit 2': { X5: '.', X6: '.', X7: '.', X8: '.' }, // nicht benutzt
  'SL 1': { P1: 'Vokabeltest', C4: 10, C5: 10, C6: 5, X7: '.', C8: 0 },
  'SL zus.': { C4: 0.2, I4: 0.2, AA4: 0.1, AB3: 'Haus-aufgabe', AA6: 1, AA7: 0.5, BE4: 0, BF3: 'Punkte-konto', BE6: 0.8 },
  Zeugnis: { C4: 0.5, I4: 0.5, O4: 0, W5: 0.5, X4: 0.4, AC4: 0.6, AC6: 0.9, AC7: 0.6, AS6: 3, AS7: 4, AM6: 2 }
};
const mU = await xlsxLesen(mappe(upz)) as Mappe;
gleich('UPZ erkannt', istUpz(mU), true);
const pU = upzLesen(mU, 'UpZ KA 22-m Englisch.xlsx');
gleich('UPZ Kopf', [pU.quelle, pU.klasse, pU.fach, pU.profil, pU.schluessel, pU.halbjahr], ['upz', 'KA 22-m', 'Englisch', 'OSZ', 'OSZ', '1. Hj. 2025/26']);
gleich('UPZ Schüler', pU.schueler.map((s) => `${s.vorname} ${s.nachname} ${s.geschlecht}`), ['Mia Ahlers w', 'Jonas Brandt m', 'Ela Celik w', 'Tim Dorn m']);
gleich('UPZ Spalten', pU.spalten.map((s) => [s.id, s.name, s.gruppe, s.gewicht]), [
  ['upz-ka1', 'Klausur 1', 'klausuren', 0.5], ['upz-sl1', 'Vokabeltest', 'sl', 0.2], ['upz-sl5', 'Hausaufgabe', 'sl', 0.1],
  ['upz-sl10', 'Punktekonto', 'sl', 0], ['upz-mdl', 'Mündlich (aus UPZ)', 'mitarbeit', 1]
]);
const ka1 = pU.spalten[0];
gleich('UPZ KA1 Datum', ka1.datum, '2025-12-09');
gleich('UPZ KA1 Werte', ka1.werte, [{ zahl: 0.54 }, { zahl: 0.45 }, { status: 'UE' }, { status: 'E', text: 'krank' }]);
gleich('UPZ KA1 in OSZ', ka1.werte.map((w) => umrechnen(w, ka1, 'OSZ', 'OSZ')), [{ wert: 4 }, { wert: 4 }, { status: 'UE' }, { status: 'E' }]);
gleich('UPZ SL1 (0 Punkte zählt)', pU.spalten[1].werte, [{ zahl: 1 }, { zahl: 0.5 }, null, { zahl: 0 }]);
gleich('UPZ Gewichte', pU.gewichte, { sl: 0.4, mitarbeit: 0.6 });
gleich('UPZ Zeugnis laut Datei', pU.zeugnis, [3, 4, null, null]);
gleich('UPZ Hinweis Gewicht 0', pU.hinweise.some((h) => h.includes('Gewicht 0')), true);
gleich('UPZ Hinweis frühere Halbjahre', pU.hinweise.some((h) => h.includes('früherer Halbjahre')), true);
gleich('UPZ unkomprimiert', ((await xlsxLesen(mappe(upz, false))) as Mappe).blaetter.length, 7);

// FOS-Klasse: Klausur-Blätter, Punkte nach FOS-Schlüssel, mündlich in Spalte AJ
const upzFos = await xlsxLesen(mappe({
  Einstellungen: { D7: '2FOS 25-1', D8: 'Englisch', D10: 3 },
  Namen: { B3: 'Ahlers', C3: 'Mia' },
  'Klausur 1': { C4: 60, C5: 27 }, // 45 % → 5 NP
  'Zeugnis (FOS)': { C4: 0.5, J4: 0.5, AD4: 0.4, AJ4: 0.6, AJ6: 0.9, AA5: 0.6 },
  'SL zus. (FOS)': {}
})) as Mappe;
const pF = paketAus(upzFos, 'upz.xlsx');
gleich('UPZ FOS', [pF.profil, pF.schluessel, pF.spalten.map((s) => s.name)], ['FOS', 'FOS', ['Klausur 1', 'Mündlich (aus UPZ)']]);
gleich('UPZ FOS Werte', pF.spalten.map((s) => umrechnen(s.werte[0], s, 'FOS', 'FOS')), [{ wert: 5 }, { wert: 14 }]);
gleich('UPZ FOS Hinweis 50:50', pF.hinweise.some((h) => h.includes('fest 50 : 50')), true);

// ---------- Fehlerfälle ----------
const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
gleich('Kennwort/xls', 'fehler' in (await xlsxLesen(ole)) && ((await xlsxLesen(ole)) as { fehler: string }).fehler.includes('Kennwort'), true);
gleich('kein Excel', 'fehler' in (await xlsxLesen(enc.encode('hallo welt'))), true);

// ---------- Eigene Tabelle (CSV aus Excel, Semikolon, Komma als Dezimalzeichen) ----------
const csv = [
  'Nr;Nachname;Vorname;Klausur 1;Test Vokabeln (50 %);Referat;Okt;Nov;Bemerkung;Gesamt',
  '1;Ahlers;Mia;11;12;;13;12;nett;11,5',
  '2;Brandt;Jonas;ue;4;8;7;;;6',
  '3;Celik;Ela;krank;;10;9;9;;9',
  ';Durchschnitt;;8,5;8;9;;;;'
].join('\r\n');
const mC = await mappeAusDatei(enc.encode(csv), 'Noten 2FOS.csv') as Mappe;
const pC = paketAus(mC, 'Noten 2FOS.csv', undefined, { schuljahr: 2026 });
gleich('CSV Quelle', [pC.quelle, pC.profil], ['tabelle', 'FOS']);
gleich('CSV Schüler (ohne Durchschnittszeile)', pC.schueler.map((s) => s.nachname), ['Ahlers', 'Brandt', 'Celik']);
gleich('CSV Spalten', pC.spalten.map((s) => [s.name, s.gruppe, s.skala, s.gewicht, s.monat ?? '']), [
  ['Klausur 1', 'klausuren', 'np', 1, ''], ['Test Vokabeln', 'sl', 'np', 0.5, ''], ['Referat', 'sl', 'np', 1, ''],
  ['Okt', 'mitarbeit', 'np', 1, '2026-10'], ['Nov', 'mitarbeit', 'np', 1, '2026-11'], ['Gesamt', null, 'np', 1, '']
]);
gleich('CSV Status', pC.spalten[0].werte, [{ zahl: 11 }, { status: 'UE' }, { status: 'E', text: 'krank' }]);

// Eine Namensspalte „Nachname, Vorname“, Noten mit Tendenz, Windows-1252
const csv2 = 'Schüler,Note Klausur,Mitarbeit Sep\n"Ahlers, Mia",2+,1\n"Brandt, Jonas",4-,3\n';
const latin = new Uint8Array([...csv2].map((c) => c.charCodeAt(0)));
const pC2 = paketAus(await mappeAusDatei(latin, 'liste.csv') as Mappe, 'liste.csv', undefined, { schuljahr: 2026 });
gleich('CSV2 Namen', pC2.schueler, [{ nachname: 'Ahlers', vorname: 'Mia' }, { nachname: 'Brandt', vorname: 'Jonas' }]);
gleich('CSV2 Skala', pC2.spalten.map((s) => [s.gruppe, s.skala]), [['klausuren', 'note'], ['mitarbeit', 'note']]);
gleich('CSV2 in FOS', pC2.spalten[0].werte.map((w) => umrechnen(w, pC2.spalten[0], 'FOS', 'OSZ')), [{ wert: 12 }, { wert: 4 }]);

// „Vorname Nachname“ in einer Spalte, ohne Kopf „Name“
const b3 = csvAlsBlatt('Liste;Test\nMia Ahlers;12\nJonas Brandt;7\n');
const p3 = tabelleLesen(b3, 'x.csv');
gleich('ohne Namenskopf', [p3.schueler.map((s) => s.nachname), p3.hinweise.some((h) => h.includes('Keine Spalte'))], [['Ahlers', 'Brandt'], true]);
gleich('Nachname zuerst', tabelleLesen(b3, 'x.csv', { nachnameZuerst: true }).schueler[0], { nachname: 'Mia', vorname: 'Ahlers' });

// ---------- Tabelle mit Gruppenspalten und Zwischenergebnissen (z. B. Export aus einem anderen Notenbuch) ----------
const mI = await xlsxLesen(mappe({
  Noten: {
    A1: '2FOS 25-1 Eng', A3: 'Nachname', B3: 'Vorname', C3: 'Gesamtnote', D3: 'Klausuren', E3: 'Klausur 1', F3: 'Mitarbeit', G3: 'August', H3: 'September',
    I3: 'Tests und Sonstiges', J3: 'Test 1', K3: 'Berlin Day Pitch (100 %)',
    A4: 'Ahlers', B4: 'Mia', C4: 10.25, D4: 9, E4: 9, F4: 12, G4: 12, H4: 12, I4: 11, J4: 11, K4: 11,
    A5: 'Brandt', B5: 'Jonas', C5: 4.5, D5: 0, E5: 0, F5: 9, G5: 8, H5: 10, I5: 9, J5: '☹', K5: 9
  },
  Mitarbeit: { A1: 'Nachname', A2: 'Ahlers', B1: '17.09.2026', B2: '☺' }
})) as Mappe;
const pI = paketAus(mI, 'export.xlsx', undefined, { schuljahr: 2026 });
gleich('Gruppen-Tabelle', [pI.quelle, pI.blatt, pI.profil], ['tabelle', 'Noten', 'FOS']);
gleich('Gruppen-Tabelle Spalten', pI.spalten.map((s) => [s.name, s.gruppe]), [
  ['Gesamtnote', null], ['Klausuren', null], ['Klausur 1', 'klausuren'], ['Mitarbeit', null], ['August', 'mitarbeit'], ['September', 'mitarbeit'],
  ['Tests und Sonstiges', null], ['Test 1', 'sl'], ['Berlin Day Pitch', 'sl']
]);
gleich('Smiley übergangen', pI.spalten.find((s) => s.name === 'Test 1')!.werte, [{ zahl: 11 }, null]);
gleich('Hinweis Spalten ohne Zahlen', pI.hinweise.length, 0);

// ---------- Zuordnung, Vorschau, Übernehmen ----------
const schueler: any[] = [
  { id: 'a', nachname: 'Ahlers', vorname: 'Mia', geburt: '', geschlecht: 'w', mailDienst: '' },
  { id: 'b', nachname: 'Brandt', vorname: 'Jonas', geburt: '', geschlecht: 'm', mailDienst: '' },
  { id: 'x', nachname: 'Celik', vorname: 'Emre', geburt: '', geschlecht: 'm', mailDienst: '' }
];
const kurs = kursAnlegen('k1', { name: 'KA 22-m Englisch', fach: 'Englisch', klasse: 'KA 22-m', profil: 'OSZ' });
kurs.schueler = ['a', 'b', 'x'];
kurs.leistungen.push({ id: 'l1', name: 'Klausur 1', gruppe: 'klausuren', art: 'Klausur', gewicht: 1 });
kurs.zellen['l1:a'] = { wert: 3, stern: 'Vorbehalt' }; // schon eingetragen, weicht ab (Datei: 4)
kurs.zellen['l1:b'] = { wert: 4 }; // gleich
gleich('Kurs-Vorschlag', kursVorschlag([kurs], pU), 'k1');
gleich('Kurs-Vorschlag fremd', kursVorschlag([kurs], pF), null);
gleich('Kurs-Vorschlag über Namen', kursVorschlag([kurs], pC2, schueler), 'k1');
gleich('Kurs-Vorschlag über Namen zu wenig', kursVorschlag([kurs], { ...pC, schueler: [{ nachname: 'Xu', vorname: 'Yan' }, { nachname: 'Ahlers', vorname: 'Mia' }, { nachname: 'Ott', vorname: 'Ole' }] }, schueler), null);
const zu = schuelerZuordnen(pU.schueler, schueler.filter((s) => kurs.schueler.includes(s.id)), false);
gleich('Zuordnung', zu, [{ ziel: 'a', sicher: true }, { ziel: 'b', sicher: true }, { ziel: 'x', sicher: false }, { ziel: '', sicher: false }]);
gleich('Zuordnung vertauscht', schuelerZuordnen([{ nachname: 'Mia', vorname: 'Ahlers' }], schueler, false)[0], { ziel: 'a', sicher: true });
gleich('Zuordnung neue Klasse', schuelerZuordnen([{ nachname: 'Neu', vorname: 'Nora' }], [], true)[0].ziel, '+');
const ziele = ['a', 'b', '', '+']; // Ela Celik ≠ Emre Celik: nicht übernehmen; Tim Dorn neu
const sz: Record<string, string | null> = Object.fromEntries(pU.spalten.map((s) => [s.id, spalteVorschlag(kurs, s)]));
gleich('Spaltenziel', [sz['upz-ka1'], sz['upz-sl1']], ['l1', null]);
const v = vorschau(kurs, pU, ziele, sz, 'OSZ');
gleich('Vorschau KA1', v[0].zellen.map((z) => [z.sid, z.aenderung]), [['a', 'abweichend'], ['b', 'gleich'], ['+3', 'neu']]);
gleich('Vorschau Zähler', [v[0].neu, v[0].gleich, v[0].abweichend], [1, 1, 1]);

// ohne Überschreiben: abweichende Zelle bleibt
const k2 = structuredClone(kurs);
const s2 = structuredClone(schueler);
let n = 0;
const e1 = anwenden(s2, k2, pU, ziele, v, { ueberschreiben: false, gewichte: false, neueId: () => 'n' + n++, heute: '2026-11-27' });
gleich('Ergebnis', e1, { schuelerNeu: 1, schuelerDazu: 0, spaltenNeu: 4, zellen: 9, uebersprungen: 1 });
gleich('alte Zelle bleibt', k2.zellen['l1:a'], { wert: 3, stern: 'Vorbehalt' });
gleich('neuer Schüler', [s2.at(-1).nachname, s2.at(-1).herkunft, s2.at(-1).klasse, k2.schueler.includes('n0')], ['Dorn', 'datei', 'KA 22-m', true]);
gleich('neue Zelle', k2.zellen['l1:n0'], { status: 'E' });
gleich('Gewichte unverändert', [k2.gewichte.mitarbeit, k2.gewichte.sl], [0.6, 0.4]);
gleich('neue Spalte', k2.leistungen.find((l) => l.name === 'Vokabeltest'), { id: 'n1', name: 'Vokabeltest', gruppe: 'sl', art: 'Test', gewicht: 0.2 });

// mit Überschreiben: Stern bleibt
const k3 = structuredClone(kurs);
anwenden(structuredClone(schueler), k3, pU, ziele, v, { ueberschreiben: true, gewichte: true, neueId: () => 'm' + n++, heute: '2026-11-27' });
gleich('überschrieben mit Stern', k3.zellen['l1:a'], { wert: 4, stern: 'Vorbehalt' });

// Gewichte aus einer eigenen Tabelle mit 1 : 1 normiert
const k4 = kursAnlegen('k4', { name: 'x', fach: 'x', klasse: 'x', profil: 'FOS' });
anwenden([], k4, { ...pC, gewichte: { mitarbeit: 1, sl: 1 } }, ['+', '+', '+'], vorschau(null, pC, ['+', '+', '+'], {}, 'FOS'), { ueberschreiben: false, gewichte: true, neueId: () => 'q' + n++, heute: '2026-11-27' });
gleich('Gewichte normiert', [k4.gewichte.mitarbeit, k4.gewichte.sl], [0.5, 0.5]);
gleich('Gesamt nicht übernommen', k4.leistungen.some((l) => l.name === 'Gesamt'), false);
gleich('Monatsnote mit Monat', k4.leistungen.find((l) => l.name === 'Okt')?.monat, '2026-10');

console.log(`import: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
