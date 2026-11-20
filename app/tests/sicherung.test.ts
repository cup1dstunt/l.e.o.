// Prüft die Sicherung F3 ohne Browser. Aufruf: npm test
import { einrichten, schluesselAus, umpacken } from '../src/lib/tresor.ts';
import { dateiBauen, dateiOeffnen, istVerschluesselteDatei, standBauen, standOeffnen, standMitSchluessel, ueberzaehlig, ueberblick, tag } from '../src/lib/sicherung.ts';
import { beispielDaten } from '../src/lib/beispiel.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}
async function wirft(f: () => Promise<unknown>) { try { await f(); return false; } catch { return true; } }

const R = 1000;
const d = beispielDaten();
const name = d.schueler[0].nachname;
const { tresor, roh } = await einrichten('geheim1', R);
const k = await schluesselAus(roh);

const f = await dateiBauen(k, tresor, d);
const text = JSON.stringify(f);
gleich('Datei enthält keinen Namen', text.includes(name), false);
gleich('Datei enthält keine Noten-Schlüssel', text.includes('zellen'), false);
gleich('als verschlüsselte Datei erkannt', [istVerschluesselteDatei(JSON.parse(text)), istVerschluesselteDatei(d)], [true, false]);
gleich('gleiches Gerät öffnet ohne Passwort', JSON.stringify(await dateiOeffnen(JSON.parse(text), k)) === JSON.stringify(d), true);

const fremd = await schluesselAus((await einrichten('x', R)).roh);
gleich('anderes Gerät ohne Passwort: nicht offen', await dateiOeffnen(JSON.parse(text), fremd), null);
gleich('anderes Gerät mit Passwort: offen', (await dateiOeffnen(JSON.parse(text), fremd, 'geheim1'))?.schueler.length, d.schueler.length);
gleich('falsches Passwort: nicht offen', await dateiOeffnen(JSON.parse(text), fremd, 'falsch'), null);
const verbogen = { ...JSON.parse(text), geheim: JSON.parse(text).geheim.replace(/^.{8}/, 'AAAAAAAA') };
gleich('veränderte Datei: nicht offen', await dateiOeffnen(verbogen, k, 'geheim1'), null);
// Nach Passwortwechsel öffnet die alte Datei weiter mit dem alten Passwort (sie trägt den alten Tresor)
await umpacken(tresor, 'geheim1', 'neu999');
gleich('alte Datei nach Passwortwechsel mit altem Passwort', (await dateiOeffnen(JSON.parse(text), fremd, 'geheim1')) !== null, true);

// Stände
const s = await standBauen(k, d, 'taeglich', new Date(2026, 10, 19, 0, 30));
gleich('Tagesstand id nach lokalem Datum', s.id, '2026-11-19');
gleich('Stand ohne Klartext', JSON.stringify(s).includes(name), false);
gleich('Stand öffnen', (await standOeffnen(s, k)).schueler.length, d.schueler.length);
gleich('Stand mit fremdem Schlüssel scheitert', await wirft(() => standOeffnen(s, fremd)), true);
gleich('Stand mit umgehängter id scheitert', await wirft(() => standOeffnen({ ...s, id: '2026-11-18' }, k)), true);
const umg = await standMitSchluessel(s, d, fremd);
gleich('umgeschlüsselter Stand: gleiche id, neuer Schlüssel', [umg.id, (await standOeffnen(umg, fremd)).schueler.length], [s.id, d.schueler.length]);
const klar = await standBauen(undefined, d, 'vorher');
gleich('ohne Schlüssel: Stand unverschlüsselt (nur ohne HTTPS)', (await standOeffnen(klar)).schueler.length, d.schueler.length);
gleich('vorher-Stand eigene id', klar.id.startsWith('vor-'), true);

const tage = Array.from({ length: 10 }, (_, i) => ({ id: `2026-11-${String(10 + i).padStart(2, '0')}`, erstellt: `2026-11-${String(10 + i).padStart(2, '0')}T07:00:00Z`, anlass: 'taeglich' as const }));
const vor = Array.from({ length: 5 }, (_, i) => ({ id: `vor-${i}`, erstellt: `2026-11-1${i}T08:00:00Z`, anlass: 'vorher' as const }));
gleich('7 Tagesstände bleiben, älteste fallen weg', ueberzaehlig(tage), ['2026-11-12', '2026-11-11', '2026-11-10']);
gleich('3 vorher-Stände bleiben', ueberzaehlig(vor), ['vor-1', 'vor-0']);
gleich('lokaler Tag kurz nach Mitternacht', tag(new Date(2026, 0, 1, 0, 5)), '2026-01-01');

const u = ueberblick(d);
gleich('Überblick zählt', [u.klassen.length, u.schueler], [d.kurse.length, d.schueler.length]);
gleich('Überblick Noten > 0', u.noten > 0, true);

console.log(`sicherung: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
