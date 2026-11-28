<script lang="ts">
  // Suche mit Strg+K / ⌘K (E90): Schüler, Klassen, Seiten
  import { goto } from '$app/navigation';
  import { app } from '$lib/speicher.svelte';
  import { name } from '$lib/hilfen';
  let { offen = $bindable() }: { offen: boolean } = $props();
  let q = $state('');
  let aktiv = $state(0);
  let feld = $state<HTMLInputElement>();
  $effect(() => { if (offen) { q = ''; aktiv = 0; setTimeout(() => feld?.focus(), 0); } });

  const treffer = $derived.by(() => {
    const d = app.d!;
    const t = q.trim().toLowerCase();
    const liste: { text: string; neben: string; href: string }[] = [];
    const namen = new Map<string, number>();
    for (const s of d.schueler) namen.set(name(s), (namen.get(name(s)) ?? 0) + 1);
    for (const s of d.schueler) {
      const k = d.kurse.find((x) => x.schueler.includes(s.id));
      const zusatz = (namen.get(name(s)) ?? 0) > 1 ? (s.geburt ? ` · geb. ${s.geburt.slice(0, 4)}` : ' · gleicher Name') : ''; // B4
      liste.push({ text: name(s), neben: `Schüler · ${k?.klasse ?? ''}${zusatz}`, href: `/schueler/${s.id}?kurs=${k?.id}` });
    }
    for (const k of d.kurse) {
      liste.push({ text: k.name, neben: 'Klasse · Notenbuch', href: `/kurs/${k.id}` });
      liste.push({ text: k.name, neben: 'Klasse · Stunde', href: `/stunde/${k.id}` });
      liste.push({ text: k.name, neben: 'Klasse · Sitzplan', href: `/sitzplan/${k.id}` });
      liste.push({ text: k.name, neben: 'Klasse · Planung', href: `/planung/${k.id}` });
    }
    for (const [text, href] of [['Heute', '/'], ['Klassen', '/klassen'], ['Schüler', '/schueler'], ['Einstellungen und Sicherung', '/mehr']])
      liste.push({ text, neben: 'Seite', href });
    if (!t) return liste.filter((x) => x.neben === 'Seite' || x.neben === 'Klasse · Notenbuch');
    return liste.filter((x) => (x.text + ' ' + x.neben).toLowerCase().includes(t)).slice(0, 12);
  });
  function oeffnen(href: string) { offen = false; goto(href); }
  function taste(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { aktiv = Math.min(treffer.length - 1, aktiv + 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { aktiv = Math.max(0, aktiv - 1); e.preventDefault(); }
    else if (e.key === 'Enter' && treffer[aktiv]) oeffnen(treffer[aktiv].href);
    else if (e.key === 'Escape') offen = false;
  }
</script>

{#if offen}
  <div class="hintergrund oben" role="presentation" onclick={(e) => e.target === e.currentTarget && (offen = false)}>
    <div class="schweben suche" role="dialog" aria-label="Suche">
      <input class="eingabe" bind:this={feld} bind:value={q} oninput={() => (aktiv = 0)} onkeydown={taste} placeholder="Schüler, Klasse oder Seite suchen …" />
      <ul>
        {#each treffer as t, i}
          <li><button class:aktiv={i === aktiv} onmouseenter={() => (aktiv = i)} onclick={() => oeffnen(t.href)}><b>{t.text}</b><span class="leise klein">{t.neben}</span></button></li>
        {/each}
        {#if treffer.length === 0}<li class="leise klein leer">Nichts gefunden.</li>{/if}
      </ul>
      <p class="klein leise">↑ ↓ wählen · Enter öffnen · Esc schließen</p>
    </div>
  </div>
{/if}

<style>
  .oben { place-items: start center; padding-top: 12vh; }
  .suche { width: min(560px, 100%); padding: 12px; }
  .suche > input { width: 100%; font-size: 16px; min-height: 48px; }
  ul { list-style: none; padding: 0; margin: 8px 0; max-height: 50vh; overflow: auto; }
  li button { width: 100%; display: flex; justify-content: space-between; gap: 12px; background: none; border: 0; padding: 10px 12px; border-radius: var(--leo-r-m); text-align: left; }
  li button.aktiv { background: var(--leo-akzent-hell); }
  .leer { padding: 10px 12px; }
  p { margin: 4px 8px; }
</style>
