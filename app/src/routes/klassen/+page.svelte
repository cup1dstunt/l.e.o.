<script lang="ts">
  import { app, zeige, testklasseWeg } from '$lib/speicher.svelte';
  import { istTestKurs } from '$lib/stundenzeit';
  import { istAn } from '$lib/module';
  import { datumWt, heuteISO, isoDatum, minuten } from '$lib/hilfen';
  import { letzterStand, seitText, verlauf, faelligeMerker } from '$lib/stand';
  import { naechsterBlock } from '$lib/semester';
  const d = app.d!;
  const heute = heuteISO();
  // Wo wir stehengeblieben sind (V18): Stand je Klasse auf einen Blick, Antippen klappt den Verlauf auf
  const standAn = $derived(istAn(d.einstellungen, 'stand'));
  const ablageAn = $derived(istAn(d.einstellungen, 'ablage'));
  let offen = $state<string | null>(null);
  // Testklassen (E126) lassen sich mit zweimal Tippen entfernen, echte Klassen nicht
  let entfernen = $state<string | null>(null);
  async function testWeg(id: string) {
    if (entfernen !== id) { entfernen = id; return; }
    entfernen = null;
    await testklasseWeg(id);
    zeige('Testklasse entfernt. Ein Stand von vorher liegt unter Mehr › Sicherung.');
  }
  // Nächste Stunde: ist der heutige Block schon vorbei, ab morgen suchen
  const jetzt = new Date();
  const morgen = isoDatum(new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + 1));
  function naechste(k: (typeof d.kurse)[number]) {
    const b = naechsterBlock(d, k, heute);
    return b && b.datum === heute && minuten(b.ende) <= jetzt.getHours() * 60 + jetzt.getMinutes() ? naechsterBlock(d, k, morgen) : b;
  }
</script>

<div class="seite">
  <div class="zeile"><h1 class="raum">Klassen</h1>{#if istAn(d.einstellungen, 'import')}<a class="knopf leise" href="/import">Aus Datei übernehmen</a>{/if}{#if istAn(d.einstellungen, 'statistik')}<a class="knopf" href="/auswertung">Alle Klassen vergleichen</a>{/if}</div>
  {#if !d.kurse.length}
    <section class="karte leer"><p>Noch keine Klassen. Unter <a href="/mehr/webuntis">Mehr › WebUntis</a> holst du sie aus deinem Stundenplan.{#if istAn(d.einstellungen, 'import')} Oder du übernimmst sie <a href="/import">aus einer Datei</a> (UPZ, Excel, iDoceo).{/if}</p></section>
  {/if}
  <div class="raster">
    {#each d.kurse as k (k.id)}
      <div class="karte">
        <h2>{k.name}{#if istTestKurs(k)} <span class="testmarke">Test</span>{/if}</h2>
        <p class="leise">{k.schueler.length} Schüler · Raum {k.raum} · Profil {k.profil}</p>
        {#if standAn}
          {@const v = letzterStand(k)}
          {@const mk = faelligeMerker(k, '9999-12-31')}
          {@const nb = naechste(k)}
          <button class="stand" aria-expanded={offen === k.id} onclick={() => (offen = offen === k.id ? null : k.id)}>
            <span class="klein leise">Wo ihr stehengeblieben seid{v ? ` · ${datumWt(v.datum)}, ${seitText(v.datum, heute)}` : ''}</span>
            <span class:leise={!v}>{v?.text ?? 'Noch kein Stand eingetragen'}</span>
            {#if mk.length}<span class="klein"><span class="leise">Nicht vergessen:</span> {mk.map((m) => m.text).join(' · ')}</span>{/if}
            <span class="klein leise">{nb ? `Nächste Stunde ${nb.datum === heute ? 'heute' : nb.datum === morgen ? 'morgen' : datumWt(nb.datum)} ${nb.beginn}` : ''}<span class="mehr">{offen === k.id ? 'Verlauf zu' : 'Verlauf'}</span></span>
          </button>
          {#if offen === k.id}
            {@const vl = verlauf(k, ablageAn ? d.material : [], heute, 8)}
            <ol class="verlauf">
              {#each vl as e (e.datum)}
                <li><b class="klein">{datumWt(e.datum)}</b>
                  <span>{#if e.stand}{e.stand}{:else if e.thema}<span class="leise">Thema:</span> {e.thema}{/if}</span>
                  {#if e.stand && e.thema}<span class="klein leise">Thema: {e.thema}</span>{/if}
                  {#if e.hausaufgabe}<span class="klein leise">HA: {e.hausaufgabe}</span>{/if}
                  {#if e.gezeigt.length}<span class="klein leise">Gezeigt: {e.gezeigt.join(', ')}</span>{/if}
                </li>
              {:else}
                <li class="leise klein">Noch nichts eingetragen. Der Stand kommt aus der Live-Stunde oder dem Nachtrag auf Heute.</li>
              {/each}
            </ol>
          {/if}
        {/if}
        <div class="zeile wrap">
          <a class="knopf haupt" href="/kurs/{k.id}">Notenbuch</a>
          {#if istAn(d.einstellungen, 'stunde')}<a class="knopf" href="/stunde/{k.id}">Stunde</a>{/if}
          {#if istAn(d.einstellungen, 'planung')}<a class="knopf leise" href="/planung/{k.id}">Planung</a>{/if}
          {#if istTestKurs(k)}<button class="knopf leise" onclick={() => testWeg(k.id)}>{entfernen === k.id ? 'Wirklich entfernen' : 'Testklasse entfernen'}</button>{/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .leer { margin-top: 18px; }
  .testmarke { font-size: var(--leo-text-s); font-weight: 600; padding: 2px 8px; border-radius: 99px; background: var(--leo-stern-hell); color: var(--leo-stern); vertical-align: middle; }
  .seite { padding: 24px 32px; }
  .raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 18px; align-items: start; }
  .karte { display: flex; flex-direction: column; gap: 10px; }
  .karte p { margin: 0; }
  .stand { text-align: left; display: flex; flex-direction: column; gap: 3px; background: var(--leo-flaeche-leise); border: 1px solid var(--leo-linie-fein); border-radius: var(--leo-r-m); padding: 10px 14px; color: var(--leo-tinte); cursor: pointer; }
  .stand:hover, .stand[aria-expanded='true'] { border-color: var(--leo-akzent); }
  .wrap { flex-wrap: wrap; }
  .mehr { float: right; color: var(--leo-akzent); }
  .verlauf { list-style: none; margin: 0; padding: 0 0 0 12px; border-left: 2px solid var(--leo-linie); display: flex; flex-direction: column; gap: 10px; }
  .verlauf li { display: flex; flex-direction: column; gap: 1px; }
  @media (max-width: 720px) { .seite { padding: 16px; } }
</style>
