<script lang="ts">
  // Sicherung (F3, E102): verschlüsselte Datei, automatische Tagesstände, Wiederherstellen erst nach Vorschau.
  import { app, exportieren, dateiLesen, einspielen, staendeListe, standLesen, jetzigerUeberblick, zuruecksetzen, zeige, kannVerschluesseln } from '$lib/speicher.svelte';
  import type { Daten } from '$lib/typen';
  import type { Ueberblick } from '$lib/sicherung';

  type Vorschau = { titel: string; daten: Daten; ueberblick: Ueberblick; hinweis?: string };
  let vorschau = $state<Vorschau | null>(null);
  let staende = $state<{ id: string; erstellt: string; anlass: string }[]>([]);
  let datei: HTMLInputElement;
  let gewaehlt = $state<File | null>(null);
  let dateiPw = $state('');
  let pwNoetig = $state(false);
  let arbeitet = $state(false);
  let sicher = $state(false);
  const jetzt = $derived(vorschau ? jetzigerUeberblick() : null);

  const neuLesen = () => staendeListe().then((s) => (staende = s)).catch(() => (staende = []));
  neuLesen();

  const wann = (iso: string) => new Date(iso).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  async function herunter() {
    const v = await exportieren();
    zeige(v ? 'Sicherung heruntergeladen (verschlüsselt)' : 'Sicherung heruntergeladen, unverschlüsselt (ohne HTTPS)');
  }

  async function dateiGewaehlt(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    (e.currentTarget as HTMLInputElement).value = '';
    if (!f) return;
    gewaehlt = f;
    dateiPw = '';
    await dateiPruefen();
  }
  async function dateiPruefen(e?: Event) {
    e?.preventDefault();
    if (!gewaehlt) return;
    arbeitet = true;
    try {
      const r = await dateiLesen(gewaehlt, pwNoetig ? dateiPw : undefined);
      if ('passwort' in r) { pwNoetig = true; vorschau = null; return; }
      if ('fehler' in r) { zeige(r.fehler); if (!pwNoetig) gewaehlt = null; return; }
      pwNoetig = false;
      vorschau = {
        titel: `Datei ${gewaehlt.name}`,
        daten: r.daten,
        ueberblick: r.ueberblick,
        hinweis: r.erstellt ? `Erstellt ${wann(r.erstellt)}${r.verschluesselt ? ', verschlüsselt' : ', unverschlüsselt'}` : r.verschluesselt ? 'verschlüsselt' : 'unverschlüsselte Sicherung'
      };
    } finally { arbeitet = false; }
  }

  async function standAnsehen(id: string, erstellt: string, anlass: string) {
    try {
      const r = await standLesen(id);
      if (!r) return;
      vorschau = { titel: anlass === 'vorher' ? `Stand vor dem Einspielen, ${wann(erstellt)}` : `Tagesstand ${wann(erstellt)}`, daten: r.daten, ueberblick: r.ueberblick };
      gewaehlt = null; pwNoetig = false;
    } catch (e) { zeige('Stand lässt sich nicht öffnen: ' + (e as Error).message); }
  }

  async function wiederherstellen() {
    if (!vorschau) return;
    arbeitet = true;
    try {
      await einspielen(vorschau.daten);
      zeige('Stand eingespielt');
      location.href = '/';
    } catch (e) {
      zeige('Einspielen fehlgeschlagen: ' + (e as Error).message);
    } finally { arbeitet = false; }
  }
  const zeilen: [keyof Ueberblick, string][] = [['schueler', 'Schülerinnen und Schüler'], ['noten', 'Noteneinträge'], ['muendlich', 'Einträge mündlich'], ['fehlzeiten', 'Fehlzeiten'], ['notizen', 'Notizen']];
</script>

<section class="karte">
  <h2>Sicherung</h2>
  <p>Alle Daten liegen in diesem Browser auf diesem Gerät{app.verschluesselt ? ', verschlüsselt' : ''}. Eine Sicherungsdatei schützt vor Verlust, etwa wenn Browserdaten gelöscht werden.</p>
  <div class="zeile wrap">
    <button class="knopf haupt" onclick={herunter}>Sicherung herunterladen</button>
    <button class="knopf" onclick={() => datei.click()}>Sicherung einspielen …</button>
    <input type="file" accept="application/json,.json" bind:this={datei} onchange={dateiGewaehlt} hidden />
  </div>
  <p class="klein leise">{app.verschluesselt
    ? 'Die Datei ist mit deinem L.E.O.-Passwort verschlüsselt. Auf einem anderen Gerät öffnest du sie mit dem Passwort, das beim Herunterladen galt.'
    : kannVerschluesseln() ? 'Nach dem nächsten Anmelden wird die Datei verschlüsselt.' : 'Ohne HTTPS kann der Browser nicht verschlüsseln: Die Datei ist lesbar, bewahre sie sicher auf.'}</p>
  {#if app.d?.material?.some((m) => m.art === 'datei')}
    <p class="klein leise">Dateien aus der Dateiablage sind nicht in der Sicherungsdatei, nur ihre Namen und alle Links. Mit Abgleich liegen sie verschlüsselt auf deinem Server.</p>
  {/if}

  {#if pwNoetig && gewaehlt}
    <form class="pw" onsubmit={dateiPruefen}>
      <p class="klein">Diese Sicherung stammt von einem anderen Gerät oder einem früheren Passwort. Mit welchem Passwort wurde sie gesichert?</p>
      <input class="eingabe" type="password" autocomplete="off" placeholder="Passwort der Sicherung" bind:value={dateiPw} />
      <div class="zeile"><button class="knopf" type="submit" disabled={arbeitet || !dateiPw}>{arbeitet ? 'Prüfe …' : 'Öffnen'}</button><button type="button" class="knopf leise" onclick={() => { gewaehlt = null; pwNoetig = false; }}>Abbrechen</button></div>
    </form>
  {/if}

  <h3>Automatisch gesichert</h3>
  <p class="klein leise">Einmal am Tag beim ersten Anmelden legt L.E.O. einen Stand in diesem Gerät ab und behält die letzten 7, dazu den Stand vor jedem Einspielen.</p>
  {#if staende.length}
    <ul class="staende">
      {#each staende as s (s.id)}
        <li><button class="stand" onclick={() => standAnsehen(s.id, s.erstellt, s.anlass)}><span>{wann(s.erstellt)}</span><span class="leise klein">{s.anlass === 'vorher' ? 'vor dem Einspielen' : 'täglich'}</span><span class="pfeil" aria-hidden="true">›</span></button></li>
      {/each}
    </ul>
  {:else}
    <p class="klein leise">Noch kein Stand vorhanden.</p>
  {/if}

  {#if vorschau}
    <div class="vorschau" role="region" aria-label="Vorschau">
      <h3>{vorschau.titel}</h3>
      {#if vorschau.hinweis}<p class="klein leise">{vorschau.hinweis}</p>{/if}
      <table>
        <thead><tr><th></th><th class="zahl">Sicherung</th><th class="zahl">jetzt</th></tr></thead>
        <tbody>
          <tr><td>Klassen</td><td class="zahl">{vorschau.ueberblick.klassen.length}</td><td class="zahl">{jetzt?.klassen.length ?? '–'}</td></tr>
          {#each zeilen as [k, t]}
            <tr><td>{t}</td><td class="zahl">{vorschau.ueberblick[k]}</td><td class="zahl">{jetzt?.[k] ?? '–'}</td></tr>
          {/each}
        </tbody>
      </table>
      {#if vorschau.ueberblick.klassen.length}<p class="klein leise">{vorschau.ueberblick.klassen.join(' · ')}</p>{/if}
      <p class="klein">Einspielen ersetzt alles auf diesem Gerät{app.verschluesselt ? ' und, wenn der Abgleich an ist, auch auf deinen anderen Geräten' : ''}. Der jetzige Stand wird vorher automatisch gesichert.</p>
      <div class="zeile wrap">
        <button class="knopf haupt" onclick={wiederherstellen} disabled={arbeitet}>{arbeitet ? 'Einen Moment …' : 'Diesen Stand einspielen'}</button>
        <button class="knopf leise" onclick={() => { vorschau = null; gewaehlt = null; }}>Abbrechen</button>
      </div>
    </div>
  {/if}

  <div class="zeile wrap">
    {#if !sicher}
      <button class="knopf leise" onclick={() => (sicher = true)}>Beispieldaten neu laden …</button>
    {:else}
      <span class="warn">Alle Änderungen gehen verloren.</span>
      <button class="knopf leise warn" onclick={() => { zuruecksetzen(); sicher = false; zeige('Beispieldaten neu geladen'); }}>Ja, neu laden</button>
      <button class="knopf leise" onclick={() => (sicher = false)}>Abbrechen</button>
    {/if}
  </div>
</section>

<style>
  section p { line-height: 1.55; }
  h3 { font-size: var(--leo-text-m); margin: 20px 0 4px; font-weight: 650; }
  .zeile { flex-wrap: wrap; gap: 8px; }
  .wrap { margin: 10px 0; }
  .pw { display: flex; flex-direction: column; gap: 8px; max-width: 420px; margin: 8px 0; }
  .staende { list-style: none; margin: 8px 0; padding: 0; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); overflow: hidden; }
  .staende li + li { border-top: 1px solid var(--leo-linie-fein); }
  .stand { width: 100%; min-height: var(--leo-ziel-touch); display: flex; align-items: center; gap: 12px; padding: 0 14px; background: var(--leo-karte); border: 0; text-align: left; }
  .stand:hover { background: var(--leo-flaeche-leise); }
  .stand span:first-child { flex: 1; }
  .pfeil { color: var(--leo-leise); font-size: 18px; }
  .vorschau { margin: 12px 0; padding: 14px 16px; border: 1.5px solid var(--leo-akzent); border-radius: var(--leo-r-l); background: var(--leo-flaeche-leise); }
  .vorschau h3 { margin-top: 0; }
  table { border-collapse: collapse; margin: 8px 0; }
  th, td { padding: 4px 14px 4px 0; text-align: left; }
  th { font-size: var(--leo-text-s); color: var(--leo-leise); font-weight: 500; }
  td.zahl, th.zahl { text-align: right; }
  .warn { color: var(--leo-warnung); }
</style>
