<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { app, laden } from '$lib/speicher.svelte';
  import Hinweisleiste from '$lib/ui/Hinweisleiste.svelte';
  import { onMount } from 'svelte';

  let { children } = $props();
  let breite = $state(1200);

  onMount(() => {
    laden();
  });

  $effect(() => {
    const t = app.d?.einstellungen.theme;
    if (t && t !== 'system') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  });

  const nav = [
    { href: '/', text: 'Heute', icon: 'M12 7v5l3 2 M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18' },
    { href: '/kurse', text: 'Kurse', icon: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z' },
    { href: '/schueler', text: 'Schüler', icon: 'M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8 M4 21c0-4 4-6 8-6s8 2 8 6' },
    { href: '/mehr', text: 'Mehr', icon: 'M5 12h.01 M12 12h.01 M19 12h.01' }
  ];
  const aktiv = (href: string) => (href === '/' ? page.url.pathname === '/' || page.url.pathname.startsWith('/stunde') : page.url.pathname.startsWith(href));
  const lage = $derived(breite < 720 ? 'unten' : (app.d?.einstellungen.navigation ?? 'links'));
</script>

<svelte:window bind:innerWidth={breite} />

{#if !app.d}
  <div class="laden">L.E.O. lädt …</div>
{:else}
  <div class="rahmen {lage}" style:--unten={lage === 'unten' ? '64px' : '0px'}>
    <nav aria-label="Hauptnavigation">
      {#if lage !== 'unten'}<a class="logo" href="/" aria-label="L.E.O. Startseite"><img src="/icon.svg" alt="" width="36" height="36" /></a>{/if}
      {#each nav as n}
        <a href={n.href} class:aktiv={aktiv(n.href)} aria-current={aktiv(n.href) ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width={n.text === 'Mehr' ? 3 : 1.8} stroke-linecap="round" stroke-linejoin="round"><path d={n.icon} /></svg>
          <span>{n.text}</span>
        </a>
      {/each}
      {#if lage !== 'unten'}
        <span class="status" title={app.gespeichert ? 'Alles lokal in diesem Browser gespeichert' : 'Speichert …'}>{app.gespeichert ? 'lokal ✓' : '…'}</span>
      {/if}
    </nav>
    <main>
      {#if app.fehler}<div class="fehler">{app.fehler}</div>{/if}
      {@render children()}
    </main>
  </div>
  <Hinweisleiste />
{/if}

<style>
  .laden { display: grid; place-items: center; height: 100dvh; color: var(--leo-leise); }
  .rahmen { display: flex; min-height: 100dvh; }
  .rahmen.rechts { flex-direction: row-reverse; }
  nav { width: 92px; flex: none; background: var(--leo-karte); border-right: 1px solid var(--leo-linie); display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 0; position: sticky; top: 0; height: 100dvh; z-index: 20; }
  .rechts nav { border-right: 0; border-left: 1px solid var(--leo-linie); }
  .logo { margin-bottom: 14px; }
  nav a:not(.logo) { width: 76px; padding: 10px 0 8px; border-radius: var(--leo-r-l); display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--leo-leise); text-decoration: none; font-size: 13px; }
  nav a.aktiv { background: var(--leo-akzent-hell); color: var(--leo-akzent); font-weight: 650; }
  .status { margin-top: auto; font-size: 11px; color: var(--leo-leise); }
  main { flex: 1; min-width: 0; }
  .unten { flex-direction: column; }
  .unten nav { order: 2; position: fixed; bottom: 0; left: 0; right: 0; top: auto; width: auto; height: calc(64px + env(safe-area-inset-bottom)); padding: 0 0 env(safe-area-inset-bottom); flex-direction: row; justify-content: space-around; border-right: 0; border-top: 1px solid var(--leo-linie); }
  .unten nav a:not(.logo) { width: auto; flex: 1; border-radius: 0; background: none; padding: 8px 0; }
  .unten nav a.aktiv { background: none; }
  .unten main { padding-bottom: calc(72px + env(safe-area-inset-bottom)); }
  .fehler { background: var(--leo-warnung-hell); color: var(--leo-warnung); padding: 10px 16px; }
</style>
