// Prüft das Modulregister (docs/MODULE.md). Aufruf: npm test
import { MODULE, MODUL_IDS, STARTWEGE, gewaehlt, istAn, umschalten, haengtAb, fehltFuer, modulFuerPfad, kursReiter, auswahlFuer } from '../src/lib/module.ts';

let ok = 0;
let fehler = 0;
function gleich(name: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { fehler++; console.log(`FEHLER ${name}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`); }
}

// Register vollständig und ohne Doppel
gleich('ids eindeutig', new Set(MODULE.map((m) => m.id)).size, MODULE.length);
gleich('jede id im Register', MODUL_IDS.every((id) => MODULE.some((m) => m.id === id)), true);
gleich('braucht nur bekannte', MODULE.every((m) => (m.braucht ?? []).every((b) => MODULE.some((x) => x.id === b))), true);
gleich('Kern braucht nichts', MODULE.filter((m) => m.kern && m.braucht?.length).length, 0);

// Ohne Einstellung: Standard, Kern immer an, „bald“ immer aus
gleich('leer notenbuch', istAn(undefined, 'notenbuch'), true);
gleich('leer planung', istAn({}, 'planung'), true);
gleich('leer dateiablage', istAn({}, 'ablage'), true);
gleich('kern nicht ausschaltbar', istAn({ module: { notenbuch: false } }, 'notenbuch'), true);
gleich('leer statistik', istAn({}, 'statistik'), true);
gleich('EWH standardmäßig aus', istAn({}, 'ewh'), false);
gleich('EWH einschaltbar', istAn({ module: { ewh: true } }, 'ewh'), true);
gleich('Import bleibt in Vorbereitung', istAn({ module: { import: true } }, 'import'), false);

// Alte Einstellung aus E114 bleibt gültig
gleich('alt planung aus', istAn({ module: { planung: false, kalender: true } }, 'planung'), false);
gleich('alt kalender an', istAn({ module: { planung: false, kalender: true } }, 'kalender'), true);
gleich('unbekannter Schlüssel stört nicht', istAn({ module: { gibtsnicht: true } as any }, 'stunde'), true);

// Abhängigkeiten: Kalender braucht Stundenplan, Zufall braucht Live-Stunde, Selbst braucht Mündlich
const ohnePlan = { module: { stundenplan: false } };
gleich('kalender ruht ohne stundenplan', istAn(ohnePlan, 'kalender'), false);
gleich('kalender bleibt gewählt', gewaehlt(ohnePlan, 'kalender'), true);
gleich('fehlt für kalender', fehltFuer(ohnePlan, 'kalender').map((m) => m.id), ['stundenplan']);
gleich('hängt ab von stundenplan', haengtAb({}, 'stundenplan').map((m) => m.id), ['kalender']);
gleich('hängt ab von muendlich', haengtAb({}, 'muendlich').map((m) => m.id), ['selbst']);

// Einschalten nimmt Nötiges mit, Ausschalten lässt Abhängige in Ruhe
gleich('an nimmt mit', umschalten({ module: { stundenplan: false, kalender: false } }, 'kalender', true), { stundenplan: true, kalender: true });
gleich('aus lässt ruhen', umschalten({}, 'stundenplan', false), { stundenplan: false });
gleich('kern unverändert', umschalten({ module: {} }, 'notenbuch', false), {});
gleich('zufall an nimmt stunde mit', istAn({ module: umschalten({ module: { stunde: false, zufall: false } }, 'zufall', true) }, 'stunde'), true);

// Seiten und Reiter
gleich('pfad muendlich', modulFuerPfad('/muendlich/k1')?.id, 'muendlich');
gleich('pfad mehr muendlich frei', modulFuerPfad('/mehr/muendlich'), undefined);
gleich('pfad nachschreiben', modulFuerPfad('/nachschreiben')?.id, 'nachschreiben');
gleich('pfad auswertung', modulFuerPfad('/auswertung/k1')?.id, 'statistik');
gleich('pfad EWH', modulFuerPfad('/ewh/k1')?.id, 'ewh');
gleich('pfad heute frei', modulFuerPfad('/'), undefined);
gleich('reiter standard', kursReiter({}).map((r) => r.text), ['Noten', 'Stunde', 'Sitzplan', 'Mündlich', 'Gruppenarbeit', 'Anwesenheit', 'Planung', 'Auswertung']);
gleich('reiter nur notenbuch', kursReiter({ module: { stunde: false, sitzplan: false, muendlich: false, gruppenarbeit: false, anwesenheit: false, planung: false, statistik: false } }).map((r) => r.text), ['Noten']);

// Startwege: alles ausdrücklich gesetzt, Vorschlag wirkt samt Abhängigkeiten
for (const w of STARTWEGE) {
  const a = auswahlFuer(w.id);
  gleich(`${w.id} alle gesetzt`, MODULE.filter((m) => !m.kern && !m.bald).every((m) => typeof a[m.id] === 'boolean'), true);
  gleich(`${w.id} vorschlag wirkt`, w.module.every((id) => istAn({ module: a }, id)), true);
  gleich(`${w.id} tipps`, w.tipps.length > 0, true);
}
gleich('papier ohne kalender', istAn({ module: auswahlFuer('papier') }, 'kalender'), false);
gleich('upz ohne sitzplan', istAn({ module: auswahlFuer('upz') }, 'sitzplan'), false);
gleich('idoceo mit sitzplan', istAn({ module: auswahlFuer('idoceo') }, 'sitzplan'), true);
gleich('idoceo mit Dateiablage und Auswertung', istAn({ module: auswahlFuer('idoceo') }, 'ablage') && istAn({ module: auswahlFuer('idoceo') }, 'statistik'), true);

console.log(`module: ${ok} ok, ${fehler} Fehler`);
if (fehler) process.exit(1);
