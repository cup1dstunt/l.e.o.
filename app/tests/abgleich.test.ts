// Prüft den Abgleich F4 ohne Browser: Regeln, Zusammenführen einer Klasse und den Dienst selbst (echter HTTP-Server).
// Aufruf: npm test
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { entscheiden, kursMischen, rufen, geraetName } from '../src/lib/abgleich.ts';
import { einrichten, schluesselAus, verschluesseln, entschluesseln, nachweis, oeffnen, umpacken, rohText, dateiVerschluesseln, dateiEntschluesseln } from '../src/lib/tresor.ts';
import { datensatz } from '../src/lib/ablage.ts';
import { beispielDaten } from '../src/lib/beispiel.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}
async function status(f: () => Promise<unknown>): Promise<number> { try { await f(); return 200; } catch (e: any) { return e.status ?? -1; } }

// ---------- Regeln ----------
const t1 = '2026-11-19T10:00:00.000Z', t2 = '2026-11-19T11:00:00.000Z';
gleich('nichts ausstehend: Server gilt', entscheiden('notizen', { geaendert: t1 }, { geaendert: t2 }, false), 'uebernehmen');
gleich('gleicher Stand: nichts', entscheiden('notizen', { geaendert: t1 }, { geaendert: t1 }, true), 'nichts');
gleich('eigene neuer: behalten', entscheiden('notizen', { geaendert: t1 }, { geaendert: t2 }, true), 'behalten');
gleich('Server neuer: übernehmen', entscheiden('notizen', { geaendert: t2 }, { geaendert: t1 }, true), 'uebernehmen');
gleich('Klasse auf beiden geändert: mischen', entscheiden('kurse', { geaendert: t2 }, { geaendert: t1 }, true), 'mischen');
gleich('Klasse hier gelöscht, dort geändert: neuer gewinnt', entscheiden('kurse', { geaendert: t2 }, { geaendert: t1, geloescht: true }, true), 'uebernehmen');
gleich('Server löscht, hier älter geändert', entscheiden('kurse', { geaendert: t2, geloescht: true }, { geaendert: t1 }, true), 'uebernehmen');

const basis = beispielDaten().kurse[0];
const lId = basis.leistungen[0].id;
const [sA, sB] = basis.schueler;
const pc = structuredClone(basis); pc.zellen[`${lId}:${sA}`] = { wert: 2 }; pc.name = 'PC-Name';
const ipad = structuredClone(basis); ipad.zellen[`${lId}:${sB}`] = { wert: 4 }; ipad.leistungen.push({ id: 'neuL', name: 'Test 9', gruppe: 'sl', art: 'Test', gewicht: 1 });
const m = kursMischen(pc, ipad, true, basis);
gleich('Mischen: Note vom PC bleibt', m.zellen[`${lId}:${sA}`], { wert: 2 });
gleich('Mischen: Note vom iPad kommt dazu', m.zellen[`${lId}:${sB}`], { wert: 4 });
gleich('Mischen: neue Leistung vom iPad', m.leistungen.some((l) => l.id === 'neuL'), true);
gleich('Mischen: Name nur am PC geändert, bleibt', m.name, 'PC-Name');
const ohneBasis = kursMischen(pc, ipad, true);
gleich('ohne gemeinsamen Stand: neuere Zelle gewinnt', ohneBasis.zellen[`${lId}:${sA}`], basis.zellen[`${lId}:${sA}`]);
gleich('ohne gemeinsamen Stand: nichts geht verloren', [!!ohneBasis.zellen[`${lId}:${sB}`], ohneBasis.leistungen.some((l) => l.id === 'neuL')], [true, true]);
const geloescht = structuredClone(basis); delete geloescht.zellen[`${lId}:${sA}`];
gleich('Mischen: hier gelöschte Note bleibt gelöscht', kursMischen(geloescht, ipad, true, basis).zellen[`${lId}:${sA}`], undefined);
const ohneL = structuredClone(basis); ohneL.leistungen = ohneL.leistungen.slice(1);
gleich('Mischen: dort gelöschte Leistung bleibt gelöscht', kursMischen(pc, ohneL, true, basis).leistungen.some((l) => l.id === lId), false);
const gleicheZelle = structuredClone(basis); gleicheZelle.zellen[`${lId}:${sA}`] = { wert: 5 };
gleich('Mischen: gleiche Zelle, neuere gewinnt', kursMischen(pc, gleicheZelle, true, basis).zellen[`${lId}:${sA}`], { wert: 5 });
gleich('Mischen: gleiche Zelle, eigene neuer', kursMischen(pc, gleicheZelle, false, basis).zellen[`${lId}:${sA}`], { wert: 2 });
gleich('Gerätename ohne persönliche Angaben', geraetName('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'), 'iPad, Safari');

// ---------- Dienst ----------
const ordner = mkdtempSync(path.join(tmpdir(), 'leo-abgleich-'));
process.env.ABGLEICH_DATEN = ordner;
process.env.LEO_EINLADUNG = 'einladung-test';
const { dienst } = await import('../abgleich/server.mjs');
const server = dienst();
await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
const b = `http://127.0.0.1:${(server.address() as any).port}`;
const R = 1000;
try {
  gleich('Status', await rufen('status', { basis: b }), { ok: true, kontoAnlegen: true, version: 1 });
  const { tresor, roh } = await einrichten('pw-eins', R);
  const k = await schluesselAus(roh);
  const nw = await nachweis('pw-eins', 'Lehrer.Test', R);
  gleich('Nachweis unabhängig von Groß/Klein', nw, await nachweis('pw-eins', ' lehrer.test ', R));
  gleich('Nachweis enthält nicht den Schlüssel', nw !== rohText(roh), true);

  gleich('unbekanntes Konto: 404', await status(() => rufen('anmelden', { basis: b, body: { benutzer: 'lehrer.test', nachweis: nw } })), 404);
  gleich('falscher Einladungscode: 403', await status(() => rufen('konto', { basis: b, body: { benutzer: 'lehrer.test', nachweis: nw, tresor, einladung: 'falsch' } })), 403);
  const a = await rufen<any>('konto', { basis: b, body: { benutzer: 'Lehrer.Test', nachweis: nw, tresor, einladung: 'einladung-test', geraet: 'PC' } });
  gleich('Konto angelegt, Token', typeof a.token, 'string');
  gleich('Konto doppelt: 409', await status(() => rufen('konto', { basis: b, body: { benutzer: 'lehrer.test', nachweis: nw, tresor, einladung: 'einladung-test' } })), 409);

  // Datensätze senden
  const d = beispielDaten();
  const satz = datensatz(d.schueler[0].id, JSON.stringify(d.schueler[0]), 0, new Date(t1));
  const g = await verschluesseln(k, 'schueler', satz);
  const klar = { art: 'schueler', id: satz.id, geaendert: satz.geaendert, satz };
  gleich('unverschlüsselter Datensatz abgelehnt', await status(() => rufen('aenderungen', { basis: b, token: a.token, body: { saetze: [klar] } })), 400);
  gleich('ohne Token: 401', await status(() => rufen('aenderungen', { basis: b, body: { saetze: [] } })), 401);
  const r1 = await rufen<any>('aenderungen', { basis: b, token: a.token, body: { saetze: [{ art: 'schueler', id: g.id, geaendert: g.geaendert, satz: g }] } });
  gleich('angenommen', [r1.angenommen, r1.abgelehnt, r1.stand], [1, [], 1]);
  const r1b = await rufen<any>('aenderungen', { basis: b, token: a.token, body: { saetze: [{ art: 'schueler', id: g.id, geaendert: g.geaendert, satz: g }] } });
  gleich('gleicher Stand nochmal: kein neuer Stand', [r1b.angenommen, r1b.stand], [0, 1]);

  // Zweites Gerät meldet sich an
  const nwFalsch = await nachweis('falsch', 'lehrer.test', R);
  gleich('falsches Passwort: 401', await status(() => rufen('anmelden', { basis: b, body: { benutzer: 'lehrer.test', nachweis: nwFalsch } })), 401);
  const a2 = await rufen<any>('anmelden', { basis: b, body: { benutzer: 'lehrer.test', nachweis: nw, geraet: 'iPad' } });
  const roh2 = await oeffnen(a2.tresor, 'pw-eins');
  gleich('zweites Gerät bekommt denselben Schlüssel', rohText(roh2!), rohText(roh));
  const p = await rufen<any>('aenderungen?seit=0', { basis: b, token: a2.token });
  gleich('zweites Gerät holt den Datensatz', [p.saetze.length, p.stand], [1, 1]);
  gleich('und kann ihn lesen', (await entschluesseln(await schluesselAus(roh2!), 'schueler', p.saetze[0].satz)).daten, d.schueler[0]);
  gleich('seit aktuellem Stand: nichts Neues', (await rufen<any>('aenderungen?seit=1', { basis: b, token: a2.token })).saetze.length, 0);

  // Neuere Änderung gewinnt
  const alt = await verschluesseln(k, 'schueler', { ...satz, geaendert: '2026-11-18T09:00:00.000Z' });
  const r2 = await rufen<any>('aenderungen', { basis: b, token: a2.token, body: { saetze: [{ art: 'schueler', id: alt.id, geaendert: alt.geaendert, satz: alt }] } });
  gleich('ältere Änderung abgelehnt', r2.abgelehnt, [`schueler|${satz.id}`]);
  const r3 = await rufen<any>('aenderungen', { basis: b, token: a2.token, body: { saetze: [{ art: 'schueler', id: satz.id, geaendert: t2, geloescht: true }] } });
  gleich('Löschen angenommen', [r3.angenommen, r3.stand], [1, 2]);
  const p2 = await rufen<any>('aenderungen?seit=1', { basis: b, token: a.token });
  gleich('erstes Gerät erfährt vom Löschen', [p2.saetze[0].geloescht, p2.saetze[0].satz], [true, undefined]);

  // Auf dem Server liegt nichts Lesbares
  const dateien = readdirSync(path.join(ordner, 'konten'));
  const inhalt = readFileSync(path.join(ordner, 'konten', dateien[0]), 'utf8');
  gleich('eine Datei je Konto', dateien.length, 1);
  gleich('kein Schülername auf dem Server', inhalt.includes(d.schueler[0].nachname), false);
  gleich('kein Passwort und kein Nachweis auf dem Server', [inhalt.includes('pw-eins'), inhalt.includes(nw)], [false, false]);

  // Passwort ändern
  const t = (await umpacken(tresor, 'pw-eins', 'pw-zwei'))!;
  const nw2 = await nachweis('pw-zwei', 'lehrer.test', R);
  gleich('Passwortwechsel mit falschem alten Nachweis: 401', await status(() => rufen('passwort', { basis: b, token: a.token, body: { nachweisAlt: nw2, nachweis: nw2, tresor: t } })), 401);
  const pw = await rufen<any>('passwort', { basis: b, token: a.token, body: { nachweisAlt: nw, nachweis: nw2, tresor: t } });
  gleich('Passwort geändert, neue Tresor-Version', pw.tresorRev, 2);
  const p3 = await rufen<any>('aenderungen?seit=2', { basis: b, token: a2.token });
  gleich('anderes Gerät bekommt neuen Tresor', [p3.tresorRev, rohText((await oeffnen(p3.tresor, 'pw-zwei'))!)], [2, rohText(roh)]);
  gleich('altes Passwort meldet nicht mehr an', await status(() => rufen('anmelden', { basis: b, body: { benutzer: 'lehrer.test', nachweis: nw } })), 401);

  // Abmelden
  await rufen('abmelden', { basis: b, token: a2.token, body: {} });
  gleich('nach Abmelden: Token ungültig', await status(() => rufen('aenderungen?seit=0', { basis: b, token: a2.token })), 401);
  gleich('anderes Gerät bleibt angemeldet', await status(() => rufen('aenderungen?seit=0', { basis: b, token: a.token })), 200);

  // Sperre nach vielen Fehlversuchen
  const falsch = await nachweis('x', 'lehrer.test', R);
  for (let i = 0; i < 4; i++) await status(() => rufen('anmelden', { basis: b, body: { benutzer: 'lehrer.test', nachweis: falsch } }));
  gleich('nach 5 Fehlversuchen gesperrt', await status(() => rufen('anmelden', { basis: b, body: { benutzer: 'lehrer.test', nachweis: nw2 } })), 429);

  // Dateiinhalte (Dateiablage, V14): roh, verschlüsselt, je Konto ein Ordner
  const klartext = new TextEncoder().encode('Arbeitsblatt Unit 6 – Aufgabe 1');
  const geheim = await dateiVerschluesseln(k, 'dTest12345', klartext.buffer);
  const dUrl = (id: string) => `${b}/abgleich/datei?id=${id}`;
  const mitToken = (t: string) => ({ authorization: 'Bearer ' + t });
  gleich('Datei ohne Token: 401', (await fetch(dUrl('dTest12345'), { method: 'PUT', body: geheim })).status, 401);
  gleich('Datei-id ungültig: 400', (await fetch(dUrl('../x'), { headers: mitToken(a.token) })).status, 400);
  gleich('noch nicht da: 404', (await fetch(dUrl('dTest12345'), { headers: mitToken(a.token) })).status, 404);
  gleich('zu kurz (nicht verschlüsselt): 400', (await fetch(dUrl('dTest12345'), { method: 'PUT', headers: mitToken(a.token), body: new Uint8Array(5) })).status, 400);
  const hoch = await fetch(dUrl('dTest12345'), { method: 'PUT', headers: { ...mitToken(a.token), 'content-type': 'application/octet-stream' }, body: geheim });
  gleich('Datei hochgeladen', [hoch.status, (await hoch.json()).groesse], [200, geheim.length]);
  const runter = await fetch(dUrl('dTest12345'), { headers: mitToken(a.token) });
  const bytes = new Uint8Array(await runter.arrayBuffer());
  gleich('Datei wieder geholt, gleiche Bytes', [runter.status, bytes.length, bytes.every((x, i) => x === geheim[i])], [200, geheim.length, true]);
  gleich('mit dem Schlüssel des Kontos lesbar', new TextDecoder().decode(await dateiEntschluesseln(await schluesselAus(roh2!), 'dTest12345', bytes)), 'Arbeitsblatt Unit 6 – Aufgabe 1');
  gleich('andere Datei-id passt nicht (Prüfsumme)', await dateiEntschluesseln(k, 'dAnders1234', bytes).then(() => 'gelesen', () => 'abgelehnt'), 'abgelehnt');
  const ablage = readdirSync(path.join(ordner, 'dateien'));
  const dInhalt = readFileSync(path.join(ordner, 'dateien', ablage[0], 'dTest12345.bin'));
  gleich('auf dem Server nur Geheimtext', dInhalt.includes(Buffer.from('Arbeitsblatt')), false);
  gleich('zu groß: 413', await fetch(dUrl('dGross1234'), { method: 'PUT', headers: mitToken(a.token), body: new Uint8Array(16 * 1024 * 1024) }).then((r) => r.status, () => 413), 413);
  gleich('Datei löschen', (await fetch(dUrl('dTest12345'), { method: 'DELETE', headers: mitToken(a.token) })).status, 200);
  gleich('danach weg', (await fetch(dUrl('dTest12345'), { headers: mitToken(a.token) })).status, 404);
  gleich('nochmal löschen schadet nicht', (await fetch(dUrl('dTest12345'), { method: 'DELETE', headers: mitToken(a.token) })).status, 200);

  // Server neu starten: Daten bleiben
  const { dienst: dienst2 } = await import('../abgleich/server.mjs?neu' as string);
  const s2 = dienst2();
  await new Promise<void>((r) => s2.listen(0, '127.0.0.1', () => r()));
  const b2 = `http://127.0.0.1:${(s2.address() as any).port}`;
  const n = await rufen<any>('aenderungen?seit=0', { basis: b2, token: a.token });
  gleich('nach Neustart noch da', [n.stand, n.saetze.length], [2, 1]);
  s2.close();
} finally {
  server.close();
  rmSync(ordner, { recursive: true, force: true });
}

console.log(`abgleich: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
