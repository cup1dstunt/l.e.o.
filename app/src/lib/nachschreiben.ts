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
  eintraege: { key: string; kurs: Kurs; leistung: Leistung; schueler: Schueler; stand: 'offen' | 'erledigt' | 'entfaellt'; status: 'E' | 'offen'; wert?: number; mail?: string }[];
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
    // Status für die Mail: Notenbuch zuerst, sonst Fehlzeit am Klausurtag (WebUntis vor eigener Erfassung)
    const fz = statusAmTag(d.fehlzeiten, kid, sid, leistung.datum);
    const status = z?.status === 'E' || (z?.status !== 'offen' && fz === 'E') ? 'E' : 'offen';
    eintraege.push({ key, kurs, leistung, schueler, stand, status, wert: z?.wert, mail: t.mails[key] });
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

// ---------- Mail (E105, E106, E114) ----------

export const DOMAIN = 'osz-lus.de';

/** Eine Mailvorlage. Eingebaute Vorlagen haben feste ids (std-e, std-offen) und können überschrieben werden. */
export interface MailVorlage { id: string; name: string; betreff: string; text: string }

/** Eingebaute Vorlagen: eine für entschuldigt (E), eine für noch ungeklärt (offen), E114. */
export const VORLAGEN_STANDARD: MailVorlage[] = [
  {
    id: 'std-e',
    name: 'Entschuldigt (E)',
    betreff: 'Nachschreibetermin {klausur} {fach}',
    text:
      'Hallo {vorname},\n\n' +
      'du hast die {klausur} im Fach {fach} ({klasse}) am {klausurdatum} verpasst. ' +
      'Dein Nachschreibetermin ist am {datum} um {uhrzeit} Uhr in Raum {raum}.\n\n' +
      '{nta}\n\n{hinweis}\n\n' +
      'Bitte sei pünktlich und bring alles mit, was du für die Klausur brauchst. ' +
      'Wenn du an dem Termin nicht kannst, melde dich bitte sofort bei mir.\n\n' +
      'Viele Grüße'
  },
  {
    id: 'std-offen',
    name: 'Entschuldigung offen',
    betreff: 'Nachschreibetermin {klausur} {fach}, bitte Entschuldigung nachreichen',
    text:
      'Hallo {vorname},\n\n' +
      'du hast die {klausur} im Fach {fach} ({klasse}) am {klausurdatum} verpasst. ' +
      'Dein Nachschreibetermin ist am {datum} um {uhrzeit} Uhr in Raum {raum}.\n\n' +
      'Deine Entschuldigung liegt noch nicht vor. Bitte reiche sie bis {frist} bei deiner Klassenleitung ein. ' +
      'Ohne Entschuldigung wird die Klausur als unentschuldigt gewertet, dann entfällt das Nachschreiben.\n\n' +
      '{nta}\n\n{hinweis}\n\n' +
      'Bitte sei pünktlich und bring alles mit, was du für die Klausur brauchst.\n\n' +
      'Viele Grüße'
  }
];
/** Für ältere Aufrufer und Tests: die E-Vorlage. */
export const MAIL_STANDARD = VORLAGEN_STANDARD[0];

/** Alle Platzhalter mit kurzer Erklärung, für die antippbaren Chips im Editor. */
export const PLATZHALTER_INFO: { name: string; info: string }[] = [
  { name: 'vorname', info: 'Vorname' },
  { name: 'nachname', info: 'Nachname' },
  { name: 'klausur', info: 'Name der Klausur' },
  { name: 'fach', info: 'Fach' },
  { name: 'klasse', info: 'Klasse' },
  { name: 'klausurdatum', info: 'Tag der verpassten Klausur' },
  { name: 'datum', info: 'Nachschreibetag' },
  { name: 'uhrzeit', info: 'Beginn' },
  { name: 'raum', info: 'Raum' },
  { name: 'status', info: '„entschuldigt“ oder „noch nicht entschuldigt“' },
  { name: 'frist', info: 'Ende der Entschuldigungsfrist (FOS 3, Berufsschule 14 Tage)' },
  { name: 'nta', info: 'Satz zum Nachteilsausgleich, leer wenn keiner' },
  { name: 'hinweis', info: 'Hinweis des Termins, leer wenn keiner' }
];
export const PLATZHALTER = PLATZHALTER_INFO.map((p) => p.name);

/** Vorlagen der Lehrkraft: eingebaute (ggf. überschrieben) und eigene. Alte Einzelvorlage (E107) gilt als Überschreibung von E. */
export function vorlagenVon(e: { nachschreibVorlagen?: MailVorlage[]; nachschreibMail?: { betreff: string; text: string } }): (MailVorlage & { eingebaut: boolean; geaendert: boolean })[] {
  const eigene = e.nachschreibVorlagen ?? [];
  const alt = e.nachschreibMail ? { id: 'std-e', name: VORLAGEN_STANDARD[0].name, ...e.nachschreibMail } : undefined;
  const ein = VORLAGEN_STANDARD.map((v) => {
    const ueber = eigene.find((x) => x.id === v.id) ?? (v.id === 'std-e' ? alt : undefined);
    return { ...(ueber ?? v), eingebaut: true, geaendert: !!ueber };
  });
  return [...ein, ...eigene.filter((x) => !x.id.startsWith('std-')).map((x) => ({ ...x, eingebaut: false, geaendert: false }))];
}

/** Welche Vorlage passt zum Status, wenn die Lehrkraft keine gewählt hat. */
export const vorlageFuerStatus = (status: 'E' | 'offen') => (status === 'offen' ? 'std-offen' : 'std-e');

const datumLang = (iso?: string) => (iso ? new Date(iso + 'T12:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) : 'dem Klausurtag');

/** Letzter Tag der Entschuldigungsfrist ab dem Klausurtag (Kalendertage, FRIST_TAGE). */
export function fristBis(profil: Profil, klausurdatum?: string): string | undefined {
  if (!klausurdatum) return undefined;
  const t = new Date(klausurdatum + 'T12:00');
  t.setDate(t.getDate() + FRIST_TAGE[profil]);
  return t.toISOString().slice(0, 10);
}

export function mailWerte(t: NachTermin, kurs: Kurs, leistung: Leistung, s: Schueler, status: 'E' | 'offen' = 'E'): Record<string, string> {
  const frist = fristBis(kurs.profil, leistung.datum);
  return {
    vorname: s.vorname, nachname: s.nachname, klausur: leistung.name, fach: kurs.fach, klasse: kurs.klasse,
    klausurdatum: datumLang(leistung.datum), datum: datumLang(t.datum), uhrzeit: t.beginn, raum: t.raum || '–',
    status: status === 'E' ? 'entschuldigt' : 'noch nicht entschuldigt',
    frist: frist ? datumLang(frist) : 'zum Ende der Frist',
    nta: s.nta ? `Dein Nachteilsausgleich (${s.nta}) gilt auch beim Nachschreiben.` : '',
    hinweis: t.hinweis?.trim() ?? ''
  };
}

/** Setzt {platzhalter} ein; unbekannte bleiben stehen, damit man sie sieht. Leere Platzhalter hinterlassen keine Leerzeilen. */
export const fuellen = (vorlage: string, werte: Record<string, string>) =>
  vorlage
    .replace(/\{(\w+)\}/g, (ganz, n) => (n in werte ? werte[n] : ganz))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Stand des Termins, an dem ein angepasster Entwurf hängt. Ändert sich Datum, Zeit, Raum oder Hinweis, ist der Entwurf veraltet. */
export const terminStand = (t: NachTermin) => [t.datum, t.beginn, t.raum, t.hinweis ?? ''].join('|');

/** Fertige Mail für einen Fall: angepasster Entwurf, sonst gewählte oder zum Status passende Vorlage. */
export function mailFuer(
  t: NachTermin, kurs: Kurs, leistung: Leistung, s: Schueler, status: 'E' | 'offen',
  vorlagen: MailVorlage[], key: string
): { betreff: string; text: string; vorlage: MailVorlage; angepasst: boolean; veraltet: boolean } {
  const ent = t.entwuerfe?.[key];
  const vorlage = vorlagen.find((v) => v.id === ent?.vorlage) ?? vorlagen.find((v) => v.id === vorlageFuerStatus(status)) ?? vorlagen[0] ?? MAIL_STANDARD;
  const w = mailWerte(t, kurs, leistung, s, status);
  const angepasst = ent?.text !== undefined || ent?.betreff !== undefined;
  return {
    betreff: ent?.betreff ?? fuellen(vorlage.betreff, w),
    text: ent?.text ?? fuellen(vorlage.text, w),
    vorlage,
    angepasst,
    veraltet: angepasst && ent?.stand !== terminStand(t)
  };
}

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
