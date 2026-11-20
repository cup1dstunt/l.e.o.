# Fundament: Speicherung, Sicherung, Abgleich (E97)

Stand 19.11.2026. Konstantin hat das Fundament als nächsten Schritt gewählt. Oberfläche, Rechenlogik und Tests bleiben (V12/E97). Neu gebaut wird nur, was unter `app.d` liegt.

## Ausgangslage

- Alle Daten liegen als **ein Block** („alles“) in IndexedDB. Jede Änderung schreibt den ganzen Block neu.
- Kein Schema je Datensatz, keine Herkunft außer einzelnen `quelle`-Feldern, keine Verschlüsselung.
- Sicherung nur als unverschlüsselte JSON-Datei (Mehr › Export).
- Seit 19.11. liegen **echte Schülerdaten** aus WebUntis im Browser.

## Ziel

1. Daten liegen **je Objektart** (Schüler, Klassen, Fehlzeiten, …) mit **Schema-Version**, **Herkunft** (eigen / WebUntis / Import) und **Änderungszeit** je Datensatz.
2. Daten im Gerät sind mit dem L.E.O.-Passwort **verschlüsselt** (FB1).
3. **Sicherung** als verschlüsselte Datei, zusätzlich automatisch (PB12).
4. **Abgleich** zwischen PC, iPad und Handy über einen kleinen Dienst auf dem Unraid, der nur verschlüsselte Blöcke sieht (V10, PB18).

## Bauabschnitte

| # | Abschnitt | Inhalt | Hängt ab von |
|---|---|---|---|
| F1 ✓ | Speicher je Objektart (gebaut 19.11.) | IndexedDB mit einem Speicher je Objektart, Datensatz = `{id, v, quelle, geaendert, daten}`. Nur geänderte Datensätze werden geschrieben. Alter Block wird beim ersten Start übernommen und als Rückfall behalten. `app.d` bleibt für die Oberfläche gleich | – |
| F2 ✓ | Verschlüsselung (gebaut 19.11., E101) | Zufälliger Datenschlüssel, AES-GCM je Datensatz, verpackt mit Schlüssel aus dem L.E.O.-Passwort (PBKDF2, 600 000 Runden). Ohne Passwort kein Lesen. Beim ersten Anmelden über HTTPS werden vorhandene Daten verschlüsselt, der alte Block wird gelöscht. Passwortwechsel verpackt nur den Schlüssel neu | HTTPS (siehe unten) |
| F3 ✓ | Sicherung (gebaut 20.11., E102) | Verschlüsselte Sicherungsdatei mit verpacktem Schlüssel, automatisch beim ersten Entsperren am Tag ein Stand im Gerät (die letzten 7) plus Stand vor jedem Einspielen, Wiederherstellen erst nach Vorschau. WebUntis-Schlüssel verschlüsselt gemerkt | F1, F2 |
| F4 ✓ | Abgleich (gebaut 20.11., E103) | Node-Dienst `app/abgleich/server.mjs` im selben Container, Daten in `/daten`. Gerät merkt Änderungen im Speicher „ausgang“ vor, holt Neues ab dem letzten Stand und schickt dann Eigenes, jede Minute, 3 s nach dem Speichern, beim Zurückkehren in den Tab. Konflikt: neuere Änderung gewinnt je Datensatz, Klassen je Note zusammengeführt (Dreiwege mit letztem gemeinsamen Stand). Neues Gerät: auf dem Anmeldebildschirm „Ich nutze L.E.O. schon auf einem anderen Gerät“ | F1, F2, HTTPS |

## Offene Punkte

- **HTTPS:** Browser erlauben die eingebaute Verschlüsselung (WebCrypto) und die App-Installation nur über HTTPS. Auf dem Unraid heute `http://…:8128`. Vorschlag: Zugriff über einen Reverse-Proxy mit Zertifikat (z. B. Nginx Proxy Manager oder Tailscale/Caddy) einrichten. Bis dahin läuft F2 nicht im Browser. Entschieden: Nginx Proxy Manager (E100), Anleitung in PROTOTYP_UNRAID.md.
- **Abgleich-Dienst:** Ein eigener kleiner Dienst (Node oder Go) im Image neben nginx, Daten in einem Unraid-Ordner. Er sieht keine Noten im Klartext.

## Was getestet wird

- F1: Übernahme des alten Blocks, Schreiben nur geänderter Datensätze, Laden nach Neustart, alle bisherigen Tests.
- F2 (geprüft 19.11.): 16 Prüfungen ohne Browser (falsches Passwort, fremder Schlüssel, umgehängte Datensätze, veränderter Inhalt, Passwortwechsel) und 20 im echten Browser (Übernahme unverschlüsselter Daten, kein lesbarer Inhalt in der Datenbank, Sperren, Neuladen, neuer Browserstart). Noch nicht geprüft: iPad/Safari und das Unraid hinter HTTPS.
- F3 + F4 (geprüft 20.11.): 22 Prüfungen Sicherung und 48 Abgleich ohne Browser (Dienst als echter HTTP-Server: Einladungscode, Fehlversuch-Sperre, nur verschlüsselte Datensätze, neuere gewinnt, Löschen, Passwortwechsel, Neustart; Zusammenführen einer Klasse mit und ohne Basis). Dazu 29 Schritte in zwei echten Browsern: Konto anlegen, zweites Gerät meldet sich an, Note wandert, beide offline in derselben Klasse ändern verschiedene Noten → beide kommen überall an, Passwortwechsel gilt auf dem anderen Gerät, keine Klartexte in IndexedDB und auf dem Server, Sicherung vom anderen Gerät mit Passwort einspielen (mit Vorschau), Gerät mit eigenen Daten verbinden (Stände bleiben lesbar), WebUntis-Schlüssel verschlüsselt.
- Noch nicht geprüft: das fertige Docker-Image (nginx + Node) auf dem Unraid, iPad/Safari, viele Geräte gleichzeitig.
- Bekannte Grenzen: Gerätezeit entscheidet „neuer“ (Uhren sollten stimmen). Ohne gemeinsamen Stand (z. B. erste Verbindung) kann eine gelöschte Note zurückkommen. Konto löschen und Geräteliste ansehen gibt es noch nicht (nur Datei in `/daten/konten` löschen).
