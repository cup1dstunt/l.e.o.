// Excel-Dateien (.xlsx) und CSV lesen, ohne zusätzliche Bibliothek (Import-Modul, docs/MODUL_IMPORT.md).
// Eine .xlsx ist ein ZIP-Archiv mit XML-Dateien. Entpackt wird mit DecompressionStream („deflate-raw“),
// das jeder aktuelle Browser und Node 22 mitbringt. Gelesen werden nur Zellwerte, keine Formatierung.
// Formeln: L.E.O. nimmt den zuletzt von Excel gespeicherten Wert. Fehlt er, bleibt die Zelle leer
// (der UPZ-Import rechnet deshalb selbst aus den Eingaben, siehe import.ts).

export type Wert = string | number | boolean;

export interface Blatt {
  name: string;
  zellen: Map<string, Wert>; // Schlüssel „B3“
  zeilen: number; // höchste Zeilennummer
  spalten: number; // höchste Spaltennummer (1 = A)
}

export interface Mappe {
  blaetter: Blatt[];
}

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

/** Ist das eine ZIP-Datei (also .xlsx)? */
export const istZip = (b: Uint8Array) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b;
/** OLE-Container: altes .xls oder eine mit Kennwort verschlüsselte .xlsx. Beides kann L.E.O. nicht öffnen. */
export const istOle = (b: Uint8Array) => b.length > 8 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;

async function entpacken(daten: Uint8Array, methode: number): Promise<Uint8Array> {
  if (methode === 0) return daten;
  if (methode !== 8) throw new Error('Unbekannte Komprimierung in der Excel-Datei.');
  const strom = new Blob([daten as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

/** Inhaltsverzeichnis eines ZIP-Archivs lesen und die gewünschten Dateien entpacken. */
export async function zipLesen(b: Uint8Array, nur?: (name: string) => boolean): Promise<Map<string, Uint8Array>> {
  let ende = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { ende = i; break; }
  if (ende < 0) throw new Error('Die Datei ist kein vollständiges Excel-Archiv.');
  const anzahl = u16(b, ende + 10);
  let p = u32(b, ende + 16);
  const dec = new TextDecoder();
  const aus = new Map<string, Uint8Array>();
  for (let n = 0; n < anzahl; n++) {
    if (u32(b, p) !== 0x02014b50) break;
    const methode = u16(b, p + 10);
    const groesse = u32(b, p + 20);
    const nl = u16(b, p + 28), el = u16(b, p + 30), kl = u16(b, p + 32);
    const lokal = u32(b, p + 42);
    const name = dec.decode(b.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + el + kl;
    if (nur && !nur(name)) continue;
    const start = lokal + 30 + u16(b, lokal + 26) + u16(b, lokal + 28);
    aus.set(name, await entpacken(b.subarray(start, start + groesse), methode));
  }
  return aus;
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export const xmlText = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e.toLowerCase()]);

/** Alle <t>-Texte eines Abschnitts zusammen (Rich-Text besteht aus mehreren Läufen). */
const texte = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => xmlText(m[1])).join('');
const attr = (a: string, name: string) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(a)?.[1];

/** „B3“ → { zeile: 3, spalte: 2 } */
export function adresse(r: string): { zeile: number; spalte: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(r);
  if (!m) return { zeile: 0, spalte: 0 };
  let s = 0;
  for (const c of m[1]) s = s * 26 + (c.charCodeAt(0) - 64);
  return { zeile: Number(m[2]), spalte: s };
}
/** 2 → „B“ */
export function spaltenName(n: number): string {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function blattLesen(name: string, xml: string, geteilt: string[]): Blatt {
  const zellen = new Map<string, Wert>();
  let zeilen = 0, spalten = 0;
  for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const r = attr(m[1], 'r');
    const innen = m[2] ?? '';
    if (!r) continue;
    const t = attr(m[1], 't') ?? 'n';
    let w: Wert | undefined;
    if (t === 'inlineStr') w = texte(innen);
    else {
      const v = /<v>([\s\S]*?)<\/v>/.exec(innen)?.[1];
      if (v === undefined) continue; // Formel ohne gespeicherten Wert oder leere, nur formatierte Zelle
      if (t === 's') w = geteilt[Number(v)] ?? '';
      else if (t === 'str') w = xmlText(v);
      else if (t === 'b') w = v === '1';
      else if (t === 'e') continue;
      else { const n = Number(v); w = Number.isFinite(n) ? n : xmlText(v); }
    }
    if (w === '' || w === undefined) continue;
    zellen.set(r, w);
    const a = adresse(r);
    if (a.zeile > zeilen) zeilen = a.zeile;
    if (a.spalte > spalten) spalten = a.spalte;
  }
  return { name, zellen, zeilen, spalten };
}

/** Liest eine .xlsx-Datei. Gibt bei verschlüsselten oder alten Dateien eine verständliche Meldung zurück. */
export async function xlsxLesen(b: Uint8Array): Promise<Mappe | { fehler: string }> {
  if (istOle(b)) return { fehler: 'Die Datei ist mit einem Kennwort geschützt oder im alten Excel-Format (.xls). Öffne sie in Excel, speichere eine Kopie ohne Kennwort als .xlsx und wähle diese Kopie. Die Kopie danach wieder löschen.' };
  if (!istZip(b)) return { fehler: 'Das ist keine Excel-Datei (.xlsx).' };
  let teile: Map<string, Uint8Array>;
  try {
    teile = await zipLesen(b, (n) => n === 'xl/workbook.xml' || n === 'xl/_rels/workbook.xml.rels' || n === 'xl/sharedStrings.xml' || n.startsWith('xl/worksheets/sheet'));
  } catch (e) {
    return { fehler: (e as Error).message || 'Die Excel-Datei ließ sich nicht entpacken.' };
  }
  const dec = new TextDecoder();
  const lies = (n: string) => (teile.has(n) ? dec.decode(teile.get(n)) : '');
  const wb = lies('xl/workbook.xml');
  if (!wb) return { fehler: 'In der Datei fehlt die Arbeitsmappe. Ist es eine Excel-Datei?' };
  const rels = new Map<string, string>();
  for (const m of lies('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = attr(m[1], 'Id'), ziel = attr(m[1], 'Target');
    if (id && ziel) rels.set(id, ziel.startsWith('/') ? ziel.slice(1) : 'xl/' + ziel.replace(/^\.\//, ''));
  }
  const geteilt = [...lies('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texte(m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, '')));
  const blaetter: Blatt[] = [];
  for (const m of wb.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const name = xmlText(attr(m[1], 'name') ?? '');
    const rid = attr(m[1], 'r:id') ?? /\br:id="([^"]*)"/.exec(m[1])?.[1] ?? '';
    const pfad = rels.get(rid);
    if (!pfad || !teile.has(pfad)) continue;
    blaetter.push(blattLesen(name, dec.decode(teile.get(pfad)), geteilt));
  }
  if (!blaetter.length) return { fehler: 'Die Excel-Datei enthält keine Tabellenblätter.' };
  return { blaetter };
}

/** CSV-Text als ein Blatt. Trenner (Semikolon, Komma, Tab) wird an der ersten Zeile erkannt. Zahlen bleiben Text. */
export function csvAlsBlatt(text: string, name = 'Tabelle'): Blatt {
  const t = text.replace(/^﻿/, '');
  const erste = t.split(/\r?\n/, 1)[0] ?? '';
  const trenner = ['\t', ';', ','].map((x) => [x, erste.split(x).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const zellen = new Map<string, Wert>();
  let zeile = 1, spalte = 1, feld = '', inQ = false, zeilen = 0, spalten = 0;
  const ablegen = () => {
    const v = feld.trim();
    if (v !== '') {
      zellen.set(spaltenName(spalte) + zeile, v);
      if (zeile > zeilen) zeilen = zeile;
      if (spalte > spalten) spalten = spalte;
    }
    feld = '';
  };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"' && t[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQ = false;
      else feld += c;
    } else if (c === '"') inQ = true;
    else if (c === trenner) { ablegen(); spalte++; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      ablegen(); zeile++; spalte = 1;
    } else feld += c;
  }
  ablegen();
  return { name, zellen, zeilen, spalten };
}

/** Text einer Datei: UTF-8, sonst Windows-1252 (so speichert Excel „CSV (Trennzeichen-getrennt)“). */
export function textDekodieren(b: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b); }
  catch { return new TextDecoder('windows-1252').decode(b); }
}

/** Datei lesen, egal ob .xlsx oder .csv. */
export async function mappeAusDatei(b: Uint8Array, dateiname: string): Promise<Mappe | { fehler: string }> {
  if (istZip(b) || istOle(b) || /\.xlsx?$/i.test(dateiname)) return xlsxLesen(b);
  const text = textDekodieren(b);
  if (!text.trim()) return { fehler: 'Die Datei ist leer.' };
  return { blaetter: [csvAlsBlatt(text, dateiname.replace(/\.[^.]+$/, '') || 'Tabelle')] };
}

/** Zellwert lesen, leer = undefined. */
export const zelle = (b: Blatt | undefined, r: string): Wert | undefined => b?.zellen.get(r);

/** Excel-Seriennummer (Tage seit 30.12.1899) → ISO-Datum. */
export function excelDatum(n: number): string {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
  return d.toISOString().slice(0, 10);
}
