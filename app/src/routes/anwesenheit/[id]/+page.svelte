<script lang="ts">
  // Anwesenheit der Klasse (FB14): Verspätungen mit Wochentagsanalyse, Fehlzeiten je Schüler. Jede Kachel öffnet ihre Herkunft (E89).
  import { page } from '$app/state';
  import { app } from '$lib/speicher.svelte';
  import { schuelerVon, kurzname, name, fehlzeitenVon, verspaetungenVon, verspaetungenNachWochentag, prozent, datumWt } from '$lib/hilfen';
  import KursKopf from '$lib/ui/KursKopf.svelte';

  const d = app.d!;
  const kurs = $derived(d.kurse.find((k) => k.id === page.params.id)!);
  const liste = $derived(kurs ? schuelerVon(d, kurs) : []);

  const zeilen = $derived(liste.map((s) => {
    const v = verspaetungenVon(d, kurs.id, s.id);
    const wt = verspaetungenNachWochentag(v);
    const max = Math.max(...wt.map((x) => x.anzahl));
    return { s, v, anzahl: v.length, minuten: v.reduce((a, x) => a + x.minuten, 0), haeufig: max >= 2 ? wt.find((x) => x.anzahl === max)!.name : '', fz: fehlzeitenVon(d, kurs.id, s.id) };
  }));
  const alle = $derived(zeilen.flatMap((z) => z.v.map((v) => ({ ...v, s: z.s }))));
  const minutenGesamt = $derived(alle.reduce((a, v) => a + v.minuten, 0));
  const betroffen = $derived(zeilen.filter((z) => z.anzahl > 0).length);
  const wt = $derived(verspaetungenNachWochentag(alle));
  let wtArt = $state<'anzahl' | 'minuten'>('anzahl');
  const wtMax = $derived(Math.max(1, ...wt.map((x) => x[wtArt])));
  let tagOffen = $state<number | null>(null);
  let offen = $state<'alle' | null>(null);
  let sortierung = $state<'minuten' | 'anzahl' | 'fehl' | 'name'>('minuten');
  const sortiert = $derived([...zeilen].sort((a, b) =>
    sortierung === 'name' ? a.s.nachname.localeCompare(b.s.nachname, 'de')
    : sortierung === 'fehl' ? b.fz.quote - a.fz.quote
    : sortierung === 'anzahl' ? b.anzahl - a.anzahl || b.minuten - a.minuten
    : b.minuten - a.minuten || b.anzahl - a.anzahl));
  const muster = $derived.by(() => {
    const g = alle.length;
    if (g < 4) return '';
    const i = wt.findIndex((x) => x.anzahl === Math.max(...wt.map((y) => y.anzahl)));
    return wt[i].anzahl / g >= 0.4 ? `${wt[i].anzahl} von ${g} Verspätungen an einem ${['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'][i]}.` : '';
  });
  const detail = $derived(tagOffen !== null ? wt[tagOffen].eintraege : offen === 'alle' ? alle : []);
</script>

<svelte:head><title>{kurs?.name} · Anwesenheit</title></svelte:head>

{#if kurs}
  <KursKopf {kurs} aktiv="anwesenheit" />
  <div class="seite">
    <section class="karte">
      <div class="zeile"><h2 class="raum">Verspätungen</h2><span class="klein leise">zählen nicht zu den Fehlzeiten, Minuten werden trotzdem gezählt</span></div>
      <div class="kacheln">
        <button class="kz" aria-expanded={offen === 'alle'} onclick={() => { offen = offen === 'alle' ? null : 'alle'; tagOffen = null; }}><b class="zahl">{alle.length}</b><span class="klein leise">Verspätungen</span></button>
        <button class="kz" aria-expanded={offen === 'alle'} onclick={() => { offen = offen === 'alle' ? null : 'alle'; tagOffen = null; }}><b class="zahl">{minutenGesamt}</b><span class="klein leise">Minuten gesamt</span></button>
        <button class="kz" onclick={() => (sortierung = 'minuten')}><b class="zahl">{betroffen}</b><span class="klein leise">von {liste.length} Schülern</span></button>
        <div class="kz ruhig"><b class="zahl">{alle.length ? Math.round(minutenGesamt / alle.length) : 0}</b><span class="klein leise">Ø Minuten je Verspätung</span></div>
      </div>

      <div class="zeile">
        <p class="klein leise raum">Nach Wochentag · Balken antippen zeigt die Tage</p>
        <div class="umschalter" role="group" aria-label="Wochentagsanalyse">
          <button aria-pressed={wtArt === 'anzahl'} onclick={() => (wtArt = 'anzahl')}>Anzahl</button>
          <button aria-pressed={wtArt === 'minuten'} onclick={() => (wtArt = 'minuten')}>Minuten</button>
        </div>
      </div>
      <div class="wt">
        {#each wt as t, i}
          <button class="wts" aria-expanded={tagOffen === i} aria-label="{t.name}: {t.anzahl} Verspätungen, {t.minuten} Minuten" onclick={() => { tagOffen = tagOffen === i ? null : i; offen = null; }}>
            <span class="zahl klein">{t[wtArt]}</span>
            <span class="wtb" class:max={t[wtArt] === wtMax && t[wtArt] > 0} class:an={tagOffen === i} style:height="{(t[wtArt] / wtMax) * 80 + 3}px"></span>
            <span class="klein leise">{t.name}</span>
          </button>
        {/each}
      </div>
      {#if muster}<div class="muster klein"><b>Muster:</b> {muster}</div>{/if}

      {#if tagOffen !== null || offen}
        <div class="detail">
          <p class="klein leise">{tagOffen !== null ? `${wt[tagOffen].name}: ${wt[tagOffen].anzahl} Verspätungen, ${wt[tagOffen].minuten} min` : 'Alle Verspätungen'}</p>
          <ul class="fl">
            {#each [...detail].sort((a, b) => b.datum.localeCompare(a.datum)) as v}
              <li><span class="dt">{datumWt(v.datum)}</span><a href="/schueler/{v.s.id}?kurs={kurs.id}">{kurzname(v.s)}</a><span class="kennz">+{v.minuten} min</span><span class="leise klein">Ankunft {v.ankunft}{v.quelle === 'untis' ? ' · WebUntis' : ''}</span></li>
            {/each}
          </ul>
          {#if detail.length === 0}<p class="leise klein">Keine Verspätungen.</p>{/if}
        </div>
      {/if}
    </section>

    <section class="karte">
      <div class="zeile"><h2 class="raum">Schüler</h2>
        <label class="klein leise">sortieren
          <select class="eingabe kl" bind:value={sortierung}>
            <option value="minuten">Minuten</option><option value="anzahl">Verspätungen</option><option value="fehl">Fehlzeiten</option><option value="name">Name</option>
          </select>
        </label>
      </div>
      <table>
        <thead><tr><th>Name</th><th class="r">Verspät.</th><th class="r">Minuten</th><th>häufig</th><th class="r">Fehlzeit</th></tr></thead>
        <tbody>
          {#each sortiert as z (z.s.id)}
            <tr>
              <td><a href="/schueler/{z.s.id}?kurs={kurs.id}">{name(z.s)}</a></td>
              <td class="r zahl">{z.anzahl || '·'}</td>
              <td class="r zahl">{z.minuten || '·'}</td>
              <td class="leise">{z.haeufig}</td>
              <td class="r zahl" class:warn={z.fz.quote > 0.3}>{z.fz.stunden ? prozent(z.fz.quote) : '·'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="klein leise">Fehlzeit = Stunden laut WebUntis oder eigener Erfassung geteilt durch {kurs.stundenGehalten} gehaltene Stunden. Über 30 % ist rot (E62).</p>
    </section>
  </div>
{/if}

<style>
  .seite { padding: 16px 32px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; max-width: 1500px; }
  .kacheln { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; margin: 12px 0; }
  .kz { border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); padding: 10px 12px; background: var(--leo-flaeche-leise); display: flex; flex-direction: column; gap: 4px; text-align: left; }
  button.kz:hover { border-color: var(--leo-akzent); }
  .kz[aria-expanded='true'] { border: 2px solid var(--leo-akzent); background: var(--leo-akzent-hell); padding: 9px 11px; }
  .kz b { font-size: 22px; font-weight: 750; }
  .umschalter { display: inline-flex; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-pill); overflow: hidden; }
  .umschalter button { border: 0; background: var(--leo-karte); padding: 0 12px; min-height: 32px; color: var(--leo-leise); font-size: 12px; }
  .umschalter button[aria-pressed='true'] { background: var(--leo-akzent); color: var(--leo-auf-akzent); font-weight: 600; }
  .wt { display: flex; gap: 8px; align-items: flex-end; height: 130px; margin-top: 6px; }
  .wts { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; justify-content: flex-end; height: 100%; border: 0; background: none; padding: 0; border-radius: var(--leo-r-s); }
  .wtb { display: block; width: 100%; background: #c9d9da; border-radius: 6px 6px 0 0; }
  .wtb.max { background: var(--leo-akzent); }
  .wtb.an { outline: 2px solid var(--leo-akzent); outline-offset: 2px; }
  .muster { background: var(--leo-stern-hell); border: 1px solid #ecd28a; border-radius: var(--leo-r-m); padding: 10px 12px; margin-top: 12px; }
  .detail { border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); padding: 4px 12px 8px; margin-top: 12px; }
  .fl { list-style: none; padding: 0; margin: 0; }
  .fl li { display: flex; gap: 12px; align-items: center; padding: 6px 0; border-top: 1px dashed var(--leo-linie); flex-wrap: wrap; }
  .fl li:first-child { border-top: 0; }
  .fl a { color: var(--leo-tinte); text-decoration: none; font-weight: 600; min-width: 110px; }
  .dt { min-width: 74px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { text-align: left; font-size: var(--leo-text-s); color: var(--leo-leise); font-weight: 600; padding: 6px 8px; border-bottom: 1px solid var(--leo-linie); }
  td { padding: 8px; border-bottom: 1px dashed var(--leo-linie-fein); }
  td a { color: var(--leo-tinte); text-decoration: none; }
  .r { text-align: right; white-space: nowrap; }
  .kl { min-height: 34px; padding: 4px 8px; }
  .warn { color: var(--leo-warnung); font-weight: 600; }
  @media (max-width: 900px) { .seite { grid-template-columns: 1fr; padding: 12px 16px 40px; } td, th { padding: 6px 4px; } }
</style>
