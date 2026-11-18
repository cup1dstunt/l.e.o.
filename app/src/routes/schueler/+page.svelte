<script lang="ts">
  import { app } from '$lib/speicher.svelte';
  import { name, alter } from '$lib/hilfen';
  const d = app.d!;
  let suche = $state('');
  const kursVon = (sid: string) => d.kurse.filter((k) => k.schueler.includes(sid));
  const treffer = $derived(
    [...d.schueler].sort((a, b) => a.nachname.localeCompare(b.nachname, 'de'))
      .filter((s) => (name(s) + ' ' + kursVon(s.id).map((k) => k.name).join(' ')).toLowerCase().includes(suche.toLowerCase()))
  );
</script>

<div class="seite">
  <div class="zeile kopf"><h1 class="raum">Schüler</h1><input class="eingabe" type="search" placeholder="Name oder Klasse suchen" bind:value={suche} /></div>
  <div class="karte liste">
    {#each treffer as s}
      <a href="/schueler/{s.id}?kurs={kursVon(s.id)[0]?.id}">
        <b>{name(s)}</b>{#if s.nta}&nbsp;<span class="nta" title={s.nta}>N</span>{/if}
        <span class="leise klein">{alter(s) === null ? '' : `${alter(s)} J. · `} {kursVon(s.id).map((k) => k.name).join(', ')}</span>
      </a>
    {/each}
  </div>
</div>

<style>
  .seite { padding: 24px 32px; max-width: 900px; }
  .kopf { margin-bottom: 16px; flex-wrap: wrap; }
  .liste { padding: 0 18px; }
  .liste a { display: flex; align-items: center; gap: 10px; padding: 13px 0; border-bottom: 1px solid var(--leo-linie-fein); text-decoration: none; color: var(--leo-tinte); flex-wrap: wrap; }
  .liste a span.klein { margin-left: auto; }
  @media (max-width: 720px) { .seite { padding: 16px; } }
</style>
