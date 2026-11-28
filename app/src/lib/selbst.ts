// Selbsteinschätzung der Schüler per Link (FB7b, E111, E116).
// Ablauf: Lehrkraft erstellt für Klasse + Monat eine Runde. Jeder Schüler bekommt einen Einmal-Link per Mail
// an die schulische Adresse. Das Formular (static/e/index.html) läuft auf dem eigenen Server und verschlüsselt
// die Antwort im Browser des Schülers mit dem öffentlichen Schlüssel der Runde. Der Server sieht keine Namen
// und kann die Antworten nicht lesen. Nur das Gerät der Lehrkraft kennt die Zuordnung Link → Schüler.
// Hier steht alles, was ohne Browser prüfbar ist; Aufrufe an den Dienst macht die Seite über rufen().
import type { Kurs, Raster, RasterKriterium, Schueler, SelbstAntwort, SelbstRunde } from './typen.ts';
import { fuellen } from './nachschreiben.ts';

// ---------- Kleinkram ----------
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ausB64 = (t: string) => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const zufall = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const hex = (u: Uint8Array) => [...u].map((x) => x.toString(16).padStart(2, '0')).join('');

/** Id einer Runde: 16 Hex-Zeichen Zufall, verrät nichts über Klasse oder Lehrkraft. */
export const neueRundenId = () => hex(zufall(8));
/** Einmal-Link-Token: Runde + 128 Bit Zufall. Nicht zu erraten, Kurz-Link-Dienste sind nicht nötig. */
export const neuerToken = (rundeId: string) => `${rundeId}.${b64(zufall(16))}`;
/** So kennt der Server einen Link: nur als Hash. Dient auch als Zusatzdaten der Verschlüsselung (gegen Vertauschen). */
export async function linkHash(token: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('leo-selbst|' + token))));
}
/** Link für den Schüler. Der Token steht hinter #, damit er nicht in Protokollen oder Weiterleitungen landet. */
export const linkFuer = (basis: string, token: string) => `${basis.replace(/\/+$/, '')}/e/#${token}`;

// ---------- Schlüssel (ECDH P-256 + AES-GCM, wie static/e/index.html) ----------
export async function schluesselpaar(): Promise<{ oeffentlich: JsonWebKey; privat: JsonWebKey }> {
  const p = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])) as CryptoKeyPair;
  return { oeffentlich: await crypto.subtle.exportKey('jwk', p.publicKey), privat: await crypto.subtle.exportKey('jwk', p.privateKey) };
}

/** Verschlüsselte Antwort, wie sie der Server speichert. epk = einmaliger öffentlicher Schlüssel des Schüler-Browsers. */
export interface GeheimeAntwort { epk: JsonWebKey; iv: string; geheim: string }

export async function antwortLesen(privat: JsonWebKey, a: GeheimeAntwort, hash: string): Promise<{ stufen: Record<string, number>; kommentar?: string }> {
  const priv = await crypto.subtle.importKey('jwk', privat, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
  const epk = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: a.epk.x, y: a.epk.y }, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const k = await crypto.subtle.deriveKey({ name: 'ECDH', public: epk }, priv, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const roh = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ausB64(a.iv), additionalData: new TextEncoder().encode(hash) }, k, ausB64(a.geheim));
  return JSON.parse(new TextDecoder().decode(roh));
}

/** Antwort prüfen: nur bekannte Kriterien, Stufen 1–4, Kommentar gekürzt. Unbrauchbares fällt weg. */
export function antwortSaeubern(roh: { stufen?: Record<string, unknown>; kommentar?: unknown }, kriterien: string[], zeit: string): SelbstAntwort {
  const stufen: SelbstAntwort['stufen'] = {};
  for (const id of kriterien) {
    const v = roh.stufen?.[id];
    if (v === 1 || v === 2 || v === 3 || v === 4) stufen[id] = v;
  }
  const kommentar = typeof roh.kommentar === 'string' ? roh.kommentar.trim().slice(0, 500) : '';
  return { stufen, zeit, ...(kommentar ? { kommentar } : {}) };
}

// ---------- Bogen für den Server ----------
export interface Bogen {
  titel: string;
  frist: string;
  kriterien: { id: string; name: string; stufen: [string, string, string, string] }[];
  schluessel: JsonWebKey; // öffentlicher Schlüssel
}

export const monatText = (m: string) => new Date(m + '-01T12:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
export const fristText = (f: string) => new Date(f + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });

/** Bogen ohne Namen: Fach, Klassenbezeichnung, Monat und die Ich-Sätze der Kriterien. */
export function bogenFuer(kurs: Pick<Kurs, 'fach' | 'klasse'>, monat: string, kriterien: RasterKriterium[], frist: string, schluessel: JsonWebKey): Bogen {
  return {
    titel: `${kurs.fach} · ${kurs.klasse} · ${monatText(monat)}`,
    frist,
    kriterien: kriterien.map((k) => ({ id: k.id, name: k.name, stufen: k.selbst ?? k.stufen })), // Ich-Form für die Schüler (E125)
    schluessel: { kty: schluessel.kty, crv: schluessel.crv, x: schluessel.x, y: schluessel.y }
  };
}

/** Frist als Datum: heute + n Tage. */
export function fristIn(tage: number, heute = new Date()): string {
  const d = new Date(heute.getTime() + tage * 864e5);
  return d.toISOString().slice(0, 10);
}
export const abgelaufen = (frist: string, heute = new Date().toISOString().slice(0, 10)) => heute > frist;

// ---------- Vergleich Selbst- und Fremdbild ----------
export interface Vergleich { id: string; name: string; selbst?: number; lehrkraft?: number; abstand: number | null }

/** Je Kriterium Selbst- und Fremdeinschätzung. Abstand = Selbst − Lehrkraft (positiv: sieht sich besser). */
export function vergleich(kriterien: RasterKriterium[], selbst: Record<string, number> = {}, lehrkraft: Record<string, number> = {}): Vergleich[] {
  return kriterien.map((k) => {
    const s = selbst[k.id], l = lehrkraft[k.id];
    return { id: k.id, name: k.name, selbst: s, lehrkraft: l, abstand: s !== undefined && l !== undefined ? s - l : null };
  });
}
/** Ab 2 Stufen Unterschied lohnt ein Gespräch. */
export const GROSSE_ABWEICHUNG = 2;
export const abweichungen = (v: Vergleich[]) => v.filter((x) => x.abstand !== null && Math.abs(x.abstand) >= GROSSE_ABWEICHUNG);

// ---------- Mails (E116: Vorlage frei änderbar, Platzhalter in {}) ----------
export const SELBST_MAIL = {
  betreff: 'Selbsteinschätzung {fach}: {monat}',
  text:
    'Hallo {vorname},\n\n' +
    'bitte schätze deine mündlichen Leistungen in {fach} ({klasse}) für {monat} selbst ein. Das dauert etwa zwei Minuten:\n\n' +
    '{link}\n\n' +
    'Der Link gehört nur dir, bitte gib ihn nicht weiter. Er funktioniert bis {frist}. ' +
    'Deine Einschätzung ist keine Note. Ich vergleiche sie mit meiner und wir können darüber sprechen.\n\n' +
    'Viele Grüße'
};
export const SELBST_ERINNERUNG = {
  betreff: 'Erinnerung: Selbsteinschätzung {fach}',
  text:
    'Hallo {vorname},\n\n' +
    'deine Selbsteinschätzung für {fach} ({monat}) fehlt noch. Du hast noch bis {frist} Zeit:\n\n' +
    '{link}\n\n' +
    'Viele Grüße'
};
export const SELBST_PLATZHALTER = ['vorname', 'nachname', 'fach', 'klasse', 'monat', 'frist', 'link'] as const;

export function selbstMailWerte(r: Pick<SelbstRunde, 'monat' | 'frist' | 'basis' | 'links'>, kurs: Pick<Kurs, 'fach' | 'klasse'>, s: Pick<Schueler, 'id' | 'vorname' | 'nachname'>): Record<string, string> {
  const l = r.links[s.id];
  return {
    vorname: s.vorname, nachname: s.nachname, fach: kurs.fach, klasse: kurs.klasse, monat: monatText(r.monat),
    frist: new Date(r.frist + 'T12:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }),
    link: l ? linkFuer(r.basis, l.token) : '(kein Link)'
  };
}
export function selbstMail(vorlage: { betreff: string; text: string }, werte: Record<string, string>) {
  return { betreff: fuellen(vorlage.betreff, werte), text: fuellen(vorlage.text, werte) };
}

/** Stand einer Runde für die Kachel. */
export function rundenStand(r: SelbstRunde, schueler: string[]) {
  const mitLink = schueler.filter((id) => r.links[id]);
  const zurueck = mitLink.filter((id) => r.antworten[id]);
  const offen = mitLink.filter((id) => !r.antworten[id]);
  return {
    gesamt: mitLink.length, zurueck: zurueck.length, offen,
    ohneMail: offen.filter((id) => !r.links[id].mail),
    ohneLink: schueler.filter((id) => !r.links[id]),
    abgelaufen: abgelaufen(r.frist)
  };
}

/** Kriterien, die im Bogen stehen: die aktiven des Rasters (Hausaufgaben nur, wenn eingeschaltet). */
export const bogenKriterien = (raster: Raster, aktiv: (k: RasterKriterium) => boolean) => raster.bereiche.flatMap((b) => b.kriterien).filter(aktiv);
