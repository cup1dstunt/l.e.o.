<script lang="ts">
  // Modulauswahl (docs/MODULE.md): genutzt unter Mehr › Module und im Einrichtungsassistenten.
  // Arbeitet nur auf `module`; was damit passiert (speichern, Entwurf), entscheidet der Aufrufer über `aendern`.
  import { MODULE, BEREICHE, gewaehlt, istAn, fehltFuer, haengtAb, umschalten, type ModulId } from '$lib/module';
  type Auswahl = Partial<Record<string, boolean>>;
  let { module, aendern, kompakt = false }: { module: Auswahl | undefined; aendern: (neu: Auswahl, hinweis: string) => void; kompakt?: boolean } = $props();
  const e = $derived({ module });

  function schalten(id: ModulId, an: boolean) {
    const neu = umschalten(e, id, an);
    let hinweis = '';
    if (an) {
      const mit = MODULE.filter((m) => m.id !== id && !gewaehlt(e, m.id) && gewaehlt({ module: neu }, m.id));
      if (mit.length) hinweis = `${mit.map((m) => m.name).join(', ')} mit eingeschaltet, sonst wirkt es nicht`;
    } else {
      const ruhen = haengtAb(e, id);
      if (ruhen.length) hinweis = `${ruhen.map((m) => m.name).join(', ')} ruht, solange das aus ist`;
    }
    aendern(neu, hinweis);
  }
  const bald = MODULE.filter((m) => m.bald);
</script>

<div class="auswahl" class:kompakt>
  {#each BEREICHE as b (b.id)}
    <div class="bereich">
      <h3 class="klein leise">{b.name}</h3>
      {#each MODULE.filter((m) => m.bereich === b.id && !m.bald) as m (m.id)}
        {@const wahl = gewaehlt(e, m.id)}
        {@const wirkt = istAn(e, m.id)}
        {@const fehlt = fehltFuer(e, m.id)}
        <label class="modul" class:an={wirkt} class:kern={m.kern}>
          {#if m.kern}
            <span class="immer klein">immer an</span>
          {:else}
            <input type="checkbox" role="switch" checked={wahl} onchange={(ev) => schalten(m.id, ev.currentTarget.checked)} />
          {/if}
          <span class="text">
            <b>{m.name}</b>
            <span class="klein leise">{m.text}</span>
            {#if wahl && !wirkt && fehlt.length}<span class="klein ruht">ruht, braucht {fehlt.map((x) => x.name).join(', ')}</span>
            {:else if m.braucht && !m.kern}<span class="klein leise">baut auf {m.braucht.map((x) => MODULE.find((y) => y.id === x)?.name).join(', ')} auf</span>{/if}
          </span>
        </label>
      {/each}
    </div>
  {/each}
  {#if bald.length}
    <p class="klein leise bald">In Vorbereitung: {bald.map((m) => m.name).join(', ')}. Sie erscheinen hier, sobald sie fertig sind.</p>
  {/if}
</div>

<style>
  .auswahl { display: flex; flex-direction: column; gap: var(--leo-a4); }
  .bereich { display: flex; flex-direction: column; gap: var(--leo-a2); }
  h3 { margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; font-size: var(--leo-text-xs); }
  .modul { display: flex; gap: var(--leo-a3); align-items: flex-start; padding: var(--leo-a3); border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); background: var(--leo-karte); cursor: pointer; min-height: var(--leo-ziel-touch); }
  .modul.an:not(.kern) { border-color: var(--leo-akzent); background: var(--leo-akzent-hell); }
  .modul.kern { cursor: default; background: var(--leo-flaeche-leise); }
  .modul input { width: 20px; height: 20px; margin: 2px 0 0; flex: none; accent-color: var(--leo-akzent); }
  .immer { flex: none; min-width: 20px; color: var(--leo-akzent); font-weight: 600; padding-top: 2px; }
  .text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .text b { font-weight: 650; }
  .ruht { color: var(--leo-stern); }
  .kompakt .modul { padding: var(--leo-a2) var(--leo-a3); }
  .bald { margin: 0; }
</style>
