<script lang="ts">
  // Auswertung einer Klasse (Modul A, docs/MODUL_AUSWERTUNG.md): Leistungsbild, Notenspiegel, mündliche Leistungen,
  // Hinweise. Jede Kachel klappt ihre Herkunft auf (E89). Rechnet nur auf dem Gerät, Noten sieht nur die Lehrkraft (E29).
  import { page } from '$app/state';
  import { app } from '$lib/speicher.svelte';
  import { istAn } from '$lib/module';
  import { schuelerVon, kurznameIn, name, datumKurz, heuteISO, prozent } from '$lib/hilfen';
  import { zahl } from '$lib/rechnen';
  import { gesamtStatistik, leistungsStatistik, muendlichVerlauf, anwesenheitKurz, hinweise, hinweiseJeSchueler, SPIEGEL_BEREICH, spiegelNote, type Spiegel, type HinweisArt } from '$lib/auswertung';
  import { monatsNameLang } from '$lib/raster';
  import KursKopf from '$lib/ui/KursKopf.svelte';
  import Smiley from '$lib/ui/Smiley.svelte';

  const d = app.d!;
  const kurs = $derived(d.kurse.find((k) => k.id === page.params.id)!);
  const liste = $derived(kurs ? schuelerVon(d, kurs) : []);
  const kurzname = $derived(kurznameIn(liste)); // eindeutig bei gleichen Namen (B4)
  const ids = $derived(liste.map((s) => s.id));
  const fos = $derived(kurs?.profil === 'FOS');
  const wer = (sid: string) => liste.find((s) => s.id === sid);
  const namen = (sids: string[]) => sids.map((sid) => wer(sid)).filter(Boolean).map((s) => kurzname(s!)).join(', ');
  const schnitt = (x: number | null) => (x === null ? '–' : fos ? zahl(x, 1) + ' NP' : zahl(x, 2));

  const gesamt = $derived(gesamtStatistik(kurs, ids));
  const leistungen = $derived(leistungsStatistik(kurs, ids));
  const monate = $derived(muendlichVerlauf(d, kurs, ids));
  const anw = $derived(anwesenheitKurz(d, kurs, ids));
  const hinw = $derived(hinweiseJeSchueler(hinweise(d, kurs, ids, heuteISO())));
  const ewhAn = $derived(istAn(d.einstellungen, 'ewh'));

  // Kopfkacheln: ein Klick zeigt die Namen dahinter
  let kachel = $state<null | 'unter' | 'kippe' | 'ohne' | 'hoch'>(null);
  const kachelNamen = $derived(kachel === 'unter' ? gesamt.unterIds : kachel === 'kippe' ? gesamt.kippe : kachel === 'ohne' ? gesamt.ohne : kachel === 'hoch' ? anw.hoch : []);
  const umschalten = (k: typeof kachel) => (kachel = kachel === k ? null : k);

  let note = $state<number | null>(null); // geöffnete Säule im Gesamt-Notenspiegel
  const inNote = (sp: Spiegel, n: number) => Object.entries(sp.werte).filter(([w]) => spiegelNote(kurs.profil, Number(w)) === n).flatMap(([, s]) => s);
  let offen = $state<string | null>(null); // aufgeklappte Leistung
  const hoehe = (sp: Spiegel, i: number) => `${(sp.noten[i] / Math.max(1, ...sp.noten)) * 100}%`;
  const ART: Record<HinweisArt, string> = { unter: 'unter der Grenze', kippe: 'auf der Kippe', abfall: 'Leistungsabfall', verstummt: 'mündlich still', fehlzeiten: 'Fehlzeiten' };
  const genauWerte = (sp: Spiegel) => Object.entries(sp.werte).map(([w, s]) => ({ w: Number(w), s })).sort((a, b) => (fos ? b.w - a.w : a.w - b.w));
</script>

<svelte:head><title>{kurs?.name} · Auswertung</title></svelte:head>

{#if kurs}
  <KursKopf {kurs} aktiv="auswertung" />
  {#if !istAn(d.einstellungen, 'statistik')}
    <div class="seite"><p class="karte breit">Das Modul Auswertung ist ausgeschaltet. Deine Daten sind alle noch da. Einschalten unter <a href="/mehr">Mehr › Module</a>.</p></div>
  {:else}
  <div class="seite">
    <section class="karte breit">
      <div class="zeile"><h2 class="raum">Leistungsbild</h2><span class="klein leise">vorläufige Gesamtnoten, so wie das Notenbuch sie gerade rechnet</span></div>
      <div class="kacheln">
        <div class="kz"><b class="zahl">{schnitt(gesamt.spiegel.schnitt)}</b><span class="klein leise">Ø Gesamt ({gesamt.spiegel.anzahl} mit Note)</span></div>
        <button class="kz" aria-expanded={kachel === 'unter'} onclick={() => umschalten('unter')}><b class="zahl" class:warn={gesamt.unterIds.length > 0}>{gesamt.unterIds.length}</b><span class="klein leise">unter der Grenze</span></button>
        <button class="kz" aria-expanded={kachel === 'kippe'} onclick={() => umschalten('kippe')}><b class="zahl" class:gold={gesamt.kippe.length > 0}>{gesamt.kippe.length}</b><span class="klein leise">auf der Kippe</span></button>
        <button class="kz" aria-expanded={kachel === 'ohne'} onclick={() => umschalten('ohne')}><b class="zahl">{gesamt.ohne.length}</b><span class="klein leise">noch ohne Note</span></button>
        <button class="kz" aria-expanded={kachel === 'hoch'} onclick={() => umschalten('hoch')}><b class="zahl" class:warn={anw.hoch.length > 0}>{anw.hoch.length}</b><span class="klein leise">Fehlzeiten über 30 %</span></button>
        <a class="kz" href="/anwesenheit/{kurs.id}"><b class="zahl">{anw.verspaetungen}</b><span class="klein leise">Verspätungen ({anw.minuten} Min.) ›</span></a>
      </div>
      {#if kachel}
        <div class="detail">
          {#if kachelNamen.length}
            <ul class="namen">{#each kachelNamen as sid}{@const s = wer(sid)}{#if s}<li><a href="/schueler/{s.id}?kurs={kurs.id}">{name(s)}</a></li>{/if}{/each}</ul>
          {:else}<p class="klein leise">Niemand.</p>{/if}
          {#if kachel === 'hoch'}<p class="klein"><a href="/anwesenheit/{kurs.id}">Alle Fehlzeiten im Reiter Anwesenheit ›</a></p>{/if}
        </div>
      {/if}
    </section>

    <section class="karte">
      <h2>Notenspiegel Gesamtnote</h2>
      <p class="klein leise">Ø Fehlquote der Klasse {prozent(anw.schnitt)} · Säule antippen zeigt, wer dahinter steht</p>
      <div class="saeulen" role="group" aria-label="Notenspiegel">
        {#each gesamt.spiegel.noten as n, i}
          <button class="saeule" aria-expanded={note === i + 1} onclick={() => (note = note === i + 1 ? null : i + 1)} aria-label="Note {i + 1}: {n}">
            <span class="anz zahl">{n || ''}</span>
            <span class="balken" class:schlecht={i >= 4} style:height={hoehe(gesamt.spiegel, i)}></span>
            <span class="klein leise">{SPIEGEL_BEREICH[kurs.profil][i]}</span>
          </button>
        {/each}
      </div>
      {#if note}
        <div class="detail"><p class="klein"><b>{fos ? `${SPIEGEL_BEREICH.FOS[note - 1]} NP` : `Note ${note}`}:</b> {namen(inNote(gesamt.spiegel, note)) || 'niemand'}</p></div>
      {/if}
    </section>

    <section class="karte">
      <h2>Mündliche Leistungen je Monat</h2>
      {#if monate.length}
        <table class="zahl">
          <thead><tr><th>Monat</th><th>Ø</th><th class="r">Einträge</th><th class="r">erreicht</th><th>Verteilung</th></tr></thead>
          <tbody>
            {#each monate as m}
              <tr>
                <td>{monatsNameLang(m.monat)}</td>
                <td><span class="ms"><Smiley stufe={Math.round(m.schnitt ?? 3)} groesse={20} /> {zahl(m.schnitt, 1)}</span></td>
                <td class="r">{m.eintraege}</td>
                <td class="r" class:gold={m.erreicht < ids.length * 0.75}>{m.erreicht} / {ids.length}</td>
                <td><span class="stapel" title="Smiley 1 bis 5">{#each m.verteilung as v, i}{#if v}<span class="seg" style:flex={v} style:background="var(--leo-mitv-{i + 1})"></span>{/if}{/each}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="klein leise">„erreicht“ = Schüler mit mindestens einem Eintrag im Monat. Gelb: weniger als drei Viertel der Klasse.</p>
      {:else}<p class="klein leise">Noch keine Einträge.</p>{/if}
    </section>

    <section class="karte breit">
      <div class="zeile"><h2 class="raum">Leistungen</h2>{#if ewhAn}<a class="pille" href="/ewh/{kurs.id}">Klausur aus EWH übernehmen</a>{/if}</div>
      {#if leistungen.length}
        <ul class="ll">
          {#each leistungen as st (st.leistung.id)}
            {@const l = st.leistung}
            {@const sp = st.spiegel}
            <li>
              <button class="lz" aria-expanded={offen === l.id} onclick={() => (offen = offen === l.id ? null : l.id)}>
                <span class="ln"><b>{l.name}</b> <span class="klein leise">{l.art}{l.datum ? ' · ' + datumKurz(l.datum) : ''}{l.ewh ? ' · aus EWH' : ''}</span></span>
                <span class="zahl">{schnitt(sp.schnitt)}</span>
                <span class="mini" aria-hidden="true">{#each sp.noten as n, i}<span class="mb" class:schlecht={i >= 4} style:height={hoehe(sp, i)}></span>{/each}</span>
                <span class="klein" class:warn={sp.unter > 0}>{!sp.anzahl ? 'noch keine Noten' : sp.unter ? `${sp.unter} unter der Grenze (${prozent(sp.unter / sp.anzahl)})` : 'alle bestanden'}</span>
                <span class="klein leise">{[st.E.length && `${st.E.length} E`, st.offen.length && `${st.offen.length} offen`, st.UE.length && `${st.UE.length} UE`, st.leer.length && `${st.leer.length} leer`].filter(Boolean).join(' · ') || 'vollständig'}</span>
              </button>
              {#if offen === l.id}
                <div class="detail">
                  <table class="zahl">
                    <thead><tr><th>{fos ? 'NP' : 'Note'}</th><th class="r">Anzahl</th><th>Wer</th></tr></thead>
                    <tbody>{#each genauWerte(sp) as x}<tr><td class:warn={fos ? x.w < 5 : x.w > 4}>{x.w}</td><td class="r">{x.s.length}</td><td>{namen(x.s)}</td></tr>{/each}</tbody>
                  </table>
                  {#if st.E.length + st.offen.length}<p class="klein">Nachschreiben: {namen([...st.E, ...st.offen])} · <a href="/nachschreiben">zur Nachschreibeliste ›</a></p>{/if}
                  {#if st.leer.length}<p class="klein leise">Noch leer: {namen(st.leer)}</p>{/if}
                  {#if l.gruppe === 'klausuren' && sp.anzahl}<p class="klein leise">Anteil unter der Grenze {prozent(sp.unter / sp.anzahl)}{sp.unter / sp.anzahl > 1 / 3 ? ' – mehr als ein Drittel, Genehmigung durch die Schulleitung nötig' : ''}.</p>{/if}
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}<p class="klein leise">Noch keine Leistungen im Notenbuch.</p>{/if}
    </section>

    <section class="karte breit">
      <h2>Genauer hinsehen</h2>
      <p class="klein leise">Leise Hinweise, keine Bewertung: Leistungsabfall (letzte Note {fos ? '3 NP' : '1 Note'} unter dem eigenen Schnitt), seit 3 Wochen mündlich still, Fehlzeiten ab 20 %, Gesamtnote auf der Kippe.</p>
      {#if hinw.length}
        <ul class="hl">
          {#each hinw as h (h.sid)}
            {@const s = wer(h.sid)}
            {#if s}
              <li>
                <a href="/schueler/{s.id}?kurs={kurs.id}">{name(s)}</a>
                <span class="chips">{#each h.liste as x}<span class="hchip {x.art}" title={x.text}>{ART[x.art]}</span>{/each}</span>
                <span class="klein leise">{h.liste.map((x) => x.text).join(' · ')}</span>
              </li>
            {/if}
          {/each}
        </ul>
      {:else}<p class="klein leise">Gerade fällt niemand auf.</p>{/if}
    </section>
  </div>
  {/if}
{/if}

<style>
  .seite { padding: 16px 32px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; max-width: 1500px; }
  .seite > section { min-width: 0; overflow-x: auto; }
  .breit { grid-column: 1 / -1; }
  .kacheln { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; margin: 12px 0; }
  .kz { border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); padding: 10px 12px; background: var(--leo-flaeche-leise); display: flex; flex-direction: column; gap: 4px; text-align: left; color: var(--leo-tinte); text-decoration: none; }
  button.kz:hover, a.kz:hover { border-color: var(--leo-akzent); }
  .kz[aria-expanded='true'] { border: 2px solid var(--leo-akzent); background: var(--leo-akzent-hell); padding: 9px 11px; }
  .kz b { font-size: 22px; font-weight: 750; }
  .warn { color: var(--leo-warnung); font-weight: 600; }
  .gold { color: #8a6200; font-weight: 600; }
  .detail { border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); padding: 8px 12px; margin-top: 10px; }
  .namen { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 16px; }
  .namen a, .hl a { color: var(--leo-tinte); font-weight: 600; text-decoration: none; }
  .saeulen { display: flex; gap: 8px; align-items: flex-end; height: 160px; margin-top: 10px; }
  .saeule { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 4px; height: 100%; border: 0; background: none; padding: 0; border-radius: var(--leo-r-s); min-height: var(--leo-ziel-touch); }
  .saeule .balken { display: block; width: 100%; min-height: 2px; background: #c9d9da; border-radius: 6px 6px 0 0; }
  .saeule .balken.schlecht { background: var(--leo-warnung-hell); border: 1px solid var(--leo-warnung); border-bottom: 0; }
  .saeule[aria-expanded='true'] .balken { outline: 2px solid var(--leo-akzent); outline-offset: 2px; }
  .anz { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: var(--leo-text-s); color: var(--leo-leise); font-weight: 600; padding: 6px 8px; border-bottom: 1px solid var(--leo-linie); }
  td { padding: 6px 8px; border-bottom: 1px dashed var(--leo-linie-fein); }
  .r { text-align: right; white-space: nowrap; }
  .ms { display: inline-flex; align-items: center; gap: 6px; }
  .stapel { display: flex; height: 12px; min-width: 90px; border-radius: 6px; overflow: hidden; border: 1px solid var(--leo-linie-fein); }
  .seg { display: block; height: 100%; }
  .ll, .hl { list-style: none; padding: 0; margin: 8px 0 0; }
  .ll > li, .hl > li { border-top: 1px dashed var(--leo-linie-fein); }
  .ll > li:first-child, .hl > li:first-child { border-top: 0; }
  .lz { display: grid; grid-template-columns: minmax(160px, 1.4fr) 90px 70px 1.2fr 1fr; gap: 12px; align-items: center; width: 100%; background: none; border: 0; padding: 10px 0; text-align: left; color: var(--leo-tinte); }
  .mini { display: flex; gap: 2px; align-items: flex-end; height: 24px; }
  .mb { flex: 1; min-height: 1px; background: #c9d9da; border-radius: 2px 2px 0 0; }
  .mb.schlecht { background: var(--leo-warnung); opacity: .55; }
  .hl li { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 8px 0; }
  .hl a { min-width: 150px; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .hchip { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: var(--leo-r-pill); background: var(--leo-taste); color: var(--leo-tinte); }
  .hchip.unter, .hchip.abfall { background: var(--leo-warnung-hell); color: var(--leo-warnung); }
  .hchip.kippe, .hchip.fehlzeiten { background: var(--leo-stern-hell); color: #8a6200; }
  @media (max-width: 900px) {
    .seite { grid-template-columns: minmax(0, 1fr); padding: 12px 16px 40px; }
    .lz { grid-template-columns: 1fr 80px; row-gap: 4px; }
    .lz .mini { display: none; }
    td, th { padding: 6px 4px; }
    .stapel { min-width: 56px; }
  }
</style>
