// Schülerimport vervollständigen (S1, S2, S6): Stammdaten-Export aus WebUntis und Schulmails aus IServ.
// Ohne Netz und ohne Oberfläche, damit alles testbar ist. Oberfläche: Mehr › WebUntis.
//
// Warum es das braucht: Der WebUntis-Abgleich leitet die Klassenlisten aus dem Klassenbuch ab. Dort stehen nur
// Schüler, die in einer eigenen Stunde schon einmal gefehlt haben oder zu spät kamen. Wer nie gefehlt hat, fehlt
// in L.E.O. Der Export je Klasse liefert die vollständige Liste und dazu das Geburtsdatum (E119).
//
// Datenschutz: Übernommen werden nur Schüler, die schon in L.E.O. sind oder deren Klasse zu einer eigenen Klasse
// gehört, und davon nur Name, Geburtsdatum, Geschlecht, Klasse, Nachteilsausgleich und die schulische Mailadresse.
// Private Adressen, Anschrift, Telefon und alles andere werden nicht gespeichert (Konstantin 26.11.: Schulmail reicht).
import type { Daten, Kurs, Schueler } from './typen.ts';
import { tabelleLesen, datumLesen, geschlechtAus, klassenTeile } from './untisimport.ts';
import { DOMAIN, adressVorschlag } from './nachschreiben.ts';

export type Feld = 'nachname' | 'vorname' | 'geburt' | 'geschlecht' | 'klasse' | 'mail' | 'nta' | 'id';

export const FELDER: { feld: Feld; titel: string; noetig?: boolean }[] = [
  { feld: 'nachname', titel: 'Nachname', noetig: true },
  { feld: 'vorname', titel: 'Vorname', noetig: true },
  { feld: 'geburt', titel: 'Geburtsdatum' },
  { feld: 'klasse', titel: 'Klasse' },
  { feld: 'geschlecht', titel: 'Geschlecht' },
  { feld: 'mail', titel: 'Schulmail' },
  { feld: 'nta', titel: 'Nachteilsausgleich' },
  { feld: 'id', titel: 'WebUntis-Nummer' }
];

/** Spaltenköpfe vereinheitlichen: klein, ohne Umlaute, ohne Leer- und Satzzeichen. */
export const kopfNorm = (k: string) =>
  k.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');

// Bekannte Spaltennamen, die erste passende gewinnt. Englisch = WebUntis-Bericht, Deutsch = Excel-Export und eigene Listen.
const ALIASE: Record<Feld, string[]> = {
  nachname: ['longname', 'nachname', 'familienname', 'name', 'schuelernachname'],
  vorname: ['forename', 'vorname', 'rufname', 'firstname', 'schuelervorname'],
  geburt: ['birthdate', 'geburtsdatum', 'gebdatum', 'geboren', 'geburtstag', 'dateofbirth'],
  geschlecht: ['gender', 'geschlecht', 'sex'],
  klasse: ['klassename', 'klasse', 'klassenname', 'class', 'stammklasse'],
  mail: ['iservmail', 'schulmail', 'mailschule', 'emailschule', 'addressemail', 'email', 'emailadresse', 'mail', 'mailadresse'],
  nta: ['attributenachteilsausgleich', 'nachteilsausgleich', 'nta'],
  id: ['id', 'untisid', 'schuelerid']
};

export type Zuordnung = Partial<Record<Feld, string>>;

/** Spalten automatisch erkennen. Jede Spalte wird höchstens einem Feld zugeordnet. */
export function spaltenErkennen(kopf: string[]): Zuordnung {
  const z: Zuordnung = {};
  const belegt = new Set<string>();
  for (const { feld } of FELDER) {
    for (const a of ALIASE[feld]) {
      const treffer = kopf.find((k) => !belegt.has(k) && kopfNorm(k) === a);
      if (treffer) { z[feld] = treffer; belegt.add(treffer); break; }
    }
  }
  return z;
}

/** Namen für den Vergleich: klein, Umlaute umschrieben, Akzente weg, Bindestriche wie Leerzeichen. */
export const nameNorm = (x: string) =>
  (x ?? '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-‐'’]/g, ' ').replace(/\s+/g, ' ').trim();

const klassenVon = (k: Kurs) => klassenTeile(k.klasse);
const istSchulmail = (m: string) => new RegExp(`@${DOMAIN.replace(/\./g, '\\.')}$`, 'i').test(m.trim());

export interface Zeile {
  vorname: string;
  nachname: string;
  geburt: string;
  geschlecht?: Schueler['geschlecht'];
  klasse: string;
  mail: string; // nur schulische Adresse, sonst leer
  nta: string;
  untisId?: number;
}

export interface Vorschau {
  zuordnung: Zuordnung;
  kopf: string[];
  gelesen: number;
  fehlt: Feld[]; // nötige Spalten, die nicht erkannt wurden
  treffer: { schuelerId: string; zeile: Zeile }[]; // schon in L.E.O.
  neu: { kursId: string; kurs: string; zeilen: Zeile[] }[]; // in einer eigenen Klasse, aber noch nicht in L.E.O.
  ignoriert: number; // andere Klassen, nicht gespeichert
  privatIgnoriert: number; // Mailadressen außerhalb der Schule, nicht gespeichert
}

function zeileLesen(r: Record<string, string>, z: Zuordnung): Zeile {
  const w = (f: Feld) => (z[f] ? (r[z[f]!] ?? '').trim() : '');
  const mail = w('mail');
  const id = Number(w('id'));
  const nta = w('nta');
  const g = w('geschlecht');
  return {
    vorname: w('vorname'), nachname: w('nachname'), geburt: datumLesen(w('geburt')),
    geschlecht: g ? (/^(w|f|weibl)/i.test(g) ? 'w' : /^(m|maennl|männl)/i.test(g) ? 'm' : /^d/i.test(g) ? 'd' : geschlechtAus(g)) : undefined,
    klasse: w('klasse'), mail: istSchulmail(mail) ? mail.toLowerCase() : '',
    nta: nta && !/^(nein|false|0|-)$/i.test(nta) ? (/^(ja|true|1|x)$/i.test(nta) ? 'Nachteilsausgleich (laut WebUntis)' : nta) : '',
    untisId: Number.isFinite(id) && id > 0 ? id : undefined
  };
}

/** Sucht den Schüler zu einer Zeile: zuerst über die WebUntis-Nummer, dann über Vor- und Nachname (bei Gleichnamigen mit Klasse). */
export function findeSchueler(alle: Schueler[], z: Zeile): Schueler | undefined {
  if (z.untisId !== undefined) {
    const s = alle.find((x) => x.untisId === z.untisId && nameNorm(x.nachname) === nameNorm(z.nachname));
    if (s) return s;
  }
  const gleich = alle.filter((x) => nameNorm(x.nachname) === nameNorm(z.nachname) && nameNorm(x.vorname) === nameNorm(z.vorname));
  if (gleich.length <= 1) return gleich[0];
  return gleich.find((x) => x.klasse && z.klasse && nameNorm(x.klasse) === nameNorm(z.klasse));
}

/**
 * Datei prüfen, ohne etwas zu ändern. Ergebnis zeigt die Oberfläche als Vorschau: wer zugeordnet wird,
 * wer in einer eigenen Klasse noch fehlt (zum Antippen), was ignoriert wird.
 */
export function stammdatenPruefen(d: Daten, text: string, zuordnung?: Zuordnung): Vorschau {
  const zeilen = tabelleLesen(text);
  const kopf = zeilen.length ? Object.keys(zeilen[0]) : [];
  const z = zuordnung ?? spaltenErkennen(kopf);
  const fehlt = FELDER.filter((f) => f.noetig && !z[f.feld]).map((f) => f.feld);
  const v: Vorschau = { zuordnung: z, kopf, gelesen: zeilen.length, fehlt, treffer: [], neu: [], ignoriert: 0, privatIgnoriert: 0 };
  if (fehlt.length) return v;
  const mailSpalte = z.mail;
  const neuJeKurs = new Map<string, Zeile[]>();
  for (const r of zeilen) {
    const zl = zeileLesen(r, z);
    if (!zl.nachname && !zl.vorname) continue;
    if (mailSpalte && (r[mailSpalte] ?? '').includes('@') && !zl.mail) v.privatIgnoriert++;
    const s = findeSchueler(d.schueler, zl);
    if (s) { v.treffer.push({ schuelerId: s.id, zeile: zl }); continue; }
    // Neu nur, wenn die Klasse zu einer eigenen Klasse gehört
    const kurse = zl.klasse ? d.kurse.filter((k) => klassenVon(k).some((x) => nameNorm(x) === nameNorm(zl.klasse))) : [];
    if (!kurse.length) { v.ignoriert++; continue; }
    for (const k of kurse) {
      if (!neuJeKurs.has(k.id)) neuJeKurs.set(k.id, []);
      neuJeKurs.get(k.id)!.push(zl);
    }
  }
  v.neu = [...neuJeKurs].map(([kursId, zeilen]) => ({ kursId, kurs: d.kurse.find((k) => k.id === kursId)!.name, zeilen }));
  return v;
}

/** Eindeutige, gleichbleibende Nummer für Schüler aus einer Datei (damit ein zweiter Import keine Doppelten anlegt). */
export const dateiId = (z: Zeile) => `x-${nameNorm(z.klasse)}-${nameNorm(z.nachname)}-${nameNorm(z.vorname)}`.replace(/\s/g, '_');

export interface Anwenden {
  /** je Kurs die Schüler (Index in `neu[].zeilen`), die aufgenommen werden; fehlt ein Kurs, wird dort niemand aufgenommen */
  aufnehmen?: Record<string, number[]>;
}

/** Vorschau übernehmen. Vorhandene Werte werden nur durch gefüllte Werte aus der Datei ersetzt, nie geleert. */
export function stammdatenAnwenden(d: Daten, v: Vorschau, opt: Anwenden = {}): { zugeordnet: number; geburt: number; mail: number; neu: number } {
  let geburt = 0, mail = 0, neu = 0;
  const setzen = (s: Schueler, z: Zeile, istNeu = false) => {
    if (z.geburt && s.geburt !== z.geburt) { s.geburt = z.geburt; geburt++; }
    if (z.mail && s.mailDienst !== z.mail) { s.mailDienst = z.mail; mail++; }
    if (z.nta) s.nta = z.nta;
    if (z.klasse) { s.klasse = z.klasse; s.klasseSicher = true; }
    if (z.geschlecht && (istNeu || s.untisId === undefined)) s.geschlecht = z.geschlecht; // WebUntis-Angabe hat Vorrang
  };
  for (const t of v.treffer) {
    const s = d.schueler.find((x) => x.id === t.schuelerId);
    if (s) setzen(s, t.zeile);
  }
  for (const gruppe of v.neu) {
    const kurs = d.kurse.find((k) => k.id === gruppe.kursId);
    const wahl = opt.aufnehmen?.[gruppe.kursId];
    if (!kurs || !wahl?.length) continue;
    for (const i of wahl) {
      const z = gruppe.zeilen[i];
      if (!z) continue;
      let s = d.schueler.find((x) => x.id === dateiId(z)) ?? findeSchueler(d.schueler, z);
      if (!s) {
        s = { id: dateiId(z), vorname: z.vorname, nachname: z.nachname, geburt: '', geschlecht: z.geschlecht ?? 'd', mailDienst: '', herkunft: 'datei' };
        d.schueler.push(s);
        neu++;
        setzen(s, z, true);
      }
      if (!kurs.schueler.includes(s.id)) kurs.schueler.push(s.id);
    }
  }
  return { zugeordnet: v.treffer.length, geburt, mail, neu };
}

// ---------- Schulmails aus IServ ----------

/** Mögliche Namensteile vor dem @ (v.nachname nach E106, vorname.nachname, Doppelnamen einzeln und zusammen). */
export function lokaleTeile(s: Schueler): string[] {
  const u = (x: string) => nameNorm(x).replace(/\s/g, '');
  const vor = nameNorm(s.vorname).split(' ')[0] ?? '';
  const teile = nameNorm(s.nachname).split(' ').filter(Boolean);
  const nachnamen = new Set([teile.join(''), teile.join('-'), teile.join('.'), ...teile]);
  const out = new Set<string>();
  const muster = adressVorschlag(s.vorname, s.nachname).adresse.split('@')[0];
  if (muster) out.add(muster);
  for (const n of nachnamen) if (n) { out.add(`${vor[0]}.${n}`); out.add(`${vor}.${n}`); out.add(`${u(s.vorname)}.${n}`); }
  return [...out];
}

/**
 * Schulische Adressen aus beliebigem Text übernehmen (IServ-Adressbuch, Gruppenliste, Mail-Verteiler, CSV).
 * Steht ein Name in derselben Zeile, entscheidet der Name, sonst der Teil vor dem @.
 * Zugeordnet wird nur, wenn genau ein Schüler passt. Fremde Adressen werden nicht gespeichert.
 */
export function schulmailsEinlesen(d: Daten, text: string, nur?: Set<string>): { gefunden: number; zugeordnet: number; unklar: number } {
  const re = new RegExp(`[a-z0-9._%+-]+@${DOMAIN.replace(/\./g, '\\.')}`, 'gi');
  const kandidaten = d.schueler.filter((s) => !nur || nur.has(s.id));
  const teile = new Map(kandidaten.map((s) => [s.id, lokaleTeile(s)]));
  let gefunden = 0, zugeordnet = 0, unklar = 0;
  const gesehen = new Set<string>();
  for (const zeile of text.split(/\r?\n/)) {
    for (const m of zeile.match(re) ?? []) {
      const adr = m.toLowerCase();
      if (gesehen.has(adr)) continue;
      gesehen.add(adr);
      gefunden++;
      const rest = nameNorm(zeile.replace(m, ' ').replace(/[<>",;()\t]/g, ' '));
      let passt = rest
        ? kandidaten.filter((s) => {
            const n = nameNorm(s.nachname), v = nameNorm(s.vorname).split(' ')[0];
            return n && v && rest.includes(n) && rest.includes(v);
          })
        : [];
      if (passt.length !== 1) {
        const lokal = adr.split('@')[0].replace(/\d+$/, '');
        passt = kandidaten.filter((s) => teile.get(s.id)!.includes(lokal));
      }
      if (passt.length === 1) {
        if (passt[0].mailDienst !== adr) passt[0].mailDienst = adr;
        zugeordnet++;
      } else unklar++;
    }
  }
  return { gefunden, zugeordnet, unklar };
}

/** Überblick für die Kachel „Schulmail“: hinterlegt, nur nach Muster, davon unsicher. */
export function mailStand(liste: Schueler[]): { hinterlegt: number; muster: number; pruefen: number } {
  let hinterlegt = 0, muster = 0, pruefen = 0;
  for (const s of liste) {
    if (s.mailDienst?.trim()) { hinterlegt++; continue; }
    muster++;
    if (adressVorschlag(s.vorname, s.nachname).pruefen.length) pruefen++;
  }
  return { hinterlegt, muster, pruefen };
}
