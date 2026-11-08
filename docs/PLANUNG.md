# L.E.O. – Planung

> **L**eistung · **E**ntwicklung · **O**rganisation. Ein Werkzeug für Lehrkräfte der Leopold-Ullstein-Schule.
>
> Stand: 08.11.2026 (dritte Fassung, nach Konstantins Antworten zur iDoceo-Analyse; zweite Fassung nach Konstantins Antworten zu V1–V6 und den iDoceo-Screenshots). Planungsskizze, noch kein Design und kein Code. Alles hier ist Vorschlag, bis es in
> [ENTSCHEIDUNGEN.md](ENTSCHEIDUNGEN.md) steht. Einzelne Wünsche und Ideen sammelt [BACKLOG.md](BACKLOG.md).

---

## 1 Warum L.E.O.?

iDoceo ist ein ordentliches Notenbuch, aber im Alltag umständlich:

- Schüler werden von Hand angelegt, obwohl sie in WebUntis stehen.
- Anwesenheit und Mitarbeit laufen über Smileys plus Kommentar, und jeder Kommentar wird eingetippt.
- Der Sitzplan ist so fummelig, dass man ihn nicht nutzt.
- Fehlzeiten stehen in WebUntis, Noten in iDoceo. Zusammengeführt wird im Kopf, spätestens vor der Konferenz.
- Daten liegen verschlüsselt auf einem iPad. Auswerten über Kurse, Jahre oder Kollegen hinweg geht nicht.

L.E.O. soll der Ort sein, an dem für eine Lehrkraft alles über ihre Kurse zusammenläuft, und für die Klassenleitung alles über ihre Klasse.

### Leitsätze

1. **Eine Stunde, ein Bildschirm.** Wenn die Stunde beginnt, zeigt L.E.O. genau diesen Kurs: Sitzplan, Anwesenheit, Ablauf, Timer.
2. **Nichts zweimal eintippen.** Schüler, Stundenplan und Fehlzeiten kommen aus WebUntis, Dienstmails aus IServ.
3. **Antippen statt eintippen.** Anwesenheit, Mitarbeit und Hausaufgaben mit einem Tipp, Kommentare aus Textbausteinen.
4. **So einfach, dass man es wirklich nutzt.** Gerade beim Sitzplan: in zwei Minuten fertig, sonst ist er falsch gebaut.
5. **Statistik überall, aber ruhig.** Daten werden nebenbei gesammelt und als Verlauf und Muster gezeigt, nicht als Zahlenfriedhof.
6. **Die Lehrkraft entscheidet.** L.E.O. rechnet und schlägt vor, verschickt aber nichts ungesehen.
7. **Entwicklung sichtbar machen.** Ein Kurs lebt über alle Halbjahre. Noten, Mitarbeit und Fehlzeiten früherer Halbjahre
   sind auf Wunsch einen Tipp entfernt, als Verlauf statt als vergessene Altklasse. Das ist ein **Design-Fokus** von L.E.O.
8. **Keine Listen von Hand.** Was sich berechnen oder übernehmen lässt (Fehlzeiten, Halbjahresnoten, Zähler), pflegt L.E.O. selbst.
   Niemand hat Zeit, zehn Listen zu führen.
9. **Schnelleingabe ist Pflicht.** Eine Note für eine ganze Klasse einzutragen dauert Sekunden: Zahl tippen, nächster Schüler, kein Scrollrad, kein „OK“.
10. **Kacheln statt Tabellenwüste.** Jeder Kurs hat eine Übersicht mit Kacheln (Noten, Mitarbeit, Anwesenheit, Hausaufgaben, Notizen, Sitzplan),
    von der aus alles in einem Tipp erreichbar ist.
11. **Gebaut für die ganze Schule.** Von Anfang an für ~100 Lehrkräfte mit Rollen und IServ-Anmeldung angelegt,
   auch wenn zuerst nur einer damit arbeitet.

---

## 2 Ein Schultag mit L.E.O.

**07:40, Lehrerzimmer.** Anmeldung mit dem IServ-Konto, kein eigenes Passwort. L.E.O. zeigt „Heute“: vier Stunden laut WebUntis,
eine davon vertreten. In der FOS12a ein Hinweis: Zwei Schüler haben die Klausur am Montag verpasst. Für einen steht in WebUntis
inzwischen „entschuldigt“, für den anderen noch nichts. Die Nachschreiber-Checkliste ist halb abgehakt.

**08:00, FOS12a.** Tipp auf die Stunde. Der Sitzplan erscheint. Wer in WebUntis schon als abwesend steht, ist ausgegraut.
Ein Wisch bestätigt die Anwesenheit. Oben läuft die Zeitleiste der Stunde: Einstieg 10 Minuten, Erarbeitung 25, Sicherung 10.

**08:20.** „Wer stellt vor?“ Der Zufallsgenerator zieht nur Anwesende und niemanden doppelt, bis alle dran waren.
Danach „4er-Gruppen, leistungsgemischt, A und B nicht zusammen“. Die Gruppen erscheinen groß auf dem Beamer, der Countdown läuft.

**08:45.** Während der Gruppenarbeit: Tipp auf einen Schüler im Sitzplan → 🙂 / 😐 / 🙁, dazu ein Baustein wie
„bringt eigene Ideen ein“. Zwei Sekunden pro Person, kein Tippen.

**09:30, Stundenende.** „Stunde abschließen“: Wo sind wir stehen geblieben (Marke im Reihenplan)? Hausaufgabe aufgegeben? Fertig.

**Konferenzwoche.** Die Klassenleitung öffnet die Konferenzansicht: alle Fehlzeiten der Klasse aus allen Fächern,
je Schüler Noten, Mitarbeit, Entwicklung und Notizen auf einer Seite. L.E.O. weist darauf hin, dass ein Schüler
auffällig oft montags fehlt.

---

## 3 Module im Überblick

| # | Modul | Kern | Priorität |
|---|---|---|---|
| A | Anmeldung, Rollen, Schule | IServ-SSO, Lehrkraft / Klassenleitung / Admin | **Grundgerüst** |
| B | Stammdaten & Kurse | Import aus WebUntis je Semester, Klassenleitungs-Schalter | hoch |
| C | Notenbuch | genau nach deinen iDoceo-Vorlagen | hoch |
| D | Anwesenheit & Mitarbeit | Smiley-Tipp + Textbausteine | hoch |
| E | Hausaufgaben | ein Tipp je Schüler, Zähler, Schwellen | mittel |
| F | Sitzplan | einfach, Raumvorlagen, Regeln, Generator | hoch |
| G | Zufall & Gruppen | ohne Wiederholung, Regeln, Projektgruppen | hoch |
| H | Zeitleiste & Timer | Phasen, Countdown, Beamer, Stundenabschluss | **sehr wichtig** |
| I | Fehlzeiten | WebUntis-Abgleich, E/UE, Muster, Nachschreiber | hoch |
| J | Kalender & Stundenplan | persönlicher Plan, Termine, ICS | **sehr wichtig** |
| K | Notizen & Gespräche | schnell, durchsuchbar, Wiedervorlage | mittel |
| L | Konferenzansicht | ganze Klasse, alle Fächer | mittel |
| M | Auswertung & Entwicklung | Verläufe, Muster, KI-Einschätzung aus Diktat | mittel |
| N | E-Mail | Vorlagen, Vorschau, Protokoll | später |
| O | Dateiablage je Stunde | Konzept offen | offen |
| P | Betrieb | Offline, Sicherung, Export, Updates | **Grundgerüst** |
| Q | Bewertungsbögen | Selbst- und Fremdeinschätzung per Link/QR, Bibliothek, Upload | mittel |

---

## 4 Grundgerüst für den schulweiten Betrieb

Das muss **vor** dem ersten Modul stehen, weil es sich später kaum nachrüsten lässt.
Gebaut wird zuerst nur, was ein einzelner Nutzer braucht, aber die Fundamente tragen 100.

### 4.1 Anmeldung über IServ (Single-Sign-On)

**Geht.** IServ kann selbst als Anmeldedienst für andere Anwendungen arbeiten, per **OAuth 2 / OpenID Connect**
([IServ-Doku: Verwaltung › System › Single-Sign-On](https://doku.iserv.de/manage/system/sso)).

- Der IServ-Admin registriert L.E.O. dort einmal als Anwendung (Client-ID, Secret, Rücksprung-Adresse).
- Benutzer brauchen das IServ-Recht **„OAuth verwenden“**.
- L.E.O. bekommt beim Anmelden: Benutzername, Vor- und Nachname, **IServ-Mailadresse**, eine eindeutige UUID,
  **Gruppen** und **Rollen** (Scopes `openid profile email iserv:uuid iserv:groups iserv:roles`).
- Damit lässt sich prüfen: **Ist das eine Lehrkraft?** (IServ-Rolle oder -Gruppe „Lehrer“). Schüler kommen gar nicht erst hinein.
- Zusätzlich ein **lokaler Notfall-Zugang** für den Admin (mit Passkey), falls IServ ausfällt, und für die Entwicklungsphase.

**Wichtig:** SSO liefert nur die Daten der Person, die sich anmeldet. Die Dienstmails der **Schüler** kommen darüber nicht,
dafür braucht es weiterhin einen der Wege aus 6.2.

### 4.2 Rollen und Sichtbarkeit

| Rolle | sieht | Herkunft |
|---|---|---|
**Grundsatz (E29): Lehrkräfte sind Herren über ihre eigenen Noten.** Noten, Mitarbeit, Bewertungen und Notizen sieht **nur die Lehrkraft**,
die sie vergeben hat (einzige Ausnahme: Doppelsteckung E31). Niemand sonst hat Einblick: nicht die Klassenleitung, nicht die Schulleitung, nicht der Admin.
Teilen geschieht nur aktiv durch die Lehrkraft selbst (z. B. Noten oder einen Lernstandsbericht an einen Schüler schicken,
Endnoten für die Konferenz an die Klassenleitung geben).

| Rolle | sieht | Herkunft |
|---|---|---|
| **Lehrkraft** | eigene Kurse: Noten, Mitarbeit, Notizen, Sitzpläne, Bögen. Fehlzeiten ihrer Schüler | IServ-Rolle |
| **Klassenleitung** | zusätzlich: **Fehlzeiten** der Klasse in allen Fächern (sind keine Noten, kommen aus WebUntis). Noten nur, wenn Kollegen sie aktiv teilen | WebUntis (Klassenlehrkraft) oder Schalter beim Import |
| **Admin (technisch)** | Einrichtung, Importe, Sicherung. **Keine** Noten, keine Notizen | lokal festgelegt |
| **Schulleitung** | **keine** Noten. Höchstens anonyme Zahlen, falls die Schule das will (z. B. Anzahl Nutzer) | offen |

Weitere Punkte:
- **Doppelsteckung (E31):** Unterrichten zwei oder drei Lehrkräfte dasselbe Fach im selben Kurs (z. B. Lernfeld 3), sehen und ändern alle
  das Notenbuch dieses Fachs. Jede Eingabe zeigt, wer sie gemacht hat. Das ist die **einzige** Ausnahme.
- **Halbjahresnoten (E33)** trägt die Schule weiter in ihre Excel-Tabellen ein. Je Fach wird nur die Endnote von Hand übertragen; L.E.O. zeigt sie klar an, ein Export ist nicht nötig.
- **Teilen ist eine bewusste Handlung** mit Empfänger und Umfang (z. B. „Endnoten 2FOS 25-1 an Klassenleitung, bis 30.01.“). Zurücknehmen geht jederzeit.
- **Ehrlich zur Technik:** Die Oberfläche zeigt niemandem fremde Noten. Wer den Server betreibt, könnte technisch an die Datenbank.
  Deshalb: Betrieb nur durch eine vertrauenswürdige Stelle, verschlüsselte Sicherungen, und im Backlog die Prüfung einer
  Verschlüsselung je Lehrkraft (G18).

### 4.3 Daten und Technik

**Geräte:** Smartphone, iPad und PC sind gleich wichtig, aber für verschiedene Dinge:

| Gerät | typische Nutzung |
|---|---|
| **Smartphone** | im Raum schnell: Anwesenheit, Mitarbeit-Smiley mit Baustein, Hausaufgabe abhaken, Zufall, Timer, Stundenplan, Notiz |
| **iPad** | Unterricht: Sitzplan, Notenbuch, Beamer-Ansicht, Gruppen |
| **PC** | Vor- und Nachbereitung: Notenbuch mit allen Spalten, Vorlagen, Importe, Auswertung, Konferenz |

Die große Notentabelle wird auf dem Smartphone nicht gequetscht, sondern es gibt dort **eigene, schmale Ansichten**
(ein Schüler oder eine Spalte zur Zeit, große Tipp-Flächen).

| Punkt | Vorschlag | Warum |
|---|---|---|
| Datenbank | **PostgreSQL** (E14) | viele gleichzeitige Schreiber, Zeilenrechte, etablierte Sicherung |
| Mandant | `schule_id` in allen Tabellen ab Tag 1 (E13) | Testschule neben echter Schule, später andere Schulen |
| Backend | **Python 3.13, FastAPI, SQLAlchemy 2, Alembic** (Migrationen), Authlib (OpenID Connect) | aktuell, verbreitet, bekannt aus EWH, gute Bibliotheken für Excel-Importe und Statistik |
| Frontend | **SvelteKit (Svelte 5, TypeScript) als PWA**, Vite | ein Code für Smartphone, iPad und PC; installierbar auf dem Homescreen; schnell auf alten Geräten; klare Komponenten statt einer Riesendatei (Vorschlag V3b) |
| Offline | **Service Worker + IndexedDB**: Kurs der aktuellen Stunde liegt im Gerät, Eingaben werden gepuffert und nachgesendet. Konflikte je **Zelle** (letzte Änderung gewinnt, mit Hinweis) | Klassenraum-WLAN |
| Hintergrundjobs | eigener Prozess für WebUntis-Abgleich, Erinnerungen, Sicherung | Import blockiert nicht die Oberfläche |
| Schnittstellen | Importe hinter austauschbaren Adaptern (`FehlzeitenQuelle`, `StundenplanQuelle`, `StammdatenQuelle`, `MailQuelle`) (E16) | Wechsel zwischen API, Export und Notlösung ohne Umbau |
| Sicherung | nächtlich, verschlüsselt, vor jedem Update, Wiederherstellung getestet | Vorbild EWH |
| Notausstieg | vollständiger Export je Lehrkraft (Noten als Excel/CSV, alles als JSON) | niemand ist eingesperrt |
| Betrieb | Docker Compose (App, Datenbank, Jobs), lauffähig auf dem Unraid-Server **und** auf einem Server der Schule | siehe 4.4 |
| Tests | automatische Tests für Notenberechnung und Rechte, Browsertests auf Smartphone- und iPad-Größe | Berechnungen müssen stimmen, Rechte dürfen nicht lecken |

**Ehrlich zum Unterschied zu EWH:** SvelteKit braucht einen Build-Schritt. Der passiert im Docker-Build, auf dem Server ändert sich
für dich nichts. Dafür bleibt der Code bei dieser Größe übersichtlich.

### 4.4 Wo läuft L.E.O.?

- **Entwicklung mit Testdaten:** Unraid-Server.
- **Pilot mit echten Daten (E15):** Unraid-Server, du und evtl. eine Kollegin, parallel zu iDoceo.
- **Schulweit:** Server der Schule oder des Trägers, Verzeichnis der Verarbeitungstätigkeiten, Löschkonzept.

**Schutz im Pilot mit echten Daten:**
- Anmeldung nur mit **Passkey** (Face ID / Touch ID) oder Passwort plus zweitem Faktor, bis IServ-SSO steht.
- Nur **HTTPS**, sichere Cookies, Sperre nach Fehlversuchen.
- Optional: L.E.O. nur über **VPN** erreichbar (dein iPad zeigt schon ein VPN), dann ist es aus dem Internet gar nicht sichtbar.
- **Verschlüsselte Sicherungen** (auch die Datenbank-Dumps), Schlüssel nicht auf demselben Server.
- **Sperrbildschirm in der App** nach einigen Minuten ohne Nutzung (Beamer!) und ein „Sichtschutz“-Knopf, der Namen und Noten ausblendet.
- Offline-Daten im Gerät nur für die eigenen Kurse, Abmelden löscht sie.

Die Fragen an die Schule stehen in [FRAGEN_SCHULE.md](FRAGEN_SCHULE.md).

---

## 5 Die Module im Einzelnen

### A Anmeldung, Rollen, Schule
Siehe Abschnitt 4. Dazu: Schuljahr und Halbjahre, Ferien (für Muster und Kalender), Raumliste aus WebUntis.

### B Stammdaten & Kurse
- **Jedes Semester** neu aus WebUntis laden: Klassen, Kurse, Schüler mit Name, Alter (aus Geburtsdatum), Geschlecht.
- Beim Einrichten die Frage: **„Bin ich Klassenleitung dieser Klasse?“** Ja → Daten der ganzen Klasse aus allen Fächern (vor allem Fehlzeiten).
  Nein → nur die eigenen Kurse. Schulweit lässt sich das aus WebUntis ablesen und vom Admin bestätigen.
- Zwei Mailadressen: dienstlich (IServ), privat (optional).
- Schulweit sinnvoll: **ein zentraler Import** durch den Admin statt 100 einzelner. Jede Lehrkraft sieht dann einfach ihre Kurse.
- Alternativ: CSV/Excel-Import mit Spaltenzuordnung.

### C Notenbuch
- **Notensystem je Bildungsgang** (E19). Berufsschule und FOS/DQ bewerten unterschiedlich: Notenpunkte 0–15 oder ganze Noten 1–6,
  unterschiedliche Notenspiegel (ab wie viel Prozent welche Note). IBA und Willkommensklassen werden noch geklärt.
  Das Notensystem hängt am Kurs, nicht an der Lehrkraft. Bei 0–15 gilt: **unter 5 Punkten nicht bestanden** (4 Punkte = 4− = mangelhaft).
- **Schulvorgabe:** 50 % schriftliche Leistungen (Klassenarbeiten/Klausuren) und 50 % Allgemeiner Teil (AT: Tests, Mitarbeit,
  Präsentationen, Arbeitsproben …). Das ist die Standard-Vorlage. Wie der AT innen aufgeteilt ist, entscheidet jede Lehrkraft.
- **Mitarbeitsnoten frei im Rhythmus** (E20): je Stunde, Woche, Unterrichtseinheit, Monat oder gar nicht. Monatsnoten sind Konstantins Weg,
  nicht der Standard.
- **Gewichte für einzelne Noten und Tests**, jederzeit änderbar, mit sofort sichtbarer Wirkung auf die Gesamtnote
  (z. B. „Wie stark zählen meine Verspätungstests?“).
- **Kurse leben über Halbjahre** (E21). Die Note des Vorhalbjahres steht automatisch als Richtwert daneben, nicht mehr von Hand.
- Wird **genau so aufgebaut, wie du es in iDoceo mit deinen eigenen Vorlagen nutzt**: Spalten, Kategorien, Berechnungen, Ansicht.
  Der Aufbau ist in [IDOCEO_ANALYSE.md](IDOCEO_ANALYSE.md) beschrieben. Kurz:
  - Seiten je Kurs: **Noten**, **Mitarbeit**, **Anwesenheit** (in der Vorlage auch Orga und Hausaufgaben).
  - Berechnungsbaum in Notenpunkten 0–15: Gesamtnote = Klausuren 50 % + Sonstige Leistungen 50 %;
    Sonstige = Mitarbeit (Monatsnoten) 50 % + Tests und Sonstiges (Einzelgewichte) 50 %. Leere Zellen zählen nicht, 0 zählt.
  - Rot unter 5 Punkten, Anmerkungen je Zelle, Zellfarben, Datum in der Zelle, Notenspiegel je Spalte.
  - Neue Kurse entstehen aus einer **Vorlagenklasse**.
- Neu gegenüber iDoceo: **Mitarbeitsnote des Zeitraums wird aus den Smileys vorgeschlagen**, statt sie nach Gefühl von Hand zu übertragen.
  Am Ende des Zeitraums erinnert L.E.O. daran.
- **Schnelltest in zwei Tipps** (E24), z. B. Konstantins Verspätungstest (15 Vokabeln, 3 Minuten): „Neuer Test“ → alle Anwesenden bekommen
  den vollen Wert, wer laut Anwesenheit zu spät ist, 0. Danach nur Ausnahmen antippen.
- **Schnelleingabe:** Auswahlfenster mit **allen Noten auf einen Blick** (0–15 als Tastenfeld bzw. 1–6 mit Tendenzen), ein Tipp setzt die Note und springt zum nächsten Schüler. Am PC Zahl tippen und Enter.
- Weil andere Kollegen andere Vorlagen haben: **Vorlagen** sind Daten, nicht Code. Deine wird die erste. Später kann man sie teilen.
- Die **UPZ-Dateien** der Kollegen (Excel-basierte Notenorganisation) zeigen, was andere brauchen.
  Sie werden zweite Grundlage für Vorlagen und vielleicht ein Import.
- Projektbewertungen (z. B. aus der Projekt-Werkstatt) fließen als Spalten ein.

### D Anwesenheit & Mitarbeit
- Wie bei dir in iDoceo als **Kategorien mit Smiley (fünf Stufen plus „nicht da“) und Kommentar**, aber der Kommentar kommt aus **Textbausteinen zum Antippen**.
- Eigene Bausteine, Favoriten, Reihenfolge nach Häufigkeit. Freitext bleibt möglich.
- Bewertung direkt im Sitzplan, in der Liste oder auf dem Smartphone.
- **Eine Anmerkung für mehrere Schüler auf einmal** (heute wird derselbe Satz mehrfach getippt).
- Anwesenheit (✓ / ✗ / verspätet) wird aus WebUntis vorbelegt, eigene Einträge ergänzen.
- Aufrufe aus dem Zufallsgenerator können als Mitarbeitsgelegenheit mitlaufen.
- **Selbsteinschätzung der Schüler** (Modul Q, Konzept in [BEWERTUNGSBOEGEN.md](BEWERTUNGSBOEGEN.md)): Schüler schätzen ihre mündliche Leistung anhand von Kriterien selbst ein (Formular per Link oder QR-Code,
  ohne eigenes Konto). Danach gibt die Lehrkraft ihre Einschätzung und Note ab, beides nebeneinander. Kriterienraster als Vorlage.
- **Bericht zur Mitarbeit** je Zeitraum, als PDF oder Mail verschickbar (an Schüler, Klassenleitung, Konferenz).

### E Hausaufgaben
- Ein Tipp je Schüler: gemacht / nicht gemacht / teilweise.
- Zähler und Schwelle („dreimal fehlend → Hinweis“). Verknüpft mit der Aufgabe aus dem Stundenabschluss.

### F Sitzplan
- **Raumvorlagen** (aus der WebUntis-Raumliste, Tischanordnung einmal je Raum anlegen, für alle Lehrkräfte nutzbar).
- Schüler per Ziehen setzen, mehrere Pläne je Kurs mit **Gültigkeitsdatum**.
- **Generator** mit Regeln: nicht nebeneinander, möglichst weit auseinander, möglichst vorne, nah beieinander, fester Platz,
  Mischung nach Geschlecht oder Leistung.
- Verbunden mit Anwesenheit, Mitarbeit, Zufall und Gruppen.

### G Zufall & Gruppen
- Zufall **ohne Wiederholung**, bis alle dran waren; optional gewichtet. Nur Anwesende. Aufrufe werden protokolliert.
- Gruppen: zufällig, leistungsgemischt, geschlechterausgewogen, mit Konflikt- und Wunschlisten. Im Sitzplan abbildbar.
- **Projektgruppen** über mehrere Blöcke (z. B. Podcast-Projekt über 3 Blöcke) mit Bewertung des **Beitrags jedes Mitglieds**, ähnlich Mitarbeit.

### H Zeitleiste & Timer
- Stundenablauf mit Phasen und Dauer, Countdown, **Beamer-Ansicht**.
- Ablauf als Vorlage speichern und wiederverwenden.
- **Stundenabschluss:** Fortschrittsmarke je Kurs („bis Aufgabe 3, S. 42“) und, selten, Hausaufgabe aufgegeben ja/nein.
  Beim nächsten Mal steht die Marke ganz oben.

### I Fehlzeiten
- Laufender Abgleich mit WebUntis inklusive **Status E/UE** und späterer Statusänderung.
- Dashboard: Quote je Schüler, Verlauf, Fristen für ausstehende Entschuldigungen.
- **Mustererkennung:** wiederholt montags/freitags, bestimmte Fächer oder Stunden, vor/nach Ferien, vor Klausuren.
- **Nachschreiber-Workflow** als Checkliste je Fall:
  1. in die Nachschreibedatei eingetragen,
  2. Nachschreibeklausur angelegt und ausgedruckt,
  3. Nachschreiber per Mail informiert.
  Der Status E/UE zur Klausur wird automatisch aus WebUntis übernommen.

### J Kalender & Stundenplan
- Persönlicher Stundenplan aus WebUntis mit Vertretungen und Raumänderungen.
- Kalender für Termine, Klausuren, Abgaben, Konferenzen, Aufsichten.
- Import anderer Pläne aus IServ (iCal-Feed, falls vorhanden), Export als ICS-Abo z. B. nach Google Kalender.

### K Notizen & Gespräche
- Schnelle Notiz je Schüler (Kürzel, Datum, Suche).
- Eltern- und Beratungsgespräche mit Anlass, Vereinbarung, Wiedervorlage.

### L Konferenzansicht
- Für die Klassenleitung: alle Fehlzeiten der ganzen Klasse aus allen Fächern.
- Für die eigenen Kurse: je Schüler eine Kurzübersicht mit Noten, Mitarbeit, Fehlzeiten, Notizen, Entwicklung.
- Optional: Kollegen **schicken** ihre Endnoten aktiv an die Klassenleitung (ein Tipp, statt Zettel oder Rundmail). Wer nicht schickt, bleibt unsichtbar (E29).

### M Auswertung & Entwicklung
- Verlaufsdiagramme je Schüler, Kurs und Klasse: Noten, Mitarbeit, Fehlzeiten, Hausaufgaben.
- Mustererkennung (Fehlzeiten, Leistungsabfall, Mitarbeit verstummt).
- **Leistungsstand per Knopfdruck:** Diktat → KI formuliert einen guten Text. Namen werden vorher ersetzt, wie in EWH.

### N E-Mail
- Versand aus L.E.O. mit Vorlagen und Platzhaltern, Vorschau, Protokoll am Schüler.
- Schulweit offen: ein zentrales Absenderkonto mit Antwort an die Lehrkraft, oder Versand über das eigene IServ-Postfach.
- Später, nicht erste Priorität.

### O Dateiablage je Stunde
- **Konzept offen**, legst du noch fest. EWH-Inhalte bleiben draußen.

### Q Bewertungsbögen
- Klickbare Bögen mit Bereichen, Kriterien und 3–5 Stufen, Ich-Form für Schüler, Gewichte je Bereich.
- Schüler füllen per Link/QR aus, die Lehrkraft schätzt daneben ein, L.E.O. schlägt die Note vor.
- Eigene Bögen anlegen, teilen oder als Word/PDF hochladen und umwandeln. Bibliothek, z. B. mit Bögen aus MEDIAN.
- Auch für Projekte, Präsentationen und Projektgruppen (Beitrag je Mitglied).
- Details: [BEWERTUNGSBOEGEN.md](BEWERTUNGSBOEGEN.md).

### P Betrieb
- Offline-Cache und Nachsenden, automatische Sicherung, Sicherung vor Updates, Wiederherstellung, vollständiger Export.

---

## 6 Anbindungen

### 6.1 WebUntis

Schulweit ändert sich die Lage: Statt 100 einzelner Logins braucht es **eine zentrale Verbindung der Schule**.
Damit wird der offizielle Weg deutlich attraktiver.

| Weg | Was | Voraussetzung | Rolle in L.E.O. |
|---|---|---|---|
| **Offizielle Untis-Platform-API** | Stammdaten, Stundenplan, Fehlzeiten mit Status | genehmigte Platform-Anwendung, Fehlzeiten nur mit aktivem Klassenbuch-Modul | **Ziel für schulweit**, bei der Schule anfragen |
| **Export aus WebUntis** (CSV/Excel) | Fehlzeiten, Schülerlisten, Stundenplan | Export-Recht | **Startweg**: Upload oder Watch-Ordner, täglicher Abgleich, Statusänderungen werden zusammengeführt |
| **Inoffizielle JSON-RPC-Schnittstelle** (Mobile-App) | Fehlzeiten, Stundenplan mit eigenem Login | nur eigenes Konto | **Backlog**: undokumentiert, kann jederzeit brechen. Bricht sie, zeigt L.E.O. einen Hinweis und fällt auf den Datei-Import zurück |
| ICS-Feed des Stundenplans | persönlicher Stundenplan | in WebUntis aktivierbar | einfacher Weg für Modul J |

### 6.2 IServ
- **Anmeldung:** OpenID Connect (siehe 4.1).
- **Dienstmails der Schüler:** IServ-IDM-REST-API mit Admin-Token (falls die Schule das hat), sonst Benutzerlisten-Export
  und Zuordnung über Name und Klasse, sonst Ableitung aus dem Adressmuster mit Prüfliste.
- **Kalender:** iCal-Feed, falls vorhanden.

### 6.3 Projekt-Werkstatt (`ki-webdesign-team`)
- Nur **Export** (JSON/CSV) je Gruppe oder Schüler, der in eine Notenspalte importiert wird.
  Die Werkstatt plant schon einen Bewertungsbogen mit CSV-Export „für iDoceo“; das Ziel wird L.E.O.

### 6.4 EWH Korrektur
- **Keine Inhalte** aus EWH in L.E.O. Übernommen wird nur das Betriebs- und Sicherungskonzept.
- Möglich, wenn gewünscht: Klausur-Endnoten als Export aus EWH in eine Notenspalte (wie bei der Werkstatt). Steht im Backlog.

### 6.5 UPZ-Dateien
- Excel-basierte Notenorganisation vieler Kollegen. Ab Montag kommen Beispiele.
- Ziel: verstehen, wie Kollegen Noten organisieren, daraus Notenbuch-Vorlagen und ggf. einen **Import** ableiten.
  Das ist für die Einführung an der ganzen Schule entscheidend.

---

## 7 Datenmodell (grob)

```
Schule ── Schuljahr ── Halbjahr
Schule ── Lehrkraft (IServ-UUID) ── Rolle
Schule ── Klasse ── Schüler (WebUntis-ID, Name, Geburtsdatum, Geschlecht, Mail dienstlich/privat)
Klasse ── Klassenleitung (Lehrkraft)
Kurs (Fach, Klasse/Gruppe, Halbjahr) ── Lehrkraft (1..n) ── Mitglied (Schüler)
Kurs ── Notenvorlage ── Spalte (Typ, Kategorie, Gewicht, Formel) ── Eintrag (Wert, Smiley, Bausteine, Kommentar)
Kurs ── Stunde (aus Untis) ── Ablauf (Phasen) ── Abschluss (Marke, Hausaufgabe)
Kurs ── Sitzplan (gültig ab) ── Platz        Raum ── Raumvorlage
Kurs ── Gruppensatz / Projekt ── Gruppe ── Mitglied ── Beitragsbewertung
Schüler ── Fehlzeit (Datum, Stunde, Fach, Status E/UE/offen, Quelle)
Schüler ── Notiz / Gespräch (privat | freigegeben)
Klausur ── Nachschreibfall (Checkliste)
Lehrkraft ── Kalendereintrag
Protokoll (wer hat wann was gesehen/geändert)
```

---

## 8 Fahrplan (Vorschlag)

| Stufe | Inhalt | Ergebnis |
|---|---|---|
| **0 Erkunden** | iDoceo-Screenshots, UPZ-Dateien, WebUntis-Exporte ansehen; Fragen an die Schule stellen | wir wissen, was technisch geht und was Kollegen brauchen |
| **0.1 Grundgerüst** | Docker, PostgreSQL, Anmeldung (lokal + IServ-SSO-Vorbereitung), Rollen, Schuljahr, Sicherung, Testdaten | trägt 100 Lehrkräfte, nutzbar für einen |
| **0.2 Kurse** | Import aus WebUntis (Export-Datei), Klassenleitungs-Schalter, Stundenplan (ICS oder Export) | L.E.O. kennt Kurse und Tag |
| **0.3 Notenbuch** | deine iDoceo-Vorlagen, Anwesenheit/Mitarbeit mit Bausteinen, Hausaufgaben | iDoceo-Notenbuch ersetzbar |
| **0.4 Im Unterricht** | Sitzplan, Zufall, Gruppen inkl. Projektgruppen | Unterrichtswerkzeuge |
| **0.5 Stunde** | Zeitleiste, Timer, Beamer, Stundenabschluss | |
| **0.6 Fehlzeiten** | Import mit Status, Dashboard, Muster, Nachschreiber-Checkliste | |
| **0.7 Organisation** | Kalender (IServ-Import, ICS-Export), Notizen, Gespräche | |
| **0.8 Entwicklung** | Verläufe, Konferenzansicht, KI-Einschätzung | |
| **0.9 Schule** | IServ-SSO live, Pilot mit Kollegen, Mail | |
| **1.0** | schulweit | |

Die Reihenfolge folgt dem Brainstorm, mit dem Grundgerüst davor. Wechsel zum Semesterende ist realistisch,
wenn 0.1 bis 0.4 stehen.
