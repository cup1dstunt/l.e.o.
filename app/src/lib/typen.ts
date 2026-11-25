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
  lernstoff: Record<string, { text: string; hausaufgabe: string }>; // je Datum
  uebergang: { text: string; datum: string } | null; // Notiz für die nächste Stunde
  sitzplan: Sitzplan;
  untis?: { klasseId: number; fachId: number }; // Herkunft WebUntis: Klasse + Fach
  zufall?: ZufallStand; // fairer Zufall über mehrere Stunden (P5, E109)
  gruppenRegeln?: GruppenRegeln; // „nicht zusammen“ / „gern zusammen“ (P7)
  gruppensaetze?: Gruppensatz[]; // gespeicherte Gruppen, neueste zuerst (P8)
  gruppenAktiv?: string; // id des Gruppensatzes, der im Sitzplan erscheint
  muendlich?: MuendlichEinstellung; // Raster und Schwelle für die mündlichen Leistungen (FB7, E110)
  einschaetzungen?: Record<string, RasterEinschaetzung>; // Schlüssel `${monat}:${schuelerId}`
}

/** Wie die Klasse mündlich bewertet wird (E110): Smileys, Raster springt ein, wenn zu wenige da sind. */
export interface MuendlichEinstellung {
  rasterId: string;
  mindestSmileys: number; // weniger Smileys im Monat = L.E.O. bietet das Raster an
}

/** Kriterienraster (E110): Bereiche mit Gewicht, Kriterien mit 4 Stufen (Index 0 = Stufe 4 = beste). */
export interface Raster {
  id: string;
  name: string;
  fach: string; // z. B. „Englisch“, leer = fachübergreifend
  bereiche: RasterBereich[];
  vorlage?: true; // eingebaute Vorlage, nicht änderbar (kopieren geht)
}

export interface RasterBereich {
  name: string;
  gewicht: number; // relativ
  kriterien: RasterKriterium[];
}

export interface RasterKriterium {
  id: string;
  name: string;
  stufen: [string, string, string, string]; // Stufe 4, 3, 2, 1 (Beschreibung, Ich-Form für die spätere Selbsteinschätzung)
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
  nachschreibMail?: { betreff: string; text: string }; // eigene Vorlage der Nachschreibe-Mail (E105)
  eigeneVorlagen?: EigeneVorlage[]; // Sitzplan-Vorlagen der Lehrkraft (E86), für alle Klassen nutzbar
  bausteine?: Baustein[]; // eigene Textbausteine (E110); fehlt = Startsatz aus bausteine.ts
  raster?: Raster[]; // eigene Kriterienraster (E110), Vorlagen liegen in raster.ts
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
  stundenplan: Stunde[];
  einstellungen: Einstellungen;
}
