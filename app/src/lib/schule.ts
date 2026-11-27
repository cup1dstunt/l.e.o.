// Schulprofil (E120): was an einer Schule fest ist, damit die Lehrkraft nichts suchen muss.
// Bisher nur die Leopold-Ullstein-Schule. Für eine andere Schule: ein weiteres Profil anlegen (IServ-Adresse,
// WebUntis-Server, feste IServ-Kalender) und unter einstellungen.kalender.schule wählen. Keine geheimen Links hier:
// Feed-Links enthalten einen Schlüssel und werden nur von der Lehrkraft auf ihrem Gerät eingefügt.

/** Wofür L.E.O. die Termine eines IServ-Kalenders nutzt. */
export type IservRolle = 'termine' | 'ferien' | 'aufgaben';

export interface IservKalender {
  id: string;
  name: string;
  text: string; // ein Satz: was drinsteht
  rolle: IservRolle;
  standard: boolean; // ohne eigene Wahl an?
  /** CalDAV-Pfad mit Platzhalter {benutzer}; braucht die IServ-Anmeldung. */
  caldav?: string;
  /** Feed-Link (ohne Anmeldung) möglich; die Lehrkraft erstellt ihn in IServ und fügt ihn ein. */
  feed?: { wo: string };
}

export interface Schulprofil {
  id: string;
  name: string;
  iserv: string; // Adresse ohne https://, gleich ISERV_SERVER im Container
  untis: string;
  kalender: IservKalender[];
}

export const OSZ_LUS: Schulprofil = {
  id: 'osz-lus',
  name: 'Leopold-Ullstein-Schule (OSZ)',
  iserv: 'osz-lus.de',
  untis: 'osz-lus.webuntis.com',
  kalender: [
    {
      id: 'osz-info', name: 'OSZ-Info', text: 'Termine der ganzen Schule: Gesamt- und Abteilungskonferenzen, Schultermine.',
      rolle: 'termine', standard: true, caldav: '/caldav/lusadmin/osz-info'
    },
    {
      id: 'persoenlich', name: 'Persönlicher Kalender', text: 'Deine eigenen Termine in IServ.',
      rolle: 'termine', standard: true, caldav: '/caldav/{benutzer}/home',
      feed: { wo: 'IServ › Kalender › Verwalten › persönlicher Kalender › „Freigabe für alle Termine“' }
    },
    {
      id: 'ferien', name: 'Ferien und Feiertage', text: 'Plugin mit den Berliner Ferien und Feiertagen. Zählt in der Semesterplanung, wenn WebUntis keine Ferien liefert.',
      rolle: 'ferien', standard: true,
      feed: { wo: 'IServ › Kalender › Verwalten › Plugins › Ferien und Feiertage › „Freigabe für Termine aus diesem Plugin“ › Erstellen' }
    },
    {
      id: 'aufgaben', name: 'Aufgaben', text: 'Plugin: Abgabetermine deiner Aufgaben aus dem IServ-Aufgabenmodul.',
      rolle: 'aufgaben', standard: false,
      feed: { wo: 'IServ › Kalender › Verwalten › Plugins › Aufgaben › „Freigabe für Termine aus diesem Plugin“ › Erstellen' }
    }
  ]
};

export const PROFILE: Schulprofil[] = [OSZ_LUS];

export const schulprofil = (id?: string) => PROFILE.find((p) => p.id === id) ?? OSZ_LUS;

/** CalDAV-Pfad mit Benutzername; ohne Benutzername kein Pfad. */
export function caldavPfad(k: IservKalender, benutzer: string): string {
  if (!k.caldav) return '';
  const b = benutzer.trim().toLowerCase();
  if (k.caldav.includes('{benutzer}') && !b) return '';
  return k.caldav.replace('{benutzer}', encodeURIComponent(b));
}
