<script lang="ts">
  // Beamer-Ansicht (P6, PF25, E78): nur Namenziehen als Rad, Gruppen und Timer. Keine Noten, keine Bewertungen.
  import { onMount, untrack } from 'svelte';
  import { kurznameIn } from '$lib/hilfen';
  import { app } from '$lib/speicher.svelte';
  import type { Kurs, Schueler } from '$lib/typen';

  let { kurs, anwesend, gruppen, aktuell, ziehen, neuBilden, schliessen }: {
    kurs: Kurs; anwesend: Schueler[]; gruppen: string[][]; aktuell?: string;
    ziehen: () => string | undefined; neuBilden: () => void; schliessen: () => void;
  } = $props();
  const d = app.d!;
  const kurzname = $derived(kurznameIn(d.schueler.filter((x) => kurs.schueler.includes(x.id)))); // eindeutig bei gleichen Namen (B4)
  const kn = (id: string) => { const s = d.schueler.find((x) => x.id === id); return s ? kurzname(s) : '?'; };

  let reiter = $state<'zufall' | 'gruppen' | 'timer'>('zufall');
  let el: HTMLDivElement;

  onMount(() => {
    el?.requestFullscreen?.().catch(() => {});
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') schliessen();
      if (e.key === ' ' && reiter === 'zufall') { e.preventDefault(); drehen(); }
    };
    addEventListener('keydown', taste);
    return () => {
      removeEventListener('keydown', taste);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      clearInterval(tick);
    };
  });

  // ---- Rad ----
  // Die Reihenfolge bleibt während der Ansicht fest, damit das Rad nicht springt.
  const rad = untrack(() => anwesend.map((s) => s.id));
  const n = Math.max(rad.length, 1);
  const seg = 360 / n;
  let winkel = $state(0);
  let dreht = $state(false);
  let gezeigt = $state<string | undefined>(untrack(() => aktuell));
  function drehen() {
    if (dreht || !rad.length) return;
    const id = ziehen();
    if (!id) return;
    const i = Math.max(0, rad.indexOf(id));
    // Segment i liegt bei i*seg … (i+1)*seg im Uhrzeigersinn ab oben; Zeiger oben
    const ziel = 360 - (i * seg + seg / 2);
    const basis = Math.ceil(winkel / 360) * 360;
    winkel = basis + 5 * 360 + ziel + (Math.random() - 0.5) * seg * 0.6;
    dreht = true;
    gezeigt = undefined;
    setTimeout(() => { dreht = false; gezeigt = id; }, 3200);
  }
  const punkt = (grad: number, r: number) => {
    const a = ((grad - 90) * Math.PI) / 180;
    return `${200 + r * Math.cos(a)},${200 + r * Math.sin(a)}`;
  };
  const schrift = $derived(n > 28 ? 9 : n > 20 ? 11 : n > 12 ? 13 : 16);

  // ---- Timer ----
  let dauer = $state(5 * 60);
  let rest = $state(5 * 60);
  let laeuft = $state(false);
  let tick: ReturnType<typeof setInterval> | undefined;
  function setzen(min: number) { dauer = rest = min * 60; laeuft = false; clearInterval(tick); }
  function startStopp() {
    if (laeuft) { laeuft = false; clearInterval(tick); return; }
    if (rest <= 0) rest = dauer;
    laeuft = true;
    const ende = Date.now() + rest * 1000;
    tick = setInterval(() => {
      rest = Math.max(0, Math.round((ende - Date.now()) / 1000));
      if (rest === 0) { laeuft = false; clearInterval(tick); ton(); }
    }, 250);
  }
  function ton() {
    try {
      const ctx = new AudioContext();
      [0, 0.35, 0.7].forEach((t) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.value = 880; g.gain.value = 0.15;
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
      });
    } catch { /* ohne Ton */ }
  }
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
</script>

<div class="beamer" bind:this={el} role="dialog" aria-modal="true" aria-label="Beamer-Ansicht">
  <header>
    <b>{kurs.name}</b>
    <div class="umschalter" role="group" aria-label="Ansicht">
      <button aria-pressed={reiter === 'zufall'} onclick={() => (reiter = 'zufall')}>Namen ziehen</button>
      <button aria-pressed={reiter === 'gruppen'} onclick={() => (reiter = 'gruppen')}>Gruppen</button>
      <button aria-pressed={reiter === 'timer'} onclick={() => (reiter = 'timer')}>Timer</button>
    </div>
    <button class="knopf leise" onclick={schliessen}>Schließen</button>
  </header>

  {#if reiter === 'zufall'}
    <main class="zufall">
      {#if rad.length}
        <div class="radbox">
          <div class="zeiger" aria-hidden="true"></div>
          <svg viewBox="0 0 400 400" class="rad" class:dreht style:transform="rotate({winkel}deg)" aria-hidden="true">
            {#each rad as id, i}
              {#if n === 1}
                <circle cx="200" cy="200" r="190" class="s0" />
              {:else}
                <path d="M200,200 L{punkt(i * seg, 190)} A190,190 0 {seg > 180 ? 1 : 0},1 {punkt((i + 1) * seg, 190)} Z" class={i % 2 ? 's1' : 's0'} />
              {/if}
              <text transform="rotate({i * seg + seg / 2 - 90} 200 200)" x="370" y="200" font-size={schrift} text-anchor="end" dominant-baseline="middle">{kn(id)}</text>
            {/each}
            <circle cx="200" cy="200" r="22" class="mitte" />
          </svg>
        </div>
        <div class="ergebnis">
          <p class="name">{dreht ? '…' : gezeigt ? kn(gezeigt) : ''}</p>
          <button class="knopf haupt gross" onclick={drehen} disabled={dreht}>Drehen</button>
          <p class="leise">Leertaste dreht · nur Anwesende</p>
        </div>
      {:else}<p class="leer">Niemand anwesend.</p>{/if}
    </main>
  {:else if reiter === 'gruppen'}
    <main class="gruppen">
      {#if gruppen.length}
        <div class="graster">
          {#each gruppen as g, i}
            <div class="gk"><h3>Gruppe {i + 1}</h3>{#each g as id}<p>{kn(id)}</p>{/each}</div>
          {/each}
        </div>
      {:else}<p class="leer">Noch keine Gruppen.</p>{/if}
      <button class="knopf leise" onclick={neuBilden}>Neu bilden</button>
    </main>
  {:else}
    <main class="timer">
      <p class="zeit" class:aus={rest === 0}>{mmss(rest)}</p>
      <div class="balken"><div class="voll" style:width="{dauer ? (rest / dauer) * 100 : 0}%"></div></div>
      <div class="zeile wrap mitte-z">
        {#each [1, 3, 5, 10, 15, 20] as m}<button class="pille" aria-pressed={dauer === m * 60} onclick={() => setzen(m)}>{m} min</button>{/each}
      </div>
      <div class="zeile mitte-z">
        <button class="knopf haupt gross" onclick={startStopp}>{laeuft ? 'Pause' : rest === 0 || rest === dauer ? 'Start' : 'Weiter'}</button>
        <button class="knopf leise" onclick={() => setzen(dauer / 60)}>Zurück</button>
      </div>
    </main>
  {/if}
</div>

<style>
  .beamer { position: fixed; inset: 0; z-index: 60; background: var(--leo-papier); display: flex; flex-direction: column; padding: 16px 24px; overflow: auto; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  header b { font-size: 18px; }
  .umschalter { display: inline-flex; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-pill); overflow: hidden; }
  .umschalter button { border: 0; background: var(--leo-karte); padding: 0 16px; min-height: 40px; color: var(--leo-leise); }
  .umschalter button[aria-pressed='true'] { background: var(--leo-akzent); color: var(--leo-auf-akzent); font-weight: 600; }
  main { flex: 1; display: flex; align-items: center; justify-content: center; gap: 32px; flex-wrap: wrap; padding: 16px 0; }
  .leer { font-size: 28px; color: var(--leo-leise); }
  .radbox { position: relative; width: min(70vh, 90vw); aspect-ratio: 1; }
  .rad { width: 100%; height: 100%; }
  .rad:not(.dreht) { transition: none; }
  .rad.dreht { transition: transform 3.2s cubic-bezier(.17, .67, .2, 1); }
  .rad text { fill: var(--leo-tinte); font-weight: 600; }
  .s0 { fill: var(--leo-akzent-hell); stroke: var(--leo-karte); stroke-width: 2; }
  .s1 { fill: var(--leo-karte); stroke: var(--leo-linie); stroke-width: 2; }
  .mitte { fill: var(--leo-akzent); }
  .zeiger { position: absolute; top: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 16px solid transparent; border-right: 16px solid transparent; border-top: 30px solid var(--leo-akzent); z-index: 1; }
  .ergebnis { display: flex; flex-direction: column; align-items: center; gap: 16px; min-width: 260px; }
  .name { font-size: clamp(40px, 7vw, 96px); font-weight: 800; margin: 0; min-height: 1.2em; text-align: center; }
  .gross { min-height: 56px; padding: 0 36px; font-size: 20px; }
  .gruppen { flex-direction: column; }
  .graster { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; width: 100%; }
  .gk { background: var(--leo-karte); border: 1px solid var(--leo-linie); border-radius: var(--leo-r-xl); padding: 16px 20px; }
  .gk h3 { margin: 0 0 8px; color: var(--leo-akzent); font-size: 20px; }
  .gk p { margin: 4px 0; font-size: clamp(20px, 2.4vw, 30px); font-weight: 600; }
  .timer { flex-direction: column; gap: 24px; }
  .zeit { font-size: clamp(96px, 22vw, 280px); font-weight: 800; margin: 0; font-variant-numeric: tabular-nums; line-height: 1; }
  .zeit.aus { color: var(--leo-warnung); }
  .balken { width: min(900px, 90%); height: 16px; border-radius: 99px; background: var(--leo-taste); overflow: hidden; }
  .voll { height: 100%; background: var(--leo-akzent); transition: width .25s linear; }
  .mitte-z { justify-content: center; }
  .wrap { flex-wrap: wrap; }
</style>
