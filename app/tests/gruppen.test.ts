// Prüft fairen Zufall (P5, E109) und Gruppenbildung (P7). Aufruf: npm test
import { ziehe, zuruecknehmen, neuerStand, rundenStand } from '../src/lib/zufall.ts';
import { bilden, verstoesse, kosten, tauschen, regelUmschalten, gruppenAnzahl, type Mitglied } from '../src/lib/gruppen.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}
function saat(s: number) { return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); }

// Ungewichtet: jede der 5 Personen genau einmal, dann neue Runde
{
  const st = neuerStand(false);
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const rnd = saat(1);
  const erste = Array.from({ length: 5 }, () => ziehe(st, ids, () => 3, rnd));
  gleich('Runde ohne Wiederholung', [...erste].sort(), ids);
  gleich('alle dran', rundenStand(st, ids), { dran: 5, von: 5 });
  const sechster = ziehe(st, ids, () => 3, rnd);
  gleich('neue Runde beginnt', Object.keys(st.runde).length, 1);
  gleich('nicht zweimal hintereinander', sechster !== erste[4], true);
  gleich('Protokoll', st.protokoll.length, 6);
  zuruecknehmen(st);
  gleich('zurückgenommen zählt nicht', [st.protokoll.length, Object.keys(st.runde).length], [5, 0]);
}

// Gewichtet: a hat 3 Lose, b und c je 1; eine Runde = 5 Aufrufe, a dreimal
{
  const st = neuerStand(true);
  const losVon = (id: string) => (id === 'a' ? 3 : 1);
  const rnd = saat(7);
  const z = Array.from({ length: 5 }, () => ziehe(st, ['a', 'b', 'c'], losVon, rnd));
  gleich('gewichtet: a dreimal', z.filter((x) => x === 'a').length, 3);
  gleich('gewichtet: b und c je einmal', [z.filter((x) => x === 'b').length, z.filter((x) => x === 'c').length], [1, 1]);
  gleich('nur Anwesende', ziehe(neuerStand(), [], losVon, rnd), null);
}

// Gruppen
const mitglieder: Mitglied[] = Array.from({ length: 22 }, (_, i) => ({ id: `s${i}`, geschlecht: i % 3 === 0 ? 'm' : 'w', staerke: i / 21 }));
gleich('Anzahl aus Größe', gruppenAnzahl(22, { art: 'groesse', zahl: 4 }), 6);
gleich('Anzahl fest', gruppenAnzahl(22, { art: 'anzahl', zahl: 5 }), 5);
{
  const g = bilden(mitglieder, { art: 'groesse', zahl: 4, leistung: false, geschlecht: false }, saat(3));
  gleich('alle verteilt, keiner doppelt', g.flat().sort(), mitglieder.map((m) => m.id).sort());
  const groessen = g.map((x) => x.length);
  gleich('Größen höchstens 1 auseinander', Math.max(...groessen) - Math.min(...groessen) <= 1, true);
}
{
  const regeln = { nicht: [['s0', 's1'], ['s2', 's3'], ['s4', 's5']] as [string, string][], gern: [['s10', 's20'], ['s6', 's7']] as [string, string][] };
  const g = bilden(mitglieder, { art: 'groesse', zahl: 4, leistung: true, geschlecht: true, regeln }, saat(5));
  const v = verstoesse(g, regeln);
  gleich('keine Konflikte', v.nicht.length, 0);
  gleich('Wünsche erfüllt', v.gern.length, 0);
  // leistungsgemischt: Gruppenschnitte liegen nah beieinander
  const m = new Map(mitglieder.map((x) => [x.id, x]));
  const schnitte = g.map((x) => x.reduce((a, id) => a + (m.get(id)!.staerke ?? 0), 0) / x.length);
  gleich('Schnitte nah beieinander', Math.max(...schnitte) - Math.min(...schnitte) < 0.2, true);
  const maenner = g.map((x) => x.filter((id) => m.get(id)!.geschlecht === 'm').length);
  gleich('Geschlecht verteilt', Math.max(...maenner) - Math.min(...maenner) <= 1, true);
  gleich('Kosten ohne Regeln endlich', kosten(g, m, { art: 'groesse', zahl: 4, leistung: false, geschlecht: false }), 0);
}
gleich('tauschen', tauschen([['a', 'b'], ['c']], 'a', 'c'), [['c', 'b'], ['a']]);
{
  let r = { nicht: [] as [string, string][], gern: [] as [string, string][] };
  r = regelUmschalten(r, 'nicht', 'a', 'b');
  r = regelUmschalten(r, 'gern', 'b', 'a');
  gleich('Paar wechselt Liste', r, { nicht: [], gern: [['b', 'a']] });
  r = regelUmschalten(r, 'gern', 'a', 'b');
  gleich('Paar entfernt', r.gern.length, 0);
}

console.log(`gruppen: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
