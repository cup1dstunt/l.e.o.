<script lang="ts">
  import { app, speichern, zuruecksetzen, exportieren, importieren, zeige, passwortAendern, kannVerschluesseln } from '$lib/speicher.svelte';
  import { sitzung } from '$lib/sitzung.svelte';
  const d = app.d!;
  let altPw = $state('');
  let neuPw = $state('');
  let neuPw2 = $state('');
  async function pwAendern(e: Event) {
    e.preventDefault();
    if (neuPw.length < 4) { zeige('Mindestens 4 Zeichen'); return; }
    if (neuPw !== neuPw2) { zeige('Die beiden neuen Passwörter sind verschieden'); return; }
    const f = await passwortAendern(altPw, neuPw);
    if (f) { zeige(f); return; }
    altPw = neuPw = neuPw2 = '';
    zeige('Passwort geändert');
  }
  let datei: HTMLInputElement;
  let sicher = $state(false);
  async function laden(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    try { await importieren(f); zeige('Sicherung eingespielt'); location.href = '/'; } catch (err) { zeige((err as Error).message); }
  }
</script>

<div class="seite">
  <h1>Mehr</h1>

  <section class="karte">
    <h2>Darstellung</h2>
    <p class="klein leise">Navigation (am Handy immer unten)</p>
    <div class="zeile">
      {#each [['links', 'Seitenleiste links'], ['rechts', 'Seitenleiste rechts'], ['unten', 'Leiste unten']] as [w, t]}
        <button class="pille" aria-pressed={d.einstellungen.navigation === w} onclick={() => { d.einstellungen.navigation = w as 'links'; speichern(); }}>{t}</button>
      {/each}
    </div>
    <p class="klein leise">Farbschema</p>
    <div class="zeile">
      {#each [['system', 'wie Gerät'], ['hell', 'hell'], ['dunkel', 'dunkel']] as [w, t]}
        <button class="pille" aria-pressed={d.einstellungen.theme === w} onclick={() => { d.einstellungen.theme = w as 'system'; speichern(); }}>{t}</button>
      {/each}
    </div>
    <label class="zeile schalter"><input type="checkbox" bind:checked={d.einstellungen.stundenendeHinweis} onchange={speichern} /> Hinweis „n Schüler ohne Mitarbeitseintrag“ (E55)</label>
  </section>

  <section class="karte">
    <h2>Anmeldung</h2>
    <p>Das Passwort schützt L.E.O. auf diesem Gerät, etwa wenn Schülerinnen und Schüler das iPad oder den Beamer sehen. Es verlässt das Gerät nie. Vergessen heißt: Daten nur über eine Sicherung zurückholen.</p>
    {#if app.verschluesselt}
      <p class="klein"><b>Verschlüsselt:</b> Die Daten auf diesem Gerät sind mit deinem Passwort verschlüsselt (AES-256). Ohne Passwort sind sie nicht lesbar.</p>
    {:else}
      <p class="klein warn"><b>Nicht verschlüsselt:</b> {kannVerschluesseln() ? 'Beim nächsten Anmelden werden die Daten verschlüsselt.' : 'L.E.O. ist ohne HTTPS geöffnet, dann erlaubt der Browser keine Verschlüsselung. Über die HTTPS-Adresse geht es.'}</p>
    {/if}
    <p class="klein leise">Automatisch sperren nach</p>
    <div class="zeile">
      {#each [[5, '5 Min.'], [15, '15 Min.'], [30, '30 Min.'], [60, '1 Std.'], [0, 'nie']] as [w, t]}
        <button class="pille" aria-pressed={d.einstellungen.sperreMinuten === w} onclick={() => { d.einstellungen.sperreMinuten = w as number; speichern(); }}>{t}</button>
      {/each}
    </div>
    <div class="zeile wrap"><button class="knopf" onclick={() => (sitzung.entsperrt = false)}>Jetzt sperren</button></div>
    <form class="pw" onsubmit={pwAendern}>
      <p class="klein leise">Passwort ändern</p>
      <input class="eingabe" type="password" autocomplete="current-password" placeholder="Bisheriges Passwort" bind:value={altPw} />
      <input class="eingabe" type="password" autocomplete="new-password" placeholder="Neues Passwort" bind:value={neuPw} />
      <input class="eingabe" type="password" autocomplete="new-password" placeholder="Neues Passwort wiederholen" bind:value={neuPw2} />
      <button class="knopf" type="submit">Ändern</button>
    </form>
  </section>

  <section class="karte">
    <h2>Daten</h2>
    <p>Alle Daten liegen <b>nur in diesem Browser auf diesem Gerät</b>. Der Server liefert nur die App aus und sieht keine Noten. Ein anderes Gerät oder ein anderer Browser hat eigene Daten.</p>
    <div class="zeile wrap">
      <button class="knopf haupt" onclick={exportieren}>Sicherung herunterladen</button>
      <button class="knopf" onclick={() => datei.click()}>Sicherung einspielen</button>
      <input type="file" accept="application/json,.json" bind:this={datei} onchange={laden} hidden />
    </div>
    <p class="klein leise">Mit einer Sicherung kannst du den Stand auch auf ein anderes Gerät übertragen. Einspielen ersetzt alles auf diesem Gerät. Die Sicherungsdatei selbst ist noch nicht verschlüsselt, bewahre sie sicher auf.</p>
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

  <section class="karte">
    <h2>WebUntis</h2>
    <p>Prüfe mit deinem WebUntis-Konto, welche Daten L.E.O. bekommen könnte (Stundenplan, Klassen, Schüler, Fehlzeiten). Nur lesen, nichts wird gespeichert (V11).</p>
    <div class="zeile wrap"><a class="knopf" href="/mehr/webuntis">Verbindungstest öffnen</a></div>
  </section>

  <section class="karte">
    <h2>Über diesen Prototyp</h2>
    <p class="leise">L.E.O. Prototyp 0.5: Tagesübersicht, Notenbuch, Schülerkarte, Live-Stunde, Sitzplan, Planung. Erfundene Beispieldaten, WebUntis bisher nur als Verbindungstest, kein IServ. Anmeldung nur lokal auf diesem Gerät.</p>
    <p class="leise">Als App installieren: im Browser „Zum Startbildschirm“ (iPad/iPhone) bzw. „Installieren“ (Chrome/Edge). Das geht nur über HTTPS oder auf localhost.</p>
  </section>
</div>

<style>
  .seite { padding: 24px 32px; max-width: 820px; display: flex; flex-direction: column; gap: 16px; }
  section p { line-height: 1.55; }
  .zeile { flex-wrap: wrap; gap: 8px; }
  .wrap { margin: 10px 0; }
  .schalter { margin-top: 16px; }
  .schalter input { width: 20px; height: 20px; accent-color: var(--leo-akzent); }
  .pw { display: flex; flex-direction: column; gap: 8px; max-width: 360px; }
  .warn { color: var(--leo-warnung); }
  .klein.leise { margin: 14px 0 6px; }
  @media (max-width: 720px) { .seite { padding: 16px; } }
</style>
