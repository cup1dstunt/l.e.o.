<script lang="ts">
  import type { Kurs } from '$lib/typen';
  import type { Snippet } from 'svelte';
  import { app } from '$lib/speicher.svelte';
  import { kursReiter } from '$lib/module';
  let { kurs, aktiv, info = '', rechts }: { kurs: Kurs; aktiv: 'noten' | 'stunde' | 'planung' | 'sitzplan' | 'anwesenheit' | 'muendlich' | 'gruppenarbeit'; info?: string; rechts?: Snippet } = $props();
</script>

<header class="kopf">
  <div class="titel">
    <h1>{kurs.name}</h1>
    <span class="leise">{info || `${kurs.schueler.length} Schüler · Raum ${kurs.raum} · ${kurs.profil}`}</span>
    <div class="raum"></div>
    {@render rechts?.()}
  </div>
  <nav class="reiter" aria-label="Kursansichten">
    {#each kursReiter(app.d?.einstellungen) as r (r.aktiv)}
      <a href="{r.pfad}{kurs.id}" class:aktiv={aktiv === r.aktiv}>{r.text}</a>
    {/each}
  </nav>
</header>

<style>
  .kopf { background: var(--leo-karte); border-bottom: 1px solid var(--leo-linie); padding: 14px 32px 0; position: sticky; top: 0; z-index: 15; }
  .titel { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; row-gap: 8px; }
  .titel h1 { font-size: 20px; }
  .reiter { display: flex; gap: 28px; margin-top: 10px; overflow-x: auto; }
  .reiter a { padding: 10px 2px 12px; text-decoration: none; color: var(--leo-leise); border-bottom: 3px solid transparent; }
  .reiter a.aktiv { color: var(--leo-tinte); font-weight: 700; border-color: var(--leo-akzent); }
  @media (max-width: 720px) { .kopf { padding: 12px 16px 0; } }
</style>
