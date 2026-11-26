// Automatischer WebUntis-Abgleich im Browser (WU2). Liest nur, wie „Jetzt abgleichen“; Beispieldaten bleiben unangetastet.
// Kein Dialog: Änderungen kommen als Hinweisleiste, Fehler nur als Zeile unter Mehr › WebUntis.
import { anmelden, fehlerMeldung, type Zugang } from './untis';
import { holen, uebernehmen, bekanntAus, KURZ_TAGE } from './untisimport';
import { app, speichern, zeige, geheimHolen } from './speicher.svelte';
import { faellig, meldung, abgleichArt, tageZurueck, statusVorher } from './untisauto';

export const MERK = 'leo-untis-zugang'; // Schule, Benutzer, Art (ohne Schlüssel), gemeinsam mit Mehr › WebUntis

export const untisAuto = $state({ laeuft: false, fehler: '', versucht: '' as string, letzterFehler: 0 });

function gemerkt(): Partial<Zugang> {
  try { return JSON.parse(localStorage.getItem(MERK) ?? '{}'); } catch { return {}; }
}

export async function untisAutoVersuchen(): Promise<void> {
  const d = app.d;
  if (!d) return;
  const z = gemerkt();
  if (!z.schule || !z.benutzer) return;
  const lage = {
    an: d.einstellungen.untisAuto !== false,
    zugangGemerkt: true,
    erstUebernahme: !!d.einstellungen.untis,
    online: typeof navigator === 'undefined' || navigator.onLine !== false,
    laeuft: untisAuto.laeuft,
    abgerufen: d.einstellungen.untis?.abgerufen,
    letzterFehler: untisAuto.letzterFehler
  };
  if (!faellig(lage)) return;
  untisAuto.laeuft = true;
  try {
    const geheim = await geheimHolen('untis');
    if (!geheim) return; // Schlüssel nicht gemerkt: nur von Hand
    const sz = await anmelden({ schule: z.schule, benutzer: z.benutzer, art: z.art ?? 'schluessel', geheim });
    try {
      // einmal am Tag das ganze Halbjahr, sonst nur die letzten Wochen (E119)
      const kurz = abgleichArt(d.einstellungen.untis?.vollAbgerufen) === 'kurz';
      const paket = await holen(sz, () => {}, { bekannt: bekanntAus(d), ...(kurz ? { ab: tageZurueck(KURZ_TAGE) } : {}) });
      const ziel = app.d;
      if (!ziel) return; // inzwischen gesperrt
      const unsere = ziel.fehlzeiten.filter((f) => f.quelle === 'untis');
      const vorher = { fehlzeiten: unsere.length, offen: unsere.filter((f) => f.status === 'offen').length,
        verspaetungen: ziel.verspaetungen.filter((v) => v.quelle === 'untis').length, status: statusVorher(ziel.fehlzeiten) };
      const e = uebernehmen(ziel, paket, { beispielEntfernen: false, benutzer: z.benutzer, schule: z.schule });
      speichern();
      untisAuto.fehler = '';
      untisAuto.letzterFehler = 0;
      const text = meldung(vorher, e, ziel.fehlzeiten);
      if (text) zeige(text);
    } finally { await sz.abmelden(); }
  } catch (err) {
    untisAuto.fehler = fehlerMeldung(err);
    untisAuto.letzterFehler = Date.now();
  } finally {
    untisAuto.versucht = new Date().toISOString();
    untisAuto.laeuft = false;
  }
}
