// Kalender (K2, PB14, E115): eigene Termine plus alles, was L.E.O. ohnehin kennt (Klausuren und Tests mit Datum,
// Nachschreibetermine, Ferien, Ausfälle). Export als ICS-Datei, Import aus einer Kalenderdatei (z. B. IServ).
// Abgleich (K3, K10, V17): IServ-Abo und WebUntis-Prüfungen landen als Termine mit `quelle`; die Quelle gewinnt bei
// Titel und Zeit, was die Lehrkraft selbst festlegt (Art, Klassen, unterrichtsfrei, ausgeblendet), bleibt.
// Schülernamen kommen nie in den Export (CLAUDE.md, Datenschutz).
import type { Daten, Termin, TerminArt } from './typen.ts';
import { isoDatum } from './hilfen.ts';
import { freieZeiten } from './semester.ts';

export const ARTEN_TERMIN: { art: TerminArt; name: string }[] = [
  { art: 'konferenz', name: 'Konferenz' },
  { art: 'aufsicht', name: 'Aufsicht' },
  { art: 'sprechtag', name: 'Sprechtag' },
  { art: 'abgabe', name: 'Abgabe' },
  { art: 'ausflug', name: 'Exkursion' },
  { art: 'ausfall', name: 'Ausfall' },
  { art: 'frei', name: 'Unterrichtsfrei' },
  { art: 'sonstiges', name: 'Sonstiges' }
];
export const artName = (a: string) => (a === 'pruefung' ? 'Prüfung' : ARTEN_TERMIN.find((x) => x.art === a)?.name ?? a);

/** Woher ein Eintrag kommt, für die kleine Angabe rechts in der Tagesliste. */
export const QUELLEN = { ics: 'aus Datei', iserv: 'IServ', untis: 'WebUntis' } as const;

export type EintragArt = TerminArt | 'klausur' | 'test' | 'nachschreiben' | 'ferien';
export interface Eintrag {
  id: string;
  datum: string;
  bis?: string;
  beginn?: string;
  ende?: string;
  titel: string;
  art: EintragArt;
  klasse?: string; // Klassenname zur Anzeige
  href?: string;
  termin?: Termin; // eigene und abgeglichene Termine (abgeglichene nur Art, Klassen, unterrichtsfrei)
  frei?: boolean; // unterrichtsfrei
  quelle?: 'ics' | 'iserv' | 'untis';
  auchUntis?: boolean; // Klausur steht auch in WebUntis (gleicher Tag, gleiche Klasse)
  klausurOhneDatum?: { kursId: string; leistungId: string; name: string }; // WebUntis-Prüfung: Datum ins Notenbuch übernehmbar
}

/**
 * Klassen eines Termins zur Anzeige. Prüfungen anderer Lehrkräfte (WebUntis, `fremd`) nur mit Klassenname,
 * denn das eigene Fach wäre dort irreführend: „Prüfung IT-Systeme (andere Lehrkraft) · KA25-i“.
 */
export function terminKlassen(d: Pick<Daten, 'kurse'>, kursIds: string[] | undefined, fremd?: boolean): string | undefined {
  const ks = (kursIds ?? []).map((id) => d.kurse.find((k) => k.id === id)).filter((k): k is NonNullable<typeof k> => !!k);
  const namen = [...new Set(ks.map((k) => (fremd ? k.klasse : `${k.klasse} ${k.fach}`)))];
  return namen.join(', ') || undefined;
}

const ueberlappt = (e: { datum: string; bis?: string }, von: string, bis: string) => e.datum <= bis && (e.bis || e.datum) >= von;

/** Alle Einträge im Zeitraum, nach Datum und Uhrzeit sortiert. */
export function eintraege(d: Daten, von: string, bis: string): Eintrag[] {
  const out: Eintrag[] = [];
  const kursName = (id: string) => { const k = d.kurse.find((x) => x.id === id); return k ? `${k.klasse} ${k.fach}` : ''; };
  const ka = d.einstellungen.kalender ?? {};
  // Klausuren aus dem Notenbuch je Tag und Klasse, um WebUntis-Prüfungen nicht doppelt zu zeigen
  const klausurTag = new Set<string>();
  for (const k of d.kurse) for (const l of k.leistungen) if (l.datum && l.art === 'Klausur') klausurTag.add(`${k.id}|${l.datum}`);
  const untisGesehen = new Set<string>();

  for (const t of d.termine ?? []) {
    if (t.ausgeblendet || !ueberlappt(t, von, bis)) continue;
    if (t.quelle === 'untis') {
      if (ka.untisPruefungen === false || (t.fremd && ka.fremdePruefungen === false)) continue;
      if (!t.fremd && t.kursIds?.some((id) => klausurTag.has(`${id}|${t.datum}`))) { t.kursIds.forEach((id) => untisGesehen.add(`${id}|${t.datum}`)); continue; }
    }
    const e: Eintrag = { id: t.id, datum: t.datum, bis: t.bis, beginn: t.beginn, ende: t.ende, titel: t.titel, art: t.art, termin: t, frei: t.unterrichtFrei, quelle: t.quelle,
      klasse: terminKlassen(d, t.kursIds, t.fremd) };
    if (t.quelle === 'untis' && !t.fremd && t.kursIds?.length === 1) {
      const k = d.kurse.find((x) => x.id === t.kursIds![0]);
      const l = k?.leistungen.find((x) => x.art === 'Klausur' && !x.datum);
      if (k && l) e.klausurOhneDatum = { kursId: k.id, leistungId: l.id, name: l.name };
    }
    out.push(e);
  }
  for (const k of d.kurse) for (const l of k.leistungen) {
    if (!l.datum || l.gruppe === 'mitarbeit' || l.datum < von || l.datum > bis) continue;
    out.push({ id: l.id, datum: l.datum, titel: l.name, art: l.art === 'Klausur' ? 'klausur' : 'test', klasse: `${k.klasse} ${k.fach}`, href: `/kurs/${k.id}`,
      auchUntis: l.art === 'Klausur' && untisGesehen.has(`${k.id}|${l.datum}`) });
  }
  for (const n of d.nachschreiben ?? []) {
    if (n.datum < von || n.datum > bis) continue;
    out.push({ id: n.id, datum: n.datum, beginn: n.beginn, titel: `Nachschreiben (${n.faelle.length})`, art: 'nachschreiben', klasse: n.raum ? `Raum ${n.raum}` : undefined, href: '/nachschreiben' });
  }
  const fz = freieZeiten(d);
  for (const f of fz.liste) {
    if (!ueberlappt({ datum: f.von, bis: f.bis }, von, bis)) continue;
    out.push({ id: `f${f.von}`, datum: f.von, bis: f.bis !== f.von ? f.bis : undefined, titel: f.name, art: 'ferien', frei: true, quelle: fz.quelle === 'beispiel' ? undefined : fz.quelle });
  }
  // Ausfälle laut WebUntis: je Klasse und Tag ein Eintrag (Schlüssel `${kursId}|${datum}|${beginn}`)
  const ausfall = new Map<string, { kursId: string; datum: string; beginn: string }>();
  for (const a of d.einstellungen.untis?.ausfaelle ?? []) {
    const [kursId, datum, beginn] = a.split('|');
    if (!datum || datum < von || datum > bis || !d.kurse.some((k) => k.id === kursId)) continue;
    const key = `${kursId}|${datum}`;
    const alt = ausfall.get(key);
    if (!alt || beginn < alt.beginn) ausfall.set(key, { kursId, datum, beginn });
  }
  for (const a of ausfall.values()) {
    out.push({ id: `ua${a.kursId}-${a.datum}`, datum: a.datum, beginn: a.beginn, titel: 'Fällt aus', art: 'ausfall', klasse: kursName(a.kursId), frei: true, quelle: 'untis', href: `/planung/${a.kursId}` });
  }
  return out.sort((a, b) => (a.datum + (a.beginn ?? '')).localeCompare(b.datum + (b.beginn ?? '')));
}

/** Einträge, die an einem Tag gelten (mehrtägige an jedem Tag). */
export const amTag = (liste: Eintrag[], datum: string) => liste.filter((e) => e.datum <= datum && (e.bis || e.datum) >= datum);

// ---------- ICS ----------

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const kompakt = (iso: string) => iso.replace(/-/g, '');
const tagDanach = (iso: string) => { const t = new Date(iso + 'T12:00'); t.setDate(t.getDate() + 1); return isoDatum(t); };
/** Zeilen über 75 Zeichen falten (RFC 5545). */
const falten = (z: string) => { const out: string[] = []; for (let i = 0; i < z.length; i += 73) out.push((i ? ' ' : '') + z.slice(i, i + 73)); return out.join('\r\n'); };

/** ICS-Datei aus eigenen Terminen, Klausuren/Tests und Nachschreiben. Zeiten als Ortszeit (Europe/Berlin). */
export function alsIcs(d: Daten, von: string, bis: string, jetzt = new Date()): string {
  const stempel = jetzt.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const z: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//L.E.O.//Kalender//DE', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:L.E.O.'];
  for (const e of eintraege(d, von, bis)) {
    // Ferien hat jeder schon; Abgeglichenes (Datei, IServ, WebUntis) nicht zurückspielen, sonst entstehen Dubletten
    if (e.art === 'ferien' || e.quelle) continue;
    z.push('BEGIN:VEVENT', `UID:${e.id}@leo`, `DTSTAMP:${stempel}`);
    if (e.beginn) {
      z.push(`DTSTART;TZID=Europe/Berlin:${kompakt(e.datum)}T${e.beginn.replace(':', '')}00`);
      z.push(`DTEND;TZID=Europe/Berlin:${kompakt(e.datum)}T${(e.ende || e.beginn).replace(':', '')}00`);
    } else {
      z.push(`DTSTART;VALUE=DATE:${kompakt(e.datum)}`, `DTEND;VALUE=DATE:${kompakt(tagDanach(e.bis || e.datum))}`);
    }
    z.push(falten(`SUMMARY:${esc(e.klasse ? `${e.titel} · ${e.klasse}` : e.titel)}`));
    if (e.termin?.notiz) z.push(falten(`DESCRIPTION:${esc(e.termin.notiz)}`));
    z.push('END:VEVENT');
  }
  z.push('END:VCALENDAR');
  return z.join('\r\n') + '\r\n';
}

const unesc = (s: string) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
/** ICS-Zeit in Ortszeit: 20261126, 20261126T143000, 20261126T133000Z. */
function zeitAus(wert: string): { datum: string; zeit?: string } {
  const m = wert.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{0,2}(Z)?)?$/);
  if (!m) return { datum: '' };
  if (!m[4]) return { datum: `${m[1]}-${m[2]}-${m[3]}` };
  if (m[6]) {
    // UTC-Zeit in Berliner Ortszeit, unabhängig von der Zeitzone des Geräts
    const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
    const f = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t);
    return { datum: f.slice(0, 10), zeit: f.slice(11, 16) };
  }
  return { datum: `${m[1]}-${m[2]}-${m[3]}`, zeit: `${m[4]}:${m[5]}` };
}

const plusTage = (iso: string, n: number) => { const t = new Date(iso + 'T12:00'); t.setDate(t.getDate() + n); return isoDatum(t); };
const tageZwischen = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00') - Date.parse(a + 'T12:00')) / 864e5);
const WT: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
export const MAX_WIEDERHOLUNGEN = 400; // je Serie, schützt vor endlosen Regeln

/**
 * Tage einer Wiederholungsregel (RRULE, RFC 5545) im Fenster. Unterstützt FREQ=DAILY/WEEKLY/MONTHLY/YEARLY,
 * INTERVAL, COUNT, UNTIL und bei WEEKLY BYDAY (z. B. MO,WE). Monatlich und jährlich: derselbe Tag im Monat bzw. Jahr.
 * Seltene Formen (BYSETPOS, „2. Dienstag im Monat“) werden nicht aufgelöst: dann nur der erste Termin.
 */
export function wiederholungen(start: string, regel: string, von: string, bis: string): string[] {
  const r: Record<string, string> = {};
  for (const teil of regel.split(';')) { const [k, v] = teil.split('='); if (k && v) r[k.toUpperCase()] = v; }
  const freq = r.FREQ;
  const intervall = Math.max(1, Number(r.INTERVAL) || 1);
  const anzahl = r.COUNT ? Number(r.COUNT) : Infinity;
  const until = r.UNTIL ? zeitAus(r.UNTIL).datum : '';
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq) || r.BYSETPOS || (freq !== 'WEEKLY' && r.BYDAY)) return [start];
  const out: string[] = [];
  let n = 0; // Termine der Serie (für COUNT)
  let schritte = 0; // Schutz gegen endlose Schleifen
  const nimm = (tag: string) => {
    if (++schritte > 20_000 || out.length >= MAX_WIEDERHOLUNGEN) return false;
    if (tag < start) return true;
    if ((until && tag > until) || n >= anzahl || tag > bis) return false;
    n++;
    if (tag >= von) out.push(tag);
    return true;
  };
  const s = new Date(start + 'T12:00');
  if (freq === 'DAILY') {
    for (let i = 0; ; i += intervall) if (!nimm(plusTage(start, i))) break;
  } else if (freq === 'WEEKLY') {
    const tage = (r.BYDAY ? r.BYDAY.split(',').map((x) => WT[x.slice(-2)]).filter((x) => x !== undefined) : [s.getDay()]).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const montag = plusTage(start, -((s.getDay() + 6) % 7));
    aussen: for (let w = 0; ; w += intervall) {
      for (const t of tage) if (!nimm(plusTage(montag, w * 7 + ((t + 6) % 7)))) break aussen;
    }
  } else {
    const tag = s.getDate();
    for (let i = 0; ; i += intervall) {
      const m = freq === 'MONTHLY' ? new Date(s.getFullYear(), s.getMonth() + i, 1, 12) : new Date(s.getFullYear() + i, s.getMonth(), 1, 12);
      const letzter = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      if (tag > letzter) { if (isoDatum(m) > bis || ++schritte > 20_000) break; continue; } // 31. gibt es nicht in jedem Monat: Monat auslassen (RFC 5545)
      m.setDate(tag);
      if (!nimm(isoDatum(m))) break;
    }
  }
  return out;
}

/**
 * Liest VEVENTs aus einer Kalenderdatei. Wiederholungen (RRULE) werden im Fenster `von`–`bis` aufgelöst,
 * ausgenommene Tage (EXDATE) und einzeln verschobene Termine (RECURRENCE-ID) berücksichtigt.
 */
export function ausIcs(text: string, von = '0000-01-01', bis = '9999-12-31', quelle: 'ics' | 'iserv' = 'ics'): Termin[] {
  const zeilen = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const roh: { e: Record<string, string>; ex: string[] }[] = [];
  let e: Record<string, string> | null = null;
  let ex: string[] = [];
  let tiefe = 0; // VALARM u. ä. innerhalb eines VEVENT überspringen
  for (const z of zeilen) {
    if (z === 'BEGIN:VEVENT') { e = {}; ex = []; tiefe = 0; continue; }
    if (e && z.startsWith('BEGIN:')) { tiefe++; continue; }
    if (e && tiefe && z.startsWith('END:')) { tiefe--; continue; }
    if (z === 'END:VEVENT' && e) { roh.push({ e, ex }); e = null; continue; }
    if (!e || tiefe) continue;
    const i = z.indexOf(':');
    if (i < 0) continue;
    const name = z.slice(0, i).split(';')[0].toUpperCase();
    if (name === 'EXDATE') { for (const w of z.slice(i + 1).split(',')) { const t = zeitAus(w.trim()).datum; if (t) ex.push(t); } continue; }
    if (!(name in e)) e[name] = z.slice(i + 1);
  }

  // Einzeln geänderte Termine einer Serie ersetzen den regulären Termin an ihrem ursprünglichen Tag
  const ersetzt = new Set<string>();
  for (const { e } of roh) if (e['RECURRENCE-ID'] && e.UID) ersetzt.add(`${e.UID}|${zeitAus(e['RECURRENCE-ID']).datum}`);

  const out: Termin[] = [];
  for (const { e, ex } of roh) {
    if ((e.STATUS ?? '').toUpperCase() === 'CANCELLED') continue;
    const s = zeitAus(e.DTSTART ?? '');
    if (!s.datum) continue;
    const en = e.DTEND ? zeitAus(e.DTEND) : undefined;
    let ende = en?.datum;
    if (en && !en.zeit && !s.zeit && ende) ende = plusTage(ende, -1); // Ende ganztägig = exklusiv
    const dauer = ende && ende > s.datum ? tageZwischen(s.datum, ende) : 0;
    const uid = e.UID || `${s.datum}-${e.SUMMARY ?? ''}`;
    const basisId = `${quelle}-` + uid.replace(/[^\w.-]/g, '').slice(0, 80);
    const tage = e.RRULE && !e['RECURRENCE-ID'] ? wiederholungen(s.datum, e.RRULE, plusTage(von, -dauer), bis).filter((t) => !ex.includes(t) && !ersetzt.has(`${uid}|${t}`)) : [s.datum];
    const serie = tage.length > 1 || !!e.RRULE || !!e['RECURRENCE-ID'];
    for (const tag of tage) {
      const bisTag = dauer ? plusTage(tag, dauer) : undefined;
      if ((bisTag ?? tag) < von || tag > bis) continue;
      out.push({
        id: serie ? `${basisId}-${tag}` : basisId, uid: serie ? `${uid}|${tag}` : uid, quelle, art: 'sonstiges',
        titel: unesc(e.SUMMARY ?? '(ohne Titel)').slice(0, 200), datum: tag, bis: bisTag,
        beginn: s.zeit, ende: en?.zeit, ort: e.LOCATION ? unesc(e.LOCATION).slice(0, 120) : undefined,
        notiz: e.DESCRIPTION ? unesc(e.DESCRIPTION).slice(0, 500) : undefined
      });
    }
  }
  return out;
}

/** Was die Lehrkraft an einem abgeglichenen Termin selbst festgelegt hat und was der nächste Abgleich nicht anfasst. */
const EIGENES = ['art', 'kursIds', 'unterrichtFrei', 'ausgeblendet', 'angepasst'] as const;

export interface AbgleichZahlen { neu: number; geaendert: number; entfallen: number; gesamt: number }

/**
 * Termine einer Quelle (IServ-Abo oder WebUntis) abgleichen: Was die Quelle nicht mehr liefert, verschwindet;
 * Titel, Zeit und Notiz kommen aus der Quelle; Art, Klassen, „unterrichtsfrei“ und „ausgeblendet“ bleiben,
 * wenn die Lehrkraft sie angepasst hat. Eigene Termine und andere Quellen bleiben unberührt.
 */
export function quelleAbgleichen(d: Daten, quelle: 'iserv' | 'untis', neu: Termin[], kalender?: string): AbgleichZahlen {
  // Bei IServ getrennt je Kalender: ein Kalender, der gerade nicht erreichbar ist, löscht die anderen nicht
  const gehoert = (t: Termin) => t.quelle === quelle && (t.kalender ?? '') === (kalender ?? '');
  const alt = new Map((d.termine ?? []).filter(gehoert).map((t) => [t.uid ?? t.id, t]));
  const z: AbgleichZahlen = { neu: 0, geaendert: 0, entfallen: 0, gesamt: neu.length };
  const ergebnis: Termin[] = [];
  for (const n of neu) {
    const a = alt.get(n.uid ?? n.id);
    const t: Termin = { ...n, quelle };
    if (kalender) t.kalender = kalender;
    if (a?.angepasst) for (const k of EIGENES) { if (a[k] !== undefined) (t as any)[k] = a[k]; else delete (t as any)[k]; }
    if (!a) z.neu++;
    else if (a.titel !== t.titel || a.datum !== t.datum || a.bis !== t.bis || a.beginn !== t.beginn || a.ende !== t.ende) z.geaendert++;
    alt.delete(n.uid ?? n.id);
    ergebnis.push(t);
  }
  z.entfallen = alt.size;
  d.termine = [...(d.termine ?? []).filter((t) => !gehoert(t)), ...ergebnis];
  return z;
}

/** Kurzer Text für die Hinweisleiste, leer wenn sich nichts geändert hat. */
export function abgleichText(name: string, z: AbgleichZahlen): string {
  const teile: string[] = [];
  if (z.neu) teile.push(z.neu === 1 ? '1 neuer Termin' : `${z.neu} neue Termine`);
  if (z.geaendert) teile.push(z.geaendert === 1 ? '1 Termin geändert' : `${z.geaendert} Termine geändert`);
  if (z.entfallen) teile.push(z.entfallen === 1 ? '1 Termin entfallen' : `${z.entfallen} Termine entfallen`);
  return teile.length ? `${name}: ${teile.join(', ')}` : '';
}

/** Importierte Termine übernehmen: gleiche UID wird ersetzt, eigene Termine bleiben unberührt. */
export function icsUebernehmen(d: Daten, neu: Termin[]) {
  const uids = new Set(neu.map((t) => t.uid));
  d.termine = [...(d.termine ?? []).filter((t) => !(t.quelle === 'ics' && uids.has(t.uid))), ...neu];
  return neu.length;
}
