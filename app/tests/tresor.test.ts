// Prüft die Verschlüsselung F2 ohne Browser (Node bringt WebCrypto mit).
// Aufruf: npm test
import { einrichten, oeffnen, umpacken, schluesselAus, verschluesseln, entschluesseln, istGeheim, rohText, rohAusText } from '../src/lib/tresor.ts';
import { datensatz } from '../src/lib/ablage.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}
async function wirft(f: () => Promise<unknown>) { try { await f(); return false; } catch { return true; } }

const R = 1000; // wenige Runden, damit der Test schnell ist
const { tresor, roh } = await einrichten('richtig', R);
gleich('Tresor enthält kein Passwort', JSON.stringify(tresor).includes('richtig'), false);
gleich('richtiges Passwort öffnet', rohText((await oeffnen(tresor, 'richtig'))!), rohText(roh));
gleich('falsches Passwort öffnet nicht', await oeffnen(tresor, 'falsch'), null);

const k = await schluesselAus(roh);
const satz = datensatz('s1', JSON.stringify({ id: 's1', vorname: 'Erfunden', nachname: 'Muster' }), 3);
const g = await verschluesseln(k, 'schueler', satz);
gleich('Inhalt nicht lesbar', JSON.stringify(g).includes('Erfunden'), false);
gleich('Kopfdaten lesbar', [g.id, g.v, g.pos, g.geaendert === satz.geaendert], ['s1', 1, 3, true]);
gleich('als geheim erkannt', [istGeheim(g), istGeheim(satz)], [true, false]);
gleich('zurück entschlüsselt', await entschluesseln(k, 'schueler', g), satz);
gleich('zweimal verschlüsselt sieht anders aus', (await verschluesseln(k, 'schueler', satz)).geheim !== g.geheim, true);

const fremd = await schluesselAus((await einrichten('anders', R)).roh);
gleich('fremder Schlüssel scheitert', await wirft(() => entschluesseln(fremd, 'schueler', g)), true);
gleich('umgehängte Art scheitert', await wirft(() => entschluesseln(k, 'notizen', g)), true);
gleich('umgehängte id scheitert', await wirft(() => entschluesseln(k, 'schueler', { ...g, id: 's2' })), true);
const kaputt = { ...g, geheim: g.geheim.slice(0, -4) + (g.geheim.endsWith('AAAA') ? 'BBBB' : 'AAAA') };
gleich('veränderter Inhalt scheitert', await wirft(() => entschluesseln(k, 'schueler', kaputt)), true);

const neu = (await umpacken(tresor, 'richtig', 'neu1234'))!;
gleich('nach Wechsel öffnet neues Passwort', rohText((await oeffnen(neu, 'neu1234'))!), rohText(roh));
gleich('nach Wechsel altes Passwort nicht mehr', await oeffnen(neu, 'richtig'), null);
gleich('Wechsel mit falschem altem Passwort', await umpacken(tresor, 'falsch', 'x'), null);
gleich('Rohschlüssel als Text hin und zurück', rohText(rohAusText(rohText(roh))), rohText(roh));

const t0 = performance.now();
await einrichten('zeit');
console.log(`(600 000 Runden: ${Math.round(performance.now() - t0)} ms)`);

console.log(`tresor: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
