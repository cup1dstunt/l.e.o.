// Startsatz Textbausteine (DESIGN_SYSTEM_PROTOTYP 9.2). Später pflegt der Admin die Bibliothek (E53).
import type { Stufe } from './typen.ts';

export const BAUSTEINE: { text: string; stufe: Stufe }[] = [
  { text: 'hilft Mitschülern', stufe: 1 },
  { text: 'sehr gut vorbereitet', stufe: 1 },
  { text: 'bringt eigene Ideen ein', stufe: 1 },
  { text: 'beteiligt sich aktiv', stufe: 2 },
  { text: 'Beiträge meistens treffend', stufe: 2 },
  { text: 'ruhig, wenig Beteiligung', stufe: 3 },
  { text: 'Beitragsqualität schwankt', stufe: 3 },
  { text: 'wirkt abgelenkt', stufe: 4 },
  { text: 'arbeitet langsam', stufe: 4 },
  { text: 'Material fehlt zu Beginn', stufe: 4 },
  { text: 'spricht dazwischen', stufe: 4 },
  { text: 'stört den Unterricht', stufe: 5 },
  { text: 'Handy genutzt', stufe: 5 },
  { text: 'schläft', stufe: 5 }
];

export const STUFEN: { stufe: Stufe; name: string }[] = [
  { stufe: 1, name: 'sehr gut' },
  { stufe: 2, name: 'gut' },
  { stufe: 3, name: 'mittel' },
  { stufe: 4, name: 'schwach' },
  { stufe: 5, name: 'sehr schwach' }
];

export const bausteinStufe = (t: string) => BAUSTEINE.find((b) => b.text === t)?.stufe;
