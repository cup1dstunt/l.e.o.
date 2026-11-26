// Prüft den Schülerimport aus dem Stammdaten-Export und die Schulmails aus IServ (E119), mit erfundenen Daten.
// Aufruf: npm test
import { spaltenErkennen, stammdatenPruefen, stammdatenAnwenden, schulmailsEinlesen, lokaleTeile, mailStand, nameNorm, dateiId } from '../src/lib/stammdaten.ts';
import { uebernehmen, type Paket } from '../src/lib/untisimport.ts';
import type { Daten } from '../src/lib/typen.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

const s = (id: string, vorname: string, nachname: string, untisId?: number) => ({ id, vorname, nachname, geburt: '', geschlecht: 'w' as const, mailDienst: '', ...(untisId ? { untisId } : {}) });
function daten(): Daten {
  return {
    version: 1,
    schueler: [s('u1', 'Anna', 'Muster', 1), s('u2', 'Jörg', 'Müller-Lüdenscheidt', 2), s('u3', 'Ben', 'Beispiel', 3)],
    kurse: [{ id: 'k1', name: 'FOS12a Englisch', fach: 'Englisch', klasse: 'FOS12a', raum: '', profil: 'FOS', schueler: ['u1', 'u2'], untis: { klasseId: 10, fachId: 20 } } as any,
      { id: 'k2', name: 'AM26 Deutsch', fach: 'Deutsch', klasse: 'AM26', raum: '', profil: 'OSZ', schueler: ['u3'], untis: { klasseId: 11, fachId: 21 } } as any],
    mitarbeit: [], fehlzeiten: [], verspaetungen: [], notizen: [], nachschreiben: [], termine: [], stundenplan: [],
    einstellungen: {} as any
  } as unknown as Daten;
}

// Spalten erkennen: englischer WebUntis-Bericht und deutscher Export
gleich('englisch', spaltenErkennen(['name', 'longName', 'foreName', 'gender', 'birthDate', 'klasse.name', 'id', 'address.email']),
  { nachname: 'longName', vorname: 'foreName', geburt: 'birthDate', klasse: 'klasse.name', geschlecht: 'gender', mail: 'address.email', id: 'id' });
gleich('deutsch', spaltenErkennen(['Nachname', 'Vorname', 'Geburtsdatum', 'Klasse', 'Geschlecht', 'E-Mail']),
  { nachname: 'Nachname', vorname: 'Vorname', geburt: 'Geburtsdatum', klasse: 'Klasse', geschlecht: 'Geschlecht', mail: 'E-Mail' });
gleich('Namen gleich machen', nameNorm(' Müller-Lüdenscheidt '), 'mueller luedenscheidt');

// Vorschau: Treffer, fehlende Schüler der eigenen Klasse, fremde Klasse, private Mail
const csv = 'Nachname;Vorname;Geburtsdatum;Klasse;Geschlecht;E-Mail\n' +
  'Muster;Anna;05.02.2006;FOS12a;weiblich;anna.privat@example.org\n' +
  'Mueller-Luedenscheidt;Jörg;01.03.2005;FOS12a;männlich;j.mueller-luedenscheidt@osz-lus.de\n' +
  'Neu;Nora;07.07.2007;FOS12a;weiblich;n.neu@osz-lus.de\n' +
  'Still;Sam;08.08.2007;FOS12a;divers;\n' +
  'Fremd;Otto;01.01.2005;XY99;männlich;o.fremd@osz-lus.de\n';
const d = daten();
const v = stammdatenPruefen(d, csv);
gleich('gelesen', v.gelesen, 5);
gleich('Treffer', v.treffer.map((t) => t.schuelerId), ['u1', 'u2']);
gleich('neu je Kurs', v.neu.map((g) => [g.kursId, g.zeilen.map((z) => z.vorname)]), [['k1', ['Nora', 'Sam']]]);
gleich('fremd ignoriert', v.ignoriert, 1);
gleich('privat ignoriert', v.privatIgnoriert, 1);
gleich('private Mail nie in der Zeile', v.treffer[0].zeile.mail, '');

// Anwenden: Sam wird herausgenommen (andere Teilungsgruppe), Nora aufgenommen
const r = stammdatenAnwenden(d, v, { aufnehmen: { k1: [0] } });
gleich('Ergebnis', r, { zugeordnet: 2, geburt: 3, mail: 2, neu: 1 });
gleich('Geburtsdatum', d.schueler.find((x) => x.id === 'u1')!.geburt, '2006-02-05');
gleich('Schulmail', d.schueler.find((x) => x.id === 'u2')!.mailDienst, 'j.mueller-luedenscheidt@osz-lus.de');
gleich('Anna ohne private Mail', d.schueler.find((x) => x.id === 'u1')!.mailDienst, '');
const nora = d.schueler.find((x) => x.vorname === 'Nora')!;
gleich('Nora neu', [nora.herkunft, nora.geschlecht, nora.geburt, nora.mailDienst, nora.klasse], ['datei', 'w', '2007-07-07', 'n.neu@osz-lus.de', 'FOS12a']);
gleich('Nora im Kurs', d.kurse[0].schueler.includes(nora.id), true);
gleich('Sam nicht aufgenommen', d.schueler.some((x) => x.vorname === 'Sam'), false);
gleich('WebUntis-Geschlecht bleibt', d.schueler.find((x) => x.id === 'u2')!.geschlecht, 'w');
// Zweiter Import: niemand doppelt
const v2 = stammdatenPruefen(d, csv);
stammdatenAnwenden(d, v2, { aufnehmen: { k1: v2.neu[0]?.zeilen.map((_, i) => i) ?? [] } });
gleich('kein Doppelter', d.schueler.filter((x) => x.vorname === 'Nora').length, 1);
gleich('Sam beim zweiten Mal', d.schueler.filter((x) => x.vorname === 'Sam').length, 1);
gleich('dateiId stabil', dateiId(v.neu[0].zeilen[0]), 'x-fos12a-neu-nora');

// Fehlende Pflichtspalten: nichts passiert
gleich('ohne Vorname', stammdatenPruefen(daten(), 'Nachname;Klasse\nMuster;FOS12a\n').fehlt, ['vorname']);
// Spalte von Hand gewählt
gleich('von Hand', stammdatenPruefen(daten(), 'Familie;Ruf\nMuster;Anna\n', { nachname: 'Familie', vorname: 'Ruf' }).treffer.length, 1);

// Späterer WebUntis-Abgleich ordnet Nora über den Namen zu, statt sie doppelt anzulegen
const paket: Paket = {
  kuerzel: 'Ben', von: '2026-08-24', bis: '2027-01-29',
  kurse: [{ klasseId: 10, fachId: 20, name: 'FOS12a Englisch', fach: 'Englisch', klasse: 'FOS12a', raum: '', gehalten: 10, anzahl: 10, schueler: new Set([1, 77]) }],
  schueler: [{ untisId: 1, vorname: 'Anna', nachname: 'Muster', geschlecht: 'w' }, { untisId: 77, vorname: 'Nora', nachname: 'Neu', geschlecht: 'w' }],
  stunden: [], fehlzeiten: [{ key: '10-20', untisId: 77, datum: '2026-11-20', beginn: '08:00', stunden: 2, status: 'offen', grund: '' }],
  verspaetungen: [], ausfaelle: [], stammdaten: []
};
uebernehmen(d, paket, { beispielEntfernen: true, benutzer: 'x', schule: 'osz-lus' });
gleich('Nora einmal, mit WebUntis-Nummer', d.schueler.filter((x) => x.vorname === 'Nora').map((x) => [x.id, x.untisId]), [[nora.id, 77]]);
gleich('Fehlzeit bei Nora', d.fehlzeiten.map((f) => f.schuelerId), [nora.id]);
gleich('Beispiel-Entfernen lässt Export-Schüler', d.schueler.some((x) => x.vorname === 'Sam'), true);

// Schulmails aus IServ
const m = daten();
gleich('Teile Doppelname', lokaleTeile(m.schueler[1]).includes('j.mueller-luedenscheidt'), true);
const text = 'Anna Muster <anna.muster@osz-lus.de>\n' +
  'j.luedenscheidt@osz-lus.de\n' +
  'b.beispiel@osz-lus.de; x.fremd@osz-lus.de, lehrer@example.org\n';
const rm = schulmailsEinlesen(m, text);
gleich('Mails', rm, { gefunden: 4, zugeordnet: 3, unklar: 1 });
gleich('Mail Anna (nach Name)', m.schueler[0].mailDienst, 'anna.muster@osz-lus.de');
gleich('Mail Jörg (Teil des Doppelnamens)', m.schueler[1].mailDienst, 'j.luedenscheidt@osz-lus.de');
gleich('Mail Ben', m.schueler[2].mailDienst, 'b.beispiel@osz-lus.de');
// Nur eigene Klassen
const m2 = daten();
gleich('nur Auswahl', schulmailsEinlesen(m2, 'b.beispiel@osz-lus.de', new Set(['u1'])).zugeordnet, 0);
gleich('Stand', mailStand(daten().schueler), { hinterlegt: 0, muster: 3, pruefen: 1 });

console.log(`Schülerimport: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
