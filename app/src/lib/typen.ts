// Datenmodell des Prototyps. Alles liegt lokal im Gerät (IndexedDB), es gibt keinen Notenserver.

export type Profil = 'FOS' | 'OSZ';
export type Gruppe = 'klausuren' | 'sl' | 'mitarbeit';
export type Stufe = 1 | 2 | 3 | 4 | 5; // Smiley 1 = Note 1 (sehr gut) … Smiley 5 = Note 5 (E72)

export interface Schueler {
  id: string;
  vorname: string;
  nachname: string;
  geburt: string; // ISO-Datum
  geschlecht: 'w' | 'm' | 'd';
  mailDienst: string;
  mailPrivat?: string;
  nta?: string; // Nachteilsausgleich, z. B. „Zeitverlängerung 25 %“
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
  status?: 'E' | 'UE';
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
}

export interface Einstellungen {
  navigation: 'links' | 'rechts' | 'unten';
  theme: 'system' | 'hell' | 'dunkel';
  stundenendeHinweis: boolean;
  liveAnsicht: 'liste' | 'sitzplan';
  sperreMinuten: number;
  passwort?: { salz: string; hash: string };
}

export interface Daten {
  version: 1;
  schueler: Schueler[];
  kurse: Kurs[];
  mitarbeit: MitarbeitEintrag[];
  fehlzeiten: Fehlzeit[];
  verspaetungen: Verspaetung[];
  notizen: Notiz[];
  stundenplan: Stunde[];
  einstellungen: Einstellungen;
}
