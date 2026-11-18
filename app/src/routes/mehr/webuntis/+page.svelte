<script lang="ts">
  import { PRUEFUNGEN, verbindungstest, bericht, type Pruefung, type Zugang } from '$lib/untis';
  import { zeige } from '$lib/speicher.svelte';

  // Schule und Benutzer dürfen sich das Gerät merken, der Schlüssel nie (nur Arbeitsspeicher).
  const MERK = 'leo-untis-zugang';
  let gemerkt: Partial<Zugang> = {};
  try { gemerkt = JSON.parse(localStorage.getItem(MERK) ?? '{}'); } catch { /* privat */ }

  let schule = $state(gemerkt.schule ?? 'osz-lus');
  let benutzer = $state(gemerkt.benutzer ?? '');
  let art = $state<Zugang['art']>(gemerkt.art ?? 'schluessel');
  let geheim = $state('');
  let laeuft = $state(false);
  let ergebnisse = $state<Pruefung[]>([]);
  let offen = $state<string | null>(null);
  let berichtText = $state('');

  const fertig = $derived(ergebnisse.length === PRUEFUNGEN.length);
  const mitDaten = $derived(ergebnisse.filter((p) => p.status === 'ok').length);
  const kacheln = $derived(
    PRUEFUNGEN.map((v) => ergebnisse.find((e) => e.id === v.id) ?? { ...v, status: laeuft ? ('laeuft' as const) : ('offen' as const) })
  );

  async function testen(e: Event) {
    e.preventDefault();
    if (!schule.trim() || !benutzer.trim() || !geheim) { zeige('Schule, Benutzer und Schlüssel bzw. Passwort ausfüllen'); return; }
    try { localStorage.setItem(MERK, JSON.stringify({ schule, benutzer, art })); } catch { /* egal */ }
    ergebnisse = [];
    berichtText = '';
    offen = null;
    laeuft = true;
    try {
      await verbindungstest({ schule, benutzer, art, geheim }, (p) => (ergebnisse = [...ergebnisse.filter((x) => x.id !== p.id), p]));
    } finally {
      laeuft = false;
      geheim = ''; // nicht länger als nötig im Speicher
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
    <h2>Verbindungstest</h2>
    <p>Der Test meldet sich mit deinem WebUntis-Konto an und prüft, <b>welche Daten L.E.O. bekommen könnte</b>. Er liest nur, trägt nichts in WebUntis ein und speichert nichts. Angezeigt werden nur Anzahlen und Feldnamen, keine Namen.</p>
    <p class="klein leise">Der Schlüssel bzw. das Passwort bleibt nur bis zum Ende des Tests im Arbeitsspeicher. Gemerkt werden Schule und Benutzername.</p>

    <form class="form" onsubmit={testen}>
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
      <div><button class="knopf haupt" type="submit" disabled={laeuft}>{laeuft ? 'Prüfe …' : 'Verbindung testen'}</button></div>
    </form>
  </section>

  {#if ergebnisse.length || laeuft}
    <section class="karte">
      <div class="zeile kopf">
        <h2 class="raum">Ergebnis</h2>
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
