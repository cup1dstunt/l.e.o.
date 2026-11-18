// Prüft die Bausteine des WebUntis-Verbindungstests ohne Netz (V11).
// Aufruf: npm test
import { base32, totp, felder, verteilung, untisDatum, montag, bericht, fehlerText } from '../src/lib/untis.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

// RFC 6238, Anhang B (SHA-1, Schlüssel "12345678901234567890"), letzte 6 Stellen
const k = base32('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
gleich('base32', new TextDecoder().decode(k), '12345678901234567890');
gleich('base32 klein/Leerzeichen', [...base32('gezd gnbv')], [...base32('GEZDGNBV')]);
gleich('TOTP 59', totp(k, 59_000), '287082');
gleich('TOTP 1111111109', totp(k, 1111111109_000), '081804');
gleich('TOTP 1234567890', totp(k, 1234567890_000), '005924');
gleich('TOTP 2000000000', totp(k, 2000000000_000), '279037');
gleich('TOTP 8 Stellen', totp(k, 59_000, 8), '94287082');

// Feldanalyse gibt nur Namen und Anteile zurück, nie Werte
const f = felder([{ name: 'Muster', gender: 'female', birthday: 0 }, { name: 'Beispiel', gender: '', birthday: 20080101 }]);
gleich('felder', f, [{ name: 'birthday', gefuellt: 50 }, { name: 'gender', gefuellt: 50 }, { name: 'name', gefuellt: 100 }]);
gleich('felder ohne Werte', JSON.stringify(f).includes('Muster'), false);
const b = bericht([{ id: 'schueler', titel: 'Schüler', wofuer: '', aufruf: '', status: 'ok', anzahl: 2, felder: f }]);
gleich('Bericht ohne Namen', b.includes('Muster') || b.includes('Beispiel'), false);

gleich('verteilung', verteilung([{ s: 'entsch.' }, { s: 'entsch.' }, { s: { name: 'nicht entsch.' } }, { s: null }], 's'), { 'entsch.': 2, 'nicht entsch.': 1 });
gleich('untisDatum', untisDatum(new Date(2026, 10, 18)), 20261118);
gleich('montag', untisDatum(montag(new Date(2026, 10, 22))), 20261116);
gleich('Fehler Schule', fehlerText(-8500, '').status, 'fehler');
gleich('Fehler Recht', fehlerText(-8509, '').status, 'verwehrt');

console.log(`${ok} WebUntis-Prüfungen bestanden, ${fehler} fehlgeschlagen`);
if (fehler) process.exit(1);
