<script lang="ts">
  import { app } from '$lib/speicher.svelte';
  import { istAn } from '$lib/module';
  const d = app.d!;
</script>

<div class="seite">
  <div class="zeile"><h1 class="raum">Klassen</h1>{#if istAn(d.einstellungen, 'statistik')}<a class="knopf" href="/auswertung">Alle Klassen vergleichen</a>{/if}</div>
  {#if !d.kurse.length}
    <section class="karte leer"><p>Noch keine Klassen. Unter <a href="/mehr/webuntis">Mehr › WebUntis</a> holst du sie aus deinem Stundenplan.</p></section>
  {/if}
  <div class="raster">
    {#each d.kurse as k}
      <div class="karte">
        <h2>{k.name}</h2>
        <p class="leise">{k.schueler.length} Schüler · Raum {k.raum} · Profil {k.profil}</p>
        <div class="zeile">
          <a class="knopf haupt" href="/kurs/{k.id}">Notenbuch</a>
          {#if istAn(d.einstellungen, 'stunde')}<a class="knopf" href="/stunde/{k.id}">Stunde</a>{/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .leer { margin-top: 18px; }
  .seite { padding: 24px 32px; }
  .raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 18px; }
  @media (max-width: 720px) { .seite { padding: 16px; } }
</style>
