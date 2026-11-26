<script lang="ts">
  import type { Kurs } from '$lib/typen';
  import type { Snippet } from 'svelte';
  import { app } from '$lib/speicher.svelte';
  let { kurs, aktiv, info = '', rechts }: { kurs: Kurs; aktiv: 'noten' | 'stunde' | 'planung' | 'sitzplan' | 'anwesenheit' | 'muendlich'; info?: string; rechts?: Snippet } = $props();
</script>

<header class="kopf">
  <div class="titel">
    <h1>{kurs.name}</h1>
    <span class="leise">{info || `${kurs.schueler.length} Schüler · Raum ${kurs.raum} · ${kurs.profil}`}</span>
    <div class="raum"></div>
    {@render rechts?.()}
  </div>
  <nav class="reiter" aria-label="Kursansichten">
    <a href="/kurs/{kurs.id}" class:aktiv={aktiv === 'noten'}>Noten</a>
    <a href="/stunde/{kurs.id}" class:aktiv={aktiv === 'stunde'}>Stunde</a>
    <a href="/sitzplan/{kurs.id}" class:aktiv={aktiv === 'sitzplan'}>Sitzplan</a>
    <a href="/muendlich/{kurs.id}" class:aktiv={aktiv === 'muendlich'}>Mündlich</a>
    <a href="/anwesenheit/{kurs.id}" class:aktiv={aktiv === 'anwesenheit'}>Anwesenheit</a>
    {#if app.d?.einstellungen.module?.planung !== false}<a href="/planung/{kurs.id}" class:aktiv={aktiv === 'planung'}>Planung</a>{/if}
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
