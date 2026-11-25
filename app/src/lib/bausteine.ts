// Startsatz Textbausteine (DESIGN_SYSTEM_PROTOTYP 9.2). Die Lehrkraft kann ihn unter Mehr → Mündliche Leistungen
// ändern und ergänzen (E110); dann gilt `einstellungen.bausteine`.
// kriterium: Name eines Rasterkriteriums. Im Raster stehen die Bausteine dann als Beleg beim passenden Kriterium.
import type { Baustein, Einstellungen, Stufe } from './typen.ts';

export const BAUSTEINE: Baustein[] = [
  { text: 'hilft Mitschülern', stufe: 1, kriterium: 'Arbeitsverhalten' },
  { text: 'sehr gut vorbereitet', stufe: 1, kriterium: 'Hausaufgaben' },
  { text: 'bringt eigene Ideen ein', stufe: 1, kriterium: 'Qualität der Beiträge' },
  { text: 'beteiligt sich aktiv', stufe: 2, kriterium: 'Beteiligung' },
  { text: 'Beiträge meistens treffend', stufe: 2, kriterium: 'Qualität der Beiträge' },
  { text: 'ruhig, wenig Beteiligung', stufe: 3, kriterium: 'Beteiligung' },
  { text: 'Beitragsqualität schwankt', stufe: 3, kriterium: 'Qualität der Beiträge' },
  { text: 'wirkt abgelenkt', stufe: 4, kriterium: 'Arbeitsverhalten' },
  { text: 'arbeitet langsam', stufe: 4, kriterium: 'Arbeitsverhalten' },
  { text: 'Material fehlt zu Beginn', stufe: 4, kriterium: 'Arbeitsverhalten' },
  { text: 'spricht dazwischen', stufe: 4, kriterium: 'Arbeitsverhalten' },
  { text: 'stört den Unterricht', stufe: 5, kriterium: 'Arbeitsverhalten' },
  { text: 'Handy genutzt', stufe: 5, kriterium: 'Arbeitsverhalten' },
  { text: 'schläft', stufe: 5, kriterium: 'Arbeitsverhalten' }
];

export const STUFEN: { stufe: Stufe; name: string }[] = [
  { stufe: 1, name: 'sehr gut' },
  { stufe: 2, name: 'gut' },
  { stufe: 3, name: 'mittel' },
  { stufe: 4, name: 'schwach' },
  { stufe: 5, name: 'sehr schwach' }
];

/** Die gültigen Bausteine: eigene, sonst der Startsatz. */
export const bausteineVon = (e?: Pick<Einstellungen, 'bausteine'>): Baustein[] => e?.bausteine ?? BAUSTEINE;

export const bausteinStufe = (t: string, liste: Baustein[] = BAUSTEINE) => liste.find((b) => b.text === t)?.stufe;
