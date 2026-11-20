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
const ARTEN = new Set(['schueler', 'kurse', 'mitarbeit', 'fehlzeiten', 'verspaetungen', 'notizen', 'nachschreiben', 'stundenplan', 'einstellungen']);
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

function koerper(req) {
  return new Promise((res, rej) => {
    const teile = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > MAX_KOERPER) { rej(new Fehler(413, 'Anfrage zu groß')); req.destroy(); return; }
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
    const weg = wege[`${req.method} ${new URL(req.url, 'http://x').pathname}`];
    let status = 200;
    let antwort;
    try {
      if (!weg) throw new Fehler(404, 'Unbekannt');
      antwort = await weg(req, req.method === 'POST' ? await koerper(req) : {});
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
  dienst().listen(PORT, '127.0.0.1', () => console.log(`L.E.O. Abgleich-Dienst auf 127.0.0.1:${PORT}, Daten in ${ORDNER}${EINLADUNG ? '' : ' (Konto anlegen aus: LEO_EINLADUNG fehlt)'}`));
}
