// IServ-Kalender-Abo im Browser (K3, K10, V15). Liest nur. Kein Dialog: Änderungen als Hinweisleiste,
// Fehler nur als Zeile im Kalender. Automatisch wie WebUntis (beim Entsperren, beim Zurückkehren, alle 30 Minuten).
import { app, speichern, zeige, geheimHolen } from './speicher.svelte';
import { ausIcs, quelleAbgleichen, abgleichText } from './kalender';
import { linkPruefen, durchreicherPfad, serverPasst, antwortPruefen, fenster } from './iserv';
import { faellig } from './untisauto';

export const iserv = $state({ laeuft: false, fehler: '', letzterFehler: 0, gemerkt: false });

/** Ist ein Link auf diesem Gerät gemerkt? (für die Anzeige) */
export async function iservGemerkt(): Promise<boolean> {
  iserv.gemerkt = !!(await geheimHolen('iserv'));
  return iserv.gemerkt;
}

/** Abgleich mit dem gemerkten Link. `vonHand`: auch wenn er laut Zeitplan noch nicht dran ist. Gibt die Meldung zurück. */
export async function iservAbgleichen(vonHand = false): Promise<string> {
  const d = app.d;
  if (!d || d.einstellungen.module?.kalender === false || iserv.laeuft) return '';
  const ka = d.einstellungen.kalender ?? {};
  if (!vonHand && !faellig({
    an: ka.iservAuto !== false, zugangGemerkt: true, erstUebernahme: true,
    online: typeof navigator === 'undefined' || navigator.onLine !== false,
    laeuft: iserv.laeuft, abgerufen: ka.iservAbgerufen, letzterFehler: iserv.letzterFehler
  })) return '';
  const link = await geheimHolen('iserv');
  iserv.gemerkt = !!link;
  if (!link) return '';
  const l = linkPruefen(link);
  iserv.laeuft = true;
  try {
    if (!l.ok) throw new Error(l.fehler);
    const s = await fetch('/iserv-server', { cache: 'no-store' });
    const server = s.ok ? await s.text() : '';
    if (!s.ok || server.trimStart().startsWith('<')) throw new Error('Der Durchreicher zu IServ fehlt. Ist das neue Image geladen (Compose Up)?');
    const passt = serverPasst(l.host!, server);
    if (passt) throw new Error(passt);
    let r: Response;
    try { r = await fetch(durchreicherPfad(l.pfad!), { credentials: 'omit', cache: 'no-store' }); }
    catch { throw new Error('Keine Verbindung zum Durchreicher.'); }
    const text = await r.text();
    const f = antwortPruefen(r.status, text);
    if (f) throw new Error(f);
    const { von, bis } = fenster();
    const termine = ausIcs(text, von, bis, 'iserv');
    const ziel = app.d;
    if (!ziel) return ''; // inzwischen gesperrt
    const z = quelleAbgleichen(ziel, 'iserv', termine);
    ziel.einstellungen.kalender = { ...(ziel.einstellungen.kalender ?? {}), iservAbgerufen: new Date().toISOString(), iservAnzahl: termine.length };
    speichern();
    iserv.fehler = '';
    iserv.letzterFehler = 0;
    const meldung = abgleichText('IServ', z);
    if (meldung && !vonHand) zeige(meldung);
    return meldung || `IServ: ${termine.length} Termine, nichts Neues`;
  } catch (e) {
    iserv.fehler = String((e as Error)?.message ?? e);
    iserv.letzterFehler = Date.now();
    return '';
  } finally {
    iserv.laeuft = false;
  }
}
