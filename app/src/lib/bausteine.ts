// Startsatz Textbausteine (DESIGN_SYSTEM_PROTOTYP 9.2). Die Lehrkraft kann ihn unter Mehr → Mündliche Leistungen
// ändern und ergänzen (E110); dann gilt `einstellungen.bausteine`.
// kriterium: Name eines Rasterkriteriums. Im Raster stehen die Bausteine dann als Beleg beim passenden Kriterium.
import type { Baustein, Einstellungen, Stufe } from './typen.ts';

// Startsatz 28.11.2026 (E125, ersetzt E121 Punkt 2): je Stufe 5 bis 6 Bausteine, fachübergreifend formuliert
// (nichts Fremdsprachenspezifisches), jeder einem Rasterkriterium zugeordnet. Eigene Bausteine ergänzt die Lehrkraft selbst.
const b = (stufe: Stufe, kriterium: string, ...texte: string[]): Baustein[] => texte.map((text) => ({ text, stufe, kriterium }));

export const BAUSTEINE: Baustein[] = [
  // Stufe 1: sehr gut
  ...b(1, 'Beteiligung', 'meldet sich durchgehend von selbst'),
  ...b(1, 'Qualität der Beiträge', 'Beiträge bringen den Unterricht voran', 'begründet schlüssig und eigenständig'),
  ...b(1, 'Fachsprache und Verstehen', 'erklärt Sachverhalte sicher mit Fachbegriffen'),
  ...b(1, 'Arbeitsverhalten', 'arbeitet selbstständig und zielstrebig'),
  ...b(1, 'Zusammenarbeit', 'übernimmt Verantwortung in der Gruppe'),
  // Stufe 2: gut
  ...b(2, 'Beteiligung', 'beteiligt sich regelmäßig'),
  ...b(2, 'Qualität der Beiträge', 'Beiträge meist treffend', 'greift Beiträge anderer auf'),
  ...b(2, 'Fachsprache und Verstehen', 'nutzt Fachbegriffe überwiegend richtig'),
  ...b(2, 'Arbeitsverhalten', 'arbeitet konzentriert mit'),
  ...b(2, 'Zusammenarbeit', 'arbeitet in der Gruppe konstruktiv mit'),
  // Stufe 3: mittel
  ...b(3, 'Beteiligung', 'beteiligt sich nur auf Ansprache'),
  ...b(3, 'Qualität der Beiträge', 'Beiträge kurz oder ungenau', 'gibt Inhalte wieder, ohne zu begründen'),
  ...b(3, 'Fachsprache und Verstehen', 'Fachbegriffe noch unsicher'),
  ...b(3, 'Arbeitsverhalten', 'arbeitet erst nach Aufforderung'),
  ...b(3, 'Hausaufgaben', 'Hausaufgaben unvollständig'),
  // Stufe 4: schwach
  ...b(4, 'Beteiligung', 'beteiligt sich kaum'),
  ...b(4, 'Qualität der Beiträge', 'Beiträge passen oft nicht zur Frage'),
  ...b(4, 'Fachsprache und Verstehen', 'kann Grundbegriffe nicht erklären'),
  ...b(4, 'Arbeitsverhalten', 'wirkt abgelenkt', 'Arbeitsmaterial fehlt'),
  ...b(4, 'Zusammenarbeit', 'macht in der Gruppe kaum mit'),
  // Stufe 5: sehr schwach
  ...b(5, 'Beteiligung', 'verweigert die Mitarbeit'),
  ...b(5, 'Arbeitsverhalten', 'stört den Unterricht', 'beschäftigt sich mit anderem (z. B. Handy)'),
  ...b(5, 'Zusammenarbeit', 'behindert die Gruppenarbeit'),
  ...b(5, 'Hausaufgaben', 'Hausaufgaben fehlen')
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
