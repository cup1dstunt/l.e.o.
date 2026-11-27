// IServ-Kalender im Browser (K3, K10, V17, E120). Liest nur. Kein Dialog: Änderungen als Hinweisleiste,
// Fehler nur auf der Kachel. Automatisch wie WebUntis (beim Entsperren, beim Zurückkehren, alle 30 Minuten).
// Quellen: die festen Kalender des Schulprofils (schule.ts) per CalDAV (mit IServ-Anmeldung) oder per Feed-Link,
// dazu ein weiterer Kalender per Link. Geheimnisse (Passwort, Feed-Links) liegen nur im Tresor des Geräts.
import { app, speichern, zeige, geheimHolen, geheimSetzen } from './speicher.svelte';
import { ausIcs, quelleAbgleichen, abgleichText, type AbgleichZahlen } from './kalender';
import { linkPruefen, durchreicherPfad, serverPasst, antwortPruefen, fenster, reportAnfrage, ausMultistatus, basicAuth, caldavPruefen, alsFerien } from './iserv';
import { schulprofil, caldavPfad, type IservKalender } from './schule';
import { faellig } from './untisauto';
import type { Daten, Termin } from './typen';

export const iserv = $state({ laeuft: false, fehler: '', letzterFehler: 0, gemerkt: false, feeds: {} as Record<string, boolean>, passwort: false });

// Passwort nur für diese Sitzung, wenn die Lehrkraft es nicht merken lassen will
let sitzungsPasswort = '';

export const GEHEIM_PASSWORT = 'iserv-passwort';
export const geheimFeed = (id: string) => `iserv-feed-${id}`;

/** Was ist auf diesem Gerät gemerkt? (für die Anzeige) */
export async function iservGemerkt(): Promise<boolean> {
  iserv.gemerkt = !!(await geheimHolen('iserv'));
  iserv.passwort = !!(await geheimHolen(GEHEIM_PASSWORT)) || !!sitzungsPasswort;
  const p = schulprofil(app.d?.einstellungen.kalender?.schule);
  const feeds: Record<string, boolean> = {};
  for (const k of p.kalender) if (k.feed) feeds[k.id] = !!(await geheimHolen(geheimFeed(k.id)));
  iserv.feeds = feeds;
  return iserv.gemerkt;
}

/**
 * IServ-Anmeldung für CalDAV setzen. `merken`: verschlüsselt im Tresor, sonst nur bis zum Neuladen.
 * Ohne Verschlüsselung (Aufruf über http://IP statt HTTPS) wird das Passwort nie gespeichert. Rückgabe: gemerkt?
 */
export async function anmeldungSetzen(benutzer: string, passwort: string, merken: boolean): Promise<boolean> {
  const d = app.d;
  if (!d) return false;
  if (!app.verschluesselt) merken = false; // nie im Klartext ablegen
  d.einstellungen.kalender = { ...(d.einstellungen.kalender ?? {}), iservBenutzer: benutzer.trim() || undefined };
  speichern();
  if (merken && passwort) { await geheimSetzen(GEHEIM_PASSWORT, passwort); sitzungsPasswort = ''; }
  else { await geheimSetzen(GEHEIM_PASSWORT, null); sitzungsPasswort = passwort; }
  await iservGemerkt();
  return merken;
}
export async function anmeldungEntfernen() {
  sitzungsPasswort = '';
  await geheimSetzen(GEHEIM_PASSWORT, null);
  const d = app.d;
  if (d) { d.einstellungen.kalender = { ...(d.einstellungen.kalender ?? {}), iservBenutzer: undefined }; speichern(); }
  await iservGemerkt();
}

export const kalenderAn = (d: Daten, k: IservKalender) => d.einstellungen.kalender?.iservAn?.[k.id] ?? k.standard;

async function serverHolen(): Promise<string> {
  let s: Response;
  try { s = await fetch('/iserv-server', { cache: 'no-store' }); } catch { throw new Error('Keine Verbindung zum Durchreicher.'); }
  const server = s.ok ? (await s.text()).trim().toLowerCase() : '';
  if (!s.ok || server.startsWith('<')) throw new Error('Der Durchreicher zu IServ fehlt. Ist das neue Image geladen (Compose Up)?');
  return server;
}

async function feedHolen(link: string, server: string): Promise<string> {
  const l = linkPruefen(link);
  if (!l.ok) throw new Error(l.fehler);
  const passt = serverPasst(l.host!, server);
  if (passt) throw new Error(passt);
  let r: Response;
  try { r = await fetch(durchreicherPfad(l.pfad!), { credentials: 'omit', cache: 'no-store' }); }
  catch { throw new Error('Keine Verbindung zum Durchreicher.'); }
  const text = await r.text();
  const f = antwortPruefen(r.status, text);
  if (f) throw new Error(f);
  return text;
}

async function caldavHolen(pfad: string, auth: string, von: string, bis: string): Promise<string> {
  const url = '/iserv-caldav' + pfad.replace(/^\/caldav/, '').replace(/\/?$/, '/');
  let r: Response;
  try {
    r = await fetch(url, { method: 'REPORT', credentials: 'omit', cache: 'no-store', body: reportAnfrage(von, bis),
      headers: { Authorization: auth, Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' } });
  } catch { throw new Error('Keine Verbindung zum Durchreicher.'); }
  const text = await r.text();
  if (r.status === 404 && !text.trim()) throw new Error('Der CalDAV-Durchreicher fehlt oder ISERV_SERVER ist leer. Neues Image laden (Compose Up).');
  if (text.trimStart().startsWith('<!') && r.status === 200) throw new Error('Der CalDAV-Durchreicher fehlt. Ist das neue Image geladen (Compose Up)?');
  const f = caldavPruefen(r.status, text);
  if (f === 'export') {
    // Rückfall: ganzer Kalender als ICS (viele CalDAV-Server können das)
    const e = await fetch(url + '?export', { credentials: 'omit', cache: 'no-store', headers: { Authorization: auth } });
    const t = await e.text();
    const g = antwortPruefen(e.status, t);
    if (g) throw new Error(g);
    return t;
  }
  if (f) throw new Error(f);
  return ausMultistatus(text);
}

/** Abgleich aller eingerichteten IServ-Kalender. `vonHand`: auch wenn er laut Zeitplan noch nicht dran ist. */
export async function iservAbgleichen(vonHand = false): Promise<string> {
  const d = app.d;
  // Auch bei ausgeschaltetem Modul Kalender: Ausschalten blendet nur aus (MODULE.md), die Planung rechnet weiter mit den Terminen
  if (!d || iserv.laeuft) return '';
  const ka = d.einstellungen.kalender ?? {};
  if (!vonHand && !faellig({
    an: ka.iservAuto !== false, zugangGemerkt: true, erstUebernahme: true,
    online: typeof navigator === 'undefined' || navigator.onLine !== false,
    laeuft: iserv.laeuft, abgerufen: ka.iservAbgerufen, letzterFehler: iserv.letzterFehler
  })) return '';

  const profil = schulprofil(ka.schule);
  const benutzer = ka.iservBenutzer ?? '';
  const passwort = (await geheimHolen(GEHEIM_PASSWORT)) || sitzungsPasswort;
  const link = await geheimHolen('iserv');
  iserv.gemerkt = !!link;
  iserv.passwort = !!passwort;

  // Was ist eingerichtet? CalDAV geht vor, sonst der Feed-Link
  type Aufgabe = { k?: IservKalender; weg: 'caldav' | 'feed'; pfad?: string; feed?: string };
  const aufgaben: Aufgabe[] = [];
  const aus: IservKalender[] = [];
  for (const k of profil.kalender) {
    if (!kalenderAn(d, k)) { aus.push(k); continue; }
    const pfad = caldavPfad(k, benutzer);
    const feed = k.feed ? await geheimHolen(geheimFeed(k.id)) : '';
    if (pfad && passwort) aufgaben.push({ k, weg: 'caldav', pfad });
    else if (feed) aufgaben.push({ k, weg: 'feed', feed });
  }
  if (link) aufgaben.push({ weg: 'feed', feed: link });
  if (!aufgaben.length && !aus.length) return '';

  iserv.laeuft = true;
  const stand = { ...(ka.iservStand ?? {}) };
  const zahlen: AbgleichZahlen = { neu: 0, geaendert: 0, entfallen: 0, gesamt: 0 };
  const fehler: string[] = [];
  let ferien: ReturnType<typeof alsFerien> | undefined;
  try {
    // Ausgeschaltete Kalender: ihre Termine verschwinden (kommen beim Einschalten wieder)
    for (const k of aus) {
      if (k.rolle === 'ferien') { if (d.einstellungen.kalender?.iservFerien) ferien = []; }
      else d.termine = (d.termine ?? []).filter((t) => !(t.quelle === 'iserv' && t.kalender === k.id));
      delete stand[k.id];
    }
    if (aufgaben.length) {
      const server = await serverHolen();
      if (!server) throw new Error(`Im L.E.O.-Container ist noch kein IServ eingetragen. In der Compose-Datei ISERV_SERVER=${profil.iserv} ergänzen und neu starten.`);
      const { von, bis } = fenster();
      const auth = passwort ? basicAuth(benutzer, passwort) : '';
      for (const a of aufgaben) {
        const id = a.k?.id ?? '';
        try {
          const text = a.weg === 'caldav' ? await caldavHolen(a.pfad!, auth, von, bis) : await feedHolen(a.feed!, server);
          let termine: Termin[] = ausIcs(text, von, bis, 'iserv');
          const ziel = app.d;
          if (!ziel) return ''; // inzwischen gesperrt
          if (a.k?.rolle === 'ferien') {
            ferien = alsFerien(termine);
          } else {
            if (a.k?.rolle === 'aufgaben') termine = termine.map((t) => ({ ...t, art: 'abgabe' }));
            if (id) termine = termine.map((t) => ({ ...t, id: `${id}-${t.id}` }));
            const z = quelleAbgleichen(ziel, 'iserv', termine, id || undefined);
            zahlen.neu += z.neu; zahlen.geaendert += z.geaendert; zahlen.entfallen += z.entfallen;
          }
          zahlen.gesamt += termine.length;
          stand[id || 'link'] = { abgerufen: new Date().toISOString(), anzahl: termine.length };
        } catch (e) {
          const t = String((e as Error)?.message ?? e);
          stand[id || 'link'] = { ...(stand[id || 'link'] ?? {}), fehler: t };
          fehler.push(`${a.k?.name ?? 'Weiterer Kalender'}: ${t}`);
        }
      }
    }
    const ziel = app.d;
    if (!ziel) return '';
    ziel.einstellungen.kalender = {
      ...(ziel.einstellungen.kalender ?? {}), iservStand: stand,
      ...(fehler.length < aufgaben.length || !aufgaben.length ? { iservAbgerufen: new Date().toISOString(), iservAnzahl: zahlen.gesamt } : {}),
      ...(ferien ? { iservFerien: ferien.length ? ferien : undefined } : {})
    };
    speichern();
    iserv.fehler = fehler.join(' · ');
    iserv.letzterFehler = fehler.length ? Date.now() : 0;
    const meldung = abgleichText('IServ', zahlen);
    if (meldung && !vonHand) zeige(meldung);
    if (meldung) return meldung;
    return aufgaben.length && fehler.length === aufgaben.length ? '' : `IServ: ${zahlen.gesamt} Termine, nichts Neues`;
  } catch (e) {
    iserv.fehler = String((e as Error)?.message ?? e);
    iserv.letzterFehler = Date.now();
    return '';
  } finally {
    iserv.laeuft = false;
  }
}
