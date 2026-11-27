// Prüft das Modul „Wo wir stehengeblieben sind“ (V18, docs/MODUL_STUNDENSTAND.md). Aufruf: npm test
import { staende, letzterStand, standSetzen, letzteStunde, seitText, tageZwischen, verlauf, vorschlaege, faelligeMerker, merkerDazu, merkerWeg, ohneStand } from '../src/lib/stand.ts';
import { kursMischen } from '../src/lib/abgleich.ts';
import { istAn, auswahlFuer } from '../src/lib/module.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

const k = (): any => ({ id: 'k1', lernstoff: {}, uebergang: null, zellen: {}, endnoten: {}, leistungen: [], schueler: [] });

// Alte Daten: nur `uebergang`, kein Tageseintrag
const alt = k();
alt.uebergang = { text: 'Unit 6 bis Absatz 3', datum: '2026-11-13' };
gleich('alter Übergang zählt', staende(alt), [{ datum: '2026-11-13', text: 'Unit 6 bis Absatz 3' }]);
gleich('alter Übergang vor heute', letzterStand(alt, '2026-11-20')?.text, 'Unit 6 bis Absatz 3');
gleich('nicht vor seinem Tag', letzterStand(alt, '2026-11-13'), undefined);

// Setzen führt uebergang nach, Leeren fällt auf den Stand davor zurück
const a = k();
standSetzen(a, '2026-11-20', '  Aufgabe 2 fertig ');
gleich('gesetzt am Tag', a.lernstoff['2026-11-20'].stand, 'Aufgabe 2 fertig');
gleich('uebergang neu', a.uebergang, { text: 'Aufgabe 2 fertig', datum: '2026-11-20' });
standSetzen(a, '2026-11-27', 'Aufgabe 3 angefangen');
gleich('uebergang neuester', a.uebergang.datum, '2026-11-27');
standSetzen(a, '2026-11-27', '');
gleich('leeren fällt zurück', a.uebergang, { text: 'Aufgabe 2 fertig', datum: '2026-11-20' });
gleich('leeren entfernt Feld', 'stand' in a.lernstoff['2026-11-27'], false);
standSetzen(a, '2026-11-20', '');
gleich('alles leer', a.uebergang, null);
// Thema und Hausaufgabe bleiben beim Setzen erhalten
const b = k();
b.lernstoff['2026-11-25'] = { text: 'Unit 2 Listening', hausaufgabe: 'Workbook S. 22' };
standSetzen(b, '2026-11-25', 'Teil 2 fehlt');
gleich('thema bleibt', b.lernstoff['2026-11-25'], { text: 'Unit 2 Listening', hausaufgabe: 'Workbook S. 22', stand: 'Teil 2 fehlt' });

// Letzte Stunde: nur vor heute, geplante künftige Themen zählen nicht, leere Tage auch nicht
b.lernstoff['2026-12-02'] = { text: 'Unit 3 geplant', hausaufgabe: '' };
b.lernstoff['2026-11-27'] = { text: '', hausaufgabe: '' };
gleich('letzte stunde', letzteStunde(b, '2026-11-27'), { datum: '2026-11-25', thema: 'Unit 2 Listening', hausaufgabe: 'Workbook S. 22', stand: 'Teil 2 fehlt', standDatum: '2026-11-25' });
// Letzte Stunde ohne Stand: der ältere Stand bleibt sichtbar, mit seinem Datum
const c = k();
standSetzen(c, '2026-11-13', 'Aufgabe 2 fehlt');
c.lernstoff['2026-11-20'] = { text: 'Zahlungsverkehr', hausaufgabe: 'Aufgabe 1' };
gleich('älterer stand bleibt', letzteStunde(c, '2026-11-27'), { datum: '2026-11-20', thema: 'Zahlungsverkehr', hausaufgabe: 'Aufgabe 1', stand: 'Aufgabe 2 fehlt', standDatum: '2026-11-13' });
gleich('ohne stunde', letzteStunde(k(), '2026-11-27'), undefined);
gleich('letzte stunde alter übergang', letzteStunde(alt, '2026-11-20')?.stand, 'Unit 6 bis Absatz 3');

// Zeitangaben, auch über die Zeitumstellung
gleich('tage über zeitumstellung', tageZwischen('2026-10-24', '2026-10-26'), 2);
gleich('heute', seitText('2026-11-27', '2026-11-27'), 'heute');
gleich('gestern', seitText('2026-11-26', '2026-11-27'), 'gestern');
gleich('tage', seitText('2026-11-24', '2026-11-27'), 'vor 3 Tagen');
gleich('eine woche', seitText('2026-11-20', '2026-11-27'), 'vor einer Woche');
gleich('blockwoche', seitText('2026-10-30', '2026-11-27'), 'vor 4 Wochen');

// Verlauf: neueste zuerst, mit gezeigtem Material, ohne künftige Tage
const mat: any[] = [{ id: 'm1', kursId: 'k1', titel: 'Folien Unit 2', gezeigt: ['2026-11-25'] }, { id: 'm2', kursId: 'k2', titel: 'fremd', gezeigt: ['2026-11-25'] }];
const vl = verlauf(b, mat, '2026-11-27');
gleich('verlauf daten', vl.map((e) => e.datum), ['2026-11-25']);
gleich('verlauf gezeigt', vl[0].gezeigt, ['Folien Unit 2']);

// Vorschläge zum Antippen
gleich('vorschläge', vorschlaege('Unit 2 Listening.').map((v) => v.wert), ['Unit 2 Listening geschafft', 'Unit 2 Listening angefangen, weiter bei ']);
gleich('ohne thema keine', vorschlaege('  '), []);

// Merker: erscheinen ab der nächsten Stunde, Abhaken mit Rückgängig
const m = k();
merkerDazu(m, 'Tests zurückgeben', 'x1', '2026-11-27');
merkerDazu(m, '   ', 'x2', '2026-11-27');
gleich('leerer merker nicht', m.merker.length, 1);
gleich('heute noch nicht fällig', faelligeMerker(m, '2026-11-27').length, 0);
gleich('nächstes mal fällig', faelligeMerker(m, '2026-12-01').map((x: any) => x.text), ['Tests zurückgeben']);
merkerDazu(m, 'Kopien', 'x3', '2026-11-27');
const zurueck = merkerWeg(m, 'x1');
gleich('abgehakt', m.merker.map((x: any) => x.id), ['x3']);
zurueck?.();
gleich('rückgängig an alter stelle', m.merker.map((x: any) => x.id), ['x1', 'x3']);
zurueck?.();
gleich('rückgängig nicht doppelt', m.merker.length, 2);

// Abgleich: Abhaken auf einem Gerät, neuer Merker auf dem anderen
const basis: any = { ...k(), merker: [{ id: 'x1', text: 'A', seit: '2026-11-20' }] };
const lokal: any = { ...k(), merker: [] };
const fern: any = { ...k(), merker: [{ id: 'x1', text: 'A', seit: '2026-11-20' }, { id: 'x9', text: 'B', seit: '2026-11-26' }] };
gleich('abgleich merker', (kursMischen(lokal, fern, true, basis).merker ?? []).map((x: any) => x.id), ['x9']);

// Heute: vorbei, ohne Stand, Blockstunden zusammengefasst, Ausfall zählt nicht
const k1: any = { id: 'k1', lernstoff: {} }, k2: any = { id: 'k2', lernstoff: { '2026-11-27': { text: '', hausaufgabe: '', stand: 'fertig' } } }, k3: any = { id: 'k3', lernstoff: {} };
const slots = [
  { kursId: 'k1', beginn: '08:00', ende: '08:45' }, { kursId: 'k1', beginn: '08:45', ende: '09:30' },
  { kursId: 'k2', beginn: '09:45', ende: '10:30' },
  { kursId: 'k3', beginn: '10:45', ende: '11:30', ausfall: true },
  { kursId: 'k1', beginn: '13:00', ende: '13:45' }
];
gleich('noch nicht vorbei', ohneStand([k1, k2, k3], slots, 12 * 60, '2026-11-27').map((x) => x.kursId), []);
gleich('nach dem letzten block', ohneStand([k1, k2, k3], slots, 14 * 60, '2026-11-27'), [{ kursId: 'k1', beginn: '08:00', ende: '13:45' }]);

// Register: Modul an als Standard, für Papier dabei, für UPZ nicht
gleich('standard an', istAn({}, 'stand'), true);
gleich('papier', istAn({ module: auswahlFuer('papier') }, 'stand'), true);
gleich('upz', istAn({ module: auswahlFuer('upz') }, 'stand'), false);
gleich('ohne live-stunde wirksam', istAn({ module: { stunde: false } }, 'stand'), true);

console.log(`stand: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
