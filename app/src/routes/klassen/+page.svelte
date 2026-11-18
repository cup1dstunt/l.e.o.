<script lang="ts">
  import { app } from '$lib/speicher.svelte';
  const d = app.d!;
</script>

<div class="seite">
  <h1>Klassen</h1>
  <div class="raster">
    {#each d.kurse as k}
      <div class="karte">
        <h2>{k.name}</h2>
        <p class="leise">{k.schueler.length} Schüler · Raum {k.raum} · Profil {k.profil}</p>
        <div class="zeile">
          <a class="knopf haupt" href="/kurs/{k.id}">Notenbuch</a>
          <a class="knopf" href="/stunde/{k.id}">Stunde</a>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .seite { padding: 24px 32px; }
  .raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 18px; }
  @media (max-width: 720px) { .seite { padding: 16px; } }
</style>
