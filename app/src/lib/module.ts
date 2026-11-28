// Modulregister (Projektregel, BACKLOG PF22, docs/MODULE.md): Welche Teile von L.E.O. eine Lehrkraft eingeschaltet hat.
// Grundsatz: Ausschalten blendet nur aus. Daten, Rechnung und Abgleich bleiben unverändert, Einschalten holt alles zurück.
// Neues Modul = ein Eintrag in MODULE und an den Stellen, die es zeigen, `istAn(e, 'id')` prüfen.
import type { Einstellungen } from './typen.ts';

export const MODUL_IDS = [
  'klassen', 'notenbuch',
  'stunde', 'stand', 'muendlich', 'selbst', 'sitzplan', 'zufall', 'gruppenarbeit',
  'anwesenheit', 'nachschreiben', 'stundenplan', 'kalender', 'planung',
  'ablage', 'statistik', 'ewh', 'import'
] as const;
export type ModulId = (typeof MODUL_IDS)[number];

export type Bereich = 'kern' | 'unterricht' | 'organisation';
export const BEREICHE: { id: Bereich; name: string }[] = [
  { id: 'kern', name: 'Immer dabei' },
  { id: 'unterricht', name: 'Im Unterricht' },
  { id: 'organisation', name: 'Organisation' }
];

export interface Modul {
  id: ModulId;
  name: string;
  /** Ein Satz: was das Modul abnimmt. */
  text: string;
  bereich: Bereich;
  /** Kern-Module lassen sich nicht ausschalten. */
  kern?: true;
  /** Fehlt die Einstellung, gilt dieser Wert. */
  standard: boolean;
  /** Ohne diese Module ergibt das Modul keinen Sinn; ist eines aus, ist auch dieses aus (die eigene Einstellung bleibt). */
  braucht?: ModulId[];
  /** Seiten, die zum Modul gehören (Pfad beginnt so). Bei ausgeschaltetem Modul zeigt L.E.O. dort einen Hinweis. */
  pfade?: string[];
  /** Reiter im Kurskopf, in dieser Reihenfolge. */
  reiter?: { text: string; pfad: string; aktiv: string };
  /** Noch nicht gebaut: erscheint nur als „in Vorbereitung“. */
  bald?: true;
}

export const MODULE: Modul[] = [
  { id: 'klassen', name: 'Klassen und Schüler', text: 'Klassenlisten, Schülerkarte, Suche, Notizen.', bereich: 'kern', kern: true, standard: true },
  { id: 'notenbuch', name: 'Notenbuch', text: 'Leistungen, Gesamtnote mit Rechenweg, Endnote. Rechnet wie die Schulvorgabe (Klausuren : Sonstige 50 : 50).', bereich: 'kern', kern: true, standard: true,
    pfade: ['/kurs/'], reiter: { text: 'Noten', pfad: '/kurs/', aktiv: 'noten' } },

  { id: 'stunde', name: 'Live-Stunde', text: 'Die laufende Stunde auf einem Bildschirm: Anwesenheit antippen, Zeitbalken, Lernstoff und Hausaufgabe.', bereich: 'unterricht', standard: true,
    pfade: ['/stunde/'], reiter: { text: 'Stunde', pfad: '/stunde/', aktiv: 'stunde' } },
  { id: 'stand', name: 'Wo wir stehengeblieben sind', text: 'Ein Satz am Ende der Stunde, die nächste Stunde der Klasse beginnt damit. Mit Hausaufgabe, Merkern und Verlauf, auch nach Blockwochen.', bereich: 'unterricht', standard: true },
  { id: 'sitzplan', name: 'Sitzplan', text: 'Sitzplan mit Vorlagen, in der Live-Stunde zum Antippen.', bereich: 'unterricht', standard: true,
    pfade: ['/sitzplan/'], reiter: { text: 'Sitzplan', pfad: '/sitzplan/', aktiv: 'sitzplan' } },
  { id: 'muendlich', name: 'Mündliche Leistungen', text: 'Smileys mit Textbausteinen, Kriterienraster, Monatsnote als Vorschlag.', bereich: 'unterricht', standard: true,
    pfade: ['/muendlich/'], reiter: { text: 'Mündlich', pfad: '/muendlich/', aktiv: 'muendlich' } },
  { id: 'selbst', name: 'Selbsteinschätzung', text: 'Schüler schätzen sich per Link ein, du siehst das Selbstbild neben deinem Raster. Braucht den eigenen Server.', bereich: 'unterricht', standard: true,
    braucht: ['muendlich'] },
  { id: 'zufall', name: 'Zufall und Gruppen', text: 'Wer ist dran (ohne Wiederholung), Gruppen bilden, Beamer-Ansicht.', bereich: 'unterricht', standard: true,
    braucht: ['stunde'] },
  { id: 'gruppenarbeit', name: 'Gruppenarbeit', text: 'Projekte über mehrere Stunden mit Projektraster, Note fürs Notenbuch, Rückmeldung per Mail.', bereich: 'unterricht', standard: true,
    pfade: ['/gruppenarbeit/'], reiter: { text: 'Gruppenarbeit', pfad: '/gruppenarbeit/', aktiv: 'gruppenarbeit' } },

  { id: 'anwesenheit', name: 'Fehlzeiten und Verspätungen', text: 'Fehlzeiten aus WebUntis und eigener Erfassung, Verspätungen mit Wochentagen, 30-%-Übersicht.', bereich: 'organisation', standard: true,
    pfade: ['/anwesenheit/'], reiter: { text: 'Anwesenheit', pfad: '/anwesenheit/', aktiv: 'anwesenheit' } },
  { id: 'nachschreiben', name: 'Nachschreiben', text: 'Wer eine Klausur verpasst hat, Termin festlegen, Mail-Entwurf an die Schüler.', bereich: 'organisation', standard: true,
    pfade: ['/nachschreiben'] },
  { id: 'stundenplan', name: 'Stundenplan', text: 'Dein Plan als Woche oder Tag, aus WebUntis. Nach Schulschluss zeigt er den nächsten Unterrichtstag.', bereich: 'organisation', standard: true,
    pfade: ['/stundenplan'] },
  { id: 'kalender', name: 'Kalender', text: 'Eigener Reiter mit Monatsansicht: Klausuren, Nachschreibetermine, Ferien und eigene Termine, abgeglichen mit WebUntis (Prüfungen, Ausfälle) und deinem IServ-Kalender.', bereich: 'organisation', standard: true,
    braucht: ['stundenplan'], pfade: ['/kalender'] },
  { id: 'planung', name: 'Semesterplanung', text: 'Unterrichtsreihen auf die freien Blöcke legen, Thema und Hausaufgabe je Block.', bereich: 'organisation', standard: true,
    pfade: ['/planung/'], reiter: { text: 'Planung', pfad: '/planung/', aktiv: 'planung' } },

  { id: 'ablage', name: 'Dateiablage', text: 'Material je Stunde oder Reihe.', bereich: 'organisation', standard: true },
  { id: 'statistik', name: 'Auswertung', text: 'Verläufe und Muster über Klassen und Halbjahre.', bereich: 'organisation', standard: true,
    pfade: ['/auswertung'], reiter: { text: 'Auswertung', pfad: '/auswertung/', aktiv: 'auswertung' } },
  { id: 'ewh', name: 'EWH-Übernahme', text: 'Klausurnoten aus EWH Korrektur übernehmen.', bereich: 'organisation', standard: false,
    pfade: ['/ewh/'] },
  { id: 'import', name: 'Import', text: 'Klassen und Noten aus der UPZ oder einer eigenen Excel-Tabelle übernehmen, mit Vorschau und ohne Überschreiben.', bereich: 'organisation', standard: true,
    pfade: ['/import'] }
];

const nachId = new Map(MODULE.map((m) => [m.id, m]));
export const modul = (id: ModulId) => nachId.get(id)!;

type Auswahl = Partial<Record<ModulId, boolean>>;
const auswahl = (e: Pick<Einstellungen, 'module'> | undefined): Auswahl => (e?.module ?? {}) as Auswahl;

/** Eigene Einstellung der Lehrkraft (ohne Abhängigkeiten). */
export function gewaehlt(e: Pick<Einstellungen, 'module'> | undefined, id: ModulId): boolean {
  const m = nachId.get(id);
  if (!m) return false;
  if (m.kern) return true;
  if (m.bald) return false;
  return auswahl(e)[id] ?? m.standard;
}

/** Ist das Modul wirksam an? Eigene Einstellung und alle Module, die es braucht. */
export function istAn(e: Pick<Einstellungen, 'module'> | undefined, id: ModulId, weg: ModulId[] = []): boolean {
  if (!gewaehlt(e, id)) return false;
  if (weg.includes(id)) return true; // Kreis im Register: nicht endlos suchen
  return (nachId.get(id)!.braucht ?? []).every((b) => istAn(e, b, [...weg, id]));
}

/** Welche gewählten Module fallen weg, wenn `id` aus ist? (für den Hinweis beim Ausschalten) */
export function haengtAb(e: Pick<Einstellungen, 'module'> | undefined, id: ModulId): Modul[] {
  return MODULE.filter((m) => m.id !== id && gewaehlt(e, m.id) && (m.braucht ?? []).includes(id));
}

/** Welche Module fehlen, damit `id` wirkt? */
export function fehltFuer(e: Pick<Einstellungen, 'module'> | undefined, id: ModulId): Modul[] {
  return (nachId.get(id)?.braucht ?? []).filter((b) => !istAn(e, b)).map(modul);
}

/**
 * Neue Auswahl beim Umschalten. Einschalten schaltet nötige Module mit ein (sonst wirkt es nicht),
 * Ausschalten lässt abhängige Module in Ruhe: sie ruhen, bis das Modul wieder an ist.
 */
export function umschalten(e: Pick<Einstellungen, 'module'> | undefined, id: ModulId, an: boolean): Auswahl {
  const neu: Auswahl = { ...auswahl(e) };
  const m = nachId.get(id);
  if (!m || m.kern || m.bald) return neu;
  neu[id] = an;
  if (an) for (const b of m.braucht ?? []) if (!gewaehlt({ module: neu }, b)) Object.assign(neu, umschalten({ module: neu }, b, true));
  return neu;
}

/** Welches Modul gehört zu dieser Seite? (längster passender Pfad) */
export function modulFuerPfad(pfad: string): Modul | undefined {
  let best: { m: Modul; n: number } | undefined;
  for (const m of MODULE) for (const p of m.pfade ?? []) if (pfad.startsWith(p) && (!best || p.length > best.n)) best = { m, n: p.length };
  return best?.m;
}

/** Reiter im Kurskopf, die gerade an sind. */
export function kursReiter(e: Pick<Einstellungen, 'module'> | undefined) {
  return MODULE.filter((m) => m.reiter && istAn(e, m.id)).map((m) => m.reiter!);
}

// ---------- Einrichtung beim ersten Start ----------

export type Herkunft = 'papier' | 'idoceo' | 'upz' | 'excel' | 'neu';

export interface Startweg {
  id: Herkunft;
  name: string;
  text: string;
  /** Vorschlag der Module, alles andere aus (Kern immer an). */
  module: ModulId[];
  /** Kurze Hinweise nach der Einrichtung, was in L.E.O. anders ist als bisher. */
  tipps: string[];
}

const ALLE_UNTERRICHT: ModulId[] = ['stunde', 'stand', 'sitzplan', 'muendlich', 'zufall', 'gruppenarbeit'];

export const STARTWEGE: Startweg[] = [
  { id: 'papier', name: 'Papier und Stift', text: 'Notenheft, Klassenliste, Kreuze am Rand.',
    module: ['stunde', 'stand', 'muendlich', 'sitzplan', 'zufall', 'anwesenheit', 'nachschreiben', 'stundenplan'],
    tipps: [
      'In der Live-Stunde tippst du an, wer fehlt und wie jemand mitgemacht hat. Eintippen musst du fast nichts.',
      'Das Notenbuch rechnet die Gesamtnote selbst und zeigt den Rechenweg, du musst nicht mehr nachrechnen.',
      'Was du nicht brauchst, bleibt aus. Unter Mehr › Module kommt es mit einem Tipp dazu.'
    ] },
  { id: 'idoceo', name: 'iDoceo', text: 'Notenbuch, Smileys, Anwesenheit auf dem iPad.',
    module: [...ALLE_UNTERRICHT, 'anwesenheit', 'nachschreiben', 'stundenplan', 'kalender', 'ablage', 'statistik'],
    tipps: [
      'Das Notenbuch ist aufgebaut wie die iDoceo-Vorlagen: Klausuren und Sonstige je 50 %, Sonstige aus mündlich und Tests.',
      'Smileys gibt es weiter, Kommentare kommen aus Textbausteinen statt aus der Tastatur.',
      'Schüler und Fehlzeiten holst du aus WebUntis, nichts wird mehr von Hand angelegt.'
    ] },
  { id: 'upz', name: 'UPZ (Excel der Schule)', text: 'Die Notenorganisation mit Notenschlüssel OSZ oder FOS.',
    module: ['stunde', 'muendlich', 'anwesenheit', 'nachschreiben', 'stundenplan', 'import'],
    tipps: [
      'Deine UPZ-Datei liest L.E.O. unter Klassen › Aus Datei übernehmen: Namen, Klassenarbeiten, sonstige Leistungen mit Gewichten und die mündliche Mitarbeit.',
      'L.E.O. nutzt dieselben Notenschlüssel wie die UPZ (OSZ und FOS) und rundet nur die Endnote.',
      'Die Endnote überträgst du wie bisher in die Excel der Schule. Sie steht im Notenbuch klar markiert.',
      'Fehlzeiten über 30 % zeigt die Anwesenheitsübersicht von selbst.'
    ] },
  { id: 'excel', name: 'Eigene Excel-Tabelle', text: 'Selbst gebaute Liste mit eigenen Formeln.',
    module: ['stunde', 'stand', 'muendlich', 'anwesenheit', 'nachschreiben', 'stundenplan', 'planung', 'import'],
    tipps: [
      'Deine Tabelle holst du unter Klassen › Aus Datei übernehmen (.xlsx oder .csv). Du siehst vorher genau, was in welche Spalte kommt.',
      'Gewichte stellst du je Klasse ein, auch für einzelne Noten. Der Rechenweg zeigt jede Zwischensumme wie deine Formeln.',
      'Mit „Was wäre wenn“ probierst du Noten aus, ohne etwas zu ändern.',
      'Die Endnote überträgst du in die Excel der Schule, ein Export ist nicht nötig.'
    ] },
  { id: 'neu', name: 'Noch nichts Festes', text: 'Ich fange neu an oder probiere aus.',
    module: [...ALLE_UNTERRICHT, 'anwesenheit', 'nachschreiben', 'stundenplan', 'kalender', 'planung', 'ablage', 'statistik'],
    tipps: [
      'Mit den Beispieldaten kannst du alles gefahrlos ausprobieren.',
      'Fang mit „Heute“ an: Dort steht die laufende Stunde mit allem, was du dafür brauchst.'
    ] }
];

/** Auswahl für einen Startweg: jedes Modul ausdrücklich an oder aus, nötige Module kommen mit. */
export function auswahlFuer(weg: Herkunft): Auswahl {
  const w = STARTWEGE.find((s) => s.id === weg) ?? STARTWEGE[STARTWEGE.length - 1];
  let neu: Auswahl = {};
  for (const m of MODULE) if (!m.kern && !m.bald) neu[m.id] = false;
  for (const id of w.module) neu = umschalten({ module: neu }, id, true);
  return neu;
}
