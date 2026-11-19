// Fundament F2 (docs/FUNDAMENT.md): Verschlüsselung im Gerät mit dem L.E.O.-Passwort.
// Aufbau: Ein zufälliger Datenschlüssel (AES-GCM, 256 Bit) verschlüsselt jeden Datensatz einzeln.
// Der Datenschlüssel selbst liegt nur verpackt vor, verschlüsselt mit einem Schlüssel aus dem Passwort (PBKDF2-SHA256).
// So muss beim Passwortwechsel nur der verpackte Schlüssel neu geschrieben werden, und später (F4)
// können mehrere Geräte denselben Datenschlüssel nutzen.
// Läuft nur, wo der Browser WebCrypto anbietet: über HTTPS oder auf localhost.
import type { Datensatz } from './ablage.ts';

type Bytes = Uint8Array<ArrayBuffer>;
export const RUNDEN = 600_000; // PBKDF2-Wiederholungen (Empfehlung OWASP 2023 für SHA-256)

export interface Tresor {
  id: 'haupt';
  v: 1;
  salz: string; // Base64
  runden: number;
  iv: string; // Base64
  schluessel: string; // verpackter Datenschlüssel, Base64
}

/** Verschlüsselter Datensatz: Kopfdaten lesbar (für Abgleich F4), Inhalt verschlüsselt. */
export interface GeheimSatz extends Omit<Datensatz, 'daten'> {
  iv: string;
  geheim: string;
}

export const verfuegbar = () => typeof crypto !== 'undefined' && !!crypto.subtle;

const b64 = (b: ArrayBuffer | Uint8Array) => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const zufall = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const text = new TextEncoder();
const lies = new TextDecoder();

async function ausPasswort(passwort: string, salz: Bytes, runden: number): Promise<CryptoKey> {
  const roh = await crypto.subtle.importKey('raw', text.encode(passwort), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salz, iterations: runden }, roh, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function verpacken(dek: Bytes, passwort: string, runden: number): Promise<Tresor> {
  const salz = zufall(16);
  const iv = zufall(12);
  const kek = await ausPasswort(passwort, salz, runden);
  const pack = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: text.encode('leo-tresor-1') }, kek, dek);
  return { id: 'haupt', v: 1, salz: b64(salz), runden, iv: b64(iv), schluessel: b64(pack) };
}

const alsSchluessel = (roh: Bytes) => crypto.subtle.importKey('raw', roh, 'AES-GCM', false, ['encrypt', 'decrypt']);

/** Legt einen neuen Datenschlüssel an. Gibt den Tresor (zum Speichern) und den Rohschlüssel (für diese Sitzung) zurück. */
export async function einrichten(passwort: string, runden = RUNDEN) {
  const roh = zufall(32);
  return { tresor: await verpacken(roh, passwort, runden), roh };
}

/** Holt mit dem Passwort den Rohschlüssel aus dem Tresor. Falsches Passwort: null. */
export async function oeffnen(t: Tresor, passwort: string): Promise<Bytes | null> {
  const kek = await ausPasswort(passwort, unb64(t.salz), t.runden);
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(t.iv), additionalData: text.encode('leo-tresor-1') }, kek, unb64(t.schluessel)));
  } catch {
    return null;
  }
}

/** Neues Passwort: derselbe Datenschlüssel, neu verpackt. Falsches altes Passwort: null. */
export async function umpacken(t: Tresor, alt: string, neu: string): Promise<Tresor | null> {
  const roh = await oeffnen(t, alt);
  return roh ? verpacken(roh, neu, t.runden) : null;
}

export type Datenschluessel = CryptoKey;
export const schluesselAus = (roh: Bytes): Promise<Datenschluessel> => alsSchluessel(roh);
export const rohText = (roh: Bytes) => b64(roh);
export const rohAusText = (s: string) => unb64(s);

// Art und id gehen als Zusatzdaten in die Prüfsumme ein: ein Datensatz lässt sich nicht unbemerkt umhängen.
const zusatz = (art: string, s: { id: string; v: number }) => text.encode(`${art}|${s.id}|${s.v}`);

export async function verschluesseln(k: Datenschluessel, art: string, s: Datensatz): Promise<GeheimSatz> {
  const { daten, ...kopf } = s;
  const iv = zufall(12);
  const g = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: zusatz(art, s) }, k, text.encode(JSON.stringify(daten)));
  return { ...kopf, iv: b64(iv), geheim: b64(g) };
}

export async function entschluesseln(k: Datenschluessel, art: string, g: GeheimSatz): Promise<Datensatz> {
  const { iv, geheim, ...kopf } = g;
  const roh = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv), additionalData: zusatz(art, g) }, k, unb64(geheim));
  return { ...kopf, daten: JSON.parse(lies.decode(roh)) };
}

export const istGeheim = (x: unknown): x is GeheimSatz => !!x && typeof (x as GeheimSatz).geheim === 'string';
