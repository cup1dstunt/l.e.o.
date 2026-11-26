// Modul Dateiablage je Stunde (V14, docs/MODUL_DATEIABLAGE.md): reine Regeln ohne Speicher und Browser.
// Material ist eine Datei oder ein Link und hängt an einer Reihe, einer Stunde (Datum) oder der Klasse.
import type { Kurs, Material } from './typen.ts';

export const MAX_DATEI = 15 * 1024 * 1024; // Grenze von nginx (16 MB je Anfrage) abzüglich Verschlüsselung

/** Material für einen Block: erst das der Stunde, dann das der Reihe, dann das der Klasse. */
export function materialFuer(liste: Material[], kursId: string, datum: string, reiheId?: string) {
  const eigen = liste.filter((m) => m.kursId === kursId);
  return {
    stunde: eigen.filter((m) => m.ort === 'stunde' && m.datum === datum),
    reihe: reiheId ? eigen.filter((m) => m.ort === 'reihe' && m.reiheId === reiheId) : [],
    klasse: eigen.filter((m) => m.ort === 'klasse')
  };
}
/** Alles für einen Block in einer Liste (Live-Stunde). */
export function materialListe(liste: Material[], kursId: string, datum: string, reiheId?: string): Material[] {
  const f = materialFuer(liste, kursId, datum, reiheId);
  return [...f.stunde, ...f.reihe, ...f.klasse];
}
/** Anzahl für Knöpfe in der Planung: nur Stunde + Reihe (Klassenmaterial ist überall und zählt nicht mit). */
export function anzahlFuer(liste: Material[], kursId: string, datum: string, reiheId?: string) {
  const f = materialFuer(liste, kursId, datum, reiheId);
  return f.stunde.length + f.reihe.length;
}

/** Kurzes Kennzeichen für die Liste, nach Dateityp oder Endung. */
export function kennzeichen(m: Pick<Material, 'art' | 'datei' | 'url'>): string {
  if (m.art === 'link') return /youtu\.?be/.test(m.url ?? '') ? 'Video' : 'Link';
  const typ = m.datei?.typ ?? '';
  const end = (m.datei?.name.split('.').pop() ?? '').toLowerCase();
  if (typ === 'application/pdf' || end === 'pdf') return 'PDF';
  if (typ.startsWith('image/')) return 'Bild';
  if (typ.startsWith('video/')) return 'Video';
  if (typ.startsWith('audio/')) return 'Audio';
  if (['ppt', 'pptx', 'odp', 'key'].includes(end)) return 'Folien';
  if (['doc', 'docx', 'odt', 'rtf', 'pages'].includes(end)) return 'Text';
  if (['xls', 'xlsx', 'ods', 'csv', 'numbers'].includes(end)) return 'Tabelle';
  if (typ.startsWith('text/') || end === 'txt' || end === 'md') return 'Text';
  return 'Datei';
}

/** Öffnet der Browser die Datei selbst (sonst herunterladen und mit der passenden App öffnen)? */
export function zeigbar(typ: string): boolean {
  return typ === 'application/pdf' || /^(image|video|audio|text)\//.test(typ);
}

export function groesseText(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

/** Titelvorschlag aus dem Dateinamen: ohne Endung, Unterstriche als Leerzeichen. */
export function titelAusName(name: string): string {
  const ohne = name.replace(/\.[^.]{1,6}$/, '');
  return (ohne || name).replace(/[_]+/g, ' ').trim();
}

/** Link aus Eingabe: ohne Schema wird https:// ergänzt. Nur http(s), sonst null. */
export function linkAus(text: string): string | null {
  let t = text.trim();
  if (!t) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) t = 'https://' + t;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    return u.href;
  } catch {
    return null;
  }
}
/** Titelvorschlag für einen Link: Rechnername ohne www. */
export function titelAusLink(url: string): string {
  try {
    const u = new URL(url);
    const teil = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() ?? '');
    return [u.hostname.replace(/^www\./, ''), titelAusName(teil)].filter(Boolean).join(' · ');
  } catch {
    return url;
  }
}

/** In der Live-Stunde geöffnet: Datum merken (einmal je Tag). */
export function alsGezeigt(m: Material, datum: string): boolean {
  if (m.gezeigt?.includes(datum)) return false;
  m.gezeigt = [...(m.gezeigt ?? []), datum].sort();
  return true;
}

/** Was wurde in der letzten Stunde vor `vor` gezeigt? Für „Wo wir stehengeblieben sind“. */
export function zuletztGezeigt(liste: Material[], kursId: string, vor: string): { datum: string; material: Material[] } | null {
  let datum = '';
  for (const m of liste) if (m.kursId === kursId) for (const g of m.gezeigt ?? []) if (g < vor && g > datum) datum = g;
  if (!datum) return null;
  return { datum, material: liste.filter((m) => m.kursId === kursId && m.gezeigt?.includes(datum)) };
}
/** Was wurde an einem Tag gezeigt (Rückblick)? */
export const gezeigtAm = (liste: Material[], kursId: string, datum: string) => liste.filter((m) => m.kursId === kursId && m.gezeigt?.includes(datum));

/** Block fällt aus: Material der Stunde auf einen anderen Tag legen. Gibt die Anzahl zurück. */
export function verschieben(liste: Material[], kursId: string, von: string, nach: string): number {
  let n = 0;
  for (const m of liste) if (m.kursId === kursId && m.ort === 'stunde' && m.datum === von) { m.datum = nach; n++; }
  return n;
}

/** Kopie für eine andere Klasse. Reihen-Material landet in der gewählten Reihe, sonst bei der Klasse.
 *  Der Dateiinhalt wird geteilt (gleiche Datei-id), „gezeigt“ beginnt neu. */
export function kopieFuer(m: Material, ziel: Kurs, neueId: string, reiheId?: string, jetzt = new Date()): Material {
  const reihe = reiheId && ziel.reihen?.some((r) => r.id === reiheId) ? reiheId : undefined;
  const { gezeigt: _g, datum: _d, reiheId: _r, ...rest } = m;
  return { ...rest, id: neueId, kursId: ziel.id, ort: reihe ? 'reihe' : 'klasse', ...(reihe ? { reiheId: reihe } : {}), erstellt: jetzt.toISOString() };
}

/** Reihe entfernt: ihr Material bleibt bei der Klasse, statt verloren zu gehen. */
export function reiheEntfernt(liste: Material[], kursId: string, reiheId: string): number {
  let n = 0;
  for (const m of liste) if (m.kursId === kursId && m.ort === 'reihe' && m.reiheId === reiheId) { m.ort = 'klasse'; delete m.reiheId; n++; }
  return n;
}

/** Welche Dateiinhalte werden noch gebraucht? Alles andere darf aus dem Speicher. */
export function dateienInBenutzung(liste: Material[]): Set<string> {
  return new Set(liste.flatMap((m) => (m.datei ? [m.datei.id] : [])));
}

/** Ortsangabe für die Liste, z. B. „Reihe Unit 6“ oder „Stunde Do 03.12.“. */
export function ortText(m: Material, kurs: Kurs | undefined, datumText: (iso: string) => string): string {
  if (m.ort === 'klasse') return 'Klasse';
  if (m.ort === 'stunde') return 'Stunde ' + (m.datum ? datumText(m.datum) : '');
  const r = kurs?.reihen?.find((x) => x.id === m.reiheId);
  return 'Reihe ' + (r?.titel || 'ohne Titel');
}
