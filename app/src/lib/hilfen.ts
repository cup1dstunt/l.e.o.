import type { Daten, Kurs, Schueler, Stunde } from './typen.ts';

export const name = (s: Schueler) => `${s.vorname} ${s.nachname}`;
export const kurzname = (s: Schueler) => `${s.vorname} ${s.nachname[0]}.`;

/** Kurznamen, die in einer Liste eindeutig sind (Testrunde B4): erst mehr Buchstaben vom Nachnamen,
 *  bei ganz gleichem Namen das Geburtsjahr bzw. eine laufende Nummer. */
export function kurznameIn(alle: Schueler[]): (s: Schueler) => string {
  const fest = new Map<string, string>();
  const gruppen = new Map<string, Schueler[]>();
  for (const s of alle) { const k = kurzname(s); gruppen.set(k, [...(gruppen.get(k) ?? []), s]); }
  for (const [k, liste] of gruppen) {
    if (liste.length === 1) { fest.set(liste[0].id, k); continue; }
    for (const s of liste) {
      let n = 2;
      while (n < s.nachname.length && liste.some((x) => x !== s && x.vorname === s.vorname && x.nachname.slice(0, n) === s.nachname.slice(0, n))) n++;
      const gleich = liste.filter((x) => x.vorname === s.vorname && x.nachname === s.nachname);
      if (gleich.length < 2) { fest.set(s.id, `${s.vorname} ${s.nachname.slice(0, n)}${n < s.nachname.length ? '.' : ''}`); continue; }
      const jahre = gleich.map((x) => x.geburt?.slice(0, 4) ?? '');
      const jahrHilft = jahre.every((j) => j) && new Set(jahre).size === jahre.length;
      fest.set(s.id, `${kurzname(s)} ${jahrHilft ? `(${s.geburt.slice(2, 4)})` : `(${gleich.indexOf(s) + 1})`}`);
    }
  }
  return (s: Schueler) => fest.get(s.id) ?? kurzname(s);
}
/** Volle Namen (Vor- und Nachname), bei ganz gleichem Namen mit Geburtsjahr bzw. laufender Nummer. Für die Stunde (28.11.). */
export function namenIn(alle: Schueler[]): (s: Schueler) => string {
  const fest = new Map<string, string>();
  const gruppen = new Map<string, Schueler[]>();
  for (const s of alle) { const k = name(s); gruppen.set(k, [...(gruppen.get(k) ?? []), s]); }
  for (const [k, gleich] of gruppen) {
    if (gleich.length < 2) continue;
    const jahre = gleich.map((x) => x.geburt?.slice(0, 4) ?? '');
    const jahrHilft = jahre.every((j) => j) && new Set(jahre).size === jahre.length;
    gleich.forEach((s, i) => fest.set(s.id, `${k} ${jahrHilft ? `(${s.geburt.slice(2, 4)})` : `(${i + 1})`}`));
  }
  return (s: Schueler) => fest.get(s.id) ?? name(s);
}
export const alter = (s: Schueler, heute = new Date()) => {
  if (!s.geburt) return null; // aus WebUntis ohne Export unbekannt
  const g = new Date(s.geburt);
  let a = heute.getFullYear() - g.getFullYear();
  if (heute < new Date(heute.getFullYear(), g.getMonth(), g.getDate())) a--;
  return a;
};
export const heuteISO = () => isoDatum(new Date());
export const datumKurz = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
export const datumWt = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
export const minuten = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function schuelerVon(d: Daten, k: Kurs) {
  return k.schueler.map((id) => d.schueler.find((s) => s.id === id)!).filter(Boolean)
    .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de'));
}

export const isoDatum = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Ausgefallen laut WebUntis (WU1)? Schlüssel wie beim Import: `${kursId}|${datum}|${beginn}`. */
export function istAusfall(d: Daten, s: Stunde, datum: string) {
  return (d.einstellungen.untis?.ausfaelle ?? []).includes(`${s.kursId}|${datum}|${s.beginn}`);
}

export type StundeHeute = Stunde & { ausfall: boolean; tagText?: string };

/** Stunden des heutigen Tages, dazu die laufende und die nächste. Ausgefallene Stunden laufen nie und kommen nie als Nächstes (WU1). */
export function stundenHeute(d: Daten, jetzt = new Date()) {
  const t = jetzt.getDay();
  const min = jetzt.getHours() * 60 + jetzt.getMinutes();
  const datum = isoDatum(jetzt);
  const tagesplan = (tag: number, iso: string): StundeHeute[] =>
    d.stundenplan.filter((s) => s.tag === tag).sort((a, b) => minuten(a.beginn) - minuten(b.beginn))
      .map((s) => ({ ...s, ausfall: istAusfall(d, s, iso) }));
  const heute = tagesplan(t, datum);
  const laeuft = heute.find((s) => !s.ausfall && minuten(s.beginn) <= min && min < minuten(s.ende));
  let naechste: StundeHeute | undefined = heute.find((s) => !s.ausfall && minuten(s.beginn) > min);
  if (!naechste) {
    for (let i = 1; i <= 7 && !naechste; i++) {
      const tag = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + i);
      const s = tagesplan(tag.getDay(), isoDatum(tag)).find((x) => !x.ausfall);
      if (s) naechste = { ...s, tagText: i === 1 ? 'morgen' : ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][tag.getDay()] };
    }
  }
  // Fällt die Stunde aus, die gerade laufen würde, zeigt die Startseite das an
  const ausfallJetzt = heute.find((s) => s.ausfall && minuten(s.beginn) <= min && min < minuten(s.ende));
  return { heute, laeuft, naechste, ausfallJetzt, min };
}

export function fehlzeitenVon(d: Daten, kursId: string, schuelerId: string) {
  const alle = d.fehlzeiten.filter((f) => f.kursId === kursId && f.schuelerId === schuelerId);
  // Hat WebUntis für den Tag einen Eintrag, gilt dieser; die eigene Erfassung zählt dann nicht doppelt
  const ausUntis = new Set(alle.filter((f) => f.quelle === 'untis').map((f) => f.datum));
  const liste = alle.filter((f) => f.quelle === 'untis' || !ausUntis.has(f.datum)).sort((a, b) => a.datum.localeCompare(b.datum));
  const kurs = d.kurse.find((k) => k.id === kursId)!;
  const stunden = liste.reduce((a, f) => a + f.stunden, 0);
  const quote = kurs.stundenGehalten ? stunden / kurs.stundenGehalten : 0;
  return {
    liste,
    tageE: new Set(liste.filter((f) => f.status === 'E').map((f) => f.datum)).size,
    tageUE: new Set(liste.filter((f) => f.status === 'UE').map((f) => f.datum)).size,
    tageOffen: new Set(liste.filter((f) => f.status === 'offen').map((f) => f.datum)).size,
    stunden,
    quote
  };
}

/** Verspätungen eines Schülers; WebUntis gewinnt bei gleichem Tag. */
export function verspaetungenVon(d: Daten, kursId: string | undefined, schuelerId: string) {
  const alle = d.verspaetungen.filter((v) => v.kursId === kursId && v.schuelerId === schuelerId);
  const ausUntis = new Set(alle.filter((v) => v.quelle === 'untis').map((v) => v.datum));
  return alle.filter((v) => v.quelle === 'untis' || !ausUntis.has(v.datum)).sort((a, b) => b.datum.localeCompare(a.datum));
}

export const prozent = (x: number) => (x * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' %';

export const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
/** Anzahl verschiedener Tage je Wochentag Mo–Fr */
export function nachWochentag(daten: string[]) {
  const tage = [...new Set(daten)];
  return WOCHENTAGE.map((_, i) => tage.filter((t) => new Date(t + 'T12:00').getDay() === i + 1).length);
}

/** Trendpfeil mündliche Leistungen (E88, PB5): Smiley-Schnitt im letzten Monat gegen den Monat davor; niedrig = besser. */
export function mitarbeitTrend(d: Daten, kursId: string, schuelerId: string): '' | 'besser' | 'gleich' | 'schlechter' {
  const m = new Map<string, number[]>();
  for (const e of d.mitarbeit) if (e.kursId === kursId && e.schuelerId === schuelerId) m.set(e.zeit.slice(0, 7), [...(m.get(e.zeit.slice(0, 7)) ?? []), e.stufe]);
  const r = [...m.entries()].sort().slice(-2).map(([, v]) => v.reduce((a, b) => a + b, 0) / v.length);
  if (r.length < 2) return '';
  return r[1] < r[0] - 0.3 ? 'besser' : r[1] > r[0] + 0.3 ? 'schlechter' : 'gleich';
}
export const PFEIL = { '': '', besser: '↗', gleich: '→', schlechter: '↘' } as const;

/** Verspätungen einer Klasse nach Wochentag (FB14): Anzahl, Minuten und die konkreten Einträge je Tag Mo–Fr. */
export function verspaetungenNachWochentag<T extends { datum: string; minuten: number }>(liste: T[]) {
  return WOCHENTAGE.map((name, i) => {
    const e = liste.filter((v) => new Date(v.datum + 'T12:00').getDay() === i + 1);
    return { name, anzahl: e.length, minuten: e.reduce((a, v) => a + v.minuten, 0), eintraege: e };
  });
}
