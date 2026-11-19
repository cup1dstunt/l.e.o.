<script lang="ts">
  import { PRUEFUNGEN, verbindungstest, bericht, anmelden, fehlerMeldung, type Pruefung, type Zugang } from '$lib/untis';
  import { holen, uebernehmen, stammdatenEinlesen, type Ergebnis } from '$lib/untisimport';
  import { app, zeige, speichern } from '$lib/speicher.svelte';

  const d = app.d!;

  // Schule und Benutzer merkt sich das Gerät immer, Schlüssel bzw. Passwort nur auf Wunsch (unverschlüsselt im Browser).
  const MERK = 'leo-untis-zugang';
  const MERK_GEHEIM = 'leo-untis-geheim';
  let geheimGemerkt = '';
  try { geheimGemerkt = localStorage.getItem(MERK_GEHEIM) ?? ''; } catch { /* privat */ }
  let gemerkt: Partial<Zugang> = {};
  try { gemerkt = JSON.parse(localStorage.getItem(MERK) ?? '{}'); } catch { /* privat */ }

  let schule = $state(gemerkt.schule ?? 'osz-lus');
  let benutzer = $state(gemerkt.benutzer ?? '');
  let art = $state<Zugang['art']>(gemerkt.art ?? 'schluessel');
  let geheim = $state(geheimGemerkt);
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
  const beispielDa = $derived(d.kurse.some((k) => !k.untis));
  let beispielEntfernen = $state(true);
  const stand = $derived(d.einstellungen.untis);

  function pruefen() {
    if (!schule.trim() || !benutzer.trim() || !geheim) { zeige('Schule, Benutzer und Schlüssel bzw. Passwort ausfüllen'); return false; }
    try {
      localStorage.setItem(MERK, JSON.stringify({ schule, benutzer, art }));
      if (merken) localStorage.setItem(MERK_GEHEIM, geheim);
      else localStorage.removeItem(MERK_GEHEIM);
    } catch { /* egal */ }
    return true;
  }

  async function abgleichen(e: Event) {
    e.preventDefault();
    if (!pruefen()) return;
    abgleich = true; fehler = ''; ergebnis = null; schritt = 'Anmeldung';
    try {
      const sz = await anmelden({ schule, benutzer, art, geheim });
      try {
        const paket = await holen(sz, (t) => (schritt = t));
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

  // ---------- Stammdaten-Export (Geburtsdatum, Nachteilsausgleich) ----------
  let exportDatei = $state<HTMLInputElement>();
  async function exportLesen(e: Event) {
    const dateien = [...((e.currentTarget as HTMLInputElement).files ?? [])];
    let g = 0, z = 0;
    for (const f of dateien) {
      const r = stammdatenEinlesen(d, await f.text());
      g += r.gelesen; z += r.zugeordnet;
    }
    speichern();
    zeige(`${z} von ${g} Zeilen zugeordnet${g - z ? ' (andere Schüler ignoriert)' : ''}`);
    (e.currentTarget as HTMLInputElement).value = '';
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
    <p class="klein leise">„Nur Verbindung testen“ prüft, welche Daten ankommen, und speichert nichts. Gemerkt werden Schule und Benutzername, auf Wunsch auch der Schlüssel. Er liegt dann unverschlüsselt in diesem Browser, also nur auf dem eigenen Gerät anhaken.</p>

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
        <label class="zeile schalter"><input type="checkbox" bind:checked={beispielEntfernen} /> Beispielklassen und Beispielschüler beim Abgleich entfernen</label>
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
          <a class="kachel" href="/schueler"><b class="zahl anzahl">{ergebnis.schueler}</b><span class="klein leise">Schüler{ergebnis.schuelerNeu ? `, ${ergebnis.schuelerNeu} neu` : ''}</span></a>
          <div class="kachel"><b class="zahl anzahl">{ergebnis.fehlzeiten}</b><span class="klein leise">Fehlzeiten, davon {ergebnis.offen} offen</span></div>
          <div class="kachel"><b class="zahl anzahl">{ergebnis.verspaetungen}</b><span class="klein leise">Verspätungen</span></div>
          <div class="kachel"><b class="zahl anzahl">{ergebnis.stammdaten}</b><span class="klein leise">mit Geburtsdatum aus dem Bericht</span></div>
        </div>
      {/if}
      <p class="klein leise">Übernommen werden nur deine eigenen Stunden. Alles andere aus WebUntis wird sofort verworfen. Noten, mündliche Leistungen, Notizen und Sitzpläne bleiben bei jedem Abgleich erhalten. Wer in WebUntis nicht mehr auftaucht, wird nicht gelöscht.</p>
    </section>

    <section class="karte">
      <h2>Geburtsdatum und Nachteilsausgleich</h2>
      <p>WebUntis gibt das Geburtsdatum nur im Stammdaten-Bericht heraus. In WebUntis: <b>Stammdaten › Schüler › Klasse wählen › Bericht › CSV</b>. Die Datei hier einlesen, auch mehrere auf einmal.</p>
      <p class="klein leise">Übernommen werden nur Geburtsdatum, Klasse und Nachteilsausgleich von Schülern, die schon in L.E.O. sind. Adressen, Telefon und Mail aus der Datei werden ignoriert.</p>
      <div class="zeile wrap">
        <button class="knopf" onclick={() => exportDatei?.click()}>Export einlesen</button>
        <input type="file" accept=".csv,.txt,text/csv,text/plain" multiple bind:this={exportDatei} onchange={exportLesen} hidden />
      </div>
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
  .bericht { width: 100%; margin-top: 10px; font-family: var(--leo-schrift-mono); font-size: 12px; }
  @media (max-width: 720px) { .seite { padding: 16px; } .kacheln { grid-template-columns: 1fr 1fr; } }
</style>
