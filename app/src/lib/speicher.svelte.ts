// Lokaler Speicher: alle Daten in IndexedDB dieses Browsers.
// F1 je Objektart, F2 verschlüsselt (über HTTPS oder localhost), F3 Sicherung und Tagesstände,
// F4 Abgleich mit dem Dienst auf dem Unraid, der nur verschlüsselte Datensätze sieht (docs/FUNDAMENT.md).
import { beispielDaten } from './beispiel.ts';
import { hashen, neuesSalz } from './sicherheit.ts';
import * as tresorFn from './tresor.ts';
import type { Tresor, Datenschluessel, GeheimSatz, GeheimText } from './tresor.ts';
import type { Daten, Kurs } from './typen.ts';
import { ARTEN, zerlegen, unterschied, datensatz, zusammensetzen, schluessel as satzSchluessel, type Art, type Datensatz } from './ablage.ts';
import { ausVorlage, verteilen } from './sitzplan.ts';
import * as sich from './sicherung.ts';
import type { Stand, Ueberblick, SicherungsDatei } from './sicherung.ts';
import { entscheiden, kursMischen, rufen, geraetName, DienstFehler, type FernSatz, type Anmeldung, type Aenderungen, type Senden } from './abgleich.ts';

/** Ältere Sicherungen (0.4) auf den aktuellen Stand bringen. */
function migrieren(d: Daten): Daten {
  d.verspaetungen ??= [];
  d.nachschreiben ??= [];
  d.einstellungen.liveAnsicht ??= 'liste';
  d.einstellungen.sperreMinuten ??= 15;
  for (const k of d.kurse) kursMigrieren(k);
  return d;
}
function kursMigrieren(k: Kurs) {
  k.gewichte.klausuren = 0.5;
  k.gewichte.sonstige = 0.5;
  if (!k.sitzplan) {
    k.sitzplan = ausVorlage('reihen');
    verteilen(k.sitzplan, k.schueler);
  }
}

// ---------- IndexedDB ----------
// Der alte Gesamtblock („leo-prototyp“/„alles“) wird beim ersten Start übernommen (F1).
const DB_ALT = 'leo-prototyp';
const DB = 'leo';
// Speicher außer den Objektarten: tresor (verpackter Schlüssel, Abgleich-Verbindung, gemerkte Zugangsdaten),
// staende (F3, automatische Stände), ausgang (F4, noch nicht gesendete Änderungen)
type Speicher = Art | 'tresor' | 'staende' | 'ausgang';

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
    const r = indexedDB.open(DB, 4); // 2: tresor (F2), 3: staende + ausgang (F3, F4), 4: nachschreiben (F8)
    r.onupgradeneeded = () => {
      for (const s of [...ARTEN, 'tresor', 'staende']) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' });
      if (!r.result.objectStoreNames.contains('ausgang')) r.result.createObjectStore('ausgang', { keyPath: 'key' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbOffen;
}
const anfrage = <T>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function holen<T>(s: Speicher, id: string): Promise<T | undefined> {
  const db = await oeffnen();
  return anfrage(db.transaction(s).objectStore(s).get(id));
}
async function alle<T>(s: Speicher): Promise<T[]> {
  const db = await oeffnen();
  return anfrage(db.transaction(s).objectStore(s).getAll());
}
/** Ein Schreibvorgang über mehrere Speicher. f darf nicht auf anderes warten (IndexedDB schließt den Vorgang sonst). */
async function vorgang(speicher: Speicher[], f: (t: IDBTransaction) => void): Promise<void> {
  const db = await oeffnen();
  await new Promise<void>((res, rej) => {
    const t = db.transaction(speicher, 'readwrite');
    f(t);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error ?? new Error('Speichern abgebrochen'));
  });
}
async function lesenAlt(): Promise<Daten | undefined> {
  const db = await oeffnenAlt();
  const r = await anfrage(db.transaction('daten').objectStore('daten').get('alles'));
  db.close();
  return r;
}

async function lesen(): Promise<Daten | undefined> {
  const saetze = new Map<Art, Datensatz[]>();
  for (const art of ARTEN) saetze.set(art, await Promise.all((await alle<unknown>(art)).map((x) => offen(art, x))));
  return zusammensetzen(saetze);
}
async function offen(art: Art, x: unknown): Promise<Datensatz> {
  if (!tresorFn.istGeheim(x)) return x as Datensatz;
  if (!schluessel) throw new Error('Daten sind verschlüsselt, Schlüssel fehlt.');
  return tresorFn.entschluesseln(schluessel, art, x);
}

// ---------- Zustand ----------
let schluessel: Datenschluessel | undefined; // nur im Arbeitsspeicher, solange entsperrt
let rohAktiv: Uint8Array<ArrayBuffer> | undefined; // derselbe Schlüssel als Bytes (zum Merken und Vergleichen)
let tresor: Tresor | undefined;
let zuletzt = new Map<Art, Map<string, string>>(); // Stand der letzten erfolgreichen Speicherung

interface Verbindung { id: 'abgleich'; benutzer: string; token: string; stand: number; tresorRev: number }
// basis: zuletzt abgeglichener Stand einer Klasse (verschlüsselt), damit beim Konflikt je Note entschieden werden kann
interface Ausgang { key: string; art: Art; id: string; geaendert: string; geloescht?: true; basis?: GeheimSatz }
let verbindung: Verbindung | undefined;

export const app = $state<{ d: Daten | null; gespeichert: boolean; fehler: string; bereit: boolean; verschluesselt: boolean }>({
  d: null, gespeichert: true, fehler: '', bereit: false, verschluesselt: false
});
/** Abgleich-Zustand für die Oberfläche (F4). */
export const abgleich = $state({ verbunden: false, benutzer: '', laeuft: false, zuletzt: '', fehler: '' });
/** Kann dieser Browser verschlüsseln? Über http://IP nicht, über HTTPS und localhost ja. */
export const kannVerschluesseln = () => tresorFn.verfuegbar();

async function schreiben(d: Daten, neuerTresor?: Tresor) {
  const neu = zerlegen(d);
  const { schreiben: s, loeschen } = unterschied(neuerTresor ? new Map() : zuletzt, neu);
  if (!s.length && !loeschen.length && !neuerTresor) return;
  const jetzt = new Date();
  // Erst alles verschlüsseln, dann in einem Vorgang schreiben
  const k = schluessel;
  const saetze = await Promise.all(s.map(async (x) => {
    const satz = datensatz(x.id, x.json, x.pos, jetzt);
    return { art: x.art, satz: k ? await tresorFn.verschluesseln(k, x.art, satz) : satz };
  }));
  const vormerken = !!verbindung; // verbunden: Änderungen für den Abgleich vormerken
  // Klassen: bisherigen Stand als gemeinsame Basis mitmerken (nur wenn noch keine Änderung aussteht, siehe unten)
  const basen = new Map<string, GeheimSatz>();
  if (vormerken && k && !neuerTresor) for (const x of s) {
    const vorher = x.art === 'kurse' ? zuletzt.get('kurse')?.get(x.id) : undefined;
    if (vorher) basen.set(x.id, await tresorFn.verschluesseln(k, 'kurse', datensatz(x.id, vorher, x.pos, jetzt)));
  }
  await vorgang([...ARTEN, 'tresor', 'ausgang'], (t) => {
    for (const x of saetze) {
      t.objectStore(x.art).put(x.satz);
      if (!vormerken) continue;
      const eintrag: Ausgang = { key: `${x.art}|${x.satz.id}`, art: x.art, id: x.satz.id, geaendert: x.satz.geaendert };
      const ausgang = t.objectStore('ausgang');
      if (x.art !== 'kurse') { ausgang.put(eintrag); continue; }
      // Steht schon eine Änderung aus, bleibt deren Basis (der letzte abgeglichene Stand)
      const r = ausgang.get(eintrag.key);
      r.onsuccess = () => {
        const basis = (r.result as Ausgang | undefined)?.basis ?? (r.result ? undefined : basen.get(x.satz.id));
        ausgang.put(basis ? { ...eintrag, basis } : eintrag);
      };
    }
    for (const x of loeschen) {
      t.objectStore(x.art).delete(x.id);
      if (vormerken) t.objectStore('ausgang').put({ key: `${x.art}|${x.id}`, art: x.art, id: x.id, geaendert: jetzt.toISOString(), geloescht: true } satisfies Ausgang);
    }
    if (neuerTresor) t.objectStore('tresor').put(neuerTresor);
  });
  zuletzt = neu;
}

let zeitgeber: ReturnType<typeof setTimeout> | undefined;
let offenesSpeichern: Promise<void> = Promise.resolve();
let angehalten = false; // während das Gerät den Schlüssel eines Kontos übernimmt, wird nichts geschrieben
export function speichern() {
  if (angehalten) return;
  app.gespeichert = false;
  clearTimeout(zeitgeber);
  zeitgeber = setTimeout(() => (offenesSpeichern = jetztSpeichern()), 300);
}
async function jetztSpeichern() {
  zeitgeber = undefined;
  if (!app.d || angehalten) return;
  try {
    await schreiben($state.snapshot(app.d) as Daten);
    app.gespeichert = true;
    app.fehler = '';
    if (verbindung) abgleichPlanen(3000);
  } catch (e) {
    app.fehler = 'Speichern fehlgeschlagen: ' + (e as Error).message;
  }
}
async function fertigSpeichern() {
  if (zeitgeber) { clearTimeout(zeitgeber); offenesSpeichern = jetztSpeichern(); }
  await offenesSpeichern;
}

// Der entsperrte Schlüssel bleibt in diesem Tab (sessionStorage), damit Neuladen nicht abmeldet.
// Er verfällt mit der Sperre, beim Schließen des Tabs und nach der Sperrzeit ohne Lebenszeichen.
const MERK = 'leo-schluessel';
function merken(roh: Uint8Array<ArrayBuffer>) {
  rohAktiv = roh;
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
  zuletzt = d ? zerlegen(d) : new Map();
  app.d = d ? migrieren(d) : beispielDaten();
}

/** Nach dem Entsperren: Tagesstand anlegen, gemerkte Zugangsdaten verschlüsseln, abgleichen. */
function nachEntsperren() {
  tagesstand().catch(() => { /* Stand ist Zugabe, darf nichts aufhalten */ });
  geheimUebernehmen().catch(() => {});
  if (verbindung) abgleichPlanen(200);
}

export async function laden() {
  try {
    tresor = await holen<Tresor>('tresor', 'haupt');
    verbindung = await holen<Verbindung>('tresor', 'abgleich');
    abgleich.verbunden = !!verbindung;
    abgleich.benutzer = verbindung?.benutzer ?? '';
    if (tresor) {
      app.verschluesselt = true;
      const roh = gemerkt();
      if (roh) {
        try { schluessel = await tresorFn.schluesselAus(roh); rohAktiv = roh; await datenLesen(); nachEntsperren(); }
        catch { schluessel = undefined; rohAktiv = undefined; app.d = null; }
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
  await staendeUmschluesseln(undefined, schluessel); // ohne HTTPS angelegte Tagesstände jetzt verschlüsseln
  // Probe: verschlüsselt gelesen muss dasselbe herauskommen, erst dann den unverschlüsselten Rückfall löschen
  const probe = await lesen();
  if (JSON.stringify(probe) === JSON.stringify(stand)) indexedDB.deleteDatabase(DB_ALT);
  nachEntsperren();
}

/** Erstes Passwort festlegen. */
export async function festlegen(passwort: string) {
  const salz = neuesSalz();
  app.d!.einstellungen.passwort = { salz, hash: hashen(passwort, salz) };
  if (kannVerschluesseln()) await verschluesselungEinrichten(passwort);
  else { speichern(); nachEntsperren(); }
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
    nachEntsperren();
    return { ok: true };
  }
  const p = app.d?.einstellungen.passwort;
  if (!p || hashen(passwort, p.salz) !== p.hash) return { ok: false };
  if (kannVerschluesseln()) { await verschluesselungEinrichten(passwort); return { ok: true, neuVerschluesselt: true }; }
  nachEntsperren();
  return { ok: true };
}

/** Sperren: offene Änderungen schreiben, dann Schlüssel und Daten aus dem Arbeitsspeicher nehmen. */
export async function sperren() {
  try { sessionStorage.removeItem(MERK); } catch { /* egal */ }
  if (!tresor || !app.d) return;
  await fertigSpeichern();
  schluessel = undefined;
  rohAktiv = undefined;
  app.d = null;
  zuletzt = new Map();
}

/** Passwort ändern. Leerer Text = geklappt, sonst die Fehlermeldung. */
export async function passwortAendern(alt: string, neu: string): Promise<string> {
  if (tresor) {
    const t = await tresorFn.umpacken(tresor, alt, neu);
    if (!t) return 'Bisheriges Passwort stimmt nicht';
    if (verbindung) {
      // Mit Abgleich gilt das Passwort auf allen Geräten: erst der Server, dann dieses Gerät
      try {
        const r = await rufen<{ tresorRev: number }>('passwort', {
          token: verbindung.token,
          body: { nachweisAlt: await tresorFn.nachweis(alt, verbindung.benutzer), nachweis: await tresorFn.nachweis(neu, verbindung.benutzer), tresor: t }
        });
        verbindung.tresorRev = r.tresorRev;
      } catch (e) {
        return 'Passwort nicht geändert: ' + (e as Error).message + '. Mit Abgleich geht das nur, wenn der Server erreichbar ist.';
      }
    }
    const v = verbindung ? { ...verbindung } : undefined;
    await vorgang(['tresor'], (tx) => { tx.objectStore('tresor').put(t); if (v) tx.objectStore('tresor').put(v); });
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

// =====================================================================
// F3: Sicherung (E102)
// =====================================================================

function herunterladen(inhalt: string, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([inhalt], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Sicherungsdatei: verschlüsselt, sobald der Browser es kann. Gibt zurück, ob verschlüsselt. */
export async function exportieren(): Promise<boolean> {
  const d = $state.snapshot(app.d) as Daten;
  const datum = sich.tag(new Date());
  if (schluessel && tresor) {
    herunterladen(JSON.stringify(await sich.dateiBauen(schluessel, tresor, d)), `leo-sicherung-${datum}.json`);
    return true;
  }
  herunterladen(JSON.stringify(d, null, 1), `leo-sicherung-${datum}-unverschluesselt.json`);
  return false;
}

export type DateiErgebnis = { daten: Daten; ueberblick: Ueberblick; erstellt?: string; verschluesselt: boolean } | { passwort: true } | { fehler: string };

/** Sicherungsdatei lesen, ohne etwas zu ändern (Vorschau). Mit anderem Schlüssel verschlüsselt: Passwort nötig. */
export async function dateiLesen(datei: File, passwort?: string): Promise<DateiErgebnis> {
  let j: any;
  try { j = JSON.parse(await datei.text()); } catch { return { fehler: 'Das ist keine L.E.O.-Sicherung.' }; }
  let d: Daten | null;
  const verschluesselt = sich.istVerschluesselteDatei(j);
  if (verschluesselt) {
    if (!kannVerschluesseln()) return { fehler: 'Verschlüsselte Sicherung: bitte L.E.O. über die HTTPS-Adresse öffnen.' };
    d = await sich.dateiOeffnen(j as SicherungsDatei, schluessel, passwort);
    if (!d) return passwort === undefined ? { passwort: true } : { fehler: 'Passwort passt nicht zu dieser Sicherung.' };
  } else d = j;
  if (d?.version !== 1 || !Array.isArray(d.kurse)) return { fehler: 'Das ist keine L.E.O.-Sicherung.' };
  return { daten: d, ueberblick: sich.ueberblick(d), erstellt: j.erstellt, verschluesselt };
}

/** Daten einspielen (Datei oder Stand). Vorher wird der jetzige Stand als „vorher“ abgelegt. */
export async function einspielen(d: Daten) {
  await fertigSpeichern();
  if (app.d) await standAnlegen('vorher');
  const pw = app.d?.einstellungen.passwort;
  app.d = migrieren(JSON.parse(JSON.stringify(d))); // d kann ein $state-Proxy sein (structuredClone geht damit nicht)
  if (pw) app.d.einstellungen.passwort = pw; // eigenes Passwort behalten
  if (tresor) delete app.d.einstellungen.passwort; // verschlüsselt prüft der Tresor das Passwort
  speichern();
  await fertigSpeichern();
}

async function standAnlegen(anlass: Stand['anlass']) {
  if (!app.d) return;
  const s = await sich.standBauen(schluessel, $state.snapshot(app.d) as Daten, anlass);
  const vorhanden = await alle<Stand>('staende');
  const weg = sich.ueberzaehlig([...vorhanden.filter((x) => x.id !== s.id), s]);
  await vorgang(['staende'], (t) => {
    t.objectStore('staende').put(s);
    for (const id of weg) t.objectStore('staende').delete(id);
  });
}

/** Einmal am Tag, beim ersten Entsperren: Stand im Gerät ablegen (die letzten 7 bleiben). */
async function tagesstand() {
  if (!app.d) return;
  if (await holen<Stand>('staende', sich.tag(new Date()))) return;
  await standAnlegen('taeglich');
}

export async function staendeListe(): Promise<Pick<Stand, 'id' | 'erstellt' | 'anlass'>[]> {
  return (await alle<Stand>('staende')).map(({ id, erstellt, anlass }) => ({ id, erstellt, anlass })).sort((a, b) => b.erstellt.localeCompare(a.erstellt));
}
export async function standLesen(id: string): Promise<{ daten: Daten; ueberblick: Ueberblick } | null> {
  const s = await holen<Stand>('staende', id);
  if (!s) return null;
  const daten = await sich.standOeffnen(s, schluessel);
  return { daten, ueberblick: sich.ueberblick(daten) };
}
export const jetzigerUeberblick = () => (app.d ? sich.ueberblick($state.snapshot(app.d) as Daten) : null);

/** Stände mit neuem Schlüssel neu verschlüsseln (Verschlüsselung eingerichtet oder Schlüssel vom Konto übernommen). */
async function staendeUmschluesseln(alt: Datenschluessel | undefined, neu: Datenschluessel) {
  const neue: Stand[] = [];
  for (const s of await alle<Stand>('staende')) {
    try { neue.push(await sich.standMitSchluessel(s, await sich.standOeffnen(s, alt), neu)); } catch { /* nicht lesbarer Stand fällt weg */ }
  }
  await vorgang(['staende'], (t) => {
    t.objectStore('staende').clear();
    for (const s of neue) t.objectStore('staende').put(s);
  });
}

// ---------- Gemerkte Zugangsdaten (WebUntis-Schlüssel), verschlüsselt mit dem Datenschlüssel ----------
const geheimAlt = (name: string) => `leo-${name}-geheim`; // ohne HTTPS (und bis 0.5) unverschlüsselt im localStorage
export async function geheimHolen(name: string): Promise<string> {
  if (schluessel) {
    const g = await holen<GeheimText & { id: string }>('tresor', 'geheim-' + name);
    if (g) { try { return await tresorFn.textEntschluesseln(schluessel, 'leo-geheim|' + name, g); } catch { return ''; } }
  }
  try { return localStorage.getItem(geheimAlt(name)) ?? ''; } catch { return ''; }
}
export async function geheimSetzen(name: string, wert: string | null) {
  if (!schluessel) {
    try { wert ? localStorage.setItem(geheimAlt(name), wert) : localStorage.removeItem(geheimAlt(name)); } catch { /* privat */ }
    return;
  }
  const g = wert ? { id: 'geheim-' + name, ...(await tresorFn.textVerschluesseln(schluessel, 'leo-geheim|' + name, wert)) } : null;
  await vorgang(['tresor'], (t) => (g ? t.objectStore('tresor').put(g) : t.objectStore('tresor').delete('geheim-' + name)));
  try { localStorage.removeItem(geheimAlt(name)); } catch { /* egal */ }
}
/** Bisher unverschlüsselt gemerkte Zugangsdaten verschlüsseln. */
async function geheimUebernehmen() {
  if (!schluessel) return;
  let w: string | null = null;
  try { w = localStorage.getItem(geheimAlt('untis')); } catch { /* egal */ }
  if (w) await geheimSetzen('untis', w);
}
async function geheimeUmschluesseln(alt: Datenschluessel, neu: Datenschluessel) {
  const liste = (await alle<GeheimText & { id: string }>('tresor')).filter((x) => x.id.startsWith('geheim-'));
  const neue: (GeheimText & { id: string })[] = [];
  for (const g of liste) {
    const zweck = 'leo-geheim|' + g.id.slice(7);
    try { neue.push({ id: g.id, ...(await tresorFn.textVerschluesseln(neu, zweck, await tresorFn.textEntschluesseln(alt, zweck, g))) }); } catch { /* fällt weg */ }
  }
  await vorgang(['tresor'], (t) => { for (const g of liste) t.objectStore('tresor').delete(g.id); for (const g of neue) t.objectStore('tresor').put(g); });
}

// =====================================================================
// F4: Abgleich (E103)
// =====================================================================

let abgleichZeit: ReturnType<typeof setTimeout> | undefined;
export function abgleichPlanen(ms = 0) {
  if (!verbindung) return;
  clearTimeout(abgleichZeit);
  abgleichZeit = setTimeout(() => abgleichen(), ms);
}
let laufend: Promise<void> | undefined;
/** Holt Neues vom Server und schickt eigene Änderungen. Läuft nie doppelt. */
export function abgleichen(): Promise<void> {
  laufend ??= abgleichJetzt().finally(() => (laufend = undefined));
  return laufend;
}

async function verbindungSchreiben() {
  if (!verbindung) return;
  const v = { ...verbindung };
  await vorgang(['tresor'], (t) => t.objectStore('tresor').put(v));
}

async function abgleichJetzt() {
  const v = verbindung;
  const k = schluessel;
  if (!v || !k || !app.d || angehalten) return;
  abgleich.laeuft = true;
  try {
    await fertigSpeichern();
    for (;;) {
      const a = await rufen<Aenderungen>('aenderungen?seit=' + v.stand, { token: v.token });
      if (verbindung !== v || schluessel !== k) return; // inzwischen getrennt oder gesperrt
      if (a.tresorRev > v.tresorRev) {
        // Passwort wurde auf einem anderen Gerät geändert: neu verpackten Schlüssel übernehmen
        tresor = a.tresor;
        v.tresorRev = a.tresorRev;
        await vorgang(['tresor'], (t) => t.objectStore('tresor').put(a.tresor));
      }
      await eingang(a.saetze, k);
      v.stand = a.stand;
      await verbindungSchreiben();
      if (!a.mehr) break;
    }
    const wieder = await ausgangSenden(v);
    abgleich.zuletzt = new Date().toISOString();
    abgleich.fehler = '';
    if (wieder) abgleichPlanen(1000); // Server hatte inzwischen Neueres: gleich noch einmal holen
  } catch (e) {
    const abgelaufen = e instanceof DienstFehler && e.status === 401;
    abgleich.fehler = abgelaufen ? 'Anmeldung beim Server abgelaufen, bitte unter Mehr › Abgleich neu verbinden.' : (e as Error).message;
    if (!abgelaufen) abgleichPlanen(60_000);
  } finally {
    abgleich.laeuft = false;
  }
}

/** Datensätze vom Server einarbeiten: in IndexedDB schreiben und in app.d einspielen. */
async function eingang(saetze: FernSatz[], k: Datenschluessel) {
  if (!saetze.length) return;
  const lokal = new Map<string, GeheimSatz>();
  for (const art of ARTEN) for (const x of await alle<GeheimSatz>(art)) lokal.set(`${art}|${x.id}`, x);
  const aus = new Map((await alle<Ausgang>('ausgang')).map((x) => [x.key, x]));
  const schreibe: { art: Art; id: string; satz?: GeheimSatz }[] = [];
  const ausWeg: string[] = [];
  const ausNeu: Ausgang[] = [];
  const ins: { art: Art; id: string; satz: Datensatz | null }[] = [];
  for (const f of saetze) {
    if (!(ARTEN as readonly string[]).includes(f.art)) continue;
    const art = f.art as Art;
    const key = `${art}|${f.id}`;
    const l = lokal.get(key);
    const a = aus.get(key);
    const kopf = l ? { geaendert: l.geaendert } : a ? { geaendert: a.geaendert, geloescht: true } : undefined;
    const e = entscheiden(art, f, kopf, !!a);
    if (e === 'nichts') { if (a && a.geaendert === f.geaendert) ausWeg.push(key); continue; }
    if (e === 'behalten') continue;
    if (e === 'uebernehmen') {
      if (a) ausWeg.push(key);
      if (f.geloescht) { if (l) { schreibe.push({ art, id: f.id }); ins.push({ art, id: f.id, satz: null }); } continue; }
      schreibe.push({ art, id: f.id, satz: f.satz });
      ins.push({ art, id: f.id, satz: await tresorFn.entschluesseln(k, art, f.satz!) });
      continue;
    }
    // mischen: Klasse auf beiden Geräten geändert, Noten-Zellen einzeln zusammenführen
    const ls = await tresorFn.entschluesseln(k, art, l!);
    const fs = await tresorFn.entschluesseln(k, art, f.satz!);
    const bs = a?.basis ? await tresorFn.entschluesseln(k, art, a.basis).catch(() => undefined) : undefined;
    const gemischt = kursMischen(ls.daten as Kurs, fs.daten as Kurs, f.geaendert > l!.geaendert, bs?.daten as Kurs | undefined);
    const zeit = new Date(Math.max(Date.now(), Date.parse(f.geaendert) + 1, Date.parse(l!.geaendert) + 1));
    const neu = datensatz(f.id, JSON.stringify(gemischt), ls.pos, zeit);
    schreibe.push({ art, id: f.id, satz: await tresorFn.verschluesseln(k, art, neu) });
    ausNeu.push({ key, art, id: f.id, geaendert: neu.geaendert, basis: f.satz }); // neue Basis: der Stand vom Server
    ins.push({ art, id: f.id, satz: neu });
  }
  await vorgang([...ARTEN, 'ausgang'], (t) => {
    for (const x of schreibe) x.satz ? t.objectStore(x.art).put(x.satz) : t.objectStore(x.art).delete(x.id);
    for (const key of ausWeg) t.objectStore('ausgang').delete(key);
    for (const x of ausNeu) t.objectStore('ausgang').put(x);
  });
  if (app.d) for (const x of ins) imSpeicherEinspielen(x.art, x.id, x.satz);
}

/** Einen Datensatz in app.d ersetzen, ohne das Objekt auszutauschen (Seiten halten Verweise darauf). */
function imSpeicherEinspielen(art: Art, id: string, satz: Datensatz | null) {
  const d = app.d!;
  const merke = (json: string | null) => {
    const m = zuletzt.get(art) ?? new Map<string, string>();
    json === null ? m.delete(id) : m.set(id, json);
    zuletzt.set(art, m);
  };
  const ersetzen = (ziel: any, neu: any) => {
    for (const key of Object.keys(ziel)) if (!(key in neu)) delete ziel[key];
    Object.assign(ziel, neu);
  };
  if (art === 'einstellungen') {
    if (!satz) return;
    ersetzen(d.einstellungen, satz.daten);
    merke(JSON.stringify($state.snapshot(d.einstellungen)));
    return;
  }
  const liste = (d as any)[art] as any[];
  const i = liste.findIndex((x) => satzSchluessel(art, x) === id);
  if (!satz) { if (i >= 0) liste.splice(i, 1); merke(null); return; }
  const neu = satz.daten as any;
  if (art === 'kurse') kursMigrieren(neu);
  if (i >= 0) {
    ersetzen(liste[i], neu);
    merke(JSON.stringify($state.snapshot(liste[i])));
  } else {
    liste.splice(Math.min(satz.pos, liste.length), 0, neu);
    merke(JSON.stringify(neu));
  }
}

/** Vorgemerkte Änderungen senden. Gibt zurück, ob der Server bei einigen Neueres hatte. */
async function ausgangSenden(v: Verbindung): Promise<boolean> {
  const aus = await alle<Ausgang>('ausgang');
  let abgelehnt = false;
  for (let i = 0; i < aus.length; i += 300) {
    const saetze: FernSatz[] = [];
    for (const a of aus.slice(i, i + 300)) {
      const satz = a.geloescht ? undefined : await holen<GeheimSatz>(a.art, a.id);
      if (satz && !tresorFn.istGeheim(satz)) continue; // unverschlüsselt verlässt nichts das Gerät
      saetze.push(satz ? { art: a.art, id: a.id, geaendert: satz.geaendert, satz } : { art: a.art, id: a.id, geaendert: a.geaendert, geloescht: true });
    }
    if (!saetze.length) continue;
    const r = await rufen<Senden>('aenderungen', { token: v.token, body: { saetze } });
    if (r.abgelehnt.length) abgelehnt = true;
    const nochDa = new Map((await alle<Ausgang>('ausgang')).map((x) => [x.key, x]));
    await vorgang(['ausgang'], (t) => {
      for (const s of saetze) {
        const key = `${s.art}|${s.id}`;
        // Nur austragen, was angenommen wurde und seitdem nicht schon wieder geändert ist
        if (!r.abgelehnt.includes(key) && nochDa.get(key)?.geaendert === s.geaendert) t.objectStore('ausgang').delete(key);
      }
    });
  }
  return abgelehnt;
}

async function allesVormerken() {
  const eintraege: Ausgang[] = [];
  for (const art of ARTEN) for (const x of await alle<GeheimSatz>(art)) eintraege.push({ key: `${art}|${x.id}`, art, id: x.id, geaendert: x.geaendert });
  await vorgang(['ausgang'], (t) => { for (const e of eintraege) t.objectStore('ausgang').put(e); });
}

export type VerbindenErgebnis = { ok: true; neuLaden?: boolean } | { ok: false; fehler: string; neu?: boolean };
const normal = (b: string) => b.trim().toLowerCase();

async function verbundenAb(benutzer: string, a: Anmeldung) {
  await fertigSpeichern();
  verbindung = { id: 'abgleich', benutzer, token: a.token, stand: 0, tresorRev: a.tresorRev };
  await verbindungSchreiben();
  await allesVormerken();
  abgleich.verbunden = true;
  abgleich.benutzer = benutzer;
  abgleich.fehler = '';
  await abgleichen();
}

/** Dieses Gerät mit dem Konto auf dem Server verbinden (Mehr › Abgleich).
 *  Konto unbekannt: mit Einladungscode anlegen, dieses Gerät bringt seine Daten mit.
 *  Konto vorhanden: dieses Gerät übernimmt Schlüssel und Stand vom Server, der bisherige Stand bleibt als Stand erhalten. */
export async function verbinden(benutzer: string, passwort: string, einladung?: string): Promise<VerbindenErgebnis> {
  benutzer = normal(benutzer);
  if (!tresor || !schluessel || !app.d) return { ok: false, fehler: 'Abgleich geht nur über HTTPS und mit verschlüsselten Daten.' };
  const nachweis = await tresorFn.nachweis(passwort, benutzer);
  let a: Anmeldung;
  try {
    a = await rufen<Anmeldung>('anmelden', { body: { benutzer, nachweis, geraet: geraetName() } });
  } catch (e) {
    if (!(e instanceof DienstFehler) || e.message !== 'Konto unbekannt') return { ok: false, fehler: (e as Error).message };
    if (!einladung) return { ok: false, neu: true, fehler: '' };
    if (!(await tresorFn.oeffnen(tresor, passwort))) return { ok: false, fehler: 'Für das erste Gerät bitte das L.E.O.-Passwort dieses Geräts verwenden.' };
    try {
      a = await rufen<Anmeldung>('konto', { body: { benutzer, nachweis, tresor, einladung, geraet: geraetName() } });
    } catch (e2) {
      return { ok: false, fehler: (e2 as Error).message };
    }
    await verbundenAb(benutzer, a);
    return { ok: true };
  }
  const roh = await tresorFn.oeffnen(a.tresor, passwort);
  if (!roh) return { ok: false, fehler: 'Das Passwort öffnet den Schlüssel auf dem Server nicht.' };
  if (rohAktiv && tresorFn.rohText(roh) === tresorFn.rohText(rohAktiv)) {
    // Dasselbe Konto wie vorher (z. B. nach „Trennen“): einfach weiter abgleichen
    await verbundenAb(benutzer, a);
    return { ok: true };
  }
  try {
    await kontoUebernehmen(benutzer, roh, a);
  } catch (e) {
    return { ok: false, fehler: (e as Error).message };
  }
  return { ok: true, neuLaden: true };
}

/** Neues Gerät: gleich beim Start mit dem Konto anmelden, statt erst ein eigenes Passwort festzulegen. */
export async function mitKontoAnmelden(benutzer: string, passwort: string): Promise<{ ok: boolean; fehler?: string }> {
  benutzer = normal(benutzer);
  if (!kannVerschluesseln()) return { ok: false, fehler: 'Geht nur über die HTTPS-Adresse.' };
  try {
    const a = await rufen<Anmeldung>('anmelden', { body: { benutzer, nachweis: await tresorFn.nachweis(passwort, benutzer), geraet: geraetName() } });
    const roh = await tresorFn.oeffnen(a.tresor, passwort);
    if (!roh) return { ok: false, fehler: 'Das Passwort öffnet den Schlüssel auf dem Server nicht.' };
    await kontoUebernehmen(benutzer, roh, a);
    return { ok: true };
  } catch (e) {
    return { ok: false, fehler: e instanceof DienstFehler && e.message === 'Konto unbekannt' ? 'Dieses Konto gibt es auf dem Server nicht.' : (e as Error).message };
  }
}

/** Schlüssel und Stand vom Konto übernehmen. Erst wird alles geholt und geprüft, dann ersetzt.
 *  Der bisherige Stand dieses Geräts bleibt als Stand („vorher“) erhalten. */
async function kontoUebernehmen(benutzer: string, roh: Uint8Array<ArrayBuffer>, a: Anmeldung) {
  const kNeu = await tresorFn.schluesselAus(roh);
  const fern: FernSatz[] = [];
  let stand = 0;
  let t = a.tresor;
  let tRev = a.tresorRev;
  if (a.stand) for (;;) {
    const r = await rufen<Aenderungen>('aenderungen?seit=' + stand, { token: a.token });
    fern.push(...r.saetze);
    stand = r.stand;
    t = r.tresor;
    tRev = r.tresorRev;
    if (!r.mehr) break;
  }
  const behalten = fern.filter((f) => !f.geloescht && (ARTEN as readonly string[]).includes(f.art));
  for (const f of behalten) await tresorFn.entschluesseln(kNeu, f.art, f.satz!); // passt alles zum Schlüssel? Sonst bricht es hier ab, ohne etwas zu ändern

  await fertigSpeichern();
  angehalten = true;
  try {
    const kAlt = schluessel;
    const frisch = !tresor && !app.d?.einstellungen.passwort; // neues Gerät mit Beispieldaten
    await staendeUmschluesseln(kAlt, kNeu);
    if (kAlt) await geheimeUmschluesseln(kAlt, kNeu);
    schluessel = kNeu;
    if (app.d && !frisch) await standAnlegen('vorher');
    verbindung = { id: 'abgleich', benutzer, token: a.token, stand, tresorRev: tRev };
    if (!behalten.length && app.d) {
      // Konto ohne Daten: dieses Gerät bringt seine Daten mit, neu verschlüsselt
      delete app.d.einstellungen.passwort;
      await schreiben($state.snapshot(app.d) as Daten, t);
      await verbindungSchreiben();
      await allesVormerken();
    } else {
      const v = { ...verbindung };
      await vorgang([...ARTEN, 'tresor', 'ausgang'], (tx) => {
        for (const art of ARTEN) tx.objectStore(art).clear();
        tx.objectStore('ausgang').clear();
        for (const f of behalten) tx.objectStore(f.art as Art).put(f.satz);
        tx.objectStore('tresor').put(t);
        tx.objectStore('tresor').put(v);
      });
    }
    tresor = t;
    app.verschluesselt = true;
    merken(roh);
    abgleich.verbunden = true;
    abgleich.benutzer = benutzer;
    abgleich.fehler = '';
    await datenLesen();
    indexedDB.deleteDatabase(DB_ALT);
  } finally {
    angehalten = false;
  }
  nachEntsperren();
}

/** Abgleich auf diesem Gerät beenden. Die Daten bleiben im Gerät, auf dem Server bleibt das Konto. */
export async function trennen() {
  const v = verbindung;
  verbindung = undefined;
  abgleich.verbunden = false;
  abgleich.fehler = '';
  clearTimeout(abgleichZeit);
  if (v) rufen('abmelden', { token: v.token, body: {} }).catch(() => { /* offline: schadet nicht */ });
  await vorgang(['tresor', 'ausgang'], (t) => { t.objectStore('tresor').delete('abgleich'); t.objectStore('ausgang').clear(); });
}

/** Anzahl noch nicht gesendeter Änderungen (für die Anzeige). */
export async function ausstehend(): Promise<number> {
  return (await alle<Ausgang>('ausgang')).length;
}

/** Erreichbarkeit des Dienstes und ob Konten angelegt werden können. */
export async function dienstStatus(): Promise<{ ok: boolean; kontoAnlegen: boolean }> {
  try { return await rufen('status'); } catch { return { ok: false, kontoAnlegen: false }; }
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
