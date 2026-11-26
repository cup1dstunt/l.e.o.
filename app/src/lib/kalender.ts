// Kalender (K2, PB14, E115): eigene Termine plus alles, was L.E.O. ohnehin kennt (Klausuren und Tests mit Datum,
// Nachschreibetermine, Ferien, Ausfälle). Export als ICS-Datei, Import aus einer Kalenderdatei (z. B. IServ).
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
export const artName = (a: string) => ARTEN_TERMIN.find((x) => x.art === a)?.name ?? a;

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
  termin?: Termin; // nur eigene Termine sind bearbeitbar
  frei?: boolean; // unterrichtsfrei
}

const ueberlappt = (e: { datum: string; bis?: string }, von: string, bis: string) => e.datum <= bis && (e.bis || e.datum) >= von;

/** Alle Einträge im Zeitraum, nach Datum und Uhrzeit sortiert. */
export function eintraege(d: Daten, von: string, bis: string): Eintrag[] {
  const out: Eintrag[] = [];
  const kursName = (id: string) => { const k = d.kurse.find((x) => x.id === id); return k ? `${k.klasse} ${k.fach}` : ''; };
  for (const t of d.termine ?? []) {
    if (!ueberlappt(t, von, bis)) continue;
    out.push({ id: t.id, datum: t.datum, bis: t.bis, beginn: t.beginn, ende: t.ende, titel: t.titel, art: t.art, termin: t, frei: t.unterrichtFrei,
      klasse: t.kursIds?.map(kursName).filter(Boolean).join(', ') || undefined });
  }
  for (const k of d.kurse) for (const l of k.leistungen) {
    if (!l.datum || l.gruppe === 'mitarbeit' || l.datum < von || l.datum > bis) continue;
    out.push({ id: l.id, datum: l.datum, titel: l.name, art: l.art === 'Klausur' ? 'klausur' : 'test', klasse: `${k.klasse} ${k.fach}`, href: `/kurs/${k.id}` });
  }
  for (const n of d.nachschreiben ?? []) {
    if (n.datum < von || n.datum > bis) continue;
    out.push({ id: n.id, datum: n.datum, beginn: n.beginn, titel: `Nachschreiben (${n.faelle.length})`, art: 'nachschreiben', klasse: n.raum ? `Raum ${n.raum}` : undefined, href: '/nachschreiben' });
  }
  for (const f of freieZeiten(d).liste) {
    if (!ueberlappt({ datum: f.von, bis: f.bis }, von, bis)) continue;
    out.push({ id: `f${f.von}`, datum: f.von, bis: f.bis !== f.von ? f.bis : undefined, titel: f.name, art: 'ferien', frei: true });
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
    if (e.art === 'ferien' || e.termin?.quelle === 'ics') continue; // Ferien hat jeder schon, Importiertes nicht zurückspielen
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

/** Liest VEVENTs aus einer Kalenderdatei. Wiederholungen (RRULE) werden nicht aufgelöst, nur der erste Termin. */
export function ausIcs(text: string): Termin[] {
  const zeilen = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const out: Termin[] = [];
  let e: Record<string, string> | null = null;
  for (const z of zeilen) {
    if (z === 'BEGIN:VEVENT') { e = {}; continue; }
    if (z === 'END:VEVENT' && e) {
      const s = zeitAus(e.DTSTART ?? '');
      if (s.datum) {
        const en = e.DTEND ? zeitAus(e.DTEND) : undefined;
        let bis = en?.datum;
        if (en && !en.zeit && !s.zeit && bis) { const t = new Date(bis + 'T12:00'); t.setDate(t.getDate() - 1); bis = isoDatum(t); } // Ende ganztägig = exklusiv
        const uid = e.UID || `${s.datum}-${e.SUMMARY ?? ''}`;
        out.push({
          id: 'ics-' + uid.replace(/[^\w.-]/g, '').slice(0, 80), uid, quelle: 'ics', art: 'sonstiges',
          titel: unesc(e.SUMMARY ?? '(ohne Titel)'), datum: s.datum, bis: bis && bis > s.datum ? bis : undefined,
          beginn: s.zeit, ende: en?.zeit, notiz: e.DESCRIPTION ? unesc(e.DESCRIPTION).slice(0, 500) : undefined
        });
      }
      e = null;
      continue;
    }
    if (!e) continue;
    const i = z.indexOf(':');
    if (i < 0) continue;
    const name = z.slice(0, i).split(';')[0].toUpperCase();
    if (!(name in e)) e[name] = z.slice(i + 1);
  }
  return out;
}

/** Importierte Termine übernehmen: gleiche UID wird ersetzt, eigene Termine bleiben unberührt. */
export function icsUebernehmen(d: Daten, neu: Termin[]) {
  const uids = new Set(neu.map((t) => t.uid));
  d.termine = [...(d.termine ?? []).filter((t) => !(t.quelle === 'ics' && uids.has(t.uid))), ...neu];
  return neu.length;
}
