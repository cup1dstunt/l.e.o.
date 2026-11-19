// Lokaler Speicher: alle Daten in IndexedDB dieses Browsers. Kein Server, keine Übertragung.
// Ab F2 verschlüsselt, sobald der Browser WebCrypto anbietet (HTTPS oder localhost).
import { beispielDaten } from './beispiel.ts';
import { hashen, neuesSalz } from './sicherheit.ts';
import * as tresorFn from './tresor.ts';
import type { Tresor, Datenschluessel } from './tresor.ts';
import type { Daten } from './typen.ts';
import { ARTEN, zerlegen, unterschied, datensatz, zusammensetzen, type Art, type Datensatz } from './ablage.ts';
import { ausVorlage, verteilen } from './sitzplan.ts';

/** Ältere Sicherungen (0.4) auf den aktuellen Stand bringen. */
function migrieren(d: Daten): Daten {
  d.verspaetungen ??= [];
  d.einstellungen.liveAnsicht ??= 'liste';
  d.einstellungen.sperreMinuten ??= 15;
  for (const k of d.kurse) {
    k.gewichte.klausuren = 0.5;
    k.gewichte.sonstige = 0.5;
    if (!k.sitzplan) {
      k.sitzplan = ausVorlage('reihen');
      verteilen(k.sitzplan, k.schueler);
    }
  }
  return d;
}

// Fundament F1 (docs/FUNDAMENT.md): je Objektart ein Speicher, nur geänderte Datensätze werden geschrieben.
// Der alte Gesamtblock („leo-prototyp“/„alles“) wird beim ersten Start übernommen und bleibt als Rückfall liegen.
const DB_ALT = 'leo-prototyp';
const DB = 'leo';

function oeffnenAlt(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_ALT, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('daten');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
let dbOffen: Promise<IDBDatabase> | undefined;
function oeffnen(): Promise<IDBDatabase> {
  dbOffen ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 2); // 2: Speicher „tresor“ für den verpackten Schlüssel (F2)
    r.onupgradeneeded = () => {
      for (const art of [...ARTEN, 'tresor']) if (!r.result.objectStoreNames.contains(art)) r.result.createObjectStore(art, { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbOffen;
}
async function lesenAlt(): Promise<Daten | undefined> {
  const db = await oeffnenAlt();
  return new Promise((res, rej) => {
    const r = db.transaction('daten').objectStore('daten').get('alles');
    r.onsuccess = () => { res(r.result); db.close(); };
    r.onerror = () => rej(r.error);
  });
}
async function tresorLesen(): Promise<Tresor | undefined> {
  const db = await oeffnen();
  return new Promise((res, rej) => {
    const r = db.transaction('tresor').objectStore('tresor').get('haupt');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function lesen(): Promise<Daten | undefined> {
  const db = await oeffnen();
  const t = db.transaction([...ARTEN]);
  const roh = new Map<Art, unknown[]>();
  await Promise.all(ARTEN.map((art) => new Promise<void>((res, rej) => {
    const r = t.objectStore(art).getAll();
    r.onsuccess = () => { roh.set(art, r.result); res(); };
    r.onerror = () => rej(r.error);
  })));
  const saetze = new Map<Art, Datensatz[]>();
  for (const [art, liste] of roh) {
    saetze.set(art, await Promise.all(liste.map((x) => {
      if (!tresorFn.istGeheim(x)) return x as Datensatz;
      if (!schluessel) throw new Error('Daten sind verschlüsselt, Schlüssel fehlt.');
      return tresorFn.entschluesseln(schluessel, art, x);
    })));
  }
  return zusammensetzen(saetze);
}

let schluessel: Datenschluessel | undefined; // nur im Arbeitsspeicher, solange entsperrt
let tresor: Tresor | undefined;
let zuletzt = new Map<Art, Map<string, string>>(); // Stand der letzten erfolgreichen Speicherung
async function schreiben(d: Daten, neuerTresor?: Tresor) {
  const neu = zerlegen(d);
  const { schreiben: s, loeschen } = unterschied(neuerTresor ? new Map() : zuletzt, neu);
  if (!s.length && !loeschen.length && !neuerTresor) return;
  const db = await oeffnen();
  const jetzt = new Date();
  // Erst alles verschlüsseln, dann in einem Vorgang schreiben (IndexedDB schließt Vorgänge, die auf anderes warten)
  const k = schluessel;
  const saetze = await Promise.all(s.map(async (x) => {
    const satz = datensatz(x.id, x.json, x.pos, jetzt);
    return { art: x.art, satz: k ? await tresorFn.verschluesseln(k, x.art, satz) : satz };
  }));
  await new Promise<void>((res, rej) => {
    const t = db.transaction([...ARTEN, 'tresor'], 'readwrite');
    for (const x of saetze) t.objectStore(x.art).put(x.satz);
    for (const x of loeschen) t.objectStore(x.art).delete(x.id);
    if (neuerTresor) t.objectStore('tresor').put(neuerTresor);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error ?? new Error('Speichern abgebrochen'));
  });
  zuletzt = neu;
}

export const app = $state<{ d: Daten | null; gespeichert: boolean; fehler: string; bereit: boolean; verschluesselt: boolean }>({
  d: null, gespeichert: true, fehler: '', bereit: false, verschluesselt: false
});
/** Kann dieser Browser verschlüsseln? Über http://IP nicht, über HTTPS und localhost ja. */
export const kannVerschluesseln = () => tresorFn.verfuegbar();

let zeitgeber: ReturnType<typeof setTimeout> | undefined;
let offen: Promise<void> = Promise.resolve();
export function speichern() {
  app.gespeichert = false;
  clearTimeout(zeitgeber);
  zeitgeber = setTimeout(() => (offen = jetztSpeichern()), 300);
}
async function jetztSpeichern() {
  zeitgeber = undefined;
  if (!app.d) return;
  try {
    await schreiben($state.snapshot(app.d) as Daten);
    app.gespeichert = true;
    app.fehler = '';
  } catch (e) {
    app.fehler = 'Speichern fehlgeschlagen: ' + (e as Error).message;
  }
}
async function fertigSpeichern() {
  if (zeitgeber) { clearTimeout(zeitgeber); offen = jetztSpeichern(); }
  await offen;
}

// Der entsperrte Schlüssel bleibt in diesem Tab (sessionStorage), damit Neuladen nicht abmeldet.
// Er verfällt mit der Sperre, beim Schließen des Tabs und nach der Sperrzeit ohne Lebenszeichen.
const MERK = 'leo-schluessel';
function merken(roh: Uint8Array<ArrayBuffer>) {
  try { sessionStorage.setItem(MERK, JSON.stringify({ roh: tresorFn.rohText(roh), zeit: Date.now(), min: app.d?.einstellungen.sperreMinuten ?? 15 })); } catch { /* egal */ }
}
/** Lebenszeichen: hält den gemerkten Schlüssel frisch, solange gearbeitet wird. */
export function lebenszeichen() {
  try {
    const m = JSON.parse(sessionStorage.getItem(MERK) ?? 'null');
    if (m) sessionStorage.setItem(MERK, JSON.stringify({ ...m, zeit: Date.now(), min: app.d?.einstellungen.sperreMinuten ?? m.min }));
  } catch { /* egal */ }
}
function gemerkt(): Uint8Array<ArrayBuffer> | undefined {
  try {
    const m = JSON.parse(sessionStorage.getItem(MERK) ?? 'null');
    if (m && (m.min <= 0 || Date.now() - m.zeit < m.min * 60_000)) return tresorFn.rohAusText(m.roh);
    sessionStorage.removeItem(MERK);
  } catch { /* egal */ }
  return undefined;
}

async function datenLesen() {
  const d = await lesen();
  if (d) zuletzt = zerlegen(d);
  app.d = d ? migrieren(d) : beispielDaten();
}

export async function laden() {
  try {
    tresor = await tresorLesen();
    if (tresor) {
      app.verschluesselt = true;
      const roh = gemerkt();
      if (roh) {
        try { schluessel = await tresorFn.schluesselAus(roh); await datenLesen(); }
        catch { schluessel = undefined; app.d = null; }
      }
      app.bereit = true;
      if (app.d) speichern();
      return;
    }
    let alt = await lesen();
    if (alt) zuletzt = zerlegen(alt);
    else alt = await lesenAlt().catch(() => undefined); // erster Start nach F1: alten Block übernehmen
    app.d = alt ? migrieren(alt) : beispielDaten();
    if (navigator.storage?.persist) navigator.storage.persist(); // Browser bitten, die Daten nicht zu löschen
  } catch (e) {
    app.fehler = 'Lokaler Speicher nicht verfügbar, Änderungen gehen beim Schließen verloren.';
    app.d = beispielDaten();
  }
  app.bereit = true;
  speichern();
}

/** Erstmals verschlüsseln: neuer Schlüssel, alle Datensätze verschlüsselt neu geschrieben, dann alter Klartext-Block gelöscht. */
async function verschluesselungEinrichten(passwort: string) {
  await fertigSpeichern();
  const { tresor: t, roh } = await tresorFn.einrichten(passwort);
  delete app.d!.einstellungen.passwort; // ab jetzt prüft der Tresor das Passwort
  const stand = $state.snapshot(app.d) as Daten;
  schluessel = await tresorFn.schluesselAus(roh);
  try {
    await schreiben(stand, t);
  } catch (e) {
    schluessel = undefined;
    throw e;
  }
  tresor = t;
  app.verschluesselt = true;
  merken(roh);
  // Probe: verschlüsselt gelesen muss dasselbe herauskommen, erst dann den unverschlüsselten Rückfall löschen
  const probe = await lesen();
  if (JSON.stringify(probe) === JSON.stringify(stand)) indexedDB.deleteDatabase(DB_ALT);
}

/** Erstes Passwort festlegen. */
export async function festlegen(passwort: string) {
  const salz = neuesSalz();
  app.d!.einstellungen.passwort = { salz, hash: hashen(passwort, salz) };
  if (kannVerschluesseln()) await verschluesselungEinrichten(passwort);
  else speichern();
}

/** Anmelden. Gibt zurück, ob das Passwort stimmt. Verschlüsselt beim ersten Anmelden über HTTPS die Daten. */
export async function entsperren(passwort: string): Promise<{ ok: boolean; neuVerschluesselt?: boolean }> {
  if (tresor) {
    const roh = await tresorFn.oeffnen(tresor, passwort);
    if (!roh) return { ok: false };
    schluessel = await tresorFn.schluesselAus(roh);
    if (!app.d) await datenLesen();
    merken(roh);
    speichern();
    return { ok: true };
  }
  const p = app.d?.einstellungen.passwort;
  if (!p || hashen(passwort, p.salz) !== p.hash) return { ok: false };
  if (kannVerschluesseln()) { await verschluesselungEinrichten(passwort); return { ok: true, neuVerschluesselt: true }; }
  return { ok: true };
}

/** Sperren: offene Änderungen schreiben, dann Schlüssel und Daten aus dem Arbeitsspeicher nehmen. */
export async function sperren() {
  try { sessionStorage.removeItem(MERK); } catch { /* egal */ }
  if (!tresor || !app.d) return;
  await fertigSpeichern();
  schluessel = undefined;
  app.d = null;
  zuletzt = new Map();
}

/** Passwort ändern. Leerer Text = geklappt, sonst die Fehlermeldung. */
export async function passwortAendern(alt: string, neu: string): Promise<string> {
  if (tresor) {
    const t = await tresorFn.umpacken(tresor, alt, neu);
    if (!t) return 'Bisheriges Passwort stimmt nicht';
    const db = await oeffnen();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('tresor', 'readwrite');
      tx.objectStore('tresor').put(t);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    tresor = t;
    return '';
  }
  const p = app.d!.einstellungen.passwort;
  if (p && hashen(alt, p.salz) !== p.hash) return 'Bisheriges Passwort stimmt nicht';
  const salz = neuesSalz();
  app.d!.einstellungen.passwort = { salz, hash: hashen(neu, salz) };
  speichern();
  return '';
}

export function zuruecksetzen() {
  const pw = app.d?.einstellungen.passwort;
  app.d = beispielDaten();
  app.d.einstellungen.passwort = pw; // Anmeldung bleibt (verschlüsselt prüft der Tresor, dann ist pw leer)
  if (tresor) delete app.d.einstellungen.passwort;
  speichern();
}

export function exportieren() {
  const blob = new Blob([JSON.stringify($state.snapshot(app.d), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `leo-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importieren(datei: File) {
  const d = JSON.parse(await datei.text());
  if (d?.version !== 1 || !Array.isArray(d.kurse)) throw new Error('Das ist keine L.E.O.-Sicherung.');
  const pw = app.d?.einstellungen.passwort;
  app.d = migrieren(d);
  if (pw) app.d.einstellungen.passwort = pw; // eigenes Passwort behalten
  if (tresor) delete app.d.einstellungen.passwort; // verschlüsselt prüft der Tresor das Passwort
  speichern();
}

export const neueId = () => Math.random().toString(36).slice(2, 10);

// Hinweisleiste unten mit „Rückgängig“ (DESIGN 1.5: nichts unterbricht)
export const hinweis = $state<{ text: string; rueck?: () => void; n: number }>({ text: '', n: 0 });
let hz: ReturnType<typeof setTimeout> | undefined;
export function zeige(text: string, rueck?: () => void) {
  hinweis.text = text;
  hinweis.rueck = rueck;
  hinweis.n++;
  clearTimeout(hz);
  hz = setTimeout(() => (hinweis.text = ''), 5000);
}
