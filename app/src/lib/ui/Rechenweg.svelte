<script lang="ts">
  // Aufklappbarer Rechenweg (Feedback 18.11.): jede Stufe zeigt ihr Ergebnis, ein Tipp öffnet die Zahlen dazu.
  import type { Ergebnis, Schritt } from '$lib/rechnen';
  import { zahl, bestanden } from '$lib/rechnen';
  import type { Profil } from '$lib/typen';
  let { erg, profil, nur, offen = [] }: { erg: Ergebnis; profil: Profil; nur?: Schritt['id'][]; offen?: Schritt['id'][] } = $props();
  const fos = $derived(profil === 'FOS');
  // Anzeige: AT steht vor seinen beiden Bestandteilen, die eingerückt darunter folgen
  const REIHE: Schritt['id'][] = ['klausuren', 'at', 'mitarbeit', 'sl', 'gesamt'];
  const schritte = $derived(REIHE.map((id) => erg.schritte.find((s) => s.id === id)!).filter((s) => !nur || nur.includes(s.id)));
  // Nur der Anfangszustand: welche Stufen beim Öffnen schon aufgeklappt sind
  // svelte-ignore state_referenced_locally
  let auf = $state<Record<string, boolean>>(Object.fromEntries(offen.map((id) => [id, true])));
  const wert = (s: Schritt) => (s.wert === null ? '–' : fos ? String(s.wert) : zahl(s.wert));
  const warn = (s: Schritt) => s.wert !== null && !bestanden(profil, s.wert);
  // Klausuren, mündlich, Tests sind die Zutaten; AT und Gesamt bauen darauf auf
  const ebene = (s: Schritt) => (s.id === 'mitarbeit' || s.id === 'sl' ? 1 : 0);
</script>

<ol class="rw">
  {#each schritte as s (s.id)}
    <li class:ebene1={ebene(s) === 1} class:gesamt={s.id === 'gesamt'}>
      <button class="kopf" aria-expanded={!!auf[s.id]} onclick={() => (auf[s.id] = !auf[s.id])}>
        <span class="pfeil" aria-hidden="true">{auf[s.id] ? '▾' : '▸'}</span>
        <span class="titel">{s.titel}</span>
        <b class="zahl" class:warn={warn(s)}>{wert(s)}</b>
      </button>
      {#if auf[s.id]}
        <div class="innen">
          <div class="formel zahl">{s.formel}</div>
          <ul class="posten">
            {#each s.posten as p}
              <li class:aus={!p.zaehlt}>
                <span class="pn">{p.name}</span>
                <span class="zahl">{p.anzeige}</span>
                <span class="klein leise">{p.zaehlt ? `Gewicht ${p.gewicht.toLocaleString('de-DE')}` : p.grund}</span>
              </li>
            {/each}
            {#if s.posten.length === 0}<li class="aus"><span class="pn">noch keine Leistung angelegt</span></li>{/if}
          </ul>
          {#if s.id === 'gesamt'}<p class="klein leise">Klausuren : AT ist fest 50 : 50 (Schulvorgabe).{fos ? ' FOS: jede Stufe wird kaufmännisch gerundet (wie UPZ).' : ' OSZ (vereinfacht): ohne Zwischenrundung, bei ,50 entscheidest du.'}</p>{/if}
          {#if s.id === 'at'}<p class="klein leise">Die Gewichtung mündlich : Tests stellst du unter „Profil · Gewichte“ ein.</p>{/if}
        </div>
      {/if}
    </li>
  {/each}
</ol>

<style>
  .rw { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .rw > li { border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); background: var(--leo-karte); }
  .rw > li.ebene1 { margin-left: 16px; }
  .rw > li.gesamt { border-color: var(--leo-akzent); }
  .kopf { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 40px; padding: 6px 12px; background: none; border: 0; text-align: left; font: inherit; color: inherit; cursor: pointer; }
  .pfeil { color: var(--leo-leise); width: 12px; }
  .titel { flex: 1; }
  .kopf b { font-size: 15px; color: var(--leo-berechnet); }
  .gesamt .kopf b { font-size: 17px; }
  .kopf b.warn { color: var(--leo-warnung); }
  .innen { padding: 0 12px 10px 32px; }
  .formel { background: var(--leo-akzent-hell); border-radius: var(--leo-r-m); padding: 8px 12px; font-family: var(--leo-schrift-mono); font-size: 12.5px; margin-bottom: 6px; overflow-wrap: anywhere; }
  .posten { list-style: none; margin: 0; padding: 0; font-size: 13px; }
  .posten li { display: grid; grid-template-columns: 1fr auto 9em; gap: 8px; padding: 3px 0; border-bottom: 1px dashed var(--leo-linie-fein); align-items: baseline; }
  .posten li:last-child { border-bottom: 0; }
  .posten li.aus { color: var(--leo-leise); }
  .posten .zahl { text-align: right; }
</style>
