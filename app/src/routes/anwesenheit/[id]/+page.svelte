<script lang="ts">
  // Anwesenheit der Klasse (FB14): Verspätungen mit Wochentagsanalyse, Fehlzeiten je Schüler. Jede Kachel öffnet ihre Herkunft (E89).
  import { page } from '$app/state';
  import { app } from '$lib/speicher.svelte';
  import { schuelerVon, kurznameIn, name, fehlzeitenVon, verspaetungenVon, verspaetungenNachWochentag, prozent, datumWt } from '$lib/hilfen';
  import KursKopf from '$lib/ui/KursKopf.svelte';
  import { fristAbgelaufen, quotenStufe, FRIST_TAGE } from '$lib/nachschreiben';
  import { heuteISO } from '$lib/hilfen';

  const d = app.d!;
  const kurs = $derived(d.kurse.find((k) => k.id === page.params.id)!);
  const liste = $derived(kurs ? schuelerVon(d, kurs) : []);
  const kurzname = $derived(kurznameIn(liste)); // eindeutig bei gleichen Namen (B4)

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
  // ---------- Fehlzeiten der Klasse (F11): 30-%-Regel (E62), offene Entschuldigungen mit Frist ----------
  const heute = heuteISO();
  const fzZeilen = $derived(zeilen.map((z) => {
    const st = (s: string) => z.fz.liste.filter((f) => f.status === s).reduce((a, f) => a + f.stunden, 0);
    const offenListe = z.fz.liste.filter((f) => f.status === 'offen');
    return { ...z, stufe: quotenStufe(z.fz.quote), stE: st('E'), stUE: st('UE'), stOffen: st('offen'), ueberfaellig: offenListe.filter((f) => fristAbgelaufen(kurs.profil, f.datum, heute)).length };
  }));
  let fzFilter = $state<'' | 'hoch' | 'mittel' | 'offen' | 'frist'>('');
  let fzOffen = $state<string | null>(null);
  const fzListe = $derived([...fzZeilen]
    .filter((z) => !fzFilter || (fzFilter === 'offen' ? z.stOffen > 0 : fzFilter === 'frist' ? z.ueberfaellig > 0 : z.stufe === fzFilter))
    .sort((a, b) => b.fz.quote - a.fz.quote || a.s.nachname.localeCompare(b.s.nachname, 'de')));
  const fzZahl = $derived({
    hoch: fzZeilen.filter((z) => z.stufe === 'hoch').length,
    mittel: fzZeilen.filter((z) => z.stufe === 'mittel').length,
    offen: fzZeilen.reduce((a, z) => a + z.fz.tageOffen, 0),
    frist: fzZeilen.reduce((a, z) => a + z.ueberfaellig, 0)
  });
  const filtern = (f: typeof fzFilter) => (fzFilter = fzFilter === f ? '' : f);
  const breite = (stunden: number) => `${Math.min(1, stunden / (kurs.stundenGehalten || 1) / 0.4) * 100}%`;
  const detail = $derived(tagOffen !== null ? wt[tagOffen].eintraege : offen === 'alle' ? alle : []);
</script>

<svelte:head><title>{kurs?.name} · Anwesenheit</title></svelte:head>

{#if kurs}
  <KursKopf {kurs} aktiv="anwesenheit" />
  <div class="seite">
    <section class="karte breit">
      <div class="zeile"><h2 class="raum">Fehlzeiten</h2><span class="klein leise">Basis {kurs.stundenGehalten} gehaltene Stunden · Verspätungen zählen nicht mit</span></div>
      <div class="kacheln">
        <button class="kz" aria-expanded={fzFilter === 'hoch'} onclick={() => filtern('hoch')}><b class="zahl" class:warn={fzZahl.hoch > 0}>{fzZahl.hoch}</b><span class="klein leise">über 30 %</span></button>
        <button class="kz" aria-expanded={fzFilter === 'mittel'} onclick={() => filtern('mittel')}><b class="zahl" class:gold={fzZahl.mittel > 0}>{fzZahl.mittel}</b><span class="klein leise">20 bis 30 %</span></button>
        <button class="kz" aria-expanded={fzFilter === 'offen'} onclick={() => filtern('offen')}><b class="zahl">{fzZahl.offen}</b><span class="klein leise">Tage noch offen</span></button>
        <button class="kz" aria-expanded={fzFilter === 'frist'} onclick={() => filtern('frist')}><b class="zahl" class:warn={fzZahl.frist > 0}>{fzZahl.frist}</b><span class="klein leise">davon Frist vorbei ({FRIST_TAGE[kurs.profil]} Tage)</span></button>
      </div>
      {#if fzZahl.hoch}<p class="klein warn">Über 30 %: „N“ im Halbjahreszeugnis möglich, die Zeugniskonferenz entscheidet (E62).</p>{/if}
      <ul class="fzl">
        {#each fzListe as z (z.s.id)}
          <li>
            <button class="fzz" aria-expanded={fzOffen === z.s.id} onclick={() => (fzOffen = fzOffen === z.s.id ? null : z.s.id)}>
              <span class="fzn">{name(z.s)}</span>
              <span class="balken" aria-hidden="true">
                <span class="seg e" style:width={breite(z.stE)}></span><span class="seg ue" style:width={breite(z.stUE)}></span><span class="seg of" style:width={breite(z.stOffen)}></span>
                <span class="mk" style:left="50%"></span><span class="mk" style:left="75%"></span>
              </span>
              <b class="zahl fzq" class:warn={z.stufe === 'hoch'} class:gold={z.stufe === 'mittel'}>{z.fz.stunden ? prozent(z.fz.quote) : '·'}</b>
              <span class="klein leise fzs">{z.fz.stunden} Std.{z.ueberfaellig ? ` · ${z.ueberfaellig} Frist vorbei` : ''}</span>
            </button>
            {#if fzOffen === z.s.id}
              <ul class="fl tage">
                {#each [...z.fz.liste].reverse() as f}
                  <li><span class="dt">{datumWt(f.datum)}</span><span class="kennz" class:ue={f.status === 'UE'}>{f.status === 'offen' ? '?' : f.status}</span><span class="leise klein">{f.stunden} Std.{f.status === 'offen' ? (fristAbgelaufen(kurs.profil, f.datum, heute) ? ' · Frist vorbei' : ' · Frist läuft') : ''}{f.grund ? ` · ${f.grund}` : ''}{f.quelle === 'untis' ? ' · WebUntis' : ' · eigene Erfassung'}</span></li>
                {/each}
                {#if z.fz.liste.length === 0}<li class="leise klein">Keine Fehltage.</li>{/if}
              </ul>
              <a class="klein" href="/schueler/{z.s.id}?kurs={kurs.id}">Schülerkarte öffnen ›</a>
            {/if}
          </li>
        {/each}
        {#if fzListe.length === 0}<li class="leise klein">Niemand in dieser Auswahl.</li>{/if}
      </ul>
      <p class="klein leise legende"><span class="seg e"></span> entschuldigt <span class="seg ue"></span> unentschuldigt <span class="seg of"></span> offen · Striche bei 20 und 30 % · Frist in Kalendertagen, bitte prüfen</p>
    </section>

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
  .gold { color: #8a6200; font-weight: 600; }
  .breit { grid-column: 1 / -1; }
  .fzl { list-style: none; padding: 0; margin: 8px 0 0; }
  .fzl > li { border-top: 1px dashed var(--leo-linie-fein); padding: 2px 0; }
  .fzl > li:first-child { border-top: 0; }
  .fzz { display: grid; grid-template-columns: minmax(120px, 200px) 1fr 70px 150px; gap: 12px; align-items: center; width: 100%; background: none; border: 0; padding: 8px 0; text-align: left; }
  .fzn { font-weight: 600; }
  .fzq { text-align: right; }
  .balken { position: relative; display: flex; height: 12px; background: var(--leo-flaeche-leise); border: 1px solid var(--leo-linie-fein); border-radius: 6px; overflow: hidden; }
  .seg { display: inline-block; height: 100%; }
  .seg.e { background: #c9d9da; }
  .seg.ue { background: var(--leo-warnung); }
  .seg.of { background: var(--leo-stern); }
  .mk { position: absolute; top: -2px; bottom: -2px; width: 1.5px; background: var(--leo-tinte); opacity: .5; }
  .tage { margin: 0 0 6px; padding-left: 8px; }
  .legende { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
  .legende .seg { width: 14px; height: 10px; border-radius: 3px; }
  @media (max-width: 900px) { .seite { grid-template-columns: 1fr; padding: 12px 16px 40px; } td, th { padding: 6px 4px; } .fzz { grid-template-columns: 1fr 64px; row-gap: 4px; } .balken { grid-column: 1 / -1; grid-row: 2; } .fzs { grid-column: 1 / -1; } }
</style>
