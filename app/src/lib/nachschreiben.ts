// Modul 1 Nachschreiben (E104–E106, Backlog F8–F11): Fälle aus Notenbuch und Fehlzeiten, Termine, Mail-Entwurf, Fristen.
// Reine Funktionen ohne Speicher, damit sie getestet werden können (tests/nachschreiben.test.ts).
import type { Daten, Fehlzeit, Kurs, Leistung, NachTermin, Profil, Schueler } from './typen.ts';

/** Schlüssel eines Falls: Klasse, Klausur, Schüler. */
export const fallSchluessel = (kursId: string, leistungId: string, schuelerId: string) => `${kursId}|${leistungId}|${schuelerId}`;

export interface Fall {
  key: string;
  kurs: Kurs;
  leistung: Leistung;
  schueler: Schueler;
  status: 'E' | 'offen'; // UE ist ausgeschlossen (E104)
  quelle: 'notenbuch' | 'fehlzeit'; // fehlzeit = Zelle noch leer, Status aus den Fehlzeiten am Klausurtag
  termin?: NachTermin;
}

export interface Hinweis {
  key: string;
  kurs: Kurs;
  leistung: Leistung;
  schueler: Schueler;
  text: string;
  setzen?: 'E' | 'UE'; // Ein-Tipp-Aktion: Status ins Notenbuch übernehmen
}

/** Termin mit aufgelösten Fällen. Fälle mit eingetragener Note sind erledigt, mit UE entfallen. */
export interface TerminSicht {
  termin: NachTermin;
  eintraege: { key: string; kurs: Kurs; leistung: Leistung; schueler: Schueler; stand: 'offen' | 'erledigt' | 'entfaellt'; wert?: number; mail?: string }[];
  erledigt: boolean; // alle Einträge erledigt oder entfallen
  mailsFertig: number;
  notenFertig: number;
}

/** Status der Fehlzeit am Klausurtag. WebUntis gewinnt vor der eigenen Erfassung (wie fehlzeitenVon). */
export function statusAmTag(fehlzeiten: Fehlzeit[], kursId: string, schuelerId: string, datum: string | undefined): Fehlzeit['status'] | undefined {
  if (!datum) return undefined;
  const am = fehlzeiten.filter((f) => f.kursId === kursId && f.schuelerId === schuelerId && f.datum === datum);
  return (am.find((f) => f.quelle === 'untis') ?? am[0])?.status;
}

/** Alle Nachschreibe-Fälle und Hinweise über alle Klassen. */
export function nachschreibLage(d: Daten) {
  const termine = d.nachschreiben ?? [];
  const terminVon = new Map<string, NachTermin>();
  for (const t of termine) for (const k of t.faelle) terminVon.set(k, t);
  const faelle: Fall[] = [];
  const hinweise: Hinweis[] = [];
  for (const kurs of d.kurse) {
    for (const leistung of kurs.leistungen.filter((l) => l.gruppe === 'klausuren')) {
      for (const sid of kurs.schueler) {
        const schueler = d.schueler.find((s) => s.id === sid);
        if (!schueler) continue;
        const key = fallSchluessel(kurs.id, leistung.id, sid);
        const z = kurs.zellen[`${leistung.id}:${sid}`];
        const fz = statusAmTag(d.fehlzeiten, kurs.id, sid, leistung.datum);
        const basis = { key, kurs, leistung, schueler };
        if (z?.status === 'E' || z?.status === 'offen') {
          faelle.push({ ...basis, status: z.status, quelle: 'notenbuch', termin: terminVon.get(key) });
          if (fz && fz !== z.status && fz !== 'offen')
            hinweise.push({ ...basis, text: `Im Notenbuch ${z.status}, laut Fehlzeiten jetzt ${fz}`, setzen: fz });
        } else if (z?.wert !== undefined) {
          if (fz === 'UE') hinweise.push({ ...basis, text: `Note ${z.wert} eingetragen, laut Fehlzeiten inzwischen UE. Bitte selbst entscheiden, L.E.O. ändert nichts` });
        } else if (z?.status !== 'UE') {
          if (fz === 'E' || fz === 'offen') faelle.push({ ...basis, status: fz, quelle: 'fehlzeit', termin: terminVon.get(key) });
          else if (fz === 'UE') hinweise.push({ ...basis, text: 'Laut Fehlzeiten UE, im Notenbuch noch leer', setzen: 'UE' });
        }
      }
    }
  }
  return { faelle, ohneTermin: faelle.filter((f) => !f.termin), hinweise };
}

/** Löst die Fälle eines Termins auf. */
export function terminSicht(d: Daten, t: NachTermin): TerminSicht {
  const eintraege: TerminSicht['eintraege'] = [];
  for (const key of t.faelle) {
    const [kid, lid, sid] = key.split('|');
    const kurs = d.kurse.find((k) => k.id === kid);
    const leistung = kurs?.leistungen.find((l) => l.id === lid);
    const schueler = d.schueler.find((s) => s.id === sid);
    if (!kurs || !leistung || !schueler) continue; // Klasse oder Klausur gelöscht
    const z = kurs.zellen[`${lid}:${sid}`];
    const stand = z?.wert !== undefined ? 'erledigt' : z?.status === 'UE' ? 'entfaellt' : 'offen';
    eintraege.push({ key, kurs, leistung, schueler, stand, wert: z?.wert, mail: t.mails[key] });
  }
  const offen = eintraege.filter((e) => e.stand === 'offen');
  return {
    termin: t,
    eintraege,
    erledigt: eintraege.length > 0 && offen.length === 0,
    mailsFertig: eintraege.filter((e) => e.stand !== 'entfaellt' && e.mail).length,
    notenFertig: eintraege.filter((e) => e.stand === 'erledigt').length
  };
}

// ---------- Mail (E105, E106) ----------

export const DOMAIN = 'osz-lus.de';

export const MAIL_STANDARD = {
  betreff: 'Nachschreibetermin {klausur} {fach}',
  text:
    'Hallo {vorname},\n\n' +
    'du hast die {klausur} im Fach {fach} ({klasse}) am {klausurdatum} verpasst. ' +
    'Dein Nachschreibetermin ist am {datum} um {uhrzeit} Uhr in Raum {raum}.\n\n' +
    'Bitte sei pünktlich und bring alles mit, was du für die Klausur brauchst. ' +
    'Wenn du an dem Termin nicht kannst, melde dich bitte sofort bei mir.\n\n' +
    'Viele Grüße'
};

export const PLATZHALTER = ['vorname', 'nachname', 'klausur', 'fach', 'klasse', 'klausurdatum', 'datum', 'uhrzeit', 'raum'] as const;

const datumLang = (iso?: string) => (iso ? new Date(iso + 'T12:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) : 'dem Klausurtag');

export function mailWerte(t: NachTermin, kurs: Kurs, leistung: Leistung, s: Schueler): Record<string, string> {
  return {
    vorname: s.vorname, nachname: s.nachname, klausur: leistung.name, fach: kurs.fach, klasse: kurs.klasse,
    klausurdatum: datumLang(leistung.datum), datum: datumLang(t.datum), uhrzeit: t.beginn, raum: t.raum || '–'
  };
}

/** Setzt {platzhalter} ein; unbekannte bleiben stehen, damit man sie sieht. */
export const fuellen = (vorlage: string, werte: Record<string, string>) =>
  vorlage.replace(/\{(\w+)\}/g, (ganz, n) => (n in werte ? werte[n] : ganz));

export const mailLink = (an: string, betreff: string, text: string) =>
  `mailto:${encodeURIComponent(an).replace(/%40/g, '@')}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text)}`;

const UMSCHRIFT: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };
const umschreiben = (x: string) =>
  x.toLowerCase().replace(/[äöüß]/g, (c) => UMSCHRIFT[c]).normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Vorschlag nach Schulmuster v.nachname@osz-lus.de (E106) und was daran unsicher ist. */
export function adressVorschlag(vorname: string, nachname: string): { adresse: string; pruefen: string[] } {
  const pruefen: string[] = [];
  const v = vorname.trim();
  const n = nachname.trim();
  if (!v || !n) return { adresse: '', pruefen: ['Name unvollständig'] };
  if (/[äöüÄÖÜ]/.test(v[0] + n)) pruefen.push('Umlaut');
  if (/ß/.test(n)) pruefen.push('ß');
  if (/[^\x00-\x7F]/.test((v[0] + n).replace(/[äöüÄÖÜß]/g, ''))) pruefen.push('Akzent');
  if (/[\s-]/.test(n)) pruefen.push('Doppelname');
  if (/['’]/.test(n)) pruefen.push('Apostroph');
  const vk = umschreiben(v)[0] ?? '';
  const nk = umschreiben(n).replace(/[\s'’]/g, '').replace(/[^a-z0-9.-]/g, '');
  return { adresse: `${vk}.${nk}@${DOMAIN}`, pruefen };
}

/** Schulische Adresse eines Schülers: hinterlegt, sonst Vorschlag. Gleiche Vorschläge für zwei Schüler werden markiert. */
export function schulAdresse(s: Schueler, alle: Schueler[]): { adresse: string; vorschlag: boolean; pruefen: string[] } {
  if (s.mailDienst?.trim()) return { adresse: s.mailDienst.trim(), vorschlag: false, pruefen: [] };
  const v = adressVorschlag(s.vorname, s.nachname);
  const gleich = alle.some((x) => x.id !== s.id && (x.mailDienst?.trim().toLowerCase() || adressVorschlag(x.vorname, x.nachname).adresse) === v.adresse);
  return { adresse: v.adresse, vorschlag: true, pruefen: gleich ? [...v.pruefen, 'Namensgleichheit'] : v.pruefen };
}

// ---------- Fehlzeiten der Klasse (F11) ----------

/** Frist für die Entschuldigung in Kalendertagen: FOS 3, Berufsschule 14 (E96). */
export const FRIST_TAGE: Record<Profil, number> = { FOS: 3, OSZ: 14 };

/** Tage seit dem Fehltag, ab wann die Frist abgelaufen ist. */
export function fristAbgelaufen(profil: Profil, datum: string, heute: string): boolean {
  const tage = Math.round((new Date(heute + 'T12:00').getTime() - new Date(datum + 'T12:00').getTime()) / 864e5);
  return tage > FRIST_TAGE[profil];
}

/** Einordnung der Fehlzeitenquote: über 30 % (E62), ab 20 % beobachten. */
export const quotenStufe = (q: number): 'hoch' | 'mittel' | '' => (q > 0.3 ? 'hoch' : q >= 0.2 ? 'mittel' : '');
