<script lang="ts">
  import { app, speichern, zuruecksetzen, exportieren, importieren, zeige } from '$lib/speicher.svelte';
  const d = app.d!;
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
    <h2>Daten</h2>
    <p>Alle Daten liegen <b>nur in diesem Browser auf diesem Gerät</b>. Der Server liefert nur die App aus und sieht keine Noten. Ein anderes Gerät oder ein anderer Browser hat eigene Daten.</p>
    <div class="zeile wrap">
      <button class="knopf haupt" onclick={exportieren}>Sicherung herunterladen</button>
      <button class="knopf" onclick={() => datei.click()}>Sicherung einspielen</button>
      <input type="file" accept="application/json,.json" bind:this={datei} onchange={laden} hidden />
    </div>
    <p class="klein leise">Mit einer Sicherung kannst du den Stand auch auf ein anderes Gerät übertragen. Einspielen ersetzt alles auf diesem Gerät.</p>
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
    <h2>Über diesen Prototyp</h2>
    <p class="leise">L.E.O. Prototyp 0.4 (abgespeckt): Notenbuch, Schüleransicht, Live-Stunde. Erfundene Beispieldaten, kein WebUntis, kein IServ, keine Anmeldung.</p>
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
  .warn { color: var(--leo-warnung); }
  .klein.leise { margin: 14px 0 6px; }
  @media (max-width: 720px) { .seite { padding: 16px; } }
</style>
