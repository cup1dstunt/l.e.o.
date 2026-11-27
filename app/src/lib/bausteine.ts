// Startsatz Textbausteine (DESIGN_SYSTEM_PROTOTYP 9.2). Die Lehrkraft kann ihn unter Mehr → Mündliche Leistungen
// ändern und ergänzen (E110); dann gilt `einstellungen.bausteine`.
// kriterium: Name eines Rasterkriteriums. Im Raster stehen die Bausteine dann als Beleg beim passenden Kriterium.
import type { Baustein, Einstellungen, Stufe } from './typen.ts';

// Startsatz 27.11.2026 (E121): je Stufe mehrere aussagekräftige Bausteine, jeder einem Rasterkriterium zugeordnet,
// damit nach dem Smiley passende Vorschläge oben stehen und die Bausteine später im Raster als Beleg dienen.
const b = (stufe: Stufe, kriterium: string, ...texte: string[]): Baustein[] => texte.map((text) => ({ text, stufe, kriterium }));

export const BAUSTEINE: Baustein[] = [
  // Stufe 1: sehr gut
  ...b(1, 'Beteiligung', 'meldet sich durchgehend', 'treibt das Unterrichtsgespräch voran'),
  ...b(1, 'Qualität der Beiträge', 'bringt eigene Ideen ein', 'begründet schlüssig', 'stellt Zusammenhänge zu früheren Themen her', 'erkennt den Kern der Frage sofort'),
  ...b(1, 'Fachsprache und Verstehen', 'nutzt Fachbegriffe sicher', 'erklärt den Stoff verständlich für andere'),
  ...b(1, 'Sprache', 'spricht flüssig und weitgehend fehlerfrei'),
  ...b(1, 'Zusammenarbeit', 'hilft Mitschülern', 'übernimmt Verantwortung in der Gruppe'),
  ...b(1, 'Arbeitsverhalten', 'arbeitet selbstständig und zügig'),
  ...b(1, 'Hausaufgaben', 'sehr gut vorbereitet'),
  // Stufe 2: gut
  ...b(2, 'Beteiligung', 'beteiligt sich aktiv', 'meldet sich regelmäßig'),
  ...b(2, 'Qualität der Beiträge', 'Beiträge meistens treffend', 'gute Rückfrage gestellt', 'greift Beiträge anderer auf'),
  ...b(2, 'Fachsprache und Verstehen', 'verwendet Fachbegriffe überwiegend richtig'),
  ...b(2, 'Sprache', 'drückt sich verständlich aus, kleine Fehler'),
  ...b(2, 'Zusammenarbeit', 'arbeitet in der Gruppe konstruktiv mit'),
  ...b(2, 'Arbeitsverhalten', 'arbeitet konzentriert'),
  ...b(2, 'Hausaufgaben', 'Hausaufgaben vollständig'),
  // Stufe 3: mittel
  ...b(3, 'Beteiligung', 'ruhig, wenig Beteiligung', 'beteiligt sich nur auf Ansprache'),
  ...b(3, 'Qualität der Beiträge', 'Beitragsqualität schwankt', 'gibt Inhalte wieder, ohne zu begründen'),
  ...b(3, 'Fachsprache und Verstehen', 'Fachbegriffe noch unsicher', 'braucht Hilfe beim Einstieg'),
  ...b(3, 'Sprache', 'spricht stockend, aber verständlich'),
  ...b(3, 'Zusammenarbeit', 'arbeitet in der Gruppe mit, übernimmt wenig'),
  ...b(3, 'Arbeitsverhalten', 'arbeitet erst nach Aufforderung'),
  ...b(3, 'Hausaufgaben', 'Hausaufgaben unvollständig'),
  // Stufe 4: schwach
  ...b(4, 'Beteiligung', 'beteiligt sich kaum'),
  ...b(4, 'Qualität der Beiträge', 'Beiträge passen oft nicht zur Frage'),
  ...b(4, 'Fachsprache und Verstehen', 'kann Grundbegriffe nicht erklären'),
  ...b(4, 'Sprache', 'antwortet nur in einzelnen Wörtern'),
  ...b(4, 'Zusammenarbeit', 'macht in der Gruppe kaum mit'),
  ...b(4, 'Arbeitsverhalten', 'wirkt abgelenkt', 'arbeitet langsam', 'Material fehlt zu Beginn', 'spricht dazwischen', 'zu spät gekommen'),
  ...b(4, 'Hausaufgaben', 'Hausaufgaben fehlen'),
  // Stufe 5: sehr schwach
  ...b(5, 'Beteiligung', 'verweigert jede Beteiligung'),
  ...b(5, 'Qualität der Beiträge', 'keine verwertbaren Beiträge'),
  ...b(5, 'Zusammenarbeit', 'behindert die Gruppenarbeit'),
  ...b(5, 'Arbeitsverhalten', 'stört den Unterricht', 'Handy genutzt', 'schläft', 'arbeitet trotz Aufforderung nicht'),
  ...b(5, 'Hausaufgaben', 'Hausaufgaben wiederholt nicht gemacht')
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
