// Prüft Modul 1 Nachschreiben: Fälle aus Notenbuch und Fehlzeiten (E104), Hinweise bei Statusänderung (F10),
// Termine, Mail-Platzhalter und Adressmuster (E105, E106), Fristen und Quote (F11).
// Aufruf: npm test
import { nachschreibLage, terminSicht, fallSchluessel, adressVorschlag, schulAdresse, fuellen, mailLink, fristAbgelaufen, quotenStufe, mailWerte, MAIL_STANDARD } from '../src/lib/nachschreiben.ts';
import { zellWert, rechne } from '../src/lib/rechnen.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

const schueler = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id, vorname: 'V' + id, nachname: 'N' + id, geburt: '', geschlecht: 'w' as const, mailDienst: '' }));
const kurs: any = {
  id: 'k', name: 'K', fach: 'Englisch', klasse: '2FOS', raum: '2.14', profil: 'FOS', schueler: schueler.map((s) => s.id),
  leistungen: [
    { id: 'k1', name: 'Klausur 1', gruppe: 'klausuren', art: 'Klausur', gewicht: 1, datum: '2026-10-08' },
    { id: 't1', name: 'Test 1', gruppe: 'sl', art: 'Test', gewicht: 1, datum: '2026-10-08' }
  ],
  gewichte: { klausuren: 0.5, sonstige: 0.5, mitarbeit: 0.5, sl: 0.5 },
  zellen: {
    'k1:a': { status: 'E' },
    'k1:b': { status: 'offen' },
    'k1:c': { status: 'UE' },
    'k1:d': { wert: 9 },
    // e: leer, Fehlzeit offen → Fall aus den Fehlzeiten
    // f: leer, Fehlzeit UE → Hinweis
    'k1:g': { status: 'offen' }
  },
  endnoten: {}, stundenGehalten: 40, lernstoff: {}, uebergang: null, sitzplan: { vorlage: 'reihen', spalten: 1, reihen: 1, tische: [true], belegung: {} }
};
const fz = (sid: string, status: string, quelle?: string) => ({ id: sid + status, kursId: 'k', schuelerId: sid, datum: '2026-10-08', stunden: 2, status, quelle });
const d: any = {
  version: 1, schueler, kurse: [kurs], mitarbeit: [], verspaetungen: [], notizen: [], stundenplan: [], einstellungen: {},
  fehlzeiten: [fz('d', 'UE'), fz('e', 'offen'), fz('f', 'UE'), fz('g', 'offen'), fz('g', 'E', 'untis'), fz('a', 'E')],
  nachschreiben: [{ id: 't', datum: '2026-11-24', beginn: '14:00', raum: '2.14', faelle: [fallSchluessel('k', 'k1', 'a'), fallSchluessel('k', 'k1', 'd'), fallSchluessel('k', 'k1', 'c')], vorbereitet: false, gedruckt: false, mails: { [fallSchluessel('k', 'k1', 'a')]: '2026-11-20' } }]
};

// ---------- Fälle (E104) ----------
const lage = nachschreibLage(d);
gleich('Fälle: E, offen, aus Fehlzeit, offen (g)', lage.faelle.map((f) => `${f.schueler.id}:${f.status}:${f.quelle}`), ['a:E:notenbuch', 'b:offen:notenbuch', 'e:offen:fehlzeit', 'g:offen:notenbuch']);
gleich('UE nie auf der Liste', lage.faelle.some((f) => f.schueler.id === 'c' || f.schueler.id === 'f'), false);
gleich('nur Klausuren, keine Tests', lage.faelle.every((f) => f.leistung.id === 'k1'), true);
gleich('a hat Termin, Rest ohne', lage.ohneTermin.map((f) => f.schueler.id), ['b', 'e', 'g']);

// ---------- Hinweise (F10) ----------
const h = Object.fromEntries(lage.hinweise.map((x) => [x.schueler.id, x]));
gleich('Note eingetragen, später UE: nur Hinweis', [!!h.d, h.d?.setzen], [true, undefined]);
gleich('leer + UE: UE übernehmen', h.f?.setzen, 'UE');
gleich('offen im Notenbuch, WebUntis E: E übernehmen', h.g?.setzen, 'E');
gleich('keine weiteren Hinweise', Object.keys(h).sort(), ['d', 'f', 'g']);

// ---------- Termin ----------
const t = terminSicht(d, d.nachschreiben[0]);
gleich('Termin: Stände', t.eintraege.map((e) => `${e.schueler.id}:${e.stand}`), ['a:offen', 'd:erledigt', 'c:entfaellt']);
gleich('Termin nicht erledigt, solange a offen', t.erledigt, false);
gleich('Mails/Noten gezählt', [t.mailsFertig, t.notenFertig], [1, 1]);
gleich('gelöschte Klausur fällt raus', terminSicht(d, { ...d.nachschreiben[0], faelle: ['k|weg|a'] }).eintraege.length, 0);

// ---------- Rechnen: offen wie E ----------
gleich('offen zählt nicht', zellWert('FOS', { status: 'offen' }), null);
gleich('offen in nachschreiben', rechne(kurs, 'b').nachschreiben, ['Klausur 1']);

// ---------- Mail (E105) ----------
const w = mailWerte(d.nachschreiben[0], kurs, kurs.leistungen[0], schueler[0]);
const text = fuellen(MAIL_STANDARD.text, w);
gleich('Platzhalter eingesetzt', [text.includes('Hallo Va,'), text.includes('14:00 Uhr in Raum 2.14'), /\{\w+\}/.test(text)], [true, true, false]);
gleich('unbekannter Platzhalter bleibt', fuellen('{x} {vorname}', { vorname: 'A' }), '{x} A');
gleich('mailto', mailLink('a.b@osz-lus.de', 'Ü & Co', 'Zeile 1\nZeile 2'), 'mailto:a.b@osz-lus.de?subject=%C3%9C%20%26%20Co&body=Zeile%201%0AZeile%202');

// ---------- Adressmuster (E106) ----------
gleich('einfach', adressVorschlag('Max', 'Mustermann'), { adresse: 'm.mustermann@osz-lus.de', pruefen: [] });
gleich('Umlaut', adressVorschlag('Jörg', 'Müller'), { adresse: 'j.mueller@osz-lus.de', pruefen: ['Umlaut'] });
gleich('ß', adressVorschlag('Lea', 'Strauß'), { adresse: 'l.strauss@osz-lus.de', pruefen: ['ß'] });
gleich('Doppelname', adressVorschlag('Ana', 'García López'), { adresse: 'a.garcialopez@osz-lus.de', pruefen: ['Akzent', 'Doppelname'] });
gleich('Bindestrich', adressVorschlag('Tom', 'Schulz-Brandt').adresse, 't.schulz-brandt@osz-lus.de');
gleich('Umlaut am Vornamen', adressVorschlag('Ömer', 'Kaya'), { adresse: 'o.kaya@osz-lus.de', pruefen: ['Umlaut'] });
const zwei = [
  { id: '1', vorname: 'Max', nachname: 'Meier', mailDienst: '' },
  { id: '2', vorname: 'Mia', nachname: 'Meier', mailDienst: '' },
  { id: '3', vorname: 'Ole', nachname: 'Berg', mailDienst: 'o.berg2@osz-lus.de' }
] as any[];
gleich('Namensgleichheit markiert', schulAdresse(zwei[0], zwei).pruefen, ['Namensgleichheit']);
gleich('hinterlegt gewinnt', schulAdresse(zwei[2], zwei), { adresse: 'o.berg2@osz-lus.de', vorschlag: false, pruefen: [] });

// ---------- Frist und Quote (F11) ----------
gleich('FOS 3 Tage', [fristAbgelaufen('FOS', '2026-11-16', '2026-11-19'), fristAbgelaufen('FOS', '2026-11-16', '2026-11-20')], [false, true]);
gleich('Berufsschule 14 Tage', [fristAbgelaufen('OSZ', '2026-11-01', '2026-11-15'), fristAbgelaufen('OSZ', '2026-11-01', '2026-11-16')], [false, true]);
gleich('Quote', [quotenStufe(0.1), quotenStufe(0.2), quotenStufe(0.3), quotenStufe(0.31)], ['', 'mittel', 'mittel', 'hoch']);

console.log(`Nachschreiben: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
