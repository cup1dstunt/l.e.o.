// IServ-Kalender abonnieren (K3, K10, V15): reine Logik, ohne Netz testbar. Ablauf im Browser: iserv.svelte.ts.
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
