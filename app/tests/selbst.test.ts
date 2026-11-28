// Prüft die Selbsteinschätzung per Link (FB7b, E116) ohne Browser: Verschlüsselung Schüler → Lehrkraft,
// Mails, Vergleich und die Endpunkte im Abgleich-Dienst (echter HTTP-Server).
// Aufruf: npm test
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  neueRundenId, neuerToken, linkHash, linkFuer, schluesselpaar, antwortLesen, antwortSaeubern, bogenFuer, vergleich, abweichungen,
  SELBST_MAIL, selbstMailWerte, selbstMail, rundenStand, fristIn
} from '../src/lib/selbst.ts';
import { VORLAGEN } from '../src/lib/raster.ts';
import { rufen } from '../src/lib/abgleich.ts';
import { einrichten, nachweis } from '../src/lib/tresor.ts';
// @ts-ignore – Browser-Modul des Schülerbogens
import { verschluesseln, linkHash as linkHashSchueler } from '../static/e/krypto.js';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}
async function status(f: () => Promise<unknown>): Promise<number> { try { await f(); return 200; } catch (e: any) { return e.status ?? -1; } }

// ---------- Verschlüsselung ----------
const id = neueRundenId();
gleich('Runden-id 16 Hex', /^[0-9a-f]{16}$/.test(id), true);
const token = neuerToken(id);
gleich('Token: Runde + Zufall', /^[0-9a-f]{16}\.[\w-]{22}$/.test(token), true);
gleich('Link mit # (Token geht nicht an den Server)', linkFuer('https://leo.example.de/', token), `https://leo.example.de/e/#${token}`);
const h = await linkHash(token);
gleich('Hash gleich in App und Bogen', await linkHashSchueler(token), h);
const paar = await schluesselpaar();
const geheim = await verschluesseln(paar.oeffentlich, h, { stufen: { beteiligung: 3, qualitaet: 4 }, kommentar: 'passt' });
gleich('Antwort enthält keinen Klartext', JSON.stringify(geheim).includes('passt'), false);
gleich('Lehrkraft liest die Antwort', await antwortLesen(paar.privat, geheim, h), { stufen: { beteiligung: 3, qualitaet: 4 }, kommentar: 'passt' });
const h2 = await linkHash(neuerToken(id));
gleich('vertauschte Antwort (anderer Link) scheitert', await antwortLesen(paar.privat, geheim, h2).then(() => 'gelesen', () => 'abgelehnt'), 'abgelehnt');
const fremd = await schluesselpaar();
gleich('falscher Schlüssel scheitert', await antwortLesen(fremd.privat, geheim, h).then(() => 'gelesen', () => 'abgelehnt'), 'abgelehnt');
gleich('Säubern: nur bekannte Kriterien und Stufen 1–4',
  antwortSaeubern({ stufen: { beteiligung: 3, qualitaet: 7, fremd: 2 }, kommentar: '  x  ' }, ['beteiligung', 'qualitaet'], 'z'),
  { stufen: { beteiligung: 3 }, zeit: 'z', kommentar: 'x' });

// ---------- Bogen, Mail, Vergleich ----------
const raster = VORLAGEN[0];
const kriterien = raster.bereiche.flatMap((b) => b.kriterien).filter((k) => !k.optional);
const bogen = bogenFuer({ fach: 'Englisch', klasse: 'BFS23a' }, '2026-11', kriterien, '2026-12-04', paar.oeffentlich);
gleich('Bogen: Titel ohne Namen', bogen.titel, 'Englisch · BFS23a · November 2026');
gleich('Bogen: nur öffentlicher Schlüssel', 'd' in bogen.schluessel, false);
gleich('Bogen: 5 Kriterien ohne Hausaufgaben', bogen.kriterien.map((k) => k.id), ['beteiligung', 'qualitaet', 'sprache', 'arbeitsverhalten', 'zusammenarbeit']);
gleich('Bogen: Ich-Form für Schüler (E125)', bogen.kriterien[0].stufen[0], 'Ich melde mich oft von selbst.');
gleich('Raster: Lehrkrafttext ohne Ich-Form (E125)', kriterien.every((k) => k.stufen.every((t) => !/^(Ich|Mein|Mir|Man versteht mich)/.test(t))), true);
const runde = { monat: '2026-11', frist: '2026-12-04', basis: 'https://leo.example.de', links: { s1: { token } } };
const mail = selbstMail(SELBST_MAIL, selbstMailWerte(runde, { fach: 'Englisch', klasse: 'BFS23a' }, { id: 's1', vorname: 'Mia', nachname: 'Test' }));
gleich('Mail: Betreff', mail.betreff, 'Selbsteinschätzung Englisch: November 2026');
gleich('Mail: Link und Frist im Text', [mail.text.includes(linkFuer(runde.basis, token)), mail.text.includes('Freitag, 4. Dezember')], [true, true]);
gleich('Mail: eigene Vorlage', selbstMail({ betreff: '{fach}', text: 'Hi {vorname} {unbekannt}' }, selbstMailWerte(runde, { fach: 'E', klasse: 'K' }, { id: 's1', vorname: 'Mia', nachname: 'T' })), { betreff: 'E', text: 'Hi Mia {unbekannt}' });
const v = vergleich(kriterien, { beteiligung: 4, qualitaet: 2, sprache: 3 }, { beteiligung: 2, qualitaet: 2 });
gleich('Vergleich: Abstand Selbst − Lehrkraft', v.map((x) => x.abstand), [2, 0, null, null, null]);
gleich('Abweichung ab 2 Stufen', abweichungen(v).map((x) => x.id), ['beteiligung']);
const st = rundenStand({ id, monat: '2026-11', rasterId: raster.id, kriterien: [], frist: '2999-01-01', basis: '', privat: {}, erstellt: '', links: { a: { token: 't', mail: 'x' }, b: { token: 't' } }, antworten: { a: { stufen: {}, zeit: '' } } }, ['a', 'b', 'c']);
gleich('Stand: zurück, offen, ohne Mail, ohne Link', [st.zurueck, st.offen, st.ohneMail, st.ohneLink], [1, ['b'], ['b'], ['c']]);
gleich('Frist in 7 Tagen', fristIn(7, new Date('2026-11-25T10:00:00Z')), '2026-12-02');

// ---------- Dienst ----------
const ordner = mkdtempSync(path.join(tmpdir(), 'leo-selbst-'));
process.env.ABGLEICH_DATEN = ordner;
process.env.LEO_EINLADUNG = 'einladung-test';
const { dienst, selbstAufraeumen } = await import('../abgleich/server.mjs');
const server = dienst();
await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
const b = `http://127.0.0.1:${(server.address() as any).port}`;
const R = 1000;
try {
  const konto = async (benutzer: string) => {
    const t = await einrichten('pw-' + benutzer, R);
    return (await rufen<any>('konto', { basis: b, body: { benutzer, nachweis: await nachweis('pw-' + benutzer, benutzer, R), tresor: t.tresor, einladung: 'einladung-test', geraet: 'Test' } })).token as string;
  };
  const lk = await konto('lehrer');
  const andere = await konto('andere');
  const tokens = [neuerToken(id), neuerToken(id)];
  const hashes = await Promise.all(tokens.map(linkHash));
  const zukunft = fristIn(10);
  const bg = { ...bogen, frist: zukunft };
  gleich('Runde ohne Anmeldung abgelehnt', await status(() => rufen('selbst/runde', { basis: b, body: { id, bogen: bg, links: hashes } })), 401);
  gleich('Bogen mit privatem Schlüssel abgelehnt', await status(() => rufen('selbst/runde', { basis: b, token: lk, body: { id, bogen: { ...bg, schluessel: paar.privat }, links: hashes } })), 400);
  gleich('Runde anlegen', await status(() => rufen('selbst/runde', { basis: b, token: lk, body: { id, bogen: bg, links: hashes } })), 200);
  gleich('fremdes Konto darf die Runde nicht lesen', await status(() => rufen('selbst/antworten', { basis: b, token: andere, body: { id } })), 403);
  const datei = readFileSync(path.join(ordner, 'selbst', id + '.json'), 'utf8');
  gleich('Server-Datei ohne Token und ohne privaten Schlüssel', [datei.includes(tokens[0].split('.')[1]), datei.includes(String(paar.privat.d))], [false, false]);

  const geladen = await rufen<any>('selbst/bogen', { basis: b, body: { t: tokens[0] } });
  gleich('Schüler öffnet den Bogen', [geladen.titel, geladen.kriterien.length, geladen.abgegeben, geladen.abgelaufen], [bogen.titel, 5, false, false]);
  gleich('falscher Link: 404', await status(() => rufen('selbst/bogen', { basis: b, body: { t: id + '.' + 'x'.repeat(22) } })), 404);
  gleich('Unsinn statt Link: 404', await status(() => rufen('selbst/bogen', { basis: b, body: { t: '../../etc' } })), 404);
  const ant = await verschluesseln(geladen.schluessel, hashes[0], { stufen: { beteiligung: 4, qualitaet: 3 }, kommentar: '' });
  gleich('Abgeben', await status(() => rufen('selbst/abgeben', { basis: b, body: { t: tokens[0], antwort: ant } })), 200);
  gleich('zweites Abgeben: 409', await status(() => rufen('selbst/abgeben', { basis: b, body: { t: tokens[0], antwort: ant } })), 409);
  gleich('Bogen zeigt „schon abgegeben“', (await rufen<any>('selbst/bogen', { basis: b, body: { t: tokens[0] } })).abgegeben, true);
  gleich('Abgeben ohne Verschlüsselung abgelehnt', await status(() => rufen('selbst/abgeben', { basis: b, body: { t: tokens[1], antwort: { stufen: { beteiligung: 1 } } } })), 400);
  const zuGross = await status(() => rufen('selbst/abgeben', { basis: b, body: { t: tokens[1], antwort: { ...ant, geheim: 'x'.repeat(100_000) } } }));
  gleich('übergroße Antwort abgelehnt', zuGross === 413 || zuGross === 0, true);

  const a = await rufen<any>('selbst/antworten', { basis: b, token: lk, body: { id } });
  gleich('Lehrkraft holt eine Antwort', Object.keys(a.antworten), [hashes[0]]);
  gleich('… und entschlüsselt sie', (await antwortLesen(paar.privat, a.antworten[hashes[0]].antwort, hashes[0])).stufen, { beteiligung: 4, qualitaet: 3 });

  // Links ergänzen: bestehende Antwort bleibt
  const neu = neuerToken(id);
  await rufen('selbst/runde', { basis: b, token: lk, body: { id, bogen: bg, links: [await linkHash(neu)] } });
  gleich('Ergänzen behält Antworten', Object.keys((await rufen<any>('selbst/antworten', { basis: b, token: lk, body: { id } })).antworten).length, 1);
  gleich('neuer Link funktioniert', (await rufen<any>('selbst/bogen', { basis: b, body: { t: neu } })).abgegeben, false);

  // Frist abgelaufen
  const id2 = neueRundenId();
  const t2 = neuerToken(id2);
  await rufen('selbst/runde', { basis: b, token: lk, body: { id: id2, bogen: { ...bogen, frist: '2020-01-01' }, links: [await linkHash(t2)] } });
  gleich('abgelaufen: Bogen sagt es', (await rufen<any>('selbst/bogen', { basis: b, body: { t: t2 } })).abgelaufen, true);
  gleich('abgelaufen: Abgeben 410', await status(() => rufen('selbst/abgeben', { basis: b, body: { t: t2, antwort: ant } })), 410);
  gleich('Aufräumen löscht alte Runden (Frist + 60 Tage)', await selbstAufraeumen(), 1);
  gleich('aktuelle Runde bleibt', readdirSync(path.join(ordner, 'selbst')).length, 1);

  // Beenden
  gleich('fremdes Konto darf nicht beenden', await status(() => rufen('selbst/beenden', { basis: b, token: andere, body: { id } })), 403);
  await rufen('selbst/beenden', { basis: b, token: lk, body: { id } });
  gleich('nach Beenden: Link ungültig', await status(() => rufen('selbst/bogen', { basis: b, body: { t: tokens[1] } })), 404);
  gleich('nach Beenden: Datei weg', readdirSync(path.join(ordner, 'selbst')).length, 0);
  writeFileSync(path.join(ordner, 'selbst', 'kaputt.json'), '{');
  gleich('fremde Dateien stören das Aufräumen nicht', await selbstAufraeumen(), 0);
} finally {
  server.close();
  rmSync(ordner, { recursive: true, force: true });
}

console.log(`Selbsteinschätzung: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
