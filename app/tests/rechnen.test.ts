// Prüft den Rechenkern gegen RECHENLOGIK.md (Abschnitt 5) und die UPZ-Referenzwerte (FOS).
// Aufruf: npm test
import { readFileSync } from 'node:fs';
import { mittel, rechne, kaufm, monatsVorschlag, noetigeNote } from '../src/lib/rechnen.ts';
import type { Kurs } from '../src/lib/typen.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  const a = typeof ist === 'number' ? Math.round(ist * 100) / 100 : ist;
  if (JSON.stringify(a) === JSON.stringify(soll)) ok++;
  else {
    fehler++;
    console.log(`FEHLER ${name}: ist ${JSON.stringify(a)}, soll ${JSON.stringify(soll)}`);
  }
}
const p = (...w: (number | null)[]) => w.map((wert) => ({ wert, gewicht: 1 }));

// RECHENLOGIK 5.1 und 5.2 (gewichteter Mittelwert, leer übersprungen, 0 zählt)
gleich('T1', mittel(p(0, 15)), 7.5);
gleich('T2', mittel(p(0, 0)), 0);
gleich('T5', mittel(p(0, null)), 0);
gleich('T6', mittel(p(null, null)), null);
gleich('T8', mittel(p(13, 15)), 14);
gleich('T9', mittel([{ wert: 12, gewicht: 1 }, { wert: 0, gewicht: 0.1 }]), 10.91);
gleich('T14', mittel([{ wert: 3, gewicht: 0 }, { wert: 12, gewicht: 1 }]), 12);
gleich('T15', mittel(p(10, 11, null, 13)), 11.33);
gleich('T20', mittel([{ wert: 12, gewicht: 0.5 }, { wert: 6, gewicht: 1 }]), 8);
gleich('Runden 3,5', kaufm(3.5), 4);
gleich('Runden 9,49', kaufm(9.49), 9);
gleich('Monat FOS Ø2', monatsVorschlag('FOS', [2, 2])?.wert, 11);

// UPZ-Referenzwerte FOS (Klausuren 0,5/0,5; SL 0,4 gegen Mitarbeit 0,6; 50:50)
const ref = JSON.parse(readFileSync(new URL('../../docs/testfaelle/upz_referenzwerte.json', import.meta.url), 'utf8'));
const schl = ref.schluessel.fos;
const npAusProzent = (pr: number) => {
  let np = 0;
  schl.ab_prozent.forEach((g: number, i: number) => { if (pr >= g - 1e-9) np = schl.notenpunkte[i]; });
  return np;
};
for (const s of ref.profile.fos.schueler) {
  const zellen: Kurs['zellen'] = {};
  const setz = (lid: string, x: { notenpunkte?: number | null; status?: string | null } | undefined) => {
    if (!x) return;
    if (x.status === 'ue') zellen[`${lid}:S`] = { status: 'UE' };
    else if (x.notenpunkte !== null && x.notenpunkte !== undefined) zellen[`${lid}:S`] = { wert: x.notenpunkte };
  };
  setz('k1', s.klausur1);
  setz('k2', s.klausur2);
  setz('sl', s.sl_zusammen);
  if (s.mitarbeit_prozent !== null && s.mitarbeit_prozent !== undefined) zellen['ma:S'] = { wert: npAusProzent(s.mitarbeit_prozent) };
  const kurs: Kurs = {
    id: 'x', name: '', fach: '', klasse: '', raum: '', profil: 'FOS', schueler: ['S'], endnoten: {}, stundenGehalten: 0,
    lernstoff: {}, uebergang: null, zellen,
    gewichte: { klausuren: 0.5, sonstige: 0.5, mitarbeit: 0.6, sl: 0.4 },
    leistungen: [
      { id: 'k1', name: 'K1', gruppe: 'klausuren', art: 'Klausur', gewicht: 0.5 },
      { id: 'k2', name: 'K2', gruppe: 'klausuren', art: 'Klausur', gewicht: 0.5 },
      { id: 'sl', name: 'SL', gruppe: 'sl', art: 'Test', gewicht: 1 },
      { id: 'ma', name: 'MA', gruppe: 'mitarbeit', art: 'Monatsnote', gewicht: 1 }
    ]
  };
  const e = rechne(kurs, 'S');
  gleich(`UPZ FOS ${s.schueler} Zeugnis`, e.gesamt, s.zeugnis?.zeugnis_notenpunkte ?? null);
}

// Was-wäre-wenn: FOS, Klausur 1 = 4, Rest 8 → welche Klausur 2 für mindestens 5 Gesamt?
{
  const kurs: Kurs = {
    id: 'w', name: '', fach: '', klasse: '', raum: '', profil: 'FOS', schueler: ['S'], endnoten: {}, stundenGehalten: 0, lernstoff: {}, uebergang: null,
    gewichte: { klausuren: 0.5, sonstige: 0.5, mitarbeit: 0.6, sl: 0.4 },
    leistungen: [
      { id: 'k1', name: 'K1', gruppe: 'klausuren', art: 'Klausur', gewicht: 1 },
      { id: 'k2', name: 'K2', gruppe: 'klausuren', art: 'Klausur', gewicht: 1 },
      { id: 'ma', name: 'MA', gruppe: 'mitarbeit', art: 'Monatsnote', gewicht: 1 }
    ],
    zellen: { 'k1:S': { wert: 0 }, 'ma:S': { wert: 6 } }
  };
  // K-Ø = round((0 + x) / 2), Sonstige 6, Gesamt = round((K + 6) / 2) >= 8 → K >= 10 → x >= 19 unmöglich; Ziel 5 → K >= 3 (Rundung 4,5 → 5) → x >= 5
  gleich('Was-wäre-wenn Ziel 5', noetigeNote(kurs, 'S', 'k2', 5), 5);
  gleich('Was-wäre-wenn Ziel 8', noetigeNote(kurs, 'S', 'k2', 8), 'unmoeglich');
}

console.log(`${ok} bestanden, ${fehler} fehlgeschlagen`);
if (fehler) process.exit(1);
