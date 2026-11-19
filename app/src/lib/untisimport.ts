// Echte Übernahme aus WebUntis (V11, Stufe 1: nur lesen).
// Datenschutz: Das Lehrerkonto sieht die ganze Schule. Übernommen wird nur, was zu den EIGENEN Stunden gehört;
// alles andere wird direkt nach dem Abruf im Arbeitsspeicher verworfen und nie gespeichert.
// Ehrlich: Die Zuordnung über das Lehrerkürzel ist aus dem Verbindungstest abgeleitet, aber noch nicht mit echten Daten geprüft.
import type { Daten, Fehlzeit, Kurs, Leistung, Schueler, Stunde, Verspaetung } from './typen.ts';
import { alsListe, type Sitzung } from './untis.ts';
import { ausVorlage, verteilen } from './sitzplan.ts';

// ---------- kleine, getestete Bausteine ----------

/** 20261118 → 2026-11-18 */
export const isoAusUntis = (n: number | string) => {
  const s = String(n);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};
/** 815 → 08:15 */
export const zeitAusUntis = (n: number | string) => {
  const s = String(n).padStart(4, '0');
  return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
};
const minutenVon = (n: number) => Math.floor(n / 100) * 60 + (n % 100);
/** Unterrichtseinheiten zu 45 Minuten (eine Doppelstunde = 2). */
export const einheiten = (start: number, ende: number) => Math.max(1, Math.round((minutenVon(ende) - minutenVon(start)) / 45));
export const untisDatumAus = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

export type Art = 'E' | 'UE' | 'offen' | 'verspaetung' | null;

/** Status aus WebUntis auf L.E.O. abbilden (E94, E95). null = anwesend. */
export function artAusUntis(excuseStatus?: string | null, grund?: string | null, minuten?: number | null): Art {
  const st = (excuseStatus ?? '').trim().toLowerCase();
  const g = (grund ?? '').trim();
  if (!st && !g && !minuten) return null;
  if (st.startsWith('versp') || /^V\s*\(/.test(g)) return 'verspaetung';
  if (st.startsWith('nicht')) return 'UE';
  if (st.startsWith('entsch')) return 'E';
  if (g === 'UE') return 'UE';
  return 'offen';
}

export const geschlechtAus = (g?: string): Schueler['geschlecht'] => (/^(f|w)/i.test(g ?? '') ? 'w' : /^m/i.test(g ?? '') ? 'm' : 'd');

export const profilAus = (klasse: string): Kurs['profil'] => (/FOS/i.test(klasse) ? 'FOS' : 'OSZ');

/** Tabelle aus einem WebUntis-Export (CSV oder Tab) lesen. Trennzeichen wird erkannt, Anführungszeichen beachtet. */
export function tabelleLesen(text: string): Record<string, string>[] {
  const zeilen = text.replace(/^﻿/, '').split(/\r?\n/).filter((z) => z.trim());
  if (!zeilen.length) return [];
  const kopf = zeilen[0];
  const trenner = ['\t', ';', ','].map((t) => [t, kopf.split(t).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const teilen = (z: string) => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < z.length; i++) {
      const c = z[i];
      if (c === '"') { if (q && z[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === trenner && !q) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map((x) => x.trim());
  };
  const namen = teilen(kopf);
  return zeilen.slice(1).map((z) => {
    const w = teilen(z);
    return Object.fromEntries(namen.map((n, i) => [n, w[i] ?? '']));
  });
}

/** 05.02.2006, 2006-02-05 oder 20060205 → 2006-02-05; sonst leer */
export function datumLesen(t: string): string {
  const s = (t ?? '').trim();
  let m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return '';
}

/**
 * Geburtsdatum und Nachteilsausgleich aus dem Stammdaten-Export übernehmen.
 * Nur für Schüler, die schon in L.E.O. sind (eigene Klassen). Adressen, Telefon, Mail und alles andere werden ignoriert.
 */
export function stammdatenEinlesen(d: Daten, text: string): { gelesen: number; zugeordnet: number } {
  const zeilen = tabelleLesen(text);
  let zugeordnet = 0;
  for (const z of zeilen) {
    const id = Number(z['id']);
    const s =
      d.schueler.find((x) => x.untisId !== undefined && x.untisId === id) ??
      d.schueler.find((x) => x.nachname === (z['longName'] || z['name']) && x.vorname === z['foreName']);
    if (!s) continue;
    zugeordnet++;
    const geb = datumLesen(z['birthDate']);
    if (geb) s.geburt = geb;
    const nta = (z['attribute.Nachteilsausgleich'] ?? '').trim();
    if (nta && !/^(nein|false|0)$/i.test(nta)) s.nta = /^(ja|true|1|x)$/i.test(nta) ? 'Nachteilsausgleich (laut WebUntis)' : nta;
    if (z['klasse.name']) s.klasse = z['klasse.name'];
  }
  return { gelesen: zeilen.length, zugeordnet };
}

// ---------- Abruf ----------

export interface Paket {
  kuerzel: string;
  von: string;
  bis: string;
  kurse: { klasseId: number; fachId: number; name: string; fach: string; klasse: string; raum: string; gehalten: number; anzahl: number; schueler: Set<number> }[];
  schueler: { untisId: number; vorname: string; nachname: string; geschlecht: Schueler['geschlecht']; klasse?: string }[];
  stunden: { key: string; tag: number; beginn: string; ende: string }[];
  fehlzeiten: { key: string; untisId: number; datum: string; beginn: string; stunden: number; status: Fehlzeit['status']; grund: string }[];
  verspaetungen: { key: string; untisId: number; datum: string; ankunft: string; minuten: number }[];
  ausfaelle: { key: string; datum: string; beginn: string }[];
  stammdaten: string[]; // CSV-Texte, falls der Bericht automatisch abrufbar war
}

const kursKey = (klasseId: number, fachId: number) => `${klasseId}-${fachId}`;

/** Holt alles für die eigenen Stunden des laufenden Halbjahres. `melde` zeigt den Fortschritt. */
export async function holen(sz: Sitzung, melde: (t: string) => void): Promise<Paket> {
  const heute = new Date();
  const heuteN = untisDatumAus(heute);

  melde('Schuljahr und Stammlisten');
  const sj = await sz.r('getCurrentSchoolyear');
  const von: number = sj.startDate;
  const bis: number = sj.endDate;
  const name = (l: unknown[]) => new Map(l.map((x: any) => [x.id as number, (x.name ?? '') as string]));
  const lang = (l: unknown[]) => new Map(l.map((x: any) => [x.id as number, (x.longName || x.name || '') as string]));
  const klassen = name(alsListe(await sz.r('getKlassen')));
  const faecherL = alsListe(await sz.r('getSubjects'));
  const faecher = lang(faecherL);
  const raeume = name(alsListe(await sz.r('getRooms')));

  melde('Eigener Stundenplan im Halbjahr');
  const sp = alsListe(await sz.r('getTimetable', {
    options: {
      element: { id: sz.person.id, type: sz.person.typ || 2 },
      startDate: von, endDate: bis,
      klasseFields: ['id', 'name'], subjectFields: ['id', 'name', 'longname'], roomFields: ['id', 'name'], teacherFields: ['id', 'name']
    }
  })) as any[];

  let kuerzel = '';
  for (const s of sp) for (const t of s.te ?? []) if (t.id === sz.person.id && t.name) kuerzel = t.name;

  const kurse = new Map<string, Paket['kurse'][number]>();
  const raumZaehler = new Map<string, Map<string, number>>();
  const stundenNachSchluessel = new Map<string, { key: string; start: number; ende: number }[]>();
  const muster = new Map<string, Paket['stunden'][number]>();
  const ausfaelle: Paket['ausfaelle'] = [];
  const in14 = untisDatumAus(new Date(heute.getTime() + 14 * 864e5));
  const vor14 = untisDatumAus(new Date(heute.getTime() - 14 * 864e5));

  for (const s of sp) {
    const kl = s.kl?.[0];
    const su = s.su?.[0];
    if (!kl?.id || !su?.id) continue;
    const key = kursKey(kl.id, su.id);
    const klasse = s.kl.map((k: any) => k.name || klassen.get(k.id) || '').filter(Boolean).join(', ');
    const fach = faecher.get(su.id) || su.longname || su.longName || su.name || '';
    if (!kurse.has(key)) kurse.set(key, { klasseId: kl.id, fachId: su.id, name: `${klasse} ${fach}`.trim(), fach, klasse, raum: '', gehalten: 0, anzahl: 0, schueler: new Set() });
    const k = kurse.get(key)!;
    const raum = s.ro?.[0]?.name || raeume.get(s.ro?.[0]?.id) || '';
    if (raum) {
      const z = raumZaehler.get(key) ?? new Map();
      z.set(raum, (z.get(raum) ?? 0) + 1);
      raumZaehler.set(key, z);
    }
    const tagKey = String(s.date);
    const liste = stundenNachSchluessel.get(tagKey) ?? [];
    liste.push({ key, start: s.startTime, ende: s.endTime });
    stundenNachSchluessel.set(tagKey, liste);
    if (s.code === 'cancelled') {
      ausfaelle.push({ key, datum: isoAusUntis(s.date), beginn: zeitAusUntis(s.startTime) });
      continue;
    }
    k.anzahl++;
    if (s.date <= heuteN) k.gehalten += einheiten(s.startTime, s.endTime);
    if (s.date >= vor14 && s.date <= in14) {
      const tag = new Date(isoAusUntis(s.date) + 'T12:00').getDay();
      const m = { key, tag, beginn: zeitAusUntis(s.startTime), ende: zeitAusUntis(s.endTime) };
      muster.set(`${m.tag}-${m.beginn}-${key}`, m);
    }
  }
  for (const [key, z] of raumZaehler) kurse.get(key)!.raum = [...z].sort((a, b) => b[1] - a[1])[0][0];

  // Klassenbuch in 14-Tage-Stücken. Behalten werden nur Zeilen, die zeitlich in eine eigene Stunde fallen.
  // Welche Kennung in teacherIds „ich“ bin, ist nicht dokumentiert: gezählt wird, welche Kennung in den
  // eigenen Stunden fast immer vorkommt. Bevorzugt wird das Kürzel aus dem Stundenplan, wenn es passt.
  const ende = Math.min(heuteN, bis);
  const inMeinenStunden: { z: any; stunde: { key: string; start: number; ende: number } }[] = [];
  const kennungen = new Map<string, Set<string>>();
  const slots = new Set<string>();
  let start = new Date(isoAusUntis(von) + 'T12:00');
  while (untisDatumAus(start) <= ende) {
    const stueckEnde = new Date(start.getTime() + 13 * 864e5);
    const a = untisDatumAus(start);
    const b = Math.min(untisDatumAus(stueckEnde), ende);
    melde(`Klassenbuch ${isoAusUntis(a).slice(8, 10)}.${isoAusUntis(a).slice(5, 7)}. bis ${isoAusUntis(b).slice(8, 10)}.${isoAusUntis(b).slice(5, 7)}.`);
    const zeilen = alsListe(await sz.r('getTimetableWithAbsences', { options: { startDate: a, endDate: b } })) as any[];
    for (const z of zeilen) {
      const stunde = (stundenNachSchluessel.get(String(z.date)) ?? []).find((x) => x.start <= z.startTime && z.startTime < x.ende);
      if (!stunde) continue;
      const slot = `${z.date}-${stunde.start}`;
      slots.add(slot);
      for (const t of Array.isArray(z.teacherIds) ? z.teacherIds : []) {
        const k = String(t);
        if (!kennungen.has(k)) kennungen.set(k, new Set());
        kennungen.get(k)!.add(slot);
      }
      inMeinenStunden.push({ z, stunde });
    }
    zeilen.length = 0; // Rest der Schule sofort verwerfen
    start = new Date(stueckEnde.getTime() + 864e5);
  }
  const ich = kennungWaehlen(kennungen, slots.size, [kuerzel, String(sz.person.id)]);

  const fehlzeiten: Paket['fehlzeiten'] = [];
  const verspaetungen: Paket['verspaetungen'] = [];
  for (const { z, stunde } of inMeinenStunden) {
    if (!ich || !Array.isArray(z.teacherIds) || !z.teacherIds.some((t: unknown) => String(t) === ich)) continue;
    const k = kurse.get(stunde.key)!;
    k.schueler.add(z.studentId);
    const art = artAusUntis(z.excuseStatus, typeof z.absenceReason === 'object' ? z.absenceReason?.name : z.absenceReason, z.absentTime);
    if (!art) continue;
    const datum = isoAusUntis(z.date);
    if (art === 'verspaetung') {
      const min = Number(z.absentTime) || 0;
      verspaetungen.push({ key: stunde.key, untisId: z.studentId, datum, minuten: min, ankunft: zeitAusMinuten(minutenVon(stunde.start) + min) });
    } else {
      fehlzeiten.push({ key: stunde.key, untisId: z.studentId, datum, beginn: zeitAusUntis(stunde.start), stunden: einheiten(stunde.start, stunde.ende), status: art, grund: String(z.absenceReason?.name ?? z.absenceReason ?? '') });
    }
  }
  inMeinenStunden.length = 0;
  if (ich) kuerzel = ich;

  melde('Schüler der eigenen Klassen');
  const alle = new Set([...kurse.values()].flatMap((k) => [...k.schueler]));
  const schuelerAlle = alsListe(await sz.r('getStudents')) as any[];
  const schueler: Paket['schueler'] = schuelerAlle
    .filter((s) => alle.has(s.id))
    .map((s) => ({ untisId: s.id, vorname: s.foreName ?? '', nachname: s.longName || s.name || '', geschlecht: geschlechtAus(s.gender) }));
  schuelerAlle.length = 0; // Rest der Schule sofort verwerfen

  // Stammdaten-Bericht je Klasse (wie in WebUntis › Stammdaten › Bericht). Klappt evtl. nicht mit dieser Anmeldung.
  melde('Stammdaten-Bericht (Geburtsdatum)');
  const stammdaten: string[] = [];
  for (const klasseId of new Set([...kurse.values()].map((k) => k.klasseId))) {
    try {
      const t = await sz.rest(`reports.do?name=Student&format=csv&klasseId=${klasseId}&studentsForDate=true&context=klasseId`);
      if (typeof t === 'string' && /birthDate/.test(t.slice(0, 500))) stammdaten.push(t);
    } catch { /* dann per Datei */ }
  }

  return {
    kuerzel, von: isoAusUntis(von), bis: isoAusUntis(bis),
    // Einzelne Vertretungsstunden in fremden Klassen sind keine eigenen Klassen: mindestens 3 Stunden im Halbjahr
    kurse: [...kurse.values()].filter((k) => k.anzahl >= 3),
    schueler, stunden: [...muster.values()], fehlzeiten, verspaetungen, ausfaelle, stammdaten
  };
}

/** Kennung, die in den eigenen Stunden am häufigsten vorkommt. Bevorzugt eine der Vorschläge, wenn sie in ≥ 30 % der Stunden steht. */
export function kennungWaehlen(kennungen: Map<string, Set<string>>, slots: number, vorschlaege: string[]): string {
  if (!slots) return '';
  const anteil = (k: string) => (kennungen.get(k)?.size ?? 0) / slots;
  for (const v of vorschlaege) if (v && anteil(v) >= 0.3) return v;
  const beste = [...kennungen.keys()].sort((a, b) => anteil(b) - anteil(a))[0];
  return beste && anteil(beste) >= 0.5 ? beste : '';
}

const zeitAusMinuten = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// ---------- Zusammenführen ----------

function neueLeistungen(id: string, von: string, bis: string): Leistung[] {
  const monate: string[] = [];
  const d = new Date(von.slice(0, 7) + '-01T12:00');
  while (d.toISOString().slice(0, 7) <= bis.slice(0, 7) && monate.length < 7) {
    monate.push(d.toISOString().slice(0, 7));
    d.setMonth(d.getMonth() + 1);
  }
  const monatsName = (m: string) => new Date(m + '-01T12:00').toLocaleDateString('de-DE', { month: 'short' }).replace('.', '');
  return [
    { id: `${id}-k1`, name: 'Klausur 1', art: 'Klausur', gruppe: 'klausuren', gewicht: 1 },
    { id: `${id}-k2`, name: 'Klausur 2', art: 'Klausur', gruppe: 'klausuren', gewicht: 1 },
    ...monate.map((m) => ({ id: `${id}-m${m}`, name: monatsName(m), art: 'Monatsnote', gruppe: 'mitarbeit' as const, gewicht: 1, monat: m }))
  ];
}

export interface Ergebnis {
  kurseNeu: number;
  kurse: number;
  schuelerNeu: number;
  schueler: number;
  fehlzeiten: number;
  offen: number;
  verspaetungen: number;
  stammdaten: number;
}

/**
 * Paket in die lokalen Daten übernehmen. Eigene Einträge (Noten, Mitarbeit, Notizen, Sitzplan, eigene Anwesenheit) bleiben.
 * Abgänge werden nicht gelöscht. WebUntis-Fehlzeiten werden bei jedem Abgleich neu gesetzt.
 */
export function uebernehmen(d: Daten, p: Paket, opt: { beispielEntfernen: boolean; benutzer: string; schule: string }): Ergebnis {
  if (opt.beispielEntfernen) {
    const weg = new Set(d.kurse.filter((k) => !k.untis).map((k) => k.id));
    const wegS = new Set(d.schueler.filter((s) => s.untisId === undefined).map((s) => s.id));
    d.kurse = d.kurse.filter((k) => !weg.has(k.id));
    d.schueler = d.schueler.filter((s) => !wegS.has(s.id));
    d.mitarbeit = d.mitarbeit.filter((e) => !weg.has(e.kursId));
    d.fehlzeiten = d.fehlzeiten.filter((e) => !weg.has(e.kursId));
    d.verspaetungen = d.verspaetungen.filter((e) => !weg.has(e.kursId));
    d.notizen = d.notizen.filter((n) => !wegS.has(n.schuelerId));
    d.stundenplan = d.stundenplan.filter((s) => s.quelle === 'untis');
  }

  // Schüler
  const sid = new Map<number, string>();
  let schuelerNeu = 0;
  for (const u of p.schueler) {
    let s = d.schueler.find((x) => x.untisId === u.untisId);
    if (!s) {
      s = { id: `u${u.untisId}`, untisId: u.untisId, vorname: u.vorname, nachname: u.nachname, geschlecht: u.geschlecht, geburt: '', mailDienst: '' };
      d.schueler.push(s);
      schuelerNeu++;
    } else {
      s.vorname = u.vorname; s.nachname = u.nachname; s.geschlecht = u.geschlecht;
    }
    sid.set(u.untisId, s.id);
  }

  // Klassen (Kurse)
  const kid = new Map<string, string>();
  let kurseNeu = 0;
  for (const k of p.kurse) {
    const key = kursKey(k.klasseId, k.fachId);
    const ids = [...k.schueler].map((x) => sid.get(x)).filter((x): x is string => !!x);
    let kurs = d.kurse.find((x) => x.untis && kursKey(x.untis.klasseId, x.untis.fachId) === key);
    if (!kurs) {
      const id = `uk${key}`;
      const neu: Kurs = {
        id, name: k.name, fach: k.fach, klasse: k.klasse, raum: k.raum, profil: profilAus(k.klasse),
        schueler: ids, leistungen: neueLeistungen(id, p.von, p.bis),
        gewichte: { klausuren: 0.5, sonstige: 0.5, mitarbeit: 0.6, sl: 0.4 },
        zellen: {}, endnoten: {}, stundenGehalten: k.gehalten, lernstoff: {}, uebergang: null,
        sitzplan: ausVorlage('reihen'), untis: { klasseId: k.klasseId, fachId: k.fachId }
      };
      verteilen(neu.sitzplan, [...ids].sort((a, b) => nach(d, a).localeCompare(nach(d, b), 'de')));
      d.kurse.push(neu);
      kurs = neu;
      kurseNeu++;
    } else {
      for (const i of ids) if (!kurs.schueler.includes(i)) kurs.schueler.push(i);
      kurs.stundenGehalten = k.gehalten;
      if (k.raum) kurs.raum = k.raum;
    }
    kid.set(key, kurs.id);
    for (const i of ids) { const s = d.schueler.find((x) => x.id === i); if (s && !s.klasse) s.klasse = k.klasse; }
  }

  // Stundenplan (Wochenmuster)
  d.stundenplan = d.stundenplan.filter((s) => s.quelle !== 'untis');
  for (const s of p.stunden) {
    const kursId = kid.get(s.key);
    if (kursId) d.stundenplan.push({ kursId, tag: s.tag, beginn: s.beginn, ende: s.ende, quelle: 'untis' } satisfies Stunde);
  }

  // Fehlzeiten und Verspätungen aus WebUntis: jedes Mal neu, eigene Einträge bleiben
  d.fehlzeiten = d.fehlzeiten.filter((f) => f.quelle !== 'untis');
  for (const f of p.fehlzeiten) {
    const kursId = kid.get(f.key);
    const schuelerId = sid.get(f.untisId);
    if (!kursId || !schuelerId) continue;
    d.fehlzeiten.push({ id: `uf${f.untisId}-${f.datum}-${f.beginn}`, kursId, schuelerId, datum: f.datum, stunden: f.stunden, status: f.status, quelle: 'untis', grund: f.grund, beginn: f.beginn });
  }
  d.verspaetungen = d.verspaetungen.filter((v) => v.quelle !== 'untis');
  for (const v of p.verspaetungen) {
    const kursId = kid.get(v.key);
    const schuelerId = sid.get(v.untisId);
    if (!kursId || !schuelerId) continue;
    d.verspaetungen.push({ id: `uv${v.untisId}-${v.datum}-${v.ankunft}`, kursId, schuelerId, datum: v.datum, ankunft: v.ankunft, minuten: v.minuten, quelle: 'untis' } satisfies Verspaetung);
  }

  let stammdaten = 0;
  for (const t of p.stammdaten) stammdaten += stammdatenEinlesen(d, t).zugeordnet;

  d.einstellungen.untis = {
    schule: opt.schule, benutzer: opt.benutzer, kuerzel: p.kuerzel, abgerufen: new Date().toISOString(),
    halbjahrVon: p.von, halbjahrBis: p.bis,
    ausfaelle: p.ausfaelle.map((a) => `${kid.get(a.key)}|${a.datum}|${a.beginn}`).filter((x) => !x.startsWith('undefined'))
  };

  const unsere = d.fehlzeiten.filter((f) => f.quelle === 'untis');
  return {
    kurseNeu, kurse: kid.size, schuelerNeu, schueler: sid.size,
    fehlzeiten: unsere.length, offen: unsere.filter((f) => f.status === 'offen').length,
    verspaetungen: d.verspaetungen.filter((v) => v.quelle === 'untis').length, stammdaten
  };
}

const nach = (d: Daten, id: string) => d.schueler.find((s) => s.id === id)?.nachname ?? '';
