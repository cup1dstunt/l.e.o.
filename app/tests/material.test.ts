// Prüft die Regeln der Dateiablage (V14, docs/MODUL_DATEIABLAGE.md) ohne Browser.
// Aufruf: npm test
import { materialFuer, materialListe, anzahlFuer, kennzeichen, zeigbar, groesseText, titelAusName, linkAus, titelAusLink, alsGezeigt, zuletztGezeigt, gezeigtAm, verschieben, kopieFuer, reiheEntfernt, dateienInBenutzung, ortText } from '../src/lib/material.ts';
import { beispielDaten } from '../src/lib/beispiel.ts';
import { zerlegen, zusammensetzen, datensatz, ARTEN, type Art, type Datensatz } from '../src/lib/ablage.ts';
import type { Material } from '../src/lib/typen.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

const jetzt = '2026-11-26T10:00:00.000Z';
const m = (x: Partial<Material>): Material => ({ id: 'x', kursId: 'k1', ort: 'klasse', titel: 'T', art: 'link', url: 'https://a.de', erstellt: jetzt, ...x });
const liste: Material[] = [
  m({ id: 'a', ort: 'stunde', datum: '2026-12-01', titel: 'AB 1' }),
  m({ id: 'b', ort: 'reihe', reiheId: 'r1', titel: 'Reihe-Folien' }),
  m({ id: 'c', ort: 'klasse', titel: 'Kursplan' }),
  m({ id: 'd', ort: 'stunde', datum: '2026-12-02', titel: 'AB 2' }),
  m({ id: 'e', kursId: 'k2', ort: 'klasse', titel: 'fremd' }),
  m({ id: 'f', ort: 'reihe', reiheId: 'r2', titel: 'andere Reihe' })
];

// ---------- Zuordnung ----------
const f = materialFuer(liste, 'k1', '2026-12-01', 'r1');
gleich('Stunde, Reihe, Klasse getrennt', [f.stunde.map((x) => x.id), f.reihe.map((x) => x.id), f.klasse.map((x) => x.id)], [['a'], ['b'], ['c']]);
gleich('Live-Stunde: Stunde vor Reihe vor Klasse', materialListe(liste, 'k1', '2026-12-01', 'r1').map((x) => x.id), ['a', 'b', 'c']);
gleich('ohne Reihe (Planung aus): kein Reihen-Material', materialListe(liste, 'k1', '2026-12-01').map((x) => x.id), ['a', 'c']);
gleich('andere Klasse sieht nichts davon', materialListe(liste, 'k2', '2026-12-01', 'r1').map((x) => x.id), ['e']);
gleich('Zähler ohne Klassenmaterial', anzahlFuer(liste, 'k1', '2026-12-01', 'r1'), 2);

// ---------- Kennzeichen, Größe, Titel, Links ----------
const datei = (name: string, typ: string) => ({ art: 'datei' as const, datei: { id: 'd1', name, typ, groesse: 1 } });
gleich('PDF', kennzeichen(datei('ab.pdf', 'application/pdf')), 'PDF');
gleich('PDF nur an der Endung', kennzeichen(datei('ab.PDF', '')), 'PDF');
gleich('Bild', kennzeichen(datei('tafel.jpg', 'image/jpeg')), 'Bild');
gleich('Folien', kennzeichen(datei('unit6.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')), 'Folien');
gleich('Word = Text', kennzeichen(datei('ab.docx', '')), 'Text');
gleich('Tabelle', kennzeichen(datei('noten.xlsx', '')), 'Tabelle');
gleich('Unbekannt = Datei', kennzeichen(datei('x.zip', 'application/zip')), 'Datei');
gleich('Link', kennzeichen({ art: 'link', url: 'https://moodle.de/x' }), 'Link');
gleich('YouTube = Video', kennzeichen({ art: 'link', url: 'https://youtu.be/abc' }), 'Video');
gleich('PDF öffnet der Browser', [zeigbar('application/pdf'), zeigbar('image/png'), zeigbar('application/vnd.ms-excel')], [true, true, false]);
gleich('Größe', [groesseText(500), groesseText(2048), groesseText(3.5 * 1024 * 1024)], ['500 B', '2 KB', '3,5 MB']);
gleich('Titel aus Dateiname', titelAusName('AB_Unit_6_Reading.pdf'), 'AB Unit 6 Reading');
gleich('Titel ohne Endung bleibt', titelAusName('Tafelbild'), 'Tafelbild');
gleich('Link ohne https', linkAus('moodle.example.org/kurs'), 'https://moodle.example.org/kurs');
gleich('Link mit http bleibt', linkAus('http://a.de/x'), 'http://a.de/x');
gleich('javascript: abgelehnt', linkAus('javascript:alert(1)'), null);
gleich('Unsinn abgelehnt', linkAus('hallo'), null);
gleich('leer abgelehnt', linkAus('  '), null);
gleich('Titel aus Link', titelAusLink('https://www.example.org/dateien/Unit_6.pdf'), 'example.org · Unit 6');

// ---------- Gezeigt und Stundenstand ----------
const g = structuredClone(liste);
gleich('erstes Öffnen merkt das Datum', alsGezeigt(g[0], '2026-12-01'), true);
gleich('zweites Öffnen am selben Tag nicht', alsGezeigt(g[0], '2026-12-01'), false);
alsGezeigt(g[1], '2026-12-01');
alsGezeigt(g[1], '2026-11-24');
gleich('gezeigt sortiert', g[1].gezeigt, ['2026-11-24', '2026-12-01']);
gleich('zuletzt gezeigt vor heute', zuletztGezeigt(g, 'k1', '2026-12-02')?.material.map((x) => x.id), ['a', 'b']);
gleich('zuletzt gezeigt: Datum', zuletztGezeigt(g, 'k1', '2026-12-02')?.datum, '2026-12-01');
gleich('heute zählt nicht als zuletzt', zuletztGezeigt(g, 'k1', '2026-12-01')?.datum, '2026-11-24');
gleich('nichts gezeigt: null', zuletztGezeigt(g, 'k2', '2026-12-02'), null);
gleich('Rückblick je Tag', gezeigtAm(g, 'k1', '2026-11-24').map((x) => x.id), ['b']);

// ---------- Ausfall, Kopie, Reihe entfernt ----------
const v = structuredClone(liste);
gleich('Ausfall: Material der Stunde wandert', verschieben(v, 'k1', '2026-12-01', '2026-12-03'), 1);
gleich('jetzt am neuen Tag', materialFuer(v, 'k1', '2026-12-03').stunde.map((x) => x.id), ['a']);
gleich('andere Tage unberührt', v.find((x) => x.id === 'd')?.datum, '2026-12-02');
const d = beispielDaten();
const ziel = d.kurse[1];
const k1 = kopieFuer({ ...liste[1], gezeigt: ['2026-11-01'], datei: { id: 'dA', name: 'f.pdf', typ: 'application/pdf', groesse: 9 }, art: 'datei' }, ziel, 'neu1', 'r2', new Date(jetzt));
gleich('Kopie in Reihe der Zielklasse', [k1.kursId, k1.ort, k1.reiheId, k1.id, k1.gezeigt], [ziel.id, 'reihe', 'r2', 'neu1', undefined]);
gleich('Kopie teilt den Dateiinhalt', k1.datei?.id, 'dA');
const k2 = kopieFuer(liste[0], ziel, 'neu2', undefined, new Date(jetzt));
gleich('Stunden-Material kommt zur Klasse, ohne Datum', [k2.ort, k2.datum], ['klasse', undefined]);
const k3 = kopieFuer(liste[1], ziel, 'neu3', 'gibt-es-nicht', new Date(jetzt));
gleich('Reihe fehlt im Ziel: Klasse', [k3.ort, k3.reiheId], ['klasse', undefined]);
const r = structuredClone(liste);
gleich('Reihe entfernt: Material bleibt', reiheEntfernt(r, 'k1', 'r1'), 1);
gleich('liegt jetzt bei der Klasse', [r[1].ort, r[1].reiheId], ['klasse', undefined]);
gleich('Dateien in Benutzung', [...dateienInBenutzung([k1, k2, { ...k1, id: 'z' }])], ['dA']);
gleich('Ortstext', [ortText(liste[2], undefined, (x) => x), ortText(liste[0], undefined, (x) => x.slice(5)), ortText({ ...liste[1], reiheId: 'r2' }, d.kurse[0], (x) => x)], ['Klasse', 'Stunde 12-01', 'Reihe Unit 6 · Media and society']);

// ---------- Ablage F1: neue Datenart rundweg ----------
gleich('material ist eine Datenart', (ARTEN as readonly string[]).includes('material'), true);
gleich('Beispiel hat Material', d.material.length > 0, true);
const teile = zerlegen(d);
const saetze = new Map<Art, Datensatz[]>();
for (const [art, mm] of teile) saetze.set(art, [...mm].map(([id, json], pos) => datensatz(id, json, pos)));
gleich('Rundweg mit Material', zusammensetzen(saetze)?.material, d.material);
const ohne = new Map(saetze); ohne.delete('material');
gleich('alter Stand ohne Material: leere Liste', zusammensetzen(ohne)?.material, []);

console.log(`material: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
