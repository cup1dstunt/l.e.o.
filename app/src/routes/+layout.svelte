<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { app, abgleich, laden, sperren, lebenszeichen, abgleichPlanen } from '$lib/speicher.svelte';
  import Hinweisleiste from '$lib/ui/Hinweisleiste.svelte';
  import Anmeldung from '$lib/ui/Anmeldung.svelte';
  import Suche from '$lib/ui/Suche.svelte';
  import { sitzung } from '$lib/sitzung.svelte';
  import { onMount, untrack } from 'svelte';

  let { children } = $props();
  let breite = $state(1200);

  // Entsperrt bleibt die App nur in diesem Tab und nur bis zur Sperre nach Inaktivität (E81)
  let letzteAktivitaet = Date.now();
  onMount(() => {
    laden();
    try { sitzung.entsperrt = sessionStorage.getItem('leo-entsperrt') === '1'; } catch {}
    const aktiv = () => (letzteAktivitaet = Date.now());
    const t = setInterval(() => {
      const min = app.d?.einstellungen.sperreMinuten ?? 15;
      if (sitzung.entsperrt && min > 0 && Date.now() - letzteAktivitaet > min * 60_000) sitzung.entsperrt = false;
      else if (sitzung.entsperrt && Date.now() - letzteAktivitaet < 20_000) lebenszeichen();
    }, 15_000);
    for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, aktiv);
    // Abgleich (F4): jede Minute, beim Zurückkehren in den Tab und wenn das Netz wieder da ist
    const ab = setInterval(() => { if (sitzung.entsperrt && !document.hidden) abgleichPlanen(); }, 60_000);
    const sichtbar = () => { if (!document.hidden && sitzung.entsperrt) abgleichPlanen(300); };
    document.addEventListener('visibilitychange', sichtbar);
    addEventListener('online', sichtbar);
    return () => { clearInterval(t); clearInterval(ab); document.removeEventListener('visibilitychange', sichtbar); removeEventListener('online', sichtbar); };
  });
  $effect(() => {
    try { sessionStorage.setItem('leo-entsperrt', sitzung.entsperrt ? '1' : '0'); } catch {}
    if (!sitzung.entsperrt) untrack(sperren); // verschlüsselt: Schlüssel und Daten aus dem Arbeitsspeicher
  });
  function tasten(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && sitzung.entsperrt) {
      e.preventDefault();
      sitzung.suche = !sitzung.suche;
    }
  }

  $effect(() => {
    const t = app.d?.einstellungen.theme;
    if (t && t !== 'system') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  });

  const nav = [
    { href: '/', text: 'Heute', icon: 'M12 7v5l3 2 M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18' },
    { href: '/stundenplan', text: 'Stundenplan', icon: 'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5' },
    { href: '/klassen', text: 'Klassen', icon: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z' },
    { href: '/schueler', text: 'Schüler', icon: 'M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8 M4 21c0-4 4-6 8-6s8 2 8 6' },
    { href: '/mehr', text: 'Mehr', icon: 'M5 12h.01 M12 12h.01 M19 12h.01' }
  ];
  const aktiv = (href: string) =>
    href === '/' ? page.url.pathname === '/' || page.url.pathname.startsWith('/stunde/')
    : href === '/klassen' ? /^\/(klassen|kurs|planung|sitzplan)/.test(page.url.pathname)
    : page.url.pathname.startsWith(href);
  const lage = $derived(breite < 720 ? 'unten' : (app.d?.einstellungen.navigation ?? 'links'));
</script>

<svelte:window bind:innerWidth={breite} onkeydown={tasten} />

{#if !app.bereit}
  <div class="laden">L.E.O. lädt …</div>
{:else if !sitzung.entsperrt || !app.d}
  <Anmeldung bind:entsperrt={sitzung.entsperrt} />
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
 <button class="navknopf" onclick={() => (sitzung.suche = true)} aria-label="Suchen (Strg+K)">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
        <span>Suche</span>
      </button>
      {#if lage !== 'unten'}
        <button class="navknopf sperre" onclick={() => (sitzung.entsperrt = false)} aria-label="Sperren">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          <span>Sperren</span>
        </button>
        {#if abgleich.verbunden}
          <a class="status" href="/mehr" class:warn={!!abgleich.fehler} title={abgleich.fehler || (abgleich.laeuft ? 'Gleicht ab …' : 'Gespeichert und mit deinen Geräten abgeglichen')}>{!app.gespeichert || abgleich.laeuft ? '…' : abgleich.fehler ? 'offline' : 'abgeglichen ✓'}</a>
        {:else}
          <span class="status" title={app.gespeichert ? 'Alles lokal in diesem Browser gespeichert' : 'Speichert …'}>{app.gespeichert ? 'lokal ✓' : '…'}</span>
        {/if}
      {/if}
    </nav>
    <main>
      {#if app.fehler}<div class="fehler">{app.fehler}</div>{/if}
      {@render children()}
    </main>
  </div>
  <Hinweisleiste />
  <Suche bind:offen={sitzung.suche} />
{/if}

<style>
  .laden { display: grid; place-items: center; height: 100dvh; color: var(--leo-leise); }
  .rahmen { display: flex; min-height: 100dvh; }
  .rahmen.rechts { flex-direction: row-reverse; }
  nav { width: 92px; flex: none; background: var(--leo-karte); border-right: 1px solid var(--leo-linie); display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 0; position: sticky; top: 0; height: 100dvh; z-index: 20; }
  .rechts nav { border-right: 0; border-left: 1px solid var(--leo-linie); }
  .logo { margin-bottom: 14px; }
  nav a:not(.logo):not(.status) { width: 76px; padding: 10px 0 8px; border-radius: var(--leo-r-l); display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--leo-leise); text-decoration: none; font-size: 13px; }
  nav a.aktiv { background: var(--leo-akzent-hell); color: var(--leo-akzent); font-weight: 650; }
  .navknopf { width: 76px; padding: 10px 0 8px; border-radius: var(--leo-r-l); display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--leo-leise); background: none; border: 0; font-size: 13px; }
  .sperre { margin-top: auto; }
  .unten .navknopf { width: auto; flex: 1; border-radius: 0; padding: 8px 0; }
  .status { font-size: 11px; color: var(--leo-leise); text-align: center; text-decoration: none; }
  .status.warn { color: var(--leo-warnung); }
  main { flex: 1; min-width: 0; }
  .unten { flex-direction: column; }
  .unten nav { order: 2; position: fixed; bottom: 0; left: 0; right: 0; top: auto; width: auto; height: calc(64px + env(safe-area-inset-bottom)); padding: 0 0 env(safe-area-inset-bottom); flex-direction: row; justify-content: space-around; border-right: 0; border-top: 1px solid var(--leo-linie); }
  .unten nav a:not(.logo):not(.status) { width: auto; flex: 1; border-radius: 0; background: none; padding: 8px 0; }
  .unten nav a.aktiv { background: none; }
  .unten main { padding-bottom: calc(72px + env(safe-area-inset-bottom)); }
  .fehler { background: var(--leo-warnung-hell); color: var(--leo-warnung); padding: 10px 16px; }
</style>
