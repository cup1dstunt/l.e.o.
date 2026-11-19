// WebUntis-Verbindungstest (V11, Stufe 1: nur lesen).
// Der Browser spricht WebUntis über den Durchreicher /WebUntis/ im eigenen nginx an (gleiche Adresse, kein CORS-Problem).
// Zugangsdaten bleiben nur im Arbeitsspeicher. Gespeichert wird nichts, angezeigt werden nur Anzahlen und Feldnamen.
// Ehrlich: gegen das echte WebUntis der Schule noch nicht getestet; die Abfragen folgen der öffentlich bekannten JSON-RPC-Schnittstelle.

// ---------- TOTP für den App-Schlüssel (RFC 6238, SHA-1, 30 s, 6 Stellen) ----------
// Eigenes SHA-1, weil crypto.subtle über http://IP (ohne HTTPS) im Browser fehlt.

function sha1(bytes: Uint8Array): Uint8Array {
  const l = bytes.length;
  const n = Math.ceil((l + 9) / 64) * 64;
  const m = new Uint8Array(n);
  m.set(bytes);
  m[l] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(n - 4, l * 8);
  dv.setUint32(n - 8, Math.floor((l * 8) / 2 ** 32));
  const H = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
  const W = new Uint32Array(80);
  const rotl = (x: number, y: number) => (x << y) | (x >>> (32 - y));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 80; i++) W[i] = rotl(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
    let [a, b, c, d, e] = H;
    for (let i = 0; i < 80; i++) {
      const f = i < 20 ? (b & c) | (~b & d) : i < 40 ? b ^ c ^ d : i < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d;
      const k = i < 20 ? 0x5a827999 : i < 40 ? 0x6ed9eba1 : i < 60 ? 0x8f1bbcdc : 0xca62c1d6;
      const t = (rotl(a, 5) + f + e + k + W[i]) | 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = t;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e;
  }
  const out = new Uint8Array(20);
  const ov = new DataView(out.buffer);
  H.forEach((x, i) => ov.setUint32(i * 4, x));
  return out;
}

function hmacSha1(schluessel: Uint8Array, nachricht: Uint8Array): Uint8Array {
  let k = schluessel.length > 64 ? sha1(schluessel) : schluessel;
  const kp = new Uint8Array(64);
  kp.set(k);
  const innen = new Uint8Array(64 + nachricht.length);
  const aussen = new Uint8Array(64 + 20);
  for (let i = 0; i < 64; i++) { innen[i] = kp[i] ^ 0x36; aussen[i] = kp[i] ^ 0x5c; }
  innen.set(nachricht, 64);
  aussen.set(sha1(innen), 64);
  return sha1(aussen);
}

export function base32(text: string): Uint8Array {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const sauber = text.toUpperCase().replace(/[\s=-]/g, '');
  const out: number[] = [];
  let bits = 0;
  let wert = 0;
  for (const z of sauber) {
    const i = abc.indexOf(z);
    if (i < 0) throw new Error('Der Schlüssel enthält ungültige Zeichen');
    wert = (wert << 5) | i;
    bits += 5;
    if (bits >= 8) { out.push((wert >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(out);
}

/** Einmalcode aus Schlüssel-Bytes; zeit in Millisekunden. */
export function totp(schluessel: Uint8Array, zeit = Date.now(), stellen = 6): string {
  const zaehler = Math.floor(zeit / 1000 / 30);
  const msg = new Uint8Array(8);
  const dv = new DataView(msg.buffer);
  dv.setUint32(0, Math.floor(zaehler / 2 ** 32));
  dv.setUint32(4, zaehler >>> 0);
  const h = hmacSha1(schluessel, msg);
  const o = h[19] & 0xf;
  const zahl = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(zahl % 10 ** stellen).padStart(stellen, '0');
}

// ---------- Auswertung ohne Inhalte ----------

/** Feldnamen der ersten Einträge und wie oft sie gefüllt sind. Werte werden nie zurückgegeben. */
export function felder(liste: unknown[]): { name: string; gefuellt: number }[] {
  const zaehl = new Map<string, number>();
  for (const e of liste.slice(0, 200)) {
    if (!e || typeof e !== 'object') continue;
    for (const [k, v] of Object.entries(e)) {
      const voll = v !== null && v !== undefined && v !== '' && v !== 0 && !(Array.isArray(v) && v.length === 0);
      zaehl.set(k, (zaehl.get(k) ?? 0) + (voll ? 1 : 0));
    }
  }
  const n = Math.min(liste.length, 200) || 1;
  return [...zaehl].map(([name, z]) => ({ name, gefuellt: Math.round((z / n) * 100) })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Die längste Liste irgendwo in einer Antwort (Tabellenzeilen), höchstens 4 Ebenen tief. */
export function groessteListe(x: unknown, tiefe = 0): unknown[] {
  if (Array.isArray(x)) {
    let best: unknown[] = x;
    if (tiefe < 4) for (const e of x.slice(0, 3)) { const l = groessteListe(e, tiefe + 1); if (l.length > best.length) best = l; }
    return best;
  }
  if (!x || typeof x !== 'object' || tiefe >= 4) return [];
  let best: unknown[] = [];
  for (const v of Object.values(x)) { const l = groessteListe(v, tiefe + 1); if (l.length > best.length) best = l; }
  return best;
}

/** Spaltenköpfe, falls die Antwort sie als Liste von Texten oder {label|name|title} mitliefert. Keine Inhalte. */
export function spaltenkoepfe(x: unknown, tiefe = 0): string[] {
  if (!x || typeof x !== 'object' || tiefe > 4) return [];
  for (const [k, v] of Object.entries(x)) {
    if (/col|head|field/i.test(k) && Array.isArray(v) && v.length && v.length < 60) {
      const t = v.map((e) => (typeof e === 'string' ? e : String((e as any)?.label ?? (e as any)?.name ?? (e as any)?.title ?? (e as any)?.id ?? ''))).filter(Boolean);
      if (t.length) return t.slice(0, 40);
    }
    const tiefer = spaltenkoepfe(v, tiefe + 1);
    if (tiefer.length) return tiefer;
  }
  return [];
}

/** Wie oft kommt welcher Wert eines Kategorie-Feldes vor (z. B. Entschuldigungsstatus)? Nur für Kategorien, nie für Namen. */
export function verteilung(liste: unknown[], feld: string): Record<string, number> {
  const z: Record<string, number> = {};
  for (const e of liste) {
    const v = (e as Record<string, unknown>)?.[feld];
    if (v === null || v === undefined || v === '') continue;
    const o = v as Record<string, unknown>;
    const name = typeof v === 'object' ? String(o.name ?? o.longName ?? o.code ?? o.id ?? '?') : String(v);
    z[name] = (z[name] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(z).sort((a, b) => b[1] - a[1]).slice(0, 20));
}

/** Datum als Untis-Zahl JJJJMMTT. */
export const untisDatum = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

export function montag(d = new Date()): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

// ---------- Prüfungen ----------

export type Status = 'ok' | 'leer' | 'verwehrt' | 'fehler' | 'offen';

export interface Pruefung {
  id: string;
  titel: string;
  wofuer: string; // welches L.E.O.-Modul davon lebt
  status: Status;
  anzahl?: number;
  felder?: { name: string; gefuellt: number }[];
  extra?: Record<string, string | number>;
  fehler?: string;
  aufruf: string;
}

export interface Zugang {
  schule: string;
  benutzer: string;
  art: 'passwort' | 'schluessel';
  geheim: string;
}

class UntisFehler extends Error {
  code: number | string;
  constructor(code: number | string, text: string) { super(text); this.code = code; }
}

const BASIS = '/WebUntis';
let zaehler = 0;

async function rpc(pfad: string, schule: string, methode: string, params: unknown, query = ''): Promise<any> {
  const url = `${BASIS}/${pfad}?school=${encodeURIComponent(schule)}${query}`;
  let r: Response;
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id: `leo${++zaehler}`, method: methode, params, jsonrpc: '2.0' })
    });
  } catch {
    throw new UntisFehler('netz', 'Keine Verbindung zum Durchreicher. Läuft L.E.O. über den Unraid-Container (nicht als Datei)?');
  }
  if (r.status === 404) throw new UntisFehler('durchreicher', 'Durchreicher fehlt (404). Ist das neue Image geladen (Compose Up)?');
  if (r.status >= 500 && !(r.headers.get('content-type') ?? '').includes('json'))
    throw new UntisFehler('durchreicher', `Der Container erreicht WebUntis nicht (${r.status}). Netz, DNS oder Zertifikat im Container prüfen.`);
  const typ = r.headers.get('content-type') ?? '';
  if (!typ.includes('json')) throw new UntisFehler(r.status, `Unerwartete Antwort (${r.status}, ${typ || 'ohne Typ'})`);
  const j = await r.json();
  if (j.error) throw new UntisFehler(j.error.code, j.error.message ?? 'Fehler');
  return j.result;
}

async function rest(pfad: string, token?: string, mehr: Record<string, string> = {}): Promise<any> {
  const r = await fetch(`${BASIS}/${pfad}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...mehr }
  });
  if (r.status === 401 || r.status === 403) throw new UntisFehler(r.status, 'Keine Berechtigung');
  if (!r.ok) throw new UntisFehler(r.status, `Antwort ${r.status}`);
  // Manche Antworten sind als JSON ausgewiesen, aber reiner Text (z. B. das Token)
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
}

/** Bekannte Fehlercodes verständlich machen. */
export function fehlerText(code: number | string, text: string): { status: Status; text: string } {
  const c = Number(code);
  if (c === -8500) return { status: 'fehler', text: 'Schulname unbekannt. Steht in WebUntis in der Adresszeile hinter „school=“.' };
  if (c === -8504) return { status: 'fehler', text: 'Benutzer oder Passwort/Schlüssel falsch.' };
  if (c === -8520) return { status: 'fehler', text: 'Nicht angemeldet (Sitzung fehlt). Werden Cookies durch den Durchreicher weitergegeben?' };
  if (c === -8509 || c === -8510 || c === 403) return { status: 'verwehrt', text: 'Dein Konto hat dafür keine Berechtigung.' };
  if (c === -32601) return { status: 'verwehrt', text: 'Diese Abfrage gibt es auf diesem Server nicht.' };
  if (code === 'netz' || code === 'durchreicher' || code === 'html') return { status: 'fehler', text };
  return { status: 'fehler', text: `${text} (Code ${code})` };
}

export const PRUEFUNGEN: Omit<Pruefung, 'status'>[] = [
  { id: 'anmeldung', titel: 'Anmeldung', wofuer: 'alles Weitere', aufruf: 'authenticate bzw. getUserData2017' },
  { id: 'schuljahr', titel: 'Schuljahr', wofuer: 'Halbjahre, 30-%-Regel', aufruf: 'getCurrentSchoolyear' },
  { id: 'zeitraster', titel: 'Zeitraster', wofuer: 'Stundenleiste, Semesterplanung', aufruf: 'getTimegridUnits' },
  { id: 'ferien', titel: 'Ferien', wofuer: 'Semesterplanung (Blockzählung)', aufruf: 'getHolidays' },
  { id: 'stundenplan', titel: 'Eigener Stundenplan', wofuer: 'Heute, Live-Stunde, Stundenplan', aufruf: 'getTimetable (diese und nächste Woche)' },
  { id: 'klassen', titel: 'Klassen', wofuer: 'Klassen übernehmen, Klassenleitung', aufruf: 'getKlassen' },
  { id: 'faecher', titel: 'Fächer', wofuer: 'Klasse + Fach', aufruf: 'getSubjects' },
  { id: 'raeume', titel: 'Räume', wofuer: 'Sitzplan-Raumvorlagen', aufruf: 'getRooms' },
  { id: 'schueler', titel: 'Schüler', wofuer: 'Schülerlisten, Alter, Geschlecht', aufruf: 'getStudents' },
  { id: 'fehlzeitenRpc', titel: 'Fehlzeiten (Klassenbuch)', wofuer: 'Fehlzeiten, E/UE, 30-%-Regel', aufruf: 'getTimetableWithAbsences (letzte 14 Tage)' },
  { id: 'fehlzeitenRest', titel: 'Fehlzeiten (Web-Schnittstelle)', wofuer: 'Fehlzeiten mit Status und Grund', aufruf: 'GET api/classreg/absences/students' },
  { id: 'token', titel: 'Neue REST-Schnittstelle', wofuer: 'späteres Senden (Stufe 2)', aufruf: 'GET api/token/new' },
  { id: 'stammdaten', titel: 'Stammdaten Schüler', wofuer: 'Geburtsdatum (Alter), Klassenzuordnung', aufruf: 'GET studentlist.do (wie Stammdaten › Schüler)' }
];

const liste = (x: unknown): unknown[] => (Array.isArray(x) ? x : x && typeof x === 'object' ? (Object.values(x).find(Array.isArray) as unknown[]) ?? [] : []);

export interface Sitzung {
  schule: string;
  benutzer: string;
  person: { typ: number; id: number };
  rechte: number;
  r: (methode: string, params?: unknown) => Promise<any>;
  rest: (pfad: string, mehr?: Record<string, string>) => Promise<any>;
  abmelden: () => Promise<void>;
}

/** Meldet bei WebUntis an (App-Schlüssel oder Passwort). Die Sitzung lebt nur im Arbeitsspeicher. */
export async function anmelden(z: Zugang): Promise<Sitzung> {
  const schule = z.schule.trim();
  // Cookie mit dem Schulnamen, wie es die WebUntis-Seite selbst setzt (für die REST-Aufrufe)
  try { document.cookie = `schoolname="_${btoa(unescape(encodeURIComponent(schule)))}"; path=/WebUntis; SameSite=Lax`; } catch { /* egal */ }
  let person: { typ: number; id: number };
  let rechte = 0;
  if (z.art === 'passwort') {
    const r = await rpc('jsonrpc.do', schule, 'authenticate', { user: z.benutzer.trim(), password: z.geheim, client: 'LEO' });
    person = { typ: r.personType, id: r.personId };
  } else {
    const otp = totp(base32(z.geheim));
    const r = await rpc('jsonrpc_intern.do', schule, 'getUserData2017', [{ auth: { clientTime: Date.now(), user: z.benutzer.trim(), otp } }], '&m=getUserData2017&v=i2.2');
    const u = r?.userData ?? {};
    person = { typ: ({ CLASS: 1, TEACHER: 2, SUBJECT: 3, ROOM: 4, STUDENT: 5 } as Record<string, number>)[u.elemType] ?? 0, id: u.elemId };
    rechte = Array.isArray(u.rights) ? u.rights.length : 0;
  }
  const r = (m: string, p: unknown = {}) => rpc('jsonrpc.do', schule, m, p);
  return {
    schule, benutzer: z.benutzer.trim(), person, rechte, r,
    rest: (pfad, mehr = {}) => rest(pfad, undefined, mehr),
    abmelden: async () => { try { await r('logout'); } catch { /* egal */ } }
  };
}

/** Fehler verständlich machen (für Oberflächen außerhalb des Tests). */
export function fehlerMeldung(e: unknown): string {
  return e instanceof UntisFehler ? fehlerText(e.code, e.message).text : String((e as Error)?.message ?? e);
}

export { liste as alsListe, rolle };

/**
 * Führt alle Prüfungen nacheinander aus und meldet jedes Ergebnis über `melde`.
 * Am Ende wird abgemeldet. Nichts wird gespeichert.
 */
export async function verbindungstest(z: Zugang, melde: (p: Pruefung) => void): Promise<void> {
  const vorlage = (id: string) => PRUEFUNGEN.find((p) => p.id === id)!;
  const ergebnis = (id: string, teil: Partial<Pruefung>) => melde({ ...vorlage(id), status: 'ok', ...teil });
  const fang = (id: string, e: unknown) => {
    const f = e instanceof UntisFehler ? fehlerText(e.code, e.message) : { status: 'fehler' as Status, text: String((e as Error)?.message ?? e) };
    melde({ ...vorlage(id), status: f.status, fehler: f.text });
  };
  const schule = z.schule.trim();

  // 1 Anmeldung
  let person: { typ: number; id: number } | null = null;
  try {
    const sz = await anmelden(z);
    person = sz.person;
    ergebnis('anmeldung', { extra: { Rolle: rolle(person.typ), 'Person gefunden': person.id ? 'ja' : 'nein', ...(z.art === 'schluessel' ? { Rechte: sz.rechte } : {}) } });
  } catch (e) {
    fang('anmeldung', e);
    for (const p of PRUEFUNGEN.slice(1)) melde({ ...p, status: 'offen', fehler: 'Erst die Anmeldung muss klappen.' });
    return;
  }

  const r = (m: string, p: unknown = {}) => rpc('jsonrpc.do', schule, m, p);
  const heute = new Date();
  const mo = montag(heute);
  const bis = new Date(mo); bis.setDate(bis.getDate() + 11);
  const vor14 = new Date(heute); vor14.setDate(vor14.getDate() - 14);

  // 2 Schuljahr
  try {
    const sj = await r('getCurrentSchoolyear');
    ergebnis('schuljahr', { status: sj ? 'ok' : 'leer', extra: sj ? { Zeitraum: `${sj.startDate}–${sj.endDate}` } : {} });
  } catch (e) { fang('schuljahr', e); }

  // 3 Zeitraster
  try {
    const t = liste(await r('getTimegridUnits'));
    const stunden = t.reduce((s: number, tag: any) => s + (tag?.timeUnits?.length ?? 0), 0);
    ergebnis('zeitraster', { status: t.length ? 'ok' : 'leer', anzahl: t.length, extra: { 'Stunden pro Woche im Raster': stunden } });
  } catch (e) { fang('zeitraster', e); }

  // 4 Ferien
  try {
    const f = liste(await r('getHolidays'));
    ergebnis('ferien', { status: f.length ? 'ok' : 'leer', anzahl: f.length, felder: felder(f) });
  } catch (e) { fang('ferien', e); }

  // 5 Eigener Stundenplan
  try {
    if (!person?.id) throw new UntisFehler('–', 'Ohne Personennummer kein eigener Stundenplan');
    const sp = liste(await r('getTimetable', {
      options: {
        element: { id: person.id, type: person.typ || 2 },
        startDate: untisDatum(mo), endDate: untisDatum(bis),
        showLsText: true, showStudentgroup: true, showInfo: true, showSubstText: true,
        klasseFields: ['id', 'name'], subjectFields: ['id', 'name'], roomFields: ['id', 'name'], teacherFields: ['id']
      }
    }));
    const ausfall = sp.filter((s: any) => s?.code === 'cancelled').length;
    const vertretung = sp.filter((s: any) => s?.code === 'irregular' || s?.substText).length;
    ergebnis('stundenplan', { status: sp.length ? 'ok' : 'leer', anzahl: sp.length, felder: felder(sp), extra: { Ausfälle: ausfall, 'Vertretung/Änderung': vertretung } });
  } catch (e) { fang('stundenplan', e); }

  // 6 Klassen (teacher1/teacher2 = Klassenleitung)
  try {
    const k = liste(await r('getKlassen'));
    ergebnis('klassen', { status: k.length ? 'ok' : 'leer', anzahl: k.length, felder: felder(k) });
  } catch (e) { fang('klassen', e); }

  // 7 Fächer, 8 Räume
  try { const f = liste(await r('getSubjects')); ergebnis('faecher', { status: f.length ? 'ok' : 'leer', anzahl: f.length, felder: felder(f) }); } catch (e) { fang('faecher', e); }
  try { const f = liste(await r('getRooms')); ergebnis('raeume', { status: f.length ? 'ok' : 'leer', anzahl: f.length, felder: felder(f) }); } catch (e) { fang('raeume', e); }

  let schuelerNr = new Set<string>();
  const schuelerFelder: Record<string, Set<string>> = { id: new Set(), key: new Set(), name: new Set(), externKey: new Set() };
  // 9 Schüler: nur Anzahl und welche Felder gefüllt sind (Geschlecht, Geburtsdatum?)
  try {
    const s = liste(await r('getStudents'));
    schuelerNr = new Set(s.map((x: any) => String(x?.id)));
    for (const f of Object.keys(schuelerFelder)) schuelerFelder[f] = new Set(s.map((x: any) => String(x?.[f])));
    const f = felder(s);
    const anteil = (n: string) => f.find((x) => x.name === n)?.gefuellt;
    ergebnis('schueler', {
      status: s.length ? 'ok' : 'leer', anzahl: s.length, felder: f,
      extra: { Geschlecht: anteil('gender') !== undefined ? `${anteil('gender')} % gefüllt` : 'fehlt', Geburtsdatum: anteil('birthday') !== undefined ? `${anteil('birthday')} % gefüllt` : 'fehlt' }
    });
  } catch (e) { fang('schueler', e); }

  // 10 Fehlzeiten über JSON-RPC (Klassenbuch-Modul nötig)
  try {
    const a = liste(await r('getTimetableWithAbsences', { options: { startDate: untisDatum(vor14), endDate: untisDatum(heute) } }));
    // Nur zählen: Einträge in eigenen Stunden, verschiedene Schüler darin, Verteilung der Status und Gründe
    // Weg 1: Lehrkraft-Nummer in teacherIds (als Zahl oder Text). Weg 2: Datum + Beginn wie im eigenen Stundenplan.
    const ich = String(person?.id);
    let eigeneStunden = new Set<string>();
    let kuerzelSp = '';
    try {
      const sp = liste(await r('getTimetable', { options: { element: { id: person!.id, type: person!.typ || 2 }, startDate: untisDatum(vor14), endDate: untisDatum(heute), teacherFields: ['id', 'name'] } }));
      eigeneStunden = new Set(sp.map((x: any) => `${x?.date}-${x?.startTime}`));
      for (const x of sp as any[]) for (const t of x?.te ?? []) if (t?.id === person!.id && t?.name) kuerzelSp = String(t.name);
    } catch { /* dann nur Weg 1 */ }
    const perId = a.filter((x: any) => Array.isArray(x?.teacherIds) && x.teacherIds.map(String).includes(ich));
    const perZeit = a.filter((x: any) => eigeneStunden.has(`${x?.date}-${x?.startTime}`));
    const eigene = perId.length ? perId : perZeit;
    const schuelerEigene = new Set(eigene.map((x: any) => x?.studentId)).size;
    const mitFehlzeit = eigene.filter((x: any) => x?.absenceReason || x?.excuseStatus || x?.absentTime).length;
    const extra: Record<string, string | number> = {
      'eigene Stunden (14 Tage)': eigeneStunden.size,
      'Einträge per Lehrkraft-Nr.': perId.length,
      'Einträge per Datum+Zeit': perZeit.length,
      'Typ teacherIds': [...new Set(a.slice(0, 50).flatMap((x: any) => (Array.isArray(x?.teacherIds) ? x.teacherIds.map((t: unknown) => typeof t) : [])))].join('/') || '–',
      'verschiedene Schüler darin': schuelerEigene,
      ...kennungsBild(perZeit, eigeneStunden.size, kuerzelSp, String(person?.id ?? ''), 'u:' + z.benutzer.trim()),
      ...abgleichSchueler(a, perZeit, schuelerNr, 'u:' + z.benutzer.trim()),
      ...Object.fromEntries(Object.entries(schuelerFelder).map(([f, w]) => {
        const nr = [...new Set(a.map((x: any) => String(x?.studentId)))];
        return [`studentId passt zu ${f}`, `${Math.round((nr.filter((n) => w.has(n)).length / (nr.length || 1)) * 100)} %`];
      })),
      'Muster studentId': verteilungVon(a.slice(0, 500).map((x: any) => String(x?.studentId).replace(/[A-ZÄÖÜ]/g, 'A').replace(/[a-zäöüß]/g, 'a').replace(/[0-9]/g, '9'))).slice(0, 3).map(([m, n]) => `${m} (${n})`).join(', '),
      'davon mit Abwesenheit': mitFehlzeit
    };
    for (const [n, w] of Object.entries(verteilung(a, 'excuseStatus'))) extra[`Status „${n}“`] = w;
    for (const [n, w] of Object.entries(verteilung(a, 'absenceReason'))) extra[`Grund „${n}“`] = w;
    const typen = (f: string) => [...new Set(a.slice(0, 200).map((x: any) => (x?.[f] === null || x?.[f] === undefined ? null : Array.isArray(x[f]) ? 'Liste' : typeof x[f])).filter(Boolean))].join('/');
    extra['Typ excuseStatus'] = typen('excuseStatus') || '–';
    extra['Typ absentTime'] = typen('absentTime') || '–';
    ergebnis('fehlzeitenRpc', { status: a.length ? 'ok' : 'leer', anzahl: a.length, felder: felder(a), extra });
  } catch (e) { fang('fehlzeitenRpc', e); }

  // 11 Fehlzeiten über die Web-Schnittstelle (wie die WebUntis-Seite)
  try {
    const j = await rest(`api/classreg/absences/students?startDate=${untisDatum(vor14)}&endDate=${untisDatum(heute)}&studentId=-1&excuseStatusId=-1`);
    const a = liste(j?.data?.absences ?? j?.absences ?? j?.data ?? j);
    const status = felder(a).map((x) => x.name);
    ergebnis('fehlzeitenRest', { status: a.length ? 'ok' : 'leer', anzahl: a.length, felder: felder(a), extra: { 'Status-Feld': status.some((n) => /excuse/i.test(n)) ? 'vorhanden' : 'nicht gesehen' } });
  } catch (e) { fang('fehlzeitenRest', e); }

  // 12 Token für die neue REST-Schnittstelle (Voraussetzung für Stufe 2)
  let token = '';
  try {
    const t = await rest('api/token/new');
    if (typeof t === 'string' && t.split('.').length === 3) token = t;
    const ok = typeof t === 'string' && t.split('.').length === 3;
    ergebnis('token', { status: ok ? 'ok' : 'leer', extra: { Token: ok ? 'erhalten (nicht gespeichert)' : 'keins' } });
  } catch (e) { fang('token', e); }

  // 13 Stammdaten wie in der Webansicht (Geburtsdatum, Klasse). Nur Anzahl, Feldnamen und Spaltenköpfe.
  try {
    // Mehrere Varianten, weil die alte Stammdaten-Seite ihre Daten nur bei bestimmten Kopfzeilen als JSON liefert
    const pfad = () => `studentlist.do?&request.preventCache=${Date.now()}`;
    const varianten: [string, () => Promise<any>][] = [
      ['XHR-Kopfzeile', () => rest(pfad(), undefined, { 'X-Requested-With': 'XMLHttpRequest' })],
      ['Token', () => rest(pfad(), token || undefined, { 'X-Requested-With': 'XMLHttpRequest' })],
      ['ohne Zusatz', () => rest(pfad())]
    ];
    let j: any = null;
    let weg = '';
    const titel: string[] = [];
    for (const [name, holen] of varianten) {
      try {
        const x = await holen();
        if (typeof x !== 'string') { j = x; weg = name; break; }
        const t = /<title>([^<]{0,80})<\/title>/i.exec(x)?.[1]?.trim();
        titel.push(`${name}: ${t ? `HTML „${t}“` : 'kein JSON'}`);
      } catch (e) { titel.push(`${name}: ${(e as Error).message}`); }
    }
    if (!j) throw new UntisFehler('html', `Keine Daten, nur HTML. ${titel.join(' · ')}`);
    const zeilen = groessteListe(j);
    const f = felder(zeilen);
    const extra: Record<string, string | number> = { Weg: weg, 'oberste Schlüssel': Object.keys(j ?? {}).slice(0, 12).join(', ') };
    if (Array.isArray(zeilen[0])) extra['Zeilen als Liste, Spalten'] = (zeilen[0] as unknown[]).length;
    const koepfe = spaltenkoepfe(j);
    if (koepfe.length) extra['Spaltenköpfe'] = koepfe.join(', ');
    const geb = f.find((x) => /birth|geb/i.test(x.name));
    const kl = f.find((x) => /klass|class/i.test(x.name));
    extra.Geburtsdatum = geb ? `${geb.name} ${geb.gefuellt} %` : 'Feld nicht erkannt';
    extra.Klasse = kl ? `${kl.name} ${kl.gefuellt} %` : 'Feld nicht erkannt';
    ergebnis('stammdaten', { status: zeilen.length ? 'ok' : 'leer', anzahl: zeilen.length, felder: f, extra });
  } catch (e) { fang('stammdaten', e); }

  try { await r('logout'); } catch { /* egal */ }
}

function rolle(typ: number): string {
  return ({ 1: 'Klasse', 2: 'Lehrkraft', 3: 'Fach', 4: 'Raum', 5: 'Schüler', 12: 'Eltern' } as Record<number, string>)[typ] ?? `Typ ${typ || 'unbekannt'}`;
}

/** Bericht zum Kopieren: nur Status, Anzahlen, Feldnamen. Keine Namen, keine Werte. */
export function bericht(ergebnisse: Pruefung[]): string {
  return JSON.stringify(
    {
      leo: 'Verbindungstest WebUntis',
      zeit: new Date().toISOString().slice(0, 16),
      pruefungen: ergebnisse.map((p) => ({ id: p.id, status: p.status, anzahl: p.anzahl, extra: p.extra, fehler: p.fehler, felder: p.felder?.map((f) => `${f.name} ${f.gefuellt}%`) }))
    },
    null,
    1
  );
}

/** Kennungen einer Klassenbuch-Zeile: Einträge aus teacherIds und, mit „u:“ davor, wer eingetragen hat (user). */
export function kennungenVon(z: any): string[] {
  const out = Array.isArray(z?.teacherIds) ? z.teacherIds.map((t: unknown) => String(t)).filter(Boolean) : [];
  const u = z?.user;
  const un = u === null || u === undefined || u === '' ? '' : typeof u === 'object' ? String(u.name ?? u.id ?? '') : String(u);
  if (un) out.push('u:' + un);
  return out;
}

/** Für den Bericht: welche Kennung steht in den eigenen Stunden wie oft. Lehrkraft-Kennungen, keine Schülerdaten. */
function kennungsBild(zeilen: any[], stunden: number, kuerzel: string, personId: string, ichU: string): Record<string, string | number> {
  const proSlot = new Map<string, Set<string>>();
  let leer = 0;
  for (const z of zeilen) {
    const k = kennungenVon(z);
    if (!Array.isArray(z?.teacherIds) || !z.teacherIds.length) leer++;
    for (const x of k) {
      if (!proSlot.has(x)) proSlot.set(x, new Set());
      proSlot.get(x)!.add(`${z?.date}-${z?.startTime}`);
    }
  }
  const slots = new Set(zeilen.map((z) => `${z?.date}-${z?.startTime}`)).size || 1;
  const top = [...proSlot].sort((a, b) => b[1].size - a[1].size).slice(0, 5);
  const out: Record<string, string | number> = {
    'Kürzel im Stundenplan': kuerzel || '–',
    'Stunden mit Klassenbuch-Zeilen': `${new Set(zeilen.map((z) => `${z?.date}-${z?.startTime}`)).size} von ${stunden}`,
    'Zeilen ohne teacherIds': leer,
    'Kürzel in eigenen Stunden': `${Math.round(((proSlot.get(kuerzel)?.size ?? 0) / slots) * 100)} %`,
    'Personennr. in eigenen Stunden': `${Math.round(((proSlot.get(personId)?.size ?? 0) / slots) * 100)} %`,
    'Benutzername (user) in eigenen Stunden': `${Math.round(((proSlot.get(ichU)?.size ?? 0) / slots) * 100)} %`
  };
  top.forEach(([k, v], i) => (out[`Kennung ${i + 1}`] = `${k} (${Math.round((v.size / slots) * 100)} %)`));
  return out;
}

/** Für den Bericht: passen die Schüler-Nummern im Klassenbuch zur Schülerliste? Nur Anteile und Muster, keine Namen. */
function abgleichSchueler(alle: any[], eigene: any[], liste: Set<string>, ichU: string): Record<string, string | number> {
  const muster = (v: unknown) => String(v).replace(/[A-ZÄÖÜ]/g, 'A').replace(/[a-zäöüß]/g, 'a').replace(/[0-9]/g, '9');
  const nr = new Set(alle.map((z) => String(z?.studentId)));
  const drin = [...nr].filter((x) => liste.has(x)).length;
  const meine = eigene.filter((z) => kennungenVon(z).includes(ichU));
  const tMuster = verteilungVon(alle.flatMap((z) => (Array.isArray(z?.teacherIds) ? z.teacherIds.map(muster) : [])));
  return {
    'Typ studentId': [...new Set(alle.slice(0, 50).map((z) => typeof z?.studentId))].join('/'),
    'Schüler-Nr. auch in Schülerliste': liste.size ? `${Math.round((drin / (nr.size || 1)) * 100)} %` : 'Schülerliste fehlt',
    'Zeilen mit eigenem Benutzernamen': meine.length,
    'davon Schüler': new Set(meine.map((z) => z?.studentId)).size,
    'Typ user': [...new Set(alle.slice(0, 200).map((z) => (z?.user === null || z?.user === undefined ? null : typeof z.user)).filter(Boolean))].join('/') || '–',
    'Muster teacherIds': tMuster.slice(0, 4).map(([m, n]) => `${m} (${n})`).join(', ') || '–'
  };
}

function verteilungVon(werte: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const w of werte) m.set(w, (m.get(w) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}
