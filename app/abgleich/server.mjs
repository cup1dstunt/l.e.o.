// @ts-nocheck – reines Node-JavaScript ohne Typen, geprüft durch tests/abgleich.test.ts
// L.E.O. Abgleich-Dienst (Fundament F4, docs/FUNDAMENT.md, E103).
// Läuft im selben Container wie nginx, nginx reicht /abgleich/ hierher durch.
// Der Dienst sieht nur verschlüsselte Datensätze: Inhalt ist AES-GCM im Gerät verschlüsselt (F2),
// lesbar sind nur Art, id, Änderungszeit. Datensätze ohne Verschlüsselung werden abgelehnt.
// Keine Abhängigkeiten, nur Node-Bordmittel. Daten: ein JSON je Konto in ABGLEICH_DATEN (Standard /daten).
import http from 'node:http';
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const PORT = Number(process.env.ABGLEICH_PORT ?? 8129);
const ORDNER = process.env.ABGLEICH_DATEN ?? '/daten';
const EINLADUNG = process.env.LEO_EINLADUNG ?? '';
const ARTEN = new Set(['schueler', 'kurse', 'mitarbeit', 'fehlzeiten', 'verspaetungen', 'notizen', 'nachschreiben', 'termine', 'material', 'stundenplan', 'einstellungen']);
const MAX_KOERPER = 16 * 1024 * 1024; // eine Anfrage
const MAX_SATZ = 4 * 1024 * 1024; // ein Datensatz (z. B. eine Klasse mit allen Noten)
const MAX_SAETZE = 50_000; // je Konto
const SEITE = 2000; // Datensätze je Abruf
const SPERRE_VERSUCHE = 5;
const SPERRE_MIN = 15;

const sha = (t) => createHash('sha256').update(t).digest('hex');
const kontoId = (benutzer) => sha('leo-konto|' + benutzer).slice(0, 32);
const datei = (id) => path.join(ORDNER, 'konten', id + '.json');
const normal = (b) => String(b ?? '').trim().toLowerCase();

// ---------- Konten laden und schreiben (je Konto nacheinander, Datei atomar ersetzen) ----------
const konten = new Map(); // id → Konto (Zwischenspeicher)
const warteschlange = new Map(); // id → Promise
function nacheinander(id, f) {
  const vorher = warteschlange.get(id) ?? Promise.resolve();
  const jetzt = vorher.then(f, f);
  warteschlange.set(id, jetzt.catch(() => {}));
  return jetzt;
}
async function laden(id) {
  if (konten.has(id)) return konten.get(id);
  try {
    const k = JSON.parse(await fs.readFile(datei(id), 'utf8'));
    konten.set(id, k);
    return k;
  } catch (e) {
    if (e.code === 'ENOENT') return undefined;
    throw e;
  }
}
async function sichern(id, k) {
  await fs.mkdir(path.dirname(datei(id)), { recursive: true });
  const tmp = datei(id) + '.' + randomBytes(4).toString('hex') + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(k));
  await fs.rename(tmp, datei(id));
  konten.set(id, k);
}

// ---------- Nachweis (aus dem Passwort im Gerät abgeleitet, nie das Passwort selbst) ----------
async function nachweisHash(nachweis, salz) {
  return (await scrypt(nachweis, salz, 32, { N: 16384, r: 8, p: 1 })).toString('hex');
}
async function nachweisOk(k, nachweis) {
  const ist = Buffer.from(await nachweisHash(nachweis, k.nachweis.salz), 'hex');
  const soll = Buffer.from(k.nachweis.hash, 'hex');
  return ist.length === soll.length && timingSafeEqual(ist, soll);
}

// Zu viele falsche Versuche: Konto für eine Weile sperren (je Benutzername)
const fehlversuche = new Map(); // id → { n, bis }
function gesperrt(id) {
  const f = fehlversuche.get(id);
  return f && f.bis > Date.now() ? Math.ceil((f.bis - Date.now()) / 60_000) : 0;
}
function fehlversuch(id) {
  const f = fehlversuche.get(id) ?? { n: 0, bis: 0 };
  f.n++;
  if (f.n >= SPERRE_VERSUCHE) { f.bis = Date.now() + SPERRE_MIN * 60_000; f.n = 0; }
  fehlversuche.set(id, f);
}

// ---------- Prüfungen ----------
const istText = (x, max) => typeof x === 'string' && x.length > 0 && x.length <= max;
function tresorOk(t) {
  return t && typeof t === 'object' && istText(t.salz, 200) && istText(t.iv, 200) && istText(t.schluessel, 500) && Number.isInteger(t.runden) && JSON.stringify(t).length < 2000;
}
function satzOk(s) {
  if (!s || typeof s !== 'object' || !ARTEN.has(s.art) || !istText(s.id, 300) || !istText(s.geaendert, 40)) return false;
  if (s.geloescht === true) return true;
  const g = s.satz;
  // Nur verschlüsselte Datensätze: Inhalt steckt in „geheim“, ein Feld „daten“ (Klartext) ist verboten
  return !!g && typeof g === 'object' && istText(g.geheim, MAX_SATZ) && istText(g.iv, 100) && g.id === s.id && g.geaendert === s.geaendert && !('daten' in g);
}

class Fehler extends Error {
  constructor(status, text) { super(text); this.status = status; }
}

function neuesGeraet(k, name) {
  const roh = randomBytes(32).toString('base64url');
  const token = `${k.id}.${roh}`;
  k.geraete[sha(token)] = { name: String(name ?? 'Gerät').slice(0, 80), erstellt: new Date().toISOString(), zuletzt: new Date().toISOString() };
  return token;
}
async function ausToken(req) {
  const m = /^Bearer (\w{32})\.([\w-]{20,})$/.exec(req.headers.authorization ?? '');
  if (!m) throw new Fehler(401, 'Nicht angemeldet');
  const k = await laden(m[1]);
  const g = k?.geraete[sha(`${m[1]}.${m[2]}`)];
  if (!g) throw new Fehler(401, 'Anmeldung abgelaufen, bitte neu verbinden');
  g.zuletzt = new Date().toISOString(); // wird mit dem nächsten Schreiben gesichert
  return { k, hash: sha(`${m[1]}.${m[2]}`) };
}

// ---------- Endpunkte ----------
const wege = {
  'GET /abgleich/status': async () => ({ ok: true, kontoAnlegen: !!EINLADUNG, version: 1 }),

  'POST /abgleich/konto': async (_req, b) => {
    if (!EINLADUNG) throw new Fehler(503, 'Auf diesem Server ist das Anlegen von Konten nicht eingerichtet (LEO_EINLADUNG fehlt).');
    const benutzer = normal(b.benutzer);
    if (!/^[a-z0-9._@-]{2,80}$/.test(benutzer)) throw new Fehler(400, 'Benutzername ungültig');
    if (!istText(b.nachweis, 200) || !tresorOk(b.tresor)) throw new Fehler(400, 'Anfrage unvollständig');
    const id = kontoId(benutzer);
    if (gesperrt(id)) throw new Fehler(429, `Zu viele Versuche. Bitte in ${gesperrt(id)} Minuten noch einmal.`);
    const a = Buffer.from(sha(String(b.einladung ?? '')));
    if (!timingSafeEqual(a, Buffer.from(sha(EINLADUNG)))) { fehlversuch(id); throw new Fehler(403, 'Einladungscode stimmt nicht'); }
    return nacheinander(id, async () => {
      if (await laden(id)) throw new Fehler(409, 'Dieses Konto gibt es schon');
      const salz = randomBytes(16).toString('hex');
      const k = {
        v: 1, id, benutzer, angelegt: new Date().toISOString(),
        nachweis: { salz, hash: await nachweisHash(b.nachweis, salz) },
        tresor: b.tresor, tresorRev: 1, rev: 0, saetze: {}, geraete: {}
      };
      const token = neuesGeraet(k, b.geraet);
      await sichern(id, k);
      return { token, tresor: k.tresor, tresorRev: k.tresorRev };
    });
  },

  'POST /abgleich/anmelden': async (_req, b) => {
    const id = kontoId(normal(b.benutzer));
    if (gesperrt(id)) throw new Fehler(429, `Zu viele Versuche. Bitte in ${gesperrt(id)} Minuten noch einmal.`);
    if (!istText(b.nachweis, 200)) throw new Fehler(400, 'Anfrage unvollständig');
    return nacheinander(id, async () => {
      const k = await laden(id);
      if (!k) throw new Fehler(404, 'Konto unbekannt');
      if (!(await nachweisOk(k, b.nachweis))) { fehlversuch(id); throw new Fehler(401, 'Benutzername oder Passwort stimmt nicht'); }
      fehlversuche.delete(id);
      const token = neuesGeraet(k, b.geraet);
      await sichern(id, k);
      return { token, tresor: k.tresor, tresorRev: k.tresorRev, stand: k.rev };
    });
  },

  'GET /abgleich/aenderungen': async (req) => {
    const { k } = await ausToken(req);
    const seit = Number(new URL(req.url, 'http://x').searchParams.get('seit') ?? 0) || 0;
    const neu = Object.values(k.saetze).filter((s) => s.rev > seit).sort((a, b) => a.rev - b.rev);
    const teil = neu.slice(0, SEITE);
    return {
      stand: teil.length < neu.length ? teil[teil.length - 1].rev : k.rev,
      mehr: teil.length < neu.length,
      tresorRev: k.tresorRev,
      tresor: k.tresor,
      saetze: teil
    };
  },

  'POST /abgleich/aenderungen': async (req, b) => {
    const { k: k0 } = await ausToken(req);
    if (!Array.isArray(b.saetze)) throw new Fehler(400, 'Anfrage unvollständig');
    for (const s of b.saetze) if (!satzOk(s)) throw new Fehler(400, 'Datensatz abgelehnt (nur verschlüsselte Datensätze erlaubt)');
    return nacheinander(k0.id, async () => {
      const k = await laden(k0.id);
      const abgelehnt = [];
      let angenommen = 0;
      for (const s of b.saetze) {
        const key = `${s.art}|${s.id}`;
        const alt = k.saetze[key];
        // Neuere Änderung gewinnt je Datensatz (E103). Gleich alt: schon bekannt, nichts zu tun.
        if (alt && alt.geaendert > s.geaendert) { abgelehnt.push(key); continue; }
        if (alt && alt.geaendert === s.geaendert && !!alt.geloescht === !!s.geloescht) continue;
        if (!alt && Object.keys(k.saetze).length >= MAX_SAETZE) throw new Fehler(507, 'Zu viele Datensätze in diesem Konto');
        k.rev++;
        k.saetze[key] = s.geloescht
          ? { art: s.art, id: s.id, geaendert: s.geaendert, geloescht: true, rev: k.rev }
          : { art: s.art, id: s.id, geaendert: s.geaendert, satz: s.satz, rev: k.rev };
        angenommen++;
      }
      await sichern(k.id, k);
      return { stand: k.rev, angenommen, abgelehnt };
    });
  },

  'POST /abgleich/passwort': async (req, b) => {
    const { k: k0 } = await ausToken(req);
    if (!istText(b.nachweisAlt, 200) || !istText(b.nachweis, 200) || !tresorOk(b.tresor)) throw new Fehler(400, 'Anfrage unvollständig');
    return nacheinander(k0.id, async () => {
      const k = await laden(k0.id);
      if (!(await nachweisOk(k, b.nachweisAlt))) { fehlversuch(k.id); throw new Fehler(401, 'Bisheriges Passwort stimmt nicht'); }
      const salz = randomBytes(16).toString('hex');
      k.nachweis = { salz, hash: await nachweisHash(b.nachweis, salz) };
      k.tresor = b.tresor;
      k.tresorRev++;
      await sichern(k.id, k);
      return { tresorRev: k.tresorRev };
    });
  },

  'POST /abgleich/abmelden': async (req) => {
    const { k: k0, hash } = await ausToken(req);
    return nacheinander(k0.id, async () => {
      const k = await laden(k0.id);
      delete k.geraete[hash];
      await sichern(k.id, k);
      return { ok: true };
    });
  }
};

// ---------- Selbsteinschätzung per Link (FB7b, E116) ----------
// Eine Datei je Runde in ORDNER/selbst. Darin: Bogen (Kriterien ohne Namen, öffentlicher Schlüssel), Frist,
// Hashes der Einmal-Links und je Link die im Schüler-Browser verschlüsselte Antwort. Keine Namen, keine Klartexte.
// Schüler-Endpunkte brauchen keine Anmeldung, nur den Link (128 Bit Zufall). Runden verfallen 60 Tage nach der Frist.
const SELBST_MAX_RUNDEN = 100; // je Konto
const SELBST_MAX_LINKS = 80;
const SELBST_HALTEN_TAGE = 60;
const rundeDatei = (id) => path.join(ORDNER, 'selbst', id + '.json');
const linkSha = (t) => sha('leo-selbst|' + t);
const heute = () => new Date().toISOString().slice(0, 10);
const istDatum = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);

async function rundeLaden(id) {
  try { return JSON.parse(await fs.readFile(rundeDatei(id), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return undefined; throw e; }
}
async function rundeSichern(r) {
  await fs.mkdir(path.dirname(rundeDatei(r.id)), { recursive: true });
  const tmp = rundeDatei(r.id) + '.' + randomBytes(4).toString('hex') + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(r));
  await fs.rename(tmp, rundeDatei(r.id));
}
async function alleRunden() {
  try { return (await fs.readdir(path.join(ORDNER, 'selbst'))).filter((n) => /^[0-9a-f]{16}\.json$/.test(n)).map((n) => n.slice(0, 16)); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}
/** Abgelaufene Runden löschen (Frist + 60 Tage). */
export async function selbstAufraeumen(jetzt = heute()) {
  const grenze = new Date(new Date(jetzt + 'T12:00Z').getTime() - SELBST_HALTEN_TAGE * 864e5).toISOString().slice(0, 10);
  let n = 0;
  for (const id of await alleRunden()) {
    const r = await rundeLaden(id).catch(() => undefined);
    if (r && r.frist < grenze) { await fs.rm(rundeDatei(id), { force: true }); n++; }
  }
  return n;
}
function bogenOk(b) {
  if (!b || typeof b !== 'object' || !istText(b.titel, 120) || !istDatum(b.frist) || !Array.isArray(b.kriterien)) return false;
  if (b.kriterien.length < 1 || b.kriterien.length > 8) return false;
  if (!b.kriterien.every((k) => k && istText(k.id, 60) && istText(k.name, 80) && Array.isArray(k.stufen) && k.stufen.length === 4 && k.stufen.every((t) => istText(t, 300)))) return false;
  const s = b.schluessel;
  return !!s && s.kty === 'EC' && s.crv === 'P-256' && istText(s.x, 100) && istText(s.y, 100) && !('d' in s);
}
function geheimOk(a) {
  return a && typeof a === 'object' && istText(a.iv, 40) && istText(a.geheim, 8000) && a.epk && a.epk.kty === 'EC' && a.epk.crv === 'P-256' && istText(a.epk.x, 100) && istText(a.epk.y, 100) && !('d' in a.epk);
}
async function rundeVomKonto(req, id) {
  const { k } = await ausToken(req);
  if (typeof id !== 'string' || !/^[0-9a-f]{16}$/.test(id)) throw new Fehler(400, 'Runde ungültig');
  const r = await rundeLaden(id);
  if (r && r.konto !== k.id) throw new Fehler(403, 'Diese Runde gehört zu einem anderen Konto');
  return { k, r };
}
async function rundeVomLink(t) {
  const m = /^([0-9a-f]{16})\.([\w-]{20,})$/.exec(String(t ?? ''));
  if (!m) throw new Fehler(404, 'Dieser Link ist ungültig.');
  const r = await rundeLaden(m[1]);
  const h = linkSha(m[0]);
  if (!r || !r.links[h]) throw new Fehler(404, 'Dieser Link ist ungültig oder die Runde ist schon beendet.');
  return { r, h };
}

Object.assign(wege, {
  // Lehrkraft legt eine Runde an oder ergänzt Links (bestehende Antworten bleiben)
  'POST /abgleich/selbst/runde': async (req, b) => {
    const { k } = await rundeVomKonto(req, b.id);
    if (!bogenOk(b.bogen)) throw new Fehler(400, 'Bogen unvollständig');
    if (!Array.isArray(b.links) || !b.links.length || b.links.length > SELBST_MAX_LINKS || !b.links.every((h) => /^[0-9a-f]{64}$/.test(h))) throw new Fehler(400, 'Links ungültig');
    return nacheinander('selbst:' + b.id, async () => {
      let r = await rundeLaden(b.id);
      if (!r) {
        let n = 0;
        for (const id of await alleRunden()) if ((await rundeLaden(id).catch(() => undefined))?.konto === k.id) n++;
        if (n >= SELBST_MAX_RUNDEN) throw new Fehler(429, 'Zu viele offene Runden. Bitte alte Runden beenden.');
        r = { v: 1, id: b.id, konto: k.id, angelegt: new Date().toISOString(), links: {} };
      }
      r.bogen = b.bogen;
      r.frist = b.bogen.frist;
      for (const h of b.links) r.links[h] ??= {};
      if (Object.keys(r.links).length > SELBST_MAX_LINKS) throw new Fehler(400, 'Zu viele Links');
      await rundeSichern(r);
      return { ok: true, links: Object.keys(r.links).length };
    });
  },
  // Lehrkraft holt die verschlüsselten Antworten
  'POST /abgleich/selbst/antworten': async (req, b) => {
    const { r } = await rundeVomKonto(req, b.id);
    if (!r) throw new Fehler(404, 'Runde nicht gefunden (abgelaufen oder beendet)');
    const antworten = {};
    for (const [h, l] of Object.entries(r.links)) if (l.antwort) antworten[h] = { antwort: l.antwort, abgegeben: l.abgegeben };
    return { antworten, frist: r.frist };
  },
  // Lehrkraft beendet die Runde: alles auf dem Server weg
  'POST /abgleich/selbst/beenden': async (req, b) => {
    const { r } = await rundeVomKonto(req, b.id);
    if (r) await nacheinander('selbst:' + b.id, () => fs.rm(rundeDatei(b.id), { force: true }));
    return { ok: true };
  },
  // Schüler öffnet den Bogen (ohne Anmeldung, nur mit Link)
  'POST /abgleich/selbst/bogen': async (_req, b) => {
    const { r, h } = await rundeVomLink(b.t);
    return { ...r.bogen, abgegeben: !!r.links[h].abgegeben, abgelaufen: heute() > r.frist };
  },
  // Schüler gibt ab: einmal, bis zur Frist
  'POST /abgleich/selbst/abgeben': async (_req, b) => {
    if (!geheimOk(b.antwort)) throw new Fehler(400, 'Antwort unvollständig');
    const { r: r0 } = await rundeVomLink(b.t);
    return nacheinander('selbst:' + r0.id, async () => {
      const { r, h } = await rundeVomLink(b.t);
      if (r.links[h].abgegeben) throw new Fehler(409, 'Du hast schon abgegeben. Ändern geht nicht mehr.');
      if (heute() > r.frist) throw new Fehler(410, 'Die Frist ist abgelaufen.');
      r.links[h] = { abgegeben: new Date().toISOString(), antwort: { epk: { kty: 'EC', crv: 'P-256', x: b.antwort.epk.x, y: b.antwort.epk.y }, iv: b.antwort.iv, geheim: b.antwort.geheim } };
      await rundeSichern(r);
      return { ok: true };
    });
  }
});

// ---------- Dateiinhalte (Dateiablage, V14) ----------
// Je Konto ein Ordner, je Datei eine .bin mit verschlüsselten Bytes (12 Byte IV + AES-GCM). Lesbar sind nur id und Größe.
const DATEI_MAX = 16 * 1024 * 1024 - 1024; // eine Datei, passt zu client_max_body_size 16m
const DATEIEN_GRENZE = Number(process.env.LEO_DATEIEN_MB ?? 2048) * 1024 * 1024; // je Konto
const dateiOrdner = (kid) => path.join(ORDNER, 'dateien', kid);
const dateiPfad = (kid, id) => path.join(dateiOrdner(kid), id + '.bin');
const dateiIdOk = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);
async function groesse(p) { try { return (await fs.stat(p)).size; } catch (e) { if (e.code === 'ENOENT') return -1; throw e; } }
async function belegt(kid) {
  let n = 0;
  try { for (const f of await fs.readdir(dateiOrdner(kid))) if (f.endsWith('.bin')) n += Math.max(0, await groesse(path.join(dateiOrdner(kid), f))); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  return n;
}
function rohKoerper(req, max) {
  return new Promise((res, rej) => {
    const teile = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > max) { rej(new Fehler(413, 'Datei zu groß (höchstens 15 MB)')); req.destroy(); return; }
      teile.push(c);
    });
    req.on('end', () => res(Buffer.concat(teile)));
    req.on('error', rej);
  });
}
/** GET liefert die Bytes, PUT legt ab (gleiche id = ersetzen), DELETE entfernt. id steht in ?id=. */
async function dateiWeg(req, res, url) {
  const id = url.searchParams.get('id');
  if (!dateiIdOk(id)) throw new Fehler(400, 'Datei-id ungültig');
  const { k } = await ausToken(req);
  const p = dateiPfad(k.id, id);
  if (req.method === 'GET') {
    const n = await groesse(p);
    if (n < 0) throw new Fehler(404, 'Datei nicht auf dem Server');
    const inhalt = await fs.readFile(p);
    res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': inhalt.length, 'cache-control': 'no-store' });
    res.end(inhalt);
    return;
  }
  let antwort;
  if (req.method === 'PUT') {
    const inhalt = await rohKoerper(req, DATEI_MAX);
    if (inhalt.length < 29) throw new Fehler(400, 'Kein verschlüsselter Inhalt'); // IV + Prüfsumme + mindestens 1 Byte
    antwort = await nacheinander('dateien|' + k.id, async () => {
      const vorher = Math.max(0, await groesse(p));
      if ((await belegt(k.id)) - vorher + inhalt.length > DATEIEN_GRENZE) throw new Fehler(507, 'Speicherplatz für Dateien auf dem Server ist voll');
      await fs.mkdir(dateiOrdner(k.id), { recursive: true });
      const tmp = p + '.' + randomBytes(4).toString('hex') + '.tmp';
      await fs.writeFile(tmp, inhalt);
      await fs.rename(tmp, p);
      return { ok: true, groesse: inhalt.length };
    });
  } else if (req.method === 'DELETE') {
    await fs.rm(p, { force: true });
    antwort = { ok: true };
  } else throw new Fehler(405, 'Methode nicht erlaubt');
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(antwort));
}

function koerper(req, max = MAX_KOERPER) {
  return new Promise((res, rej) => {
    const teile = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > max) { rej(new Fehler(413, 'Anfrage zu groß')); req.destroy(); return; }
      teile.push(c);
    });
    req.on('end', () => {
      if (!n) return res({});
      try { res(JSON.parse(Buffer.concat(teile).toString('utf8'))); } catch { rej(new Fehler(400, 'Kein gültiges JSON')); }
    });
    req.on('error', rej);
  });
}

export function dienst() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const pfad = url.pathname;
    const weg = wege[`${req.method} ${pfad}`];
    let status = 200;
    let antwort;
    try {
      if (pfad === '/abgleich/datei') return await dateiWeg(req, res, url);
      if (!weg) throw new Fehler(404, 'Unbekannt');
      antwort = await weg(req, req.method === 'POST' ? await koerper(req, pfad.startsWith('/abgleich/selbst/') ? 64 * 1024 : MAX_KOERPER) : {});
    } catch (e) {
      status = e instanceof Fehler ? e.status : 500;
      antwort = { fehler: e instanceof Fehler ? e.message : 'Interner Fehler' };
      if (!(e instanceof Fehler)) console.error(e);
    }
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(antwort));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  selbstAufraeumen().catch((e) => console.error(e));
  setInterval(() => selbstAufraeumen().catch((e) => console.error(e)), 6 * 3600_000).unref();
  dienst().listen(PORT, '127.0.0.1', () => console.log(`L.E.O. Abgleich-Dienst auf 127.0.0.1:${PORT}, Daten in ${ORDNER}${EINLADUNG ? '' : ' (Konto anlegen aus: LEO_EINLADUNG fehlt)'}`));
}
