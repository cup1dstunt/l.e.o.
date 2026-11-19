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
| F1 | Speicher je Objektart | IndexedDB mit einem Speicher je Objektart, Datensatz = `{id, v, quelle, geaendert, daten}`. Nur geänderte Datensätze werden geschrieben. Alter Block wird beim ersten Start übernommen und als Rückfall behalten. `app.d` bleibt für die Oberfläche gleich | – |
| F2 | Verschlüsselung | Schlüssel aus dem L.E.O.-Passwort (PBKDF2), AES-GCM je Datensatz. Ohne Passwort kein Lesen | HTTPS (siehe unten) |
| F3 | Sicherung | Verschlüsselte Sicherungsdatei, automatisch einmal täglich im Gerät die letzten 7 Stände, Wiederherstellen mit Vorschau | F1, F2 |
| F4 | Abgleich | Kleiner Dienst im selben Container auf dem Unraid: speichert je Nutzer verschlüsselte Datensätze mit Änderungszeit, Gerät holt und schickt nur Neues. Konflikt: neuere Änderung gewinnt je Datensatz, Noten-Zellen einzeln | F1, F2, HTTPS |

## Offene Punkte

- **HTTPS:** Browser erlauben die eingebaute Verschlüsselung (WebCrypto) und die App-Installation nur über HTTPS. Auf dem Unraid heute `http://…:8128`. Vorschlag: Zugriff über einen Reverse-Proxy mit Zertifikat (z. B. Nginx Proxy Manager oder Tailscale/Caddy) einrichten. Bis dahin läuft F2 nicht im Browser.
- **Abgleich-Dienst:** Ein eigener kleiner Dienst (Node oder Go) im Image neben nginx, Daten in einem Unraid-Ordner. Er sieht keine Noten im Klartext.

## Was getestet wird

- F1: Übernahme des alten Blocks, Schreiben nur geänderter Datensätze, Laden nach Neustart, alle bisherigen Tests.
- F2/F3: Ver- und Entschlüsseln mit falschem Passwort schlägt fehl, Sicherung lässt sich zurückspielen.
- F4: zwei Geräte gleichzeitig, Offline-Änderungen, Konflikt.
