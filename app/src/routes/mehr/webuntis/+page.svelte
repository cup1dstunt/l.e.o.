<script lang="ts">
  import { PRUEFUNGEN, verbindungstest, bericht, anmelden, fehlerMeldung, type Pruefung, type Zugang } from '$lib/untis';
  import { holen, uebernehmen, bekanntAus, falscheKlasseEntfernen, type Ergebnis } from '$lib/untisimport';
  import { FELDER, stammdatenPruefen, stammdatenAnwenden, schulmailsEinlesen, mailStand, type Vorschau, type Feld } from '$lib/stammdaten';
  import { name } from '$lib/hilfen';
  import { adressVorschlag } from '$lib/nachschreiben';
  import { app, zeige, speichern, geheimHolen, geheimSetzen, leerStarten, abgleich as abgleichStatus } from '$lib/speicher.svelte';
  import { MERK, untisAuto } from '$lib/untisauto.svelte';
  import { ABSTAND_MIN } from '$lib/untisauto';
  import { BEISPIEL_KURSE } from '$lib/beispiel';

  const d = app.d!;

  // Schule und Benutzer merkt sich das Gerät immer, Schlüssel bzw. Passwort nur auf Wunsch,
  // über HTTPS verschlüsselt mit dem L.E.O.-Passwort (F3), sonst unverschlüsselt im Browser.
  let gemerkt: Partial<Zugang> = {};
  try { gemerkt = JSON.parse(localStorage.getItem(MERK) ?? '{}'); } catch { /* privat */ }

  let schule = $state(gemerkt.schule ?? 'osz-lus');
  let benutzer = $state(gemerkt.benutzer ?? '');
  let art = $state<Zugang['art']>(gemerkt.art ?? 'schluessel');
  let geheim = $state('');
  geheimHolen('untis').then((g) => { if (g && !geheim) geheim = g; });
  let merken = $state(true);
  let laeuft = $state(false);
  let ergebnisse = $state<Pruefung[]>([]);
  let offen = $state<string | null>(null);
  let berichtText = $state('');

  const fertig = $derived(ergebnisse.length === PRUEFUNGEN.length);
  const mitDaten = $derived(ergebnisse.filter((p) => p.status === 'ok').length);
  const kacheln = $derived(
    PRUEFUNGEN.map((v) => ergebnisse.find((e) => e.id === v.id) ?? { ...v, status: laeuft ? ('laeuft' as const) : ('offen' as const) })
  );

  // ---------- Abgleich (echte Übernahme) ----------
  let abgleich = $state(false);
  let schritt = $state('');
  let ergebnis = $state<Ergebnis | null>(null);
  let fehler = $state('');
  const beispielDa = $derived(d.kurse.some((k) => !k.untis && BEISPIEL_KURSE.includes(k.id)));
  let beispielEntfernen = $state(true);
  // Neu anfangen (28.11.2026): sauberer Neuimport, vorher wird ein Stand abgelegt
  let neuSicher = $state(false);
  const abgleichAn = $derived(!!abgleichStatus.verbunden);
  async function neuAnfangen() {
    await leerStarten();
    if (d.einstellungen.untis) delete d.einstellungen.untis.vollAbgerufen; // nächster Abgleich holt das ganze Halbjahr
    speichern();
    neuSicher = false; ergebnis = null;
    zeige('Alles gelöscht. Jetzt „Jetzt abgleichen“, danach die Exporte der Klassen einlesen.');
  }
  const stand = $derived(d.einstellungen.untis);
  let schluesselGemerkt = $state(false);
  geheimHolen('untis').then((g) => (schluesselGemerkt = !!g));
  function autoUmschalten(e: Event) {
    d.einstellungen.untisAuto = (e.currentTarget as HTMLInputElement).checked;
    speichern();
  }
  const uhr = (iso: string) => new Date(iso).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  function pruefen() {
    if (!schule.trim() || !benutzer.trim() || !geheim) { zeige('Schule, Benutzer und Schlüssel bzw. Passwort ausfüllen'); return false; }
    try {
      localStorage.setItem(MERK, JSON.stringify({ schule, benutzer, art }));
    } catch { /* egal */ }
    geheimSetzen('untis', merken ? geheim : null).then(() => (schluesselGemerkt = merken)).catch(() => {});
    return true;
  }

  async function abgleichen(e: Event) {
    e.preventDefault();
    if (!pruefen()) return;
    abgleich = true; fehler = ''; ergebnis = null; schritt = 'Anmeldung';
    try {
      const sz = await anmelden({ schule, benutzer, art, geheim });
      try {
        const paket = await holen(sz, (t) => (schritt = t), { bekannt: bekanntAus(d) });
        schritt = 'Übernehmen';
        ergebnis = uebernehmen(d, paket, { beispielEntfernen: beispielDa && beispielEntfernen, benutzer, schule });
        speichern();
        if (!ergebnis.schueler) fehler = `Keine Schüler gefunden. L.E.O. konnte deine Kennung im Klassenbuch nicht sicher erkennen${d.einstellungen.untis?.kuerzel ? ` (gewählt: ${d.einstellungen.untis.kuerzel})` : ''}. Bitte „Nur Verbindung testen“ laufen lassen und mir den Bericht schicken, er zeigt jetzt die Kennungen in deinen Stunden.`;
      } finally { await sz.abmelden(); }
    } catch (err) {
      fehler = fehlerMeldung(err);
    } finally {
      abgleich = false; schritt = '';
    }
  }

  // ---------- Stammdaten-Export (Geburtsdatum, Klassenliste, Schulmail, Nachteilsausgleich), E119 ----------
  // Erst Vorschau, dann übernehmen. Die Dateien bleiben nur im Arbeitsspeicher, bis „Übernehmen“ getippt ist.
  let exportDatei = $state<HTMLInputElement>();
  let texte = $state<string[]>([]);
  let vorschauen = $state<Vorschau[]>([]);
  let wahl = $state<Record<string, Set<number>>>({}); // `${datei}|${kursId}` → aufzunehmende Zeilen
  async function exportLesen(e: Event) {
    const feld = e.currentTarget as HTMLInputElement; // nach await ist currentTarget leer
    const dateien = [...(feld.files ?? [])];
    texte = await Promise.all(dateien.map((f) => f.text()));
    vorschauen = texte.map((t) => stammdatenPruefen(d, t));
    wahl = {};
    vorschauen.forEach((v, i) => v.neu.forEach((g) => (wahl[`${i}|${g.kursId}`] = new Set(g.zeilen.map((_, j) => j)))));
    feld.value = '';
  }
  function spalteSetzen(i: number, feld: Feld, spalte: string) {
    const z = { ...vorschauen[i].zuordnung, [feld]: spalte || undefined };
    vorschauen[i] = stammdatenPruefen(d, texte[i], z);
    vorschauen[i].neu.forEach((g) => (wahl[`${i}|${g.kursId}`] = new Set(g.zeilen.map((_, j) => j))));
  }
  function umschalten(k: string, j: number) {
    const s = new Set(wahl[k] ?? []);
    if (s.has(j)) s.delete(j); else s.add(j);
    wahl = { ...wahl, [k]: s };
  }
  function exportUebernehmen() {
    let z = 0, g = 0, m = 0, n = 0;
    vorschauen.forEach((v, i) => {
      const aufnehmen = Object.fromEntries(v.neu.map((gr) => [gr.kursId, [...(wahl[`${i}|${gr.kursId}`] ?? [])]]));
      const r = stammdatenAnwenden(d, v, { aufnehmen });
      z += r.zugeordnet; g += r.geburt; m += r.mail; n += r.neu;
    });
    const raus = falscheKlasseEntfernen(d); // Klasse laut Export passt nicht zur L.E.O.-Klasse
    speichern();
    texte = []; vorschauen = []; wahl = {};
    zeige(`${z} zugeordnet, ${g} Geburtsdaten, ${m} Schulmails${n ? `, ${n} Schüler aufgenommen` : ''}${raus ? `, ${raus} aus falscher Klasse genommen` : ''}`);
  }
  const fehltAnzahl = $derived(vorschauen.reduce((a, v, i) => a + v.neu.reduce((b, gr) => b + (wahl[`${i}|${gr.kursId}`]?.size ?? 0), 0), 0));

  // ---------- Schulmails aus IServ (S6) ----------
  let mailText = $state('');
  const meine = $derived(d.schueler.filter((s) => d.kurse.some((k) => k.schueler.includes(s.id))));
  const mails = $derived(mailStand(meine));
  function mailsLesen() {
    const r = schulmailsEinlesen(d, mailText, new Set(meine.map((s) => s.id)));
    speichern();
    mailText = '';
    zeige(r.gefunden ? `${r.zugeordnet} von ${r.gefunden} Adressen zugeordnet${r.unklar ? `, ${r.unklar} nicht eindeutig (nicht gespeichert)` : ''}` : 'Keine Adresse der Schule im Text gefunden');
  }

  async function testen() {
    if (!pruefen()) return;
    ergebnisse = [];
    berichtText = '';
    offen = null;
    laeuft = true;
    try {
      await verbindungstest({ schule, benutzer, art, geheim }, (p) => (ergebnisse = [...ergebnisse.filter((x) => x.id !== p.id), p]));
    } finally {
      laeuft = false;
    }
  }

  async function kopieren() {
    berichtText = bericht(ergebnisse);
    try { await navigator.clipboard.writeText(berichtText); zeige('Bericht kopiert'); } catch { zeige('Kopieren nicht erlaubt, Text unten markieren'); }
  }

  const zeichen: Record<string, string> = { ok: '✓', leer: '–', verwehrt: '✗', fehler: '!', offen: '·', laeuft: '…' };
  const wort: Record<string, string> = { ok: 'liefert Daten', leer: 'geht, aber leer', verwehrt: 'keine Berechtigung', fehler: 'Fehler', offen: 'noch nicht geprüft', laeuft: 'wird geprüft' };
</script>

<div class="seite">
  <div class="zeile">
    <a class="knopf leise" href="/mehr">‹ Mehr</a>
    <h1>WebUntis</h1>
  </div>

  <section class="karte">
    <h2>Mit WebUntis abgleichen</h2>
    <p>L.E.O. holt deinen Stundenplan, deine Klassen mit Schülern und die Fehlzeiten deiner Stunden im laufenden Halbjahr. Es liest nur und trägt nichts in WebUntis ein.</p>
    <p class="klein leise">„Nur Verbindung testen“ prüft, welche Daten ankommen, und speichert nichts. Gemerkt werden Schule und Benutzername, auf Wunsch auch der Schlüssel. {app.verschluesselt ? 'Er liegt dann verschlüsselt mit deinem L.E.O.-Passwort in diesem Browser.' : 'Er liegt dann unverschlüsselt in diesem Browser (ohne HTTPS geht es nicht anders), also nur auf dem eigenen Gerät anhaken.'}</p>

    <form class="form" onsubmit={abgleichen}>
      <label class="feld"><span>Schule (in WebUntis die Adresszeile, hinter „school=“)</span>
        <input bind:value={schule} autocomplete="off" autocapitalize="off" spellcheck="false" />
      </label>
      <label class="feld"><span>Benutzername in WebUntis</span>
        <input bind:value={benutzer} autocomplete="username" autocapitalize="off" spellcheck="false" />
      </label>
      <div class="feld"><span>Anmeldung mit</span>
        <div class="zeile wrap">
          <button type="button" class="pille" aria-pressed={art === 'schluessel'} onclick={() => (art = 'schluessel')}>App-Schlüssel</button>
          <button type="button" class="pille" aria-pressed={art === 'passwort'} onclick={() => (art = 'passwort')}>Passwort</button>
        </div>
      </div>
      <label class="feld"><span>{art === 'schluessel' ? 'Schlüssel (WebUntis › Profil › Freigaben › Zugriff über Untis Mobile › Anzeigen)' : 'WebUntis-Passwort (nicht das IServ-Passwort)'}</span>
        <input type="password" bind:value={geheim} autocomplete={art === 'passwort' ? 'current-password' : 'off'} spellcheck="false" />
      </label>
      <label class="zeile schalter"><input type="checkbox" bind:checked={merken} /> Schlüssel bzw. Passwort auf diesem Gerät merken</label>
      {#if beispielDa}
        <label class="zeile schalter"><input type="checkbox" bind:checked={beispielEntfernen} /> Beispielklassen und Beispielschüler beim Abgleich entfernen (eigene und importierte Klassen bleiben)</label>
      {/if}
      <div class="zeile wrap">
        <button class="knopf haupt" type="submit" disabled={abgleich || laeuft}>{abgleich ? 'Gleiche ab …' : 'Jetzt abgleichen'}</button>
        <button class="knopf leise" type="button" onclick={testen} disabled={abgleich || laeuft}>{laeuft ? 'Prüfe …' : 'Nur Verbindung testen'}</button>
      </div>
    </form>
    {#if abgleich}<p class="klein leise">{schritt} …</p>{/if}
    {#if fehler}<p class="klein warn">{fehler}</p>{/if}
  </section>

  {#if ergebnis || stand}
    <section class="karte">
      <h2>Abgleich</h2>
      {#if stand}<p class="klein leise">Stand {new Date(stand.abgerufen).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · Kürzel {stand.kuerzel || 'nicht erkannt'} · Halbjahr {stand.halbjahrVon.split('-').reverse().join('.')} bis {stand.halbjahrBis.split('-').reverse().join('.')}</p>{/if}
      {#if ergebnis}
        <div class="kacheln">
          <a class="kachel" href="/klassen"><b class="zahl anzahl">{ergebnis.kurse}</b><span class="klein leise">Klassen{ergebnis.kurseNeu ? `, ${ergebnis.kurseNeu} neu` : ''}</span></a>
          <a class="kachel" href="/schueler"><b class="zahl anzahl">{ergebnis.schueler}</b><span class="klein leise">Schüler{ergebnis.schuelerNeu ? `, ${ergebnis.schuelerNeu} neu` : ''}{ergebnis.umgezogen ? `, ${ergebnis.umgezogen} aus falscher Klasse genommen` : ''}{ergebnis.aufgeraeumt ? `, ${ergebnis.aufgeraeumt} nicht mehr zugeordnet` : ''}</span></a>
          <div class="kachel"><b class="zahl anzahl">{ergebnis.fehlzeiten}</b><span class="klein leise">Fehlzeiten, davon {ergebnis.offen} offen</span></div>
          <div class="kachel"><b class="zahl anzahl">{ergebnis.verspaetungen}</b><span class="klein leise">Verspätungen</span></div>
          <div class="kachel"><b class="zahl anzahl">{ergebnis.stammdaten}</b><span class="klein leise">mit Geburtsdatum aus dem Bericht</span></div>
        </div>
      {/if}
      <label class="zeile schalter"><input type="checkbox" checked={d.einstellungen.untisAuto !== false} onchange={autoUmschalten} disabled={!schluesselGemerkt} /> Automatisch abgleichen: beim Entsperren und alle {ABSTAND_MIN} Minuten, solange L.E.O. offen ist</label>
      <p class="klein leise">{#if !schluesselGemerkt}Dafür muss der Schlüssel bzw. das Passwort auf diesem Gerät gemerkt sein.{:else if d.einstellungen.untisAuto === false}Aus. Abgeglichen wird nur mit „Jetzt abgleichen“.{:else if untisAuto.laeuft}Gleicht gerade ab …{:else if untisAuto.fehler}Letzter automatischer Versuch {uhr(untisAuto.versucht)}: {untisAuto.fehler}. L.E.O. versucht es später wieder.{:else}Neue Schüler und Fehlzeiten meldet eine kurze Hinweisleiste. Beispieldaten bleiben dabei unangetastet.{/if}</p>
      <p class="klein leise">Übernommen werden nur deine eigenen Stunden. Alles andere aus WebUntis wird sofort verworfen. Noten, mündliche Leistungen, Notizen und Sitzpläne bleiben bei jedem Abgleich erhalten. Wer laut WebUntis nicht (mehr) in eine Klasse gehört und dort nichts Eigenes hat, wird einmal am Tag beim vollen Abgleich aus der Liste genommen. Mit Noten oder Smileys bleibt er stehen.</p>
      <h3>Neu anfangen</h3>
      <p class="klein leise">Löscht alle Klassen, Schüler und Einträge auf diesem Gerät{abgleichAn ? ' und auf deinen verbundenen Geräten' : ''}. Einstellungen, Anmeldung und der gemerkte Schlüssel bleiben. Der jetzige Stand liegt danach unter Mehr › Sicherung und lässt sich zurückholen.</p>
      {#if neuSicher}
        <div class="zeile wrap">
          <button class="knopf warn" type="button" onclick={neuAnfangen} disabled={abgleich}>Ja, alles löschen</button>
          <button class="knopf leise" type="button" onclick={() => (neuSicher = false)}>Abbrechen</button>
        </div>
      {:else}
        <button class="knopf leise" type="button" onclick={() => (neuSicher = true)} disabled={abgleich}>Alle Klassen löschen und neu übernehmen …</button>
      {/if}
    </section>

    <section class="karte">
      <h2>Klassenliste, Geburtsdatum und Schulmail</h2>
      <p>Der Abgleich kennt nur Schüler, die in deinen Stunden schon einmal gefehlt haben oder zu spät kamen. Die vollständige Liste und das Geburtsdatum stehen im Export je Klasse. In WebUntis: <b>Stammdaten › Schüler › Klasse wählen › Bericht › CSV</b>. Die Datei hier einlesen, auch mehrere auf einmal.</p>
      <p class="klein leise">Übernommen werden Name, Geburtsdatum, Geschlecht, Klasse, Nachteilsausgleich und die schulische Mailadresse (@osz-lus.de), nur für deine Klassen. Private Adressen, Anschrift und Telefon werden nicht gespeichert.</p>
      <div class="zeile wrap">
        <button class="knopf" onclick={() => exportDatei?.click()}>Export einlesen</button>
        <input type="file" accept=".csv,.txt,text/csv,text/plain" multiple bind:this={exportDatei} onchange={exportLesen} hidden />
      </div>

      {#each vorschauen as v, i}
        <div class="detail">
          <h3>Datei {vorschauen.length > 1 ? i + 1 : ''} · {v.gelesen} Zeilen</h3>
          <p class="klein leise">Spalten</p>
          <div class="spalten">
            {#each FELDER as f}
              <label class="klein"><span class={!v.zuordnung[f.feld] && f.noetig ? 'warn' : 'leise'}>{f.titel}</span>
                <select value={v.zuordnung[f.feld] ?? ''} onchange={(e) => spalteSetzen(i, f.feld, (e.currentTarget as HTMLSelectElement).value)}>
                  <option value="">– nicht da –</option>
                  {#each v.kopf as k}<option value={k}>{k}</option>{/each}
                </select>
              </label>
            {/each}
          </div>
          {#if v.fehlt.length}
            <p class="klein warn">Bitte die Spalten für Vor- und Nachname wählen.</p>
          {:else}
            <p class="klein">{v.treffer.length} schon in L.E.O. (werden ergänzt){v.ignoriert ? ` · ${v.ignoriert} aus anderen Klassen (ignoriert)` : ''}{v.privatIgnoriert ? ` · ${v.privatIgnoriert} ${v.privatIgnoriert === 1 ? 'private Mailadresse' : 'private Mailadressen'} (ignoriert)` : ''}</p>
            {#each v.neu as g (g.kursId)}
              {@const k = `${i}|${g.kursId}`}
              <p class="klein"><b>{g.kurs}:</b> {g.zeilen.length} {g.zeilen.length === 1 ? 'Schüler fehlt' : 'Schüler fehlen'} in L.E.O. Antippen nimmt jemanden heraus (z. B. andere Teilungsgruppe).</p>
              <div class="chips zeile wrap">
                {#each g.zeilen as z, j}
                  <button class="pille klein" aria-pressed={wahl[k]?.has(j)} onclick={() => umschalten(k, j)}>{z.vorname} {z.nachname}</button>
                {/each}
              </div>
            {/each}
          {/if}
        </div>
      {/each}
      {#if vorschauen.length}
        <div class="zeile wrap">
          <button class="knopf haupt" onclick={exportUebernehmen} disabled={vorschauen.every((v) => v.fehlt.length)}>Übernehmen{fehltAnzahl ? ` (${fehltAnzahl} aufnehmen)` : ''}</button>
          <button class="knopf leise" onclick={() => { texte = []; vorschauen = []; }}>Verwerfen</button>
        </div>
      {/if}
    </section>

    <section class="karte">
      <h2>Schulmail aus IServ</h2>
      <p class="klein"><b class="zahl">{mails.hinterlegt}</b> hinterlegt · <b class="zahl">{mails.muster}</b> nach Muster v.nachname@osz-lus.de{mails.pruefen ? `, davon ${mails.pruefen} bitte prüfen (Umlaut, Doppelname …)` : ''}</p>
      <p class="klein leise">Adressen aus IServ hier einfügen, zum Beispiel aus dem Adressbuch, der Mitgliederliste einer Klassengruppe oder einem Verteiler. Steht der Name in derselben Zeile, ordnet L.E.O. danach zu, sonst nach dem Teil vor dem @. Nur eindeutige Treffer werden gespeichert.</p>
      <textarea class="eingabe" rows="4" bind:value={mailText} placeholder="Anna Muster <a.muster@osz-lus.de>"></textarea>
      <div class="zeile wrap"><button class="knopf" onclick={mailsLesen} disabled={!mailText.trim()}>Adressen zuordnen</button></div>
      {#if mails.pruefen}
        <details>
          <summary class="klein">Bitte prüfen</summary>
          <ul class="klein">
            {#each meine.filter((s) => !s.mailDienst?.trim() && adressVorschlag(s.vorname, s.nachname).pruefen.length) as s}<li><a href="/schueler/{s.id}">{name(s)}</a> <span class="leise">{adressVorschlag(s.vorname, s.nachname).adresse} · {adressVorschlag(s.vorname, s.nachname).pruefen.join(', ')}</span></li>{/each}
          </ul>
        </details>
      {/if}
    </section>
  {/if}

  {#if ergebnisse.length || laeuft}
    <section class="karte">
      <div class="zeile kopf">
        <h2 class="raum">Verbindungstest</h2>
        {#if fertig}<span class="leise zahl">{mitDaten} von {PRUEFUNGEN.length} Abfragen liefern Daten</span>{/if}
      </div>
      <div class="kacheln">
        {#each kacheln as k (k.id)}
          <button class="kachel s-{k.status}" aria-expanded={offen === k.id} onclick={() => (offen = offen === k.id ? null : k.id)}>
            <span class="zeile"><span class="marke" aria-hidden="true">{zeichen[k.status]}</span><b class="raum">{k.titel}</b>{#if 'anzahl' in k && k.anzahl !== undefined}<span class="zahl anzahl">{k.anzahl}</span>{/if}</span>
            <span class="klein leise">{wort[k.status]}</span>
          </button>
        {/each}
      </div>

      {#each kacheln as k (k.id)}
        {#if offen === k.id}
          <div class="detail">
            <h3>{k.titel}</h3>
            <p class="klein"><span class="leise">Wofür in L.E.O.:</span> {k.wofuer}</p>
            <p class="klein"><span class="leise">Abfrage:</span> <code>{k.aufruf}</code></p>
            {#if 'fehler' in k && k.fehler}<p class="klein warn">{k.fehler}</p>{/if}
            {#if 'extra' in k && k.extra}
              <dl>
                {#each Object.entries(k.extra) as [n, w]}<dt class="leise">{n}</dt><dd class="zahl">{w}</dd>{/each}
              </dl>
            {/if}
            {#if 'felder' in k && k.felder?.length}
              <p class="klein leise">Felder (Anteil gefüllt)</p>
              <div class="chips zeile wrap">
                {#each k.felder as f}<span class="chip klein">{f.name} <span class="leise zahl">{f.gefuellt} %</span></span>{/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}

      {#if fertig}
        <div class="zeile wrap">
          <button class="knopf" onclick={kopieren}>Bericht kopieren (ohne Namen)</button>
          <span class="klein leise">Den Bericht kannst du Claude schicken. Er enthält nur Status, Anzahlen und Feldnamen.</span>
        </div>
        {#if berichtText}<textarea class="eingabe bericht" readonly rows="8">{berichtText}</textarea>{/if}
      {/if}
    </section>
  {/if}
</div>

<style>
  .seite { padding: 24px 32px; max-width: 900px; display: flex; flex-direction: column; gap: 16px; }
  section p { line-height: 1.55; }
  .form { display: flex; flex-direction: column; gap: 12px; max-width: 520px; margin-top: 12px; }
  .wrap { flex-wrap: wrap; gap: 8px; }
  .kopf { margin-bottom: 12px; }
  .kacheln { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
  .kachel {
    text-align: left; display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; min-height: var(--leo-ziel-touch);
    border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); background: var(--leo-karte);
  }
  .kachel[aria-expanded='true'] { border: 2px solid var(--leo-akzent); padding: 11px 13px; }
  .marke { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; font-size: 12px; font-weight: 700; background: var(--leo-taste); color: var(--leo-leise); }
  .s-ok .marke { background: var(--leo-akzent-hell); color: var(--leo-akzent); }
  .s-verwehrt .marke { background: var(--leo-stern-hell); color: var(--leo-stern); }
  .s-fehler .marke { background: var(--leo-warnung-hell); color: var(--leo-warnung); }
  .anzahl { font-weight: 700; font-size: var(--leo-text-l); }
  .schalter input { width: 20px; height: 20px; accent-color: var(--leo-akzent); }
  a.kachel { text-decoration: none; color: inherit; }
  .detail { margin-top: 14px; padding: 14px 16px; border-radius: var(--leo-r-m); background: var(--leo-flaeche-leise); border: 1px solid var(--leo-linie-fein); }
  .detail h3 { margin: 0 0 6px; font-size: var(--leo-text-m); }
  .detail p { margin: 4px 0; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; margin: 8px 0; font-size: var(--leo-text-s); }
  dd { margin: 0; }
  code { font-family: var(--leo-schrift-mono); font-size: 12px; }
  .chip { min-height: 26px; }
  .spalten { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; margin-bottom: 8px; }
  .spalten label { display: flex; flex-direction: column; gap: 2px; }
  textarea.eingabe { width: 100%; margin: 8px 0; }
  .bericht { width: 100%; margin-top: 10px; font-family: var(--leo-schrift-mono); font-size: 12px; }
  @media (max-width: 720px) { .seite { padding: 16px; } .kacheln { grid-template-columns: 1fr 1fr; } }
</style>
