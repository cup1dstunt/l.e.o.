// Prüft das Fundament F1 (Daten je Objektart) ohne Browser.
// Aufruf: npm test
import { kennungenEindeutig, zerlegen, unterschied, datensatz, zusammensetzen, ARTEN, type Art, type Datensatz } from '../src/lib/ablage.ts';
import { beispielDaten } from '../src/lib/beispiel.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

const d = beispielDaten();
const leer = new Map<Art, Map<string, string>>();

// Erstes Schreiben: alles
const z1 = zerlegen(d);
const u1 = unterschied(leer, z1);
const alle = [...z1.values()].reduce((n, m) => n + m.size, 0);
gleich('erstes Schreiben schreibt alles', u1.schreiben.length, alle);
gleich('nichts zu löschen', u1.loeschen.length, 0);

// Rundweg: zerlegen → Datensätze → zusammensetzen ergibt dieselben Daten
const saetze = new Map<Art, Datensatz[]>();
for (const x of u1.schreiben) {
  if (!saetze.has(x.art)) saetze.set(x.art, []);
  saetze.get(x.art)!.push(datensatz(x.id, x.json, x.pos));
}
for (const art of ARTEN) saetze.get(art)?.reverse(); // Reihenfolge der Datenbank ist beliebig
gleich('Rundweg verlustfrei', zusammensetzen(saetze), JSON.parse(JSON.stringify(d)));

// Kleine Änderung: nur ein Datensatz
d.schueler[0].vorname += 'x';
const z2 = zerlegen(d);
const u2 = unterschied(z1, z2);
gleich('eine Änderung, ein Datensatz', u2.schreiben.map((x) => `${x.art}/${x.id}`), [`schueler/${d.schueler[0].id}`]);

// Löschen
const weg = d.notizen.length ? d.notizen.pop()! : null;
if (weg) {
  const u3 = unterschied(z2, zerlegen(d));
  gleich('gelöschte Notiz', u3.loeschen, [{ art: 'notizen', id: weg.id }]);
}

// Herkunft
gleich('Herkunft WebUntis', datensatz('u1', JSON.stringify({ id: 'u1', untisId: 5 }), 0).quelle, 'untis');
gleich('Herkunft eigen', datensatz('s1', JSON.stringify({ id: 's1' }), 0).quelle, 'eigen');
gleich('Schema-Version', datensatz('s1', '{}', 0).v, 1);

// Ohne Einstellungen keine Daten (leere Datenbank)
gleich('leere Datenbank', zusammensetzen(new Map()), undefined);

// Doppelte Kennungen (28.11.2026): kein stilles Überschreiben mehr
{
  const x = beispielDaten();
  const voll = x.kurse[0];
  const leerKurs = { ...JSON.parse(JSON.stringify(voll)), zellen: {}, name: 'leer' };
  x.kurse.push(leerKurs, { ...JSON.parse(JSON.stringify(voll)), id: voll.id + '~2', name: 'schon da' });
  const vorher = zerlegen(x).get('kurse')!.size;
  gleich('vorher fehlt ein Kurs im Speicher', vorher, x.kurse.length - 1);
  const r = kennungenEindeutig(x);
  gleich('eine Kennung repariert', r.map((y) => [y.art, y.alt, y.neu]), [['kurse', voll.id, voll.id + '~3']]);
  gleich('erster Kurs behält Kennung', x.kurse[0].id, voll.id);
  gleich('alle Kurse im Speicher', zerlegen(x).get('kurse')!.size, x.kurse.length);
  gleich('Noten des ersten Kurses bleiben', zerlegen(x).get('kurse')!.get(voll.id), JSON.stringify(voll));
  gleich('zweiter Lauf ändert nichts', kennungenEindeutig(x).length, 0);
  gleich('Beispieldaten ohne Doppelte', kennungenEindeutig(beispielDaten()).length, 0);
}

console.log(`${ok} Ablage-Prüfungen bestanden, ${fehler} fehlgeschlagen`);
if (fehler) process.exit(1);
