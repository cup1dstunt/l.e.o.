// Datenmodell des Prototyps. Alles liegt lokal im Gerät (IndexedDB), es gibt keinen Notenserver.

export type Profil = 'FOS' | 'OSZ';
export type Gruppe = 'klausuren' | 'sl' | 'mitarbeit';
export type Stufe = 1 | 2 | 3 | 4 | 5; // Smiley 1 = Note 1 (sehr gut) … Smiley 5 = Note 5 (E72)

export interface Schueler {
  id: string;
  vorname: string;
  nachname: string;
  geburt: string; // ISO-Datum, leer wenn unbekannt (WebUntis liefert es nur per Export)
  geschlecht: 'w' | 'm' | 'd';
  mailDienst: string;
  mailPrivat?: string;
  nta?: string; // Nachteilsausgleich, z. B. „Zeitverlängerung 25 %“
  untisId?: number; // Herkunft WebUntis (V11): Abgleich über diese Nummer
  klasse?: string; // Klassenname laut WebUntis
}

export interface Leistung {
  id: string;
  name: string;
  gruppe: Gruppe;
  art: string; // Klausur, Test, Präsentation, Abgabe, Monatsnote …
  gewicht: number; // relativ innerhalb der Gruppe (E41)
  datum?: string;
  monat?: string; // nur Monatsnoten, Format JJJJ-MM
}

export interface Zelle {
  wert?: number;
  status?: 'E' | 'UE' | 'offen'; // offen = gefehlt, Entschuldigung noch ungeklärt; darf nachschreiben (E104)
  gewicht?: number; // Einzelgewicht, ersetzt das Spaltengewicht für diesen Schüler
  stern?: string; // Vorbehalt (E42)
}

export interface Gewichte {
  klausuren: number; // fest 0,5 (E83, Schulvorgabe), nur aus Kompatibilität gespeichert
  sonstige: number; // fest 0,5
  mitarbeit: number; // mündliche Leistungen innerhalb AT (E85), frei
  sl: number; // übrige sonstige Leistungen (Tests, Präsentationen …)
}

export interface Kurs {
  id: string;
  name: string;
  fach: string;
  klasse: string;
  raum: string;
  profil: Profil;
  schueler: string[];
  leistungen: Leistung[];
  gewichte: Gewichte;
  zellen: Record<string, Zelle>; // Schlüssel `${leistungId}:${schuelerId}`
  endnoten: Record<string, number>; // festgelegte Endnote je Schüler
  stundenGehalten: number; // Basis der Fehlzeitenquote
  lernstoff: Record<string, Lernstoff>; // je Datum
  uebergang: { text: string; datum: string } | null; // Notiz für die nächste Stunde
  sitzplan: Sitzplan;
  untis?: { klasseId: number; fachId: number }; // Herkunft WebUntis: Klasse + Fach
  zufall?: ZufallStand; // fairer Zufall über mehrere Stunden (P5, E109)
  gruppenRegeln?: GruppenRegeln; // „nicht zusammen“ / „gern zusammen“ (P7)
  gruppensaetze?: Gruppensatz[]; // gespeicherte Gruppen, neueste zuerst (P8)
  gruppenAktiv?: string; // id des Gruppensatzes, der im Sitzplan erscheint
  muendlich?: MuendlichEinstellung; // Raster und Schwelle für die mündlichen Leistungen (FB7, E110)
  einschaetzungen?: Record<string, RasterEinschaetzung>; // Schlüssel `${monat}:${schuelerId}`
  selbst?: Record<string, SelbstRunde>; // Selbsteinschätzung per Link (FB7b, E116), Schlüssel = Monat
  projekte?: Projekt[]; // Gruppenarbeit über mehrere Stunden (P9, E118), neueste zuerst
  reihen?: Reihe[]; // Semesterplanung (PB16, E114): Unterrichtsreihen in Reihenfolge
  untisStunden?: string[]; // echte Termine laut WebUntis im Schuljahr, `${datum}|${beginn}|${ende}` (auch Blockwochen, A/B-Wochen)
}

/** Was in einer Stunde dran ist (PB15) und wo man stehengeblieben ist (PB1). */
export interface Lernstoff {
  text: string; // Thema / Stoff
  hausaufgabe: string;
  stand?: string; // „Wo wir stehengeblieben sind“, beim Abschließen der Stunde gespeichert
}

/** Unterrichtsreihe der Semesterplanung: Titel und wie viele Blöcke sie braucht (E114). */
export interface Reihe {
  id: string;
  titel: string;
  bloecke: number;
}

/** Kalendereintrag (K2, E115). Unterrichtsfrei + keine Klassen = für alle eigenen Klassen frei. */
export interface Termin {
  id: string;
  datum: string; // ISO-Datum
  bis?: string; // letzter Tag bei mehrtägigen Terminen
  beginn?: string; // HH:MM, fehlt = ganztägig
  ende?: string;
  titel: string;
  art: TerminArt;
  kursIds?: string[]; // betroffene Klassen (Ausfall, Exkursion, Abgabe)
  unterrichtFrei?: boolean; // zählt in der Semesterplanung nicht als Block
  notiz?: string;
  quelle?: 'ics'; // aus einer Kalenderdatei (z. B. IServ), beim nächsten Import ersetzt
  uid?: string; // UID aus der Kalenderdatei
}
export type TerminArt = 'konferenz' | 'aufsicht' | 'sprechtag' | 'abgabe' | 'ausflug' | 'ausfall' | 'frei' | 'sonstiges';

/** Ferien und Feiertage (aus WebUntis); ohne Abgleich nimmt L.E.O. Beispielwerte (semester.ts). */
export interface FreieZeit {
  name: string;
  von: string;
  bis: string;
}

/** Gruppenarbeit über mehrere Stunden bis ein Halbjahr (P9, E118): feste Gruppen, Gruppennote aus dem Raster, Abweichung je Mitglied. */
export interface Projekt {
  id: string;
  titel: string;
  von: string; // ISO-Datum
  bis: string; // ISO-Datum, Abgabe oder Präsentation
  rasterId: string; // Projektraster (Raster mit art „projekt“)
  gewichte?: Record<string, number>; // Gewicht je Kriterium in diesem Projekt, fehlt = aus dem Raster
  anteilProdukt?: number; // Anteil Handlungsprodukt in Prozent, Rest Arbeitsweise (E118), fehlt = 50
  zaehltAls: 'sl' | 'mitarbeit'; // Notenbuch: Tests/Sonstiges oder mündliche Leistungen
  gruppen: ProjektGruppe[];
  einzelStufen?: Record<string, Record<string, 1 | 2 | 3 | 4>>; // Schüler → Kriterium der Arbeitsweise → eigene Stufe, fehlt = Stufe der Gruppe
  abweichung?: Record<string, { schritte: number; grund?: string }>; // veraltet (erste Fassung), wird nicht mehr gerechnet
  leistungId?: string; // Notenbuchspalte, entsteht beim ersten Übernehmen
  satzId?: string; // Gruppensatz, über den die Gruppen im Sitzplan erscheinen
  mails?: Record<string, string>; // Schüler → Datum, an dem die Rückmeldung geöffnet wurde
  abgeschlossen?: boolean;
}

export interface ProjektGruppe {
  id: string;
  name: string; // G1, G2 … oder eigener Name
  thema: string;
  mitglieder: string[];
  stufen: Record<string, 1 | 2 | 3 | 4>; // Kriterium-id → Stufe der Gruppe (Arbeitsweise: Vorgabe für alle Mitglieder)
  notizen: { datum: string; text: string }[]; // Stand der Gruppe, neueste zuerst
}

/** Wie die Klasse mündlich bewertet wird (E110): Smileys, Raster springt ein, wenn zu wenige da sind. */
export interface MuendlichEinstellung {
  rasterId: string;
  mindestSmileys: number; // weniger Smileys im Monat = L.E.O. bietet das Raster an
  zusatz?: string[]; // eingeschaltete optionale Kriterien, z. B. Hausaufgaben (E112)
  gewichte?: Record<string, number>; // Gewicht je Kriterium-id in dieser Klasse (E113), fehlt = aus dem Raster
  selbst?: boolean; // Selbsteinschätzung per Link in dieser Klasse an (FB7b, E116)
}

/** Eine Runde Selbsteinschätzung (FB7b, E116): ein Monat, ein Raster, ein Einmal-Link je Schüler.
 *  Auf dem Server liegen nur Bogen (Kriterien ohne Namen), Hashes der Links und verschlüsselte Antworten.
 *  Wer zu welchem Link gehört und der Schlüssel zum Lesen stehen nur hier. */
export interface SelbstRunde {
  id: string; // Runde auf dem Server (Zufall, verrät nichts über die Klasse)
  monat: string;
  rasterId: string;
  kriterien: string[]; // ids der Kriterien im Bogen
  frist: string; // JJJJ-MM-TT, letzter Tag zum Abgeben
  basis: string; // Adresse, unter der die Schüler den Bogen öffnen, z. B. https://leo.example.de
  privat: JsonWebKey; // privater Schlüssel zum Lesen der Antworten
  links: Record<string, SelbstLink>; // Schüler-id → Link
  antworten: Record<string, SelbstAntwort>; // Schüler-id → entschlüsselte Antwort
  erstellt: string;
  geholt?: string; // letzter Abruf der Antworten
  beendet?: string; // Runde auf dem Server gelöscht, Antworten bleiben hier
}
export interface SelbstLink { token: string; mail?: string; erinnert?: string }
export interface SelbstAntwort { stufen: Record<string, 1 | 2 | 3 | 4>; kommentar?: string; zeit: string }

/** Kriterienraster (E110): Bereiche mit Gewicht, Kriterien mit 4 Stufen (Index 0 = Stufe 4 = beste). */
export interface Raster {
  id: string;
  name: string;
  fach: string; // z. B. „Englisch“, leer = fachübergreifend
  bereiche: RasterBereich[];
  vorlage?: true; // eingebaute Vorlage, nicht änderbar (kopieren geht)
  art?: 'projekt'; // Projektraster für die Gruppenarbeit (E118), fehlt = mündliche Leistungen
}

export interface RasterBereich {
  name: string;
  einzeln?: true; // Projektraster (E118): je Person bewertet (Arbeitsweise), sonst einmal für die Gruppe (Handlungsprodukt)
  gewicht: number; // nicht mehr in der Rechnung (E113); es zählt das Gewicht je Kriterium
  kriterien: RasterKriterium[];
}

export interface RasterKriterium {
  id: string;
  name: string;
  stufen: [string, string, string, string]; // Stufe 4, 3, 2, 1 (Beschreibung, Ich-Form für die spätere Selbsteinschätzung)
  optional?: true; // nur wenn die Klasse es einschaltet (z. B. Hausaufgaben, E112)
  gewicht?: number; // Standardgewicht (E113), fehlt = 1
}

/** Eine Einschätzung mit dem Raster für einen Schüler und einen Monat. */
export interface RasterEinschaetzung {
  rasterId: string;
  stufen: Record<string, 1 | 2 | 3 | 4>; // Kriterium-id → Stufe
  zeit: string; // ISO-Zeitpunkt der letzten Änderung
}

/** Eigener oder geänderter Textbaustein (E110). kriterium = Name eines Rasterkriteriums, z. B. „Beteiligung“. */
export interface Baustein {
  text: string;
  stufe: Stufe;
  kriterium?: string;
}

/** Ein Aufruf aus dem Zufallsgenerator. */
export interface Aufruf {
  schuelerId: string;
  zeit: string; // ISO-Zeitpunkt
}

/** Laufende Runde: wer wie oft dran war. Neue Runde, wenn alle ihre Lose verbraucht haben. */
export interface ZufallStand {
  runde: Record<string, number>; // Schüler → Aufrufe in dieser Runde
  rundeSeit: string; // ISO-Zeitpunkt
  gewichtet: boolean; // schwächere Mitarbeit und „zwischen zwei Noten“ öfter (E109)
  protokoll: Aufruf[]; // neueste zuletzt, höchstens 400
}

export interface GruppenRegeln {
  nicht: [string, string][];
  gern: [string, string][];
}

export interface Gruppensatz {
  id: string;
  name: string;
  datum: string; // ISO-Datum
  gruppen: string[][]; // Schüler-ids je Gruppe
  projektId?: string; // gehört zu einem Projekt (P9) und wird nie automatisch gelöscht
}

/** Sitzplan als Raster (E86): Zellen sind Tisch oder frei, Belegung je Zellennummer. */
export interface Sitzplan {
  vorlage: string;
  spalten: number;
  reihen: number;
  tische: boolean[];
  belegung: Record<number, string>;
}

export interface Verspaetung {
  id: string;
  kursId: string;
  schuelerId: string;
  datum: string;
  ankunft: string; // HH:MM
  minuten: number;
  quelle?: 'untis';
}

export interface MitarbeitEintrag {
  id: string;
  kursId: string;
  schuelerId: string;
  zeit: string; // ISO-Zeitpunkt
  stufe: Stufe;
  bausteine: string[];
  kommentar?: string;
}

export interface Fehlzeit {
  id: string;
  kursId: string;
  schuelerId: string;
  datum: string;
  stunden: number;
  status: 'E' | 'UE' | 'offen'; // offen = in der Stunde erfasst, E/UE kommt später (E84)
  quelle?: 'untis'; // fehlt = in L.E.O. erfasst
  grund?: string; // Kürzel des Abwesenheitsgrunds aus WebUntis, nur für Details
  beginn?: string; // HH:MM der Stunde (WebUntis)
}

/** Nachschreibetermin (F8–F10): Fälle `${kursId}|${leistungId}|${schuelerId}`, auch klassenübergreifend. */
export interface NachTermin {
  id: string;
  datum: string; // ISO-Datum
  beginn: string; // HH:MM
  raum: string;
  faelle: string[];
  vorbereitet: boolean; // Checkliste: Nachschreibeklausur erstellt
  gedruckt: boolean;
  mails: Record<string, string>; // Fall → Datum, an dem die Mail geöffnet wurde (E105)
  notiz?: string;
  hinweis?: string; // Zusatz für alle Mails dieses Termins, Platzhalter {hinweis} (E117)
  entwuerfe?: Record<string, MailEntwurf>; // Fall → angepasste Mail (E117)
}

/** Vor dem Senden angepasste Mail eines Falls (E117). Fehlt betreff/text, gilt die Vorlage. */
export interface MailEntwurf {
  vorlage?: string; // gewählte Vorlage, fehlt = passend zum Status
  betreff?: string;
  text?: string;
  stand?: string; // terminStand beim Anpassen; weicht er ab, wird der Entwurf als veraltet markiert
}

export interface Notiz {
  id: string;
  schuelerId: string;
  datum: string;
  text: string;
}

export interface Stunde {
  kursId: string;
  tag: number; // 1 = Montag … 5 = Freitag
  beginn: string; // HH:MM
  ende: string;
  quelle?: 'untis';
}

export interface Einstellungen {
  navigation: 'links' | 'rechts' | 'unten';
  theme: 'system' | 'hell' | 'dunkel';
  stundenendeHinweis: boolean;
  liveAnsicht: 'liste' | 'sitzplan';
  sperreMinuten: number;
  passwort?: { salz: string; hash: string };
  untis?: UntisStand;
  untisAuto?: boolean; // WebUntis automatisch abgleichen (WU2), fehlt = an
  nachschreibMail?: { betreff: string; text: string }; // alte Einzelvorlage (E107), gilt als Überschreibung von „Entschuldigt (E)“
  nachschreibVorlagen?: { id: string; name: string; betreff: string; text: string }[]; // eigene und überschriebene Mailvorlagen (E117)
  selbstMail?: { betreff: string; text: string }; // eigene Vorlage der Einladung zur Selbsteinschätzung (E116)
  selbstErinnerung?: { betreff: string; text: string }; // eigene Vorlage der Erinnerung (E116)
  selbstAdresse?: string; // Adresse für Schüler-Links, fehlt = Adresse dieser App (E116)
  eigeneVorlagen?: EigeneVorlage[]; // Sitzplan-Vorlagen der Lehrkraft (E86), für alle Klassen nutzbar
  bausteine?: Baustein[]; // eigene Textbausteine (E110); fehlt = Startsatz aus bausteine.ts
  raster?: Raster[]; // eigene Kriterienraster (E110), Vorlagen liegen in raster.ts
  projektMail?: { betreff: string; text: string }; // eigene Vorlage der Rückmeldung zur Gruppenarbeit (E118)
  ferien?: FreieZeit[]; // Ferien und Feiertage laut WebUntis (getHolidays)
  halbjahrGrenze?: string; // erster Tag des 2. Halbjahres, fehlt = 1. Februar
  module?: { planung?: boolean; kalender?: boolean }; // abschaltbare Module (Projektregel), fehlt = an
}

/** Eigene Tischaufstellung, z. B. „Raum 204“; nur Tische, keine Schüler. */
export interface EigeneVorlage {
  id: string;
  name: string;
  spalten: number;
  reihen: number;
  tische: boolean[];
}

/** Stand der letzten Übernahme aus WebUntis (V11). Zugangsdaten werden hier nie gespeichert. */
export interface UntisStand {
  schule: string;
  benutzer: string;
  kuerzel: string;
  abgerufen: string; // ISO-Zeitpunkt
  halbjahrVon: string; // ISO-Datum
  halbjahrBis: string;
  ausfaelle: string[]; // `${kursId}|${datum}|${beginn}` ausgefallene eigene Stunden
}

export interface Daten {
  version: 1;
  schueler: Schueler[];
  kurse: Kurs[];
  mitarbeit: MitarbeitEintrag[];
  fehlzeiten: Fehlzeit[];
  verspaetungen: Verspaetung[];
  notizen: Notiz[];
  nachschreiben: NachTermin[];
  termine: Termin[];
  stundenplan: Stunde[];
  einstellungen: Einstellungen;
}
