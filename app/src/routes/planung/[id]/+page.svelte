<script lang="ts">
  // Semesterplanung (PB16, E114) und Stundenplanung (PB15): Blöcke im Halbjahr zählen, Unterrichtsreihen darauf legen,
  // je Block Thema und Hausaufgabe planen. Quelle: echte Termine aus WebUntis, sonst Wochenmuster; Ferien aus WebUntis.
  import { page } from '$app/state';
  import { app, speichern, zeige } from '$lib/speicher.svelte';
  import { heuteISO, datumWt, datumKurz } from '$lib/hilfen';
  import { semesterPlan, halbjahre, aktuellesHalbjahr, freieZeiten, reiheText, type PlanBlock } from '$lib/semester';
  import type { Reihe } from '$lib/typen';
  import KursKopf from '$lib/ui/KursKopf.svelte';
  import MaterialListe from '$lib/ui/MaterialListe.svelte';
  import { materialFuer, anzahlFuer, verschieben, reiheEntfernt, gezeigtAm } from '$lib/material';
  import { istAn } from '$lib/module';

  const d = app.d!;
  const kurs = $derived(d.kurse.find((k) => k.id === page.params.id)!);
  const heute = heuteISO();
  const hjs = $derived(halbjahre(d));
  let hjNr = $state(aktuellesHalbjahr(app.d!, heuteISO()).nr);
  const hj = $derived(hjs[hjNr - 1]);
  const plan = $derived(semesterPlan(d, kurs, hj, heute));
  const quelleFrei = $derived(freieZeiten(d));
  const kommend = $derived(plan.bloecke.filter((b) => b.datum >= heute && b.zustand !== 'frei'));
  const vergangen = $derived(plan.bloecke.filter((b) => b.datum < heute && b.zustand === 'unterricht'));
  let alleZeigen = $state(false);
  let alteZeigen = $state(false);

  const reihenIndex = $derived(new Map((kurs.reihen ?? []).map((r, i) => [r.id, i])));
  const ton = (b: PlanBlock) => (b.reihe ? (reihenIndex.get(b.reihe.id) ?? 0) % 4 : -1);

  // Lernstoff-Einträge für sichtbare Blöcke anlegen, damit die Felder gebunden werden können
  $effect.pre(() => { for (const b of kommend.slice(0, alleZeigen ? undefined : 12)) kurs.lernstoff[b.datum] ??= { text: '', hausaufgabe: '' }; });
  const geplant = $derived(kommend.filter((b) => b.zustand === 'unterricht' && kurs.lernstoff[b.datum]?.text.trim()).length);

  function reiheNeu() {
    kurs.reihen ??= [];
    kurs.reihen.push({ id: 'r' + Date.now().toString(36), titel: '', bloecke: 4 });
    speichern();
  }
  function schieben(r: Reihe, um: number) {
    const l = kurs.reihen!;
    const i = l.indexOf(r);
    const j = i + um;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    speichern();
  }
  function bloeckeAendern(r: Reihe, um: number) { r.bloecke = Math.max(1, r.bloecke + um); speichern(); }
  function entfernen(r: Reihe) {
    kurs.reihen = kurs.reihen!.filter((x) => x !== r);
    const n = reiheEntfernt(d.material, kurs.id, r.id); // Material der Reihe bleibt bei der Klasse
    speichern();
    if (n) zeige(`${n} Material${n === 1 ? '' : 'ien'} der Reihe liegen jetzt bei der Klasse`);
  }

  // Dateiablage (V14): Material je Reihe, je Block und für die ganze Klasse
  const ablageAn = $derived(istAn(d.einstellungen, 'ablage'));
  let offenReihe = $state<string | null>(null);
  let offenBlock = $state<string | null>(null);
  let alleMaterial = $state(false);
  let suche = $state('');
  const eigenesMaterial = $derived(d.material.filter((m) => m.kursId === kurs.id));
  const gefunden = $derived(eigenesMaterial.filter((m) => !suche.trim() || [m.titel, m.datei?.name, m.url].join(' ').toLowerCase().includes(suche.trim().toLowerCase())));
  /** Fällt ein Block mit eigenem Material aus: auf den nächsten Unterrichtsblock legen. */
  function materialWeiter(b: PlanBlock) {
    const naechster = kommend.find((x) => x.datum > b.datum && x.zustand === 'unterricht');
    if (!naechster) { zeige('Kein weiterer Block im Halbjahr'); return; }
    const n = verschieben(d.material, kurs.id, b.datum, naechster.datum);
    speichern();
    zeige(`${n} Material${n === 1 ? '' : 'ien'} auf ${datumWt(naechster.datum)}`, () => { verschieben(d.material, kurs.id, naechster.datum, b.datum); speichern(); });
  }

  /** Eigener Ausfall als Kalendertermin (E115), ein Tipp setzt und nimmt zurück. */
  function ausfallUmschalten(b: PlanBlock) {
    if (b.terminId) d.termine = d.termine.filter((t) => t.id !== b.terminId);
    else if (b.zustand === 'unterricht')
      d.termine.push({ id: 'a' + Date.now().toString(36), datum: b.datum, beginn: b.beginn, ende: b.ende, titel: `Ausfall ${kurs.klasse}`, art: 'ausfall', kursIds: [kurs.id], unterrichtFrei: true });
    speichern();
  }
  const quelle = $derived(kurs.untisStunden?.length ? 'echte Termine aus WebUntis' : 'Wochenmuster des Stundenplans');
</script>

<svelte:head><title>{kurs?.name} · Planung</title></svelte:head>

{#if kurs}
  <KursKopf {kurs} aktiv="planung">
    {#snippet rechts()}
      <div class="umschalter" role="group" aria-label="Halbjahr">
        {#each hjs as h}<button aria-pressed={hjNr === h.nr} onclick={() => (hjNr = h.nr)}>{h.name}</button>{/each}
      </div>
    {/snippet}
  </KursKopf>
  <div class="seite">
    <section class="karte">
      <div class="kennzahlen">
        <div><b class="zahl">{plan.unterricht}</b><span class="klein leise">Blöcke im {hj.name}</span></div>
        <div><b class="zahl">{plan.gehalten}</b><span class="klein leise">gehalten</span></div>
        <div><b class="zahl">{plan.uebrig}</b><span class="klein leise">noch übrig</span></div>
        <div><b class="zahl">{plan.ausfall}</b><span class="klein leise">fallen aus</span></div>
        <div class:warnfeld={plan.puffer < 0}>
          <b class="zahl">{plan.puffer >= 0 ? plan.puffer : -plan.puffer}</b>
          <span class="klein" class:leise={plan.puffer >= 0}>{plan.puffer >= 0 ? 'Blöcke Puffer' : 'Blöcke zu wenig'}</span>
        </div>
      </div>
      <div class="strahl" aria-label="Blöcke im Halbjahr">
        {#each plan.bloecke as b (b.datum + b.beginn)}
          <span class="kaestchen t{ton(b)}" class:klausur={b.klausur} class:ausfall={b.zustand === 'ausfall'} class:frei={b.zustand === 'frei'} class:vorbei={b.datum < heute}
            class:heute={b === plan.naechster} title="{datumWt(b.datum)} {b.beginn}: {b.zustand === 'unterricht' ? reiheText(b) || 'ohne Reihe' : b.grund}"></span>
        {/each}
      </div>
      <p class="klein leise info">
        {datumKurz(hj.von)} bis {datumKurz(hj.bis)} · {plan.einheiten} Unterrichtsstunden in {plan.unterricht} Blöcken, davon {plan.klausuren} mit Klausur.
        Quelle: {quelle}; {quelleFrei.beispiel ? 'Ferien und Feiertage als Beispiel Berlin 2026/27 (bitte prüfen, kommt mit dem WebUntis- oder IServ-Abgleich)' : quelleFrei.quelle === 'iserv' ? 'Ferien und Feiertage aus IServ' : 'Ferien und Feiertage aus WebUntis'}.
        Ausfälle: WebUntis und unterrichtsfreie Termine aus dem Kalender.
      </p>
    </section>

    <section class="karte">
      <div class="zeile"><h2 class="raum">Unterrichtsreihen</h2><span class="klein leise">Reihenfolge und Blöcke je Reihe. Klausur- und Ausfallblöcke werden übersprungen.</span></div>
      <ul class="reihen">
        {#each kurs.reihen ?? [] as r, i (r.id)}
          {@const st = plan.stand[i]}
          <li>
            <span class="farbe t{i % 4}"></span>
            <input class="eingabe" placeholder="Titel der Reihe" bind:value={r.titel} oninput={speichern} aria-label="Titel der Reihe" />
            <span class="zaehler">
              <button class="knopf leise mini" onclick={() => bloeckeAendern(r, -1)} aria-label="einen Block weniger">−</button>
              <b class="zahl">{r.bloecke}</b>
              <button class="knopf leise mini" onclick={() => bloeckeAendern(r, 1)} aria-label="einen Block mehr">+</button>
            </span>
            <span class="klein zeitraum">
              {#if st?.von}<span class="zahl">{datumKurz(st.von)}–{datumKurz(st.bis!)}</span>{/if}
              {#if st?.fehlt}<span class="warn">{st.fehlt === r.bloecke ? 'passt nicht mehr ins Halbjahr' : `${st.fehlt} Blöcke passen nicht`}</span>
              {:else if st}<span class="leise">{st.fertig} von {r.bloecke} gehalten</span>{/if}
            </span>
            <span class="aktionen">
              {#if ablageAn}
                {@const n = eigenesMaterial.filter((m) => m.ort === 'reihe' && m.reiheId === r.id).length}
                <button class="pille" aria-expanded={offenReihe === r.id} onclick={() => (offenReihe = offenReihe === r.id ? null : r.id)} title="Material der Reihe">Material{n ? ` ${n}` : ''}</button>
              {/if}
              <button class="knopf leise mini" onclick={() => schieben(r, -1)} disabled={i === 0} aria-label="nach oben">↑</button>
              <button class="knopf leise mini" onclick={() => schieben(r, 1)} disabled={i === (kurs.reihen?.length ?? 0) - 1} aria-label="nach unten">↓</button>
              <button class="knopf leise mini" onclick={() => entfernen(r)} aria-label="Reihe entfernen">×</button>
            </span>
            {#if ablageAn && offenReihe === r.id}
              <div class="material">
                <p class="klein leise">Material der Reihe „{r.titel || 'ohne Titel'}“ erscheint in jedem ihrer Blöcke und in der Live-Stunde.</p>
                <MaterialListe {kurs} eintraege={eigenesMaterial.filter((m) => m.ort === 'reihe' && m.reiheId === r.id)} ziel={{ ort: 'reihe', reiheId: r.id }} ortZeigen={false} leer="Noch kein Material in dieser Reihe." />
              </div>
            {/if}
          </li>
        {/each}
      </ul>
      <div class="zeile wrap">
        <button class="knopf leise" onclick={reiheNeu}>+ Reihe</button>
        <span class="klein leise">Geplant {plan.geplant} Blöcke, verfügbar {plan.unterricht - plan.klausuren} (ohne Klausuren).</span>
      </div>
    </section>

    <section class="karte">
      <div class="zeile"><h2 class="raum">Kommende Blöcke</h2><span class="klein leise">{geplant} mit Thema · steht in der Live-Stunde unter „Lernstoff“</span></div>
      <ul class="plan">
        {#each kommend.slice(0, alleZeigen ? undefined : 12) as b, i (b.datum + b.beginn)}
          {@const e = kurs.lernstoff[b.datum]}
          <li class:heute={b.datum === heute} class:aus={b.zustand === 'ausfall'}>
            <div class="wann">
              <b>{datumWt(b.datum)}</b><span class="klein leise zahl">{b.beginn}–{b.ende}</span>
              {#each b.leistungen as l}<span class="kennz">{l.name}</span>{/each}
              {#if b.zustand === 'unterricht' && reiheText(b)}<span class="klein reihe t{ton(b)}">{reiheText(b)}</span>{/if}
              {#if ablageAn && b.zustand !== 'frei'}
                {@const n = anzahlFuer(d.material, kurs.id, b.datum, b.zustand === 'unterricht' ? b.reihe?.id : undefined)}
                <button class="pille mat" aria-expanded={offenBlock === b.datum + b.beginn} onclick={() => (offenBlock = offenBlock === b.datum + b.beginn ? null : b.datum + b.beginn)}>Material{n ? ` ${n}` : ''}</button>
              {/if}
            </div>
            {#if b.zustand === 'ausfall'}
              <span class="leise">{b.grund}</span><span></span>
            {:else if i > 0 && kommend[i - 1].datum === b.datum && kommend[i - 1].zustand === 'unterricht'}
              <span class="klein leise">gleicher Tag: Thema und Hausaufgabe oben</span><span></span>
            {:else if e}
              <input class="eingabe" placeholder="Thema / Stoff" bind:value={e.text} oninput={speichern} />
              <input class="eingabe" placeholder="Hausaufgabe" bind:value={e.hausaufgabe} oninput={speichern} />
            {/if}
            {#if b.zustand === 'unterricht' || (b.terminId && d.termine.find((t) => t.id === b.terminId)?.art === 'ausfall')}
              <button class="pille" aria-pressed={!!b.terminId} onclick={() => ausfallUmschalten(b)} title={b.terminId ? 'Ausfall zurücknehmen' : 'Block fällt aus (z. B. Prüfung, Fortbildung)'}>{b.terminId ? 'fällt aus ✓' : 'fällt aus'}</button>
            {:else if b.terminId}<a class="klein" href="/kalender">im Kalender</a>{:else}<span></span>{/if}
            {#if ablageAn && offenBlock === b.datum + b.beginn}
              {@const f = materialFuer(d.material, kurs.id, b.datum, b.zustand === 'unterricht' ? b.reihe?.id : undefined)}
              <div class="material">
                {#if b.zustand === 'ausfall' && f.stunde.length}
                  <div class="zeile wrap"><span class="klein warn">Der Block fällt aus, {f.stunde.length} Material{f.stunde.length === 1 ? '' : 'ien'} hängen an ihm.</span><button class="pille" onclick={() => materialWeiter(b)}>auf den nächsten Block</button></div>
                {/if}
                <MaterialListe {kurs} eintraege={[...f.stunde, ...f.reihe]} ziel={{ ort: 'stunde', datum: b.datum }} leer="Noch kein Material für diese Stunde. Neues hängt an diesem Tag." />
              </div>
            {/if}
          </li>
        {/each}
      </ul>
      {#if kommend.length > 12}
        <button class="pille" aria-pressed={alleZeigen} onclick={() => (alleZeigen = !alleZeigen)}>{alleZeigen ? 'weniger zeigen' : `alle ${kommend.length} bis zum Halbjahresende`}</button>
      {/if}
    </section>

    {#if ablageAn}
      <section class="karte">
        <div class="zeile wrap"><h2 class="raum">Material der Klasse</h2><span class="klein leise">immer da, z. B. Kursplan, Bewertungsraster · {eigenesMaterial.length} insgesamt</span></div>
        <MaterialListe {kurs} eintraege={eigenesMaterial.filter((m) => m.ort === 'klasse')} ziel={{ ort: 'klasse' }} ortZeigen={false} leer="Noch nichts für die ganze Klasse." />
        {#if eigenesMaterial.length}
          <div class="zeile wrap alles">
            <button class="pille" aria-pressed={alleMaterial} onclick={() => (alleMaterial = !alleMaterial)}>{alleMaterial ? 'ausblenden' : `alles Material (${eigenesMaterial.length})`}</button>
            {#if alleMaterial}<input class="eingabe" type="search" placeholder="Suchen" bind:value={suche} aria-label="Material suchen" />{/if}
          </div>
          {#if alleMaterial}
            <MaterialListe {kurs} eintraege={gefunden} ziel={{ ort: 'klasse' }} ohneNeu leer="Nichts gefunden." />
          {/if}
        {/if}
      </section>
    {/if}

    <section class="karte">
      <div class="zeile"><h2 class="raum">Rückblick</h2><button class="pille" aria-pressed={alteZeigen} onclick={() => (alteZeigen = !alteZeigen)}>{alteZeigen ? 'ausblenden' : `${vergangen.length} gehaltene zeigen`}</button></div>
      {#if alteZeigen}
        <ul class="plan alt">
          {#each [...vergangen].reverse() as b (b.datum + b.beginn)}
            {@const e = kurs.lernstoff[b.datum]}
            <li>
              <div class="wann"><b>{datumWt(b.datum)}</b>{#if reiheText(b)}<span class="klein reihe t{ton(b)}">{reiheText(b)}</span>{/if}</div>
              <span class:leise={!e?.text}>{e?.text || 'kein Thema eingetragen'}{e?.hausaufgabe ? ` · HA: ${e.hausaufgabe}` : ''}</span>
              <span class="klein">{#if e?.stand && istAn(d.einstellungen, 'stand')}<span class="leise">Stand:</span> {e.stand}{/if}
                {#if ablageAn && gezeigtAm(d.material, kurs.id, b.datum).length}<br /><span class="leise">Gezeigt:</span> {gezeigtAm(d.material, kurs.id, b.datum).map((m) => m.titel).join(', ')}{/if}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>
{/if}

<style>
  .seite { padding: 18px 32px 40px; display: flex; flex-direction: column; gap: 16px; max-width: 1200px; }
  .kennzahlen { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
  .kennzahlen div { display: flex; flex-direction: column; gap: 2px; }
  .kennzahlen b { font-size: 28px; font-weight: 750; }
  .umschalter { display: inline-flex; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-pill); overflow: hidden; }
  .umschalter button { border: 0; background: var(--leo-karte); padding: 0 12px; min-height: 32px; color: var(--leo-leise); font-size: 12px; }
  .umschalter button[aria-pressed='true'] { background: var(--leo-akzent); color: var(--leo-auf-akzent); font-weight: 600; }
  .warnfeld { color: var(--leo-warnung); }
  .info { margin: 10px 0 0; line-height: 1.5; }
  /* Zeitstrahl: ein Kästchen je Block, Reihen in Abstufungen des Akzents (keine neuen Farben) */
  .strahl { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 14px; }
  .kaestchen { width: 14px; height: 22px; border-radius: 3px; background: var(--leo-taste); border: 1px solid transparent; }
  .t0 { --ton: var(--leo-akzent); }
  .t1 { --ton: color-mix(in srgb, var(--leo-akzent) 62%, var(--leo-karte)); }
  .t2 { --ton: color-mix(in srgb, var(--leo-akzent) 82%, var(--leo-tinte)); }
  .t3 { --ton: color-mix(in srgb, var(--leo-akzent) 38%, var(--leo-karte)); }
  .kaestchen.t0, .kaestchen.t1, .kaestchen.t2, .kaestchen.t3 { background: var(--ton); }
  .kaestchen.klausur { background: var(--leo-stern); }
  .kaestchen.ausfall { background: transparent; border: 1px dashed var(--leo-leise); }
  .kaestchen.frei { background: transparent; width: 6px; }
  .kaestchen.vorbei { opacity: .45; }
  .kaestchen.heute { outline: 2px solid var(--leo-tinte); outline-offset: 1px; }
  .reihen { list-style: none; padding: 0; margin: 12px 0; display: grid; gap: 6px; }
  .reihen li { display: grid; grid-template-columns: 10px minmax(160px, 1fr) auto 220px auto; gap: 10px; align-items: center; }
  .farbe { width: 10px; height: 30px; border-radius: 3px; background: var(--ton); }
  .zaehler { display: inline-flex; align-items: center; gap: 6px; }
  .zaehler b { min-width: 24px; text-align: center; }
  .mini { min-height: 32px; min-width: 32px; padding: 0 8px; }
  .zeitraum { display: flex; flex-direction: column; }
  .aktionen { display: inline-flex; gap: 4px; justify-content: flex-end; min-width: 220px; }
  .plan { list-style: none; padding: 0; margin: 12px 0; }
  .plan li { display: grid; grid-template-columns: 290px 1fr 240px auto; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px dashed var(--leo-linie); }
  .plan li.heute { background: var(--leo-auswahl); }
  .plan li.aus .wann b { text-decoration: line-through; color: var(--leo-leise); }
  .plan.alt li { grid-template-columns: 290px 1fr 1fr; }
  .wann { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .material { grid-column: 1 / -1; padding: 6px 0 10px 20px; display: flex; flex-direction: column; gap: 6px; }
  .mat { min-height: 28px; padding: 0 10px; font-size: 12px; }
  .alles { margin-top: 12px; }
  .reihe { border-left: 4px solid var(--ton); padding-left: 6px; color: var(--leo-leise); }
  @media (max-width: 900px) {
    .seite { padding: 12px; }
    .plan li, .plan.alt li { grid-template-columns: 1fr; }
    .kennzahlen { grid-template-columns: repeat(3, 1fr); }
    .reihen li { grid-template-columns: 10px 1fr auto; padding: 8px 0; border-top: 1px dashed var(--leo-linie-fein); }
    .reihen li .farbe { grid-row: 1 / span 3; height: 100%; }
    .reihen li input { grid-column: 2 / 4; }
    .zaehler { grid-column: 2; grid-row: 2; }
    .aktionen { grid-column: 3; grid-row: 2; }
    .zeitraum { grid-column: 2 / 4; grid-row: 3; }
  }
</style>
