// IServ-Kalender abonnieren (K3, K10, V17): reine Logik, ohne Netz testbar. Ablauf im Browser: iserv.svelte.ts.
// Weg: Abo- bzw. Export-Link aus IServ (ICS, enthält einen geheimen Schlüssel, kein Passwort). Der Browser darf IServ
// nicht direkt abfragen (CORS), deshalb reicht nginx im L.E.O.-Container `/iserv/…` an genau einen Server durch
// (ISERV_SERVER), wie bei WebUntis. Der Link liegt verschlüsselt im Tresor dieses Geräts, nie in den Daten oder im Abgleich.
// Ehrlich: Ob und wo IServ an dieser Schule einen solchen Link anbietet, ist ungeprüft (MODUL_KALENDER_ABGLEICH.md).
import { isoDatum } from './hilfen.ts';

export interface LinkPruefung { ok: boolean; host?: string; pfad?: string; fehler?: string }

/** Prüft einen eingefügten Kalender-Link. webcal:// wird wie https:// behandelt. */
export function linkPruefen(roh: string): LinkPruefung {
  const text = roh.trim().replace(/^webcals?:\/\//i, 'https://');
  if (!text) return { ok: false, fehler: 'Bitte den Kalender-Link aus IServ einfügen.' };
  let u: URL;
  try { u = new URL(text); } catch { return { ok: false, fehler: 'Das ist kein Link. Er beginnt mit https:// oder webcal://.' }; }
  if (u.protocol !== 'https:') return { ok: false, fehler: 'Nur verschlüsselte Links (https) gehen.' };
  if (u.username || u.password) return { ok: false, fehler: 'Bitte keinen Link mit Benutzername oder Passwort darin.' };
  if (u.pathname === '/' && !u.search) return { ok: false, fehler: 'Das ist nur die IServ-Adresse. Gebraucht wird der Link zum Abonnieren bzw. Exportieren eines Kalenders.' };
  return { ok: true, host: u.hostname.toLowerCase(), pfad: u.pathname + u.search };
}

/** Pfad über den Durchreicher im Container. */
export const durchreicherPfad = (pfad: string) => '/iserv' + (pfad.startsWith('/') ? pfad : '/' + pfad);

/** Passt der Link zum Server, an den der Container durchreicht? Liefert sonst einen verständlichen Hinweis. */
export function serverPasst(linkHost: string, server: string): string {
  const s = server.trim().toLowerCase();
  if (!s) return 'Im L.E.O.-Container ist noch kein IServ eingetragen. In der Compose-Datei ISERV_SERVER=' + linkHost + ' ergänzen und neu starten.';
  if (s !== linkHost) return `Der Container reicht nur an ${s} durch, der Link zeigt auf ${linkHost}. ISERV_SERVER in der Compose-Datei anpassen.`;
  return '';
}

/** Antwort prüfen: Kalender oder z. B. die Anmeldeseite? */
export function antwortPruefen(status: number, text: string): string {
  if (status === 404) return 'IServ kennt den Link nicht (404). Ist er noch gültig?';
  if (status === 401 || status === 403) return 'IServ verlangt eine Anmeldung. Bitte den Abo-/Export-Link nehmen, nicht die Adresse der Kalenderseite.';
  if (status >= 500) return `Der Container erreicht IServ nicht (${status}).`;
  if (status !== 200) return `Unerwartete Antwort von IServ (${status}).`;
  if (!/BEGIN:VCALENDAR/.test(text.slice(0, 2000))) return 'Die Antwort ist kein Kalender (vermutlich die IServ-Anmeldeseite). Bitte den Abo-/Export-Link aus IServ nehmen.';
  return '';
}

/** Zeitfenster für den Abgleich: zwei Monate zurück bis 15 Monate voraus (Semesterplanung braucht das Schuljahr). */
export function fenster(heute = new Date()): { von: string; bis: string } {
  return {
    von: isoDatum(new Date(heute.getFullYear(), heute.getMonth() - 2, 1)),
    bis: isoDatum(new Date(heute.getFullYear(), heute.getMonth() + 15, 0))
  };
}

// ---------- CalDAV (E120): Kalender, für die IServ keinen Link ohne Anmeldung anbietet (z. B. OSZ-Info) ----------

const utcStempel = (iso: string) => iso.replace(/-/g, '') + 'T000000Z';

/** REPORT calendar-query: alle Termine im Zeitraum, Wiederholungen löst L.E.O. selbst auf. */
export function reportAnfrage(von: string, bis: string): string {
  return '<?xml version="1.0" encoding="utf-8"?>\n'
    + '<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">'
    + '<d:prop><c:calendar-data/></d:prop>'
    + '<c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT">'
    + `<c:time-range start="${utcStempel(von)}" end="${utcStempel(bis)}"/>`
    + '</c:comp-filter></c:comp-filter></c:filter></c:calendar-query>';
}

const xmlText = (s: string) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#13;|&#x0?[dD];/g, '\r').replace(/&#10;|&#x0?[aA];/g, '\n')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** Kalenderdaten aus einer CalDAV-Antwort (multistatus) als ein ICS-Text; jedes Präfix für den Namensraum. */
export function ausMultistatus(xml: string): string {
  const teile: string[] = [];
  const re = /<([\w-]+:)?calendar-data\b[^>]*>([\s\S]*?)<\/([\w-]+:)?calendar-data>/g;
  for (let m = re.exec(xml); m; m = re.exec(xml)) teile.push(xmlText(m[2]).trim());
  return teile.join('\r\n');
}

/** Anmeldung für CalDAV (HTTP Basic, UTF-8). Geht nur über den eigenen Container an IServ. */
export function basicAuth(benutzer: string, passwort: string): string {
  const roh = new TextEncoder().encode(`${benutzer.trim()}:${passwort}`);
  let s = '';
  for (const b of roh) s += String.fromCharCode(b);
  return 'Basic ' + btoa(s);
}

/** CalDAV-Antwort verständlich machen. Leer = in Ordnung. 'export' = Server kann REPORT nicht, Rückfall GET ?export. */
export function caldavPruefen(status: number, text: string): string {
  if (status === 401) return 'IServ lehnt die Anmeldung ab. Benutzername oder Passwort prüfen (ist die Zwei-Faktor-Anmeldung aktiv, geht CalDAV evtl. nur mit einem App-Passwort).';
  if (status === 403) return 'Kein Zugriff auf diesen Kalender mit deinem IServ-Konto.';
  if (status === 404) return 'IServ kennt diesen Kalender nicht (404).';
  if (status === 405 || status === 501) return 'export';
  if (status >= 500) return `Der Container erreicht IServ nicht (${status}).`;
  if (status !== 207 && status !== 200) return `Unerwartete Antwort von IServ (${status}).`;
  if (status === 207 && !/multistatus/i.test(text.slice(0, 4000))) return 'Die Antwort von IServ ist kein Kalender.';
  return '';
}

/** Ferien-Plugin: ganztägige Termine werden zu Ferien und Feiertagen (ohne Uhrzeit, Name aus dem Titel). */
export function alsFerien(t: { titel: string; datum: string; bis?: string; beginn?: string }[]): { name: string; von: string; bis: string }[] {
  const out = t.filter((x) => !x.beginn).map((x) => ({ name: x.titel.trim() || 'frei', von: x.datum, bis: x.bis || x.datum }));
  const gesehen = new Set<string>();
  return out.filter((f) => { const k = `${f.von}|${f.bis}|${f.name}`; if (gesehen.has(k)) return false; gesehen.add(k); return true; })
    .sort((a, b) => a.von.localeCompare(b.von));
}
