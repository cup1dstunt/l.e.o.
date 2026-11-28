// Prüft Stundenplan-Bezugstag, Tagesbalken und Klassen an Terminen (E125). Aufruf: npm test
import { bezugstag, wochenVersatz, tagesStand } from '../src/lib/wochenplan.ts';
import { terminKlassen, eintraege } from '../src/lib/kalender.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

// Mo 08:00–09:30, Fr 08:00–09:30 und 10:00–11:30
const plan = [{ tag: 1, beginn: '08:00', ende: '09:30' }, { tag: 5, beginn: '08:00', ende: '09:30' }, { tag: 5, beginn: '10:00', ende: '11:30' }];
const zeit = (iso: string, hh: number, mm = 0) => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), hh, mm);

// Freitag 27.11.2026
gleich('Fr vor Unterricht: heute', bezugstag(plan, zeit('2026-11-27', 7)), { datum: '2026-11-27', versetzt: false });
gleich('Fr während: heute', bezugstag(plan, zeit('2026-11-27', 10, 15)), { datum: '2026-11-27', versetzt: false });
gleich('Fr nach Schluss: Montag', bezugstag(plan, zeit('2026-11-27', 11, 30)), { datum: '2026-11-30', versetzt: true });
gleich('Sa: Montag', bezugstag(plan, zeit('2026-11-28', 14)), { datum: '2026-11-30', versetzt: true });
gleich('Mo nach Schluss: Freitag', bezugstag(plan, zeit('2026-11-30', 12)), { datum: '2026-12-04', versetzt: true });
gleich('Di ohne Unterricht: Freitag', bezugstag(plan, zeit('2026-12-01', 7)), { datum: '2026-12-04', versetzt: true });
gleich('ohne Plan: heute', bezugstag([], zeit('2026-11-28', 14)), { datum: '2026-11-28', versetzt: false });

gleich('Versatz gleiche Woche', wochenVersatz(zeit('2026-11-27', 12), '2026-11-23'), 0);
gleich('Versatz Sa → Mo', wochenVersatz(zeit('2026-11-28', 12), '2026-11-30'), 1);
gleich('Versatz So → Mo', wochenVersatz(zeit('2026-11-29', 23), '2026-11-30'), 1);
gleich('Versatz über Jahreswechsel', wochenVersatz(zeit('2026-12-31', 12), '2027-01-04'), 1);

const fr = [{ beginn: '08:00', ende: '09:30' }, { beginn: '10:00', ende: '11:30' }];
gleich('Balken vergangen', tagesStand(fr, '2026-11-26', zeit('2026-11-27', 9)).prozent, 100);
gleich('Balken kommend', tagesStand(fr, '2026-11-30', zeit('2026-11-27', 9)), { prozent: 0, text: '08:00–11:30', zustand: 'vorher' });
gleich('Balken vor Beginn', tagesStand(fr, '2026-11-27', zeit('2026-11-27', 7)), { prozent: 0, text: 'ab 08:00', zustand: 'vorher' });
gleich('Balken Mitte', tagesStand(fr, '2026-11-27', zeit('2026-11-27', 9, 45)), { prozent: 50, text: 'noch 1 Stunde, bis 11:30', zustand: 'laeuft' });
gleich('Balken Anfang', tagesStand(fr, '2026-11-27', zeit('2026-11-27', 8, 21)).text, 'noch 2 Stunden, bis 11:30');
gleich('Balken Schluss', tagesStand(fr, '2026-11-27', zeit('2026-11-27', 12)), { prozent: 100, text: 'Schluss seit 11:30', zustand: 'vorbei' });
gleich('Balken Ausfall zählt nicht', tagesStand([{ ...fr[0], ausfall: true }, fr[1]], '2026-11-27', zeit('2026-11-27', 9)).text, 'ab 10:00');
gleich('Balken frei', tagesStand([], '2026-11-27', zeit('2026-11-27', 9)).zustand, 'frei');

// Klassen an Terminen: fremde Prüfung nur Klassenname, doppelte Klasse einmal
const kurse = [{ id: 'a', klasse: 'KA25-i', fach: 'Englisch' }, { id: 'b', klasse: 'KA25-m', fach: 'Englisch' }, { id: 'c', klasse: 'KA25-i', fach: 'WiSo' }];
gleich('fremd nur Klasse', terminKlassen({ kurse } as any, ['a', 'b', 'c'], true), 'KA25-i, KA25-m');
gleich('eigen mit Fach', terminKlassen({ kurse } as any, ['a'], false), 'KA25-i Englisch');
gleich('ohne Klassen', terminKlassen({ kurse } as any, [], true), undefined);

const d: any = {
  kurse: kurse.map((k) => ({ ...k, leistungen: [] })), nachschreiben: [], stundenplan: [],
  einstellungen: {}, termine: [{ id: 'up1', uid: '1', quelle: 'untis', art: 'pruefung', titel: 'Prüfung IT-Systeme (andere Lehrkraft)', datum: '2026-12-02', kursIds: ['a', 'b'], fremd: true }]
};
const e = eintraege(d, '2026-11-30', '2026-12-04').find((x) => x.id === 'up1');
gleich('Prüfung anderer Lehrkraft zeigt Klassen', e?.klasse, 'KA25-i, KA25-m');

console.log(`wochenplan: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
