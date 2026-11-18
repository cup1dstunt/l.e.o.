// Lokaler Speicher: alle Daten in IndexedDB dieses Browsers. Kein Server, keine Übertragung.
import { beispielDaten } from './beispiel.ts';
import type { Daten } from './typen.ts';
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

const DB = 'leo-prototyp';
const STORE = 'daten';

function oeffnen(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function lesen(): Promise<Daten | undefined> {
  const db = await oeffnen();
  return new Promise((res, rej) => {
    const r = db.transaction(STORE).objectStore(STORE).get('alles');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function schreiben(d: Daten) {
  const db = await oeffnen();
  return new Promise<void>((res, rej) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).put(d, 'alles');
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

export const app = $state<{ d: Daten | null; gespeichert: boolean; fehler: string }>({ d: null, gespeichert: true, fehler: '' });

let zeitgeber: ReturnType<typeof setTimeout> | undefined;
export function speichern() {
  app.gespeichert = false;
  clearTimeout(zeitgeber);
  zeitgeber = setTimeout(async () => {
    if (!app.d) return;
    try {
      await schreiben($state.snapshot(app.d) as Daten);
      app.gespeichert = true;
      app.fehler = '';
    } catch (e) {
      app.fehler = 'Speichern fehlgeschlagen: ' + (e as Error).message;
    }
  }, 300);
}

export async function laden() {
  try {
    const alt = await lesen();
    app.d = alt ? migrieren(alt) : beispielDaten();
    if (navigator.storage?.persist) navigator.storage.persist(); // Browser bitten, die Daten nicht zu löschen
  } catch (e) {
    app.fehler = 'Lokaler Speicher nicht verfügbar, Änderungen gehen beim Schließen verloren.';
    app.d = beispielDaten();
  }
  speichern();
}

export function zuruecksetzen() {
  const pw = app.d?.einstellungen.passwort;
  app.d = beispielDaten();
  app.d.einstellungen.passwort = pw; // Anmeldung bleibt
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
