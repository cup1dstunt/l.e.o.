import type { Daten, Kurs, Schueler, Stunde } from './typen.ts';

export const name = (s: Schueler) => `${s.vorname} ${s.nachname}`;
export const kurzname = (s: Schueler) => `${s.vorname} ${s.nachname[0]}.`;
export const alter = (s: Schueler, heute = new Date()) => {
  const g = new Date(s.geburt);
  let a = heute.getFullYear() - g.getFullYear();
  if (heute < new Date(heute.getFullYear(), g.getMonth(), g.getDate())) a--;
  return a;
};
export const heuteISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
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

/** Stunden des heutigen Tages, dazu die laufende und die nächste. */
export function stundenHeute(d: Daten, jetzt = new Date()) {
  const t = jetzt.getDay();
  const min = jetzt.getHours() * 60 + jetzt.getMinutes();
  const heute = d.stundenplan.filter((s) => s.tag === t).sort((a, b) => minuten(a.beginn) - minuten(b.beginn));
  const laeuft = heute.find((s) => minuten(s.beginn) <= min && min < minuten(s.ende));
  let naechste: (Stunde & { tagText?: string }) | undefined = heute.find((s) => minuten(s.beginn) > min);
  if (!naechste) {
    for (let i = 1; i <= 7 && !naechste; i++) {
      const tt = (t + i) % 7;
      const s = d.stundenplan.filter((x) => x.tag === tt).sort((a, b) => minuten(a.beginn) - minuten(b.beginn))[0];
      if (s) naechste = { ...s, tagText: i === 1 ? 'morgen' : ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][tt] };
    }
  }
  return { heute, laeuft, naechste, min };
}

export function fehlzeitenVon(d: Daten, kursId: string, schuelerId: string) {
  const liste = d.fehlzeiten.filter((f) => f.kursId === kursId && f.schuelerId === schuelerId).sort((a, b) => a.datum.localeCompare(b.datum));
  const kurs = d.kurse.find((k) => k.id === kursId)!;
  const stunden = liste.reduce((a, f) => a + f.stunden, 0);
  const quote = kurs.stundenGehalten ? stunden / kurs.stundenGehalten : 0;
  return {
    liste,
    tageE: new Set(liste.filter((f) => f.status === 'E').map((f) => f.datum)).size,
    tageUE: new Set(liste.filter((f) => f.status === 'UE').map((f) => f.datum)).size,
    stunden,
    quote
  };
}

export const prozent = (x: number) => (x * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' %';
