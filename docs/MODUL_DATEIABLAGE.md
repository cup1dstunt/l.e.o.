# Modul Dateiablage je Stunde

Stand 26.11.2026, Vorschlag V14 (noch nicht bestätigt). Backlog: O1, PB15 (Material).
Baut auf Planung und Stundenstand auf ([MODUL_PLANUNG_KALENDER.md](MODUL_PLANUNG_KALENDER.md), E114).

## 1 Wozu

- **Vorbereiten:** Arbeitsblatt, Präsentation, Lösung oder Link dorthin legen, wo die Stunde geplant wird.
- **Im Unterricht:** In der Live-Stunde ein Tipp, und das Material ist offen (Beamer, iPad), ohne IServ-Ordner zu durchsuchen.
- **Nachher:** Im Rückblick sehen, was in welcher Stunde gezeigt wurde, und beim nächsten Mal wissen, wo man weitermacht.
- **Nächstes Jahr / Parallelklasse:** Material einer Reihe in eine andere Klasse kopieren.

Nicht gedacht für Schülerarbeiten oder Listen mit Schülerdaten (Datenschutz). Das steht als Hinweis beim Hinzufügen.

## 2 Was ist „Material“

| Feld | Bedeutung |
|---|---|
| Titel | frei, Vorschlag = Dateiname ohne Endung |
| Art | **Datei** (liegt in L.E.O.) oder **Link** (IServ-Dateien, Moodle, YouTube, Webseite) |
| Ort | **Reihe** (gilt für jeden Block der Reihe), **Stunde** (ein Datum) oder **Klasse** (immer da, z. B. Kursplan, Bewertungsraster) |
| Rolle | Material, Lösung (nur für mich, nie auf dem Beamer hervorgehoben), Tafelbild |
| gezeigt | Daten, an denen es in der Live-Stunde geöffnet wurde |

Dateien bis 15 MB je Datei (Grenze von nginx/Abgleich). Alle Dateitypen gehen; PDF, Bilder, Text und Video öffnet der Browser selbst, Office-Dateien lädt er herunter und öffnet sie in der passenden App.

## 3 Verzahnung

| Wo | Was erscheint |
|---|---|
| Klasse › Planung, Unterrichtsreihen | Knopf „Material n“ je Reihe, klappt die Liste der Reihe auf (hinzufügen, umbenennen, entfernen, in andere Klasse kopieren) |
| Klasse › Planung, Kommende Blöcke | Knopf „Material n“ je Block: Material der Stunde + der Reihe; Hinzufügen landet an der Stunde |
| Klasse › Planung, Ausfall | Fällt ein Block mit eigenem Material aus: „Material auf nächsten Block“ (ein Tipp) |
| Klasse › Planung, Rückblick | je gehaltenem Block, was gezeigt wurde |
| Klasse › Planung, unten | „Material der Klasse“: alles nach Reihe/Stunde/Klasse geordnet, mit Suche |
| Live-Stunde, rechte Spalte | Karte „Material“: heute (Stunde, dann Reihe, dann Klasse); Tipp öffnet und merkt „gezeigt“; + Datei/Link direkt aus der Stunde |
| Live-Stunde, „Wo wir stehengeblieben sind“ | „Zuletzt gezeigt: …“ mit einem Tipp wieder offen |
| Heute, Kachel „Läuft gerade/Als Nächstes“ | „Material: n“ neben „Geplant“, Tipp öffnet die Stunde |
| Abgleich (F4) | Angaben zum Material wie jede Datenart, Dateiinhalt einzeln und verschlüsselt (siehe 4) |
| Sicherung (F3) | Angaben und Links ja, Dateiinhalte nein (zu groß, Hinweis in der Sicherungskarte) |
| Mehr › Module | „Dateiablage“ einzeln abschaltbar; ausgeschaltet bleiben die Daten erhalten |

Ohne Modul Planung: Material der Stunde und der Klasse gibt es weiter in der Live-Stunde, Reihen-Material nicht.

## 4 Speicherung und Abgleich

- **Angaben** (Titel, Ort, Art, Link, Größe, gezeigt) sind eine eigene Datenart `material`: verschlüsselt, abgeglichen, in der Sicherung.
- **Dateiinhalt** liegt im Gerät im neuen Speicher `dateien` (IndexedDB), mit dem Datenschlüssel verschlüsselt (AES-GCM), wenn L.E.O. verschlüsselt läuft. Mehrere Materialien (z. B. Kopie in die Parallelklasse) teilen sich einen Inhalt.
- **Mit Abgleich:** Das Gerät lädt den verschlüsselten Inhalt einmal hoch (`PUT /abgleich/datei/<id>`, roher Körper, kein JSON). Andere Geräte holen ihn beim ersten Öffnen und behalten ihn. Der Dienst sieht nur verschlüsselte Bytes und die Größe. Grenze je Konto: `LEO_DATEIEN_MB` (Standard 2048). Ablage: `/daten/dateien/<konto>/<id>`.
- **Löschen:** Material weg → Inhalt weg, sobald ihn kein anderes Material mehr nutzt; auf dem Server beim nächsten Abgleich.
- **Ohne Abgleich** liegt die Datei nur auf diesem Gerät. Die Liste zeigt das an („nur auf diesem Gerät“ bzw. „liegt auf einem anderen Gerät“).

## 5 Bedienung (Designsystem A)

- Keine Dialoge: Hinzufügen klappt eine Zeile auf (Datei wählen oder hineinziehen, Link einfügen). Datei wählen genügt, der Titel kommt vom Namen.
- Je Material eine Zeile: Kennzeichen (PDF, Bild, Link, Office …) als `kennz`, Titel, Ort klein und leise, rechts „öffnen“ und „…“ (umbenennen, Rolle, verschieben, kopieren, entfernen, aufklappend).
- Keine neuen Farben: Lösung als leiser Text „Lösung“, gezeigt als Haken mit Datum.
- Handy: Liste untereinander, Öffnen ist die ganze Zeile.

## 6 Grenzen und Offenes

- Sicherung mit Dateiinhalten (eigene, große Sicherungsdatei) folgt später.
- Kein Bearbeiten von Dateien in L.E.O.; neue Fassung = Datei ersetzen.
- IServ-Dateien nur als Link (eine Anbindung an die IServ-Dateiablage bräuchte eine Schnittstelle der Schule, FRAGEN_SCHULE).
- Safari/iPad: Öffnen von verschlüsselten Dateien über ein vorab geöffnetes Fenster, ungetestet.
