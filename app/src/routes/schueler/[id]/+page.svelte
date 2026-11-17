<script lang="ts">
  import { page } from '$app/state';
  import { app, speichern, zeige, neueId } from '$lib/speicher.svelte';
  import { name, alter, fehlzeitenVon, prozent, datumWt, datumKurz, heuteISO } from '$lib/hilfen';
  import { rechne, zahl, zellSchluessel, bestanden } from '$lib/rechnen';
  import { STUFEN, bausteinStufe } from '$lib/bausteine';
  import Smiley from '$lib/ui/Smiley.svelte';

  const d = app.d!;
  const s = $derived(d.schueler.find((x) => x.id === page.params.id)!);
  const kurse = $derived(d.kurse.filter((k) => k.schueler.includes(s.id)));
  let kursId = $state(page.url.searchParams.get('kurs') ?? '');
  const kurs = $derived(kurse.find((k) => k.id === kursId) ?? kurse[0]);
  const erg = $derived(kurs ? rechne(kurs, s.id) : null);
  const fz = $derived(kurs ? fehlzeitenVon(d, kurs.id, s.id) : null);
  const fos = $derived(kurs?.profil === 'FOS');

  // Fehlzeiten nach Wochentag und Monat
  const tage = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
  const nachTag = $derived(tage.map((_, i) => new Set(fz?.liste.filter((f) => new Date(f.datum).getDay() === i + 1).map((f) => f.datum)).size));
  const maxTag = $derived(Math.max(1, ...nachTag));
  const klausurTermine = $derived(kurs?.leistungen.filter((l) => l.gruppe === 'klausuren') ?? []);
  const muster = $derived.by(() => {
    if (!fz || fz.liste.length < 3) return '';
    const tageGesamt = new Set(fz.liste.map((f) => f.datum)).size;
    const i = nachTag.indexOf(Math.max(...nachTag));
    return nachTag[i] >= 3 && nachTag[i] / tageGesamt >= 0.4 ? `${nachTag[i]} von ${tageGesamt} Fehltagen sind ${['Montage', 'Dienstage', 'Mittwoche', 'Donnerstage', 'Freitage'][i]}.` : '';
  });

  // Mitarbeit: Verlauf nach Monat (Anteile je Stufe), Ø als Note (E67, E72)
  const eintraege = $derived(d.mitarbeit.filter((e) => e.kursId === kurs?.id && e.schuelerId === s.id).sort((a, b) => b.zeit.localeCompare(a.zeit)));
  const monate = $derived.by(() => {
    const m = new Map<string, number[]>();
    for (const e of eintraege) { const k = e.zeit.slice(0, 7); m.set(k, [...(m.get(k) ?? []), e.stufe]); }
    return [...m.entries()].sort().map(([k, st]) => ({
      k, name: new Date(k + '-01').toLocaleDateString('de-DE', { month: 'short' }), n: st.length,
      anteile: [1, 2, 3, 4, 5].map((x) => st.filter((y) => y === x).length / st.length),
      schnitt: st.reduce((a, b) => a + b, 0) / st.length
    }));
  });
  const haeufig = $derived.by(() => {
    const z = new Map<string, number>();
    for (const e of eintraege) for (const b of e.bausteine) z.set(b, (z.get(b) ?? 0) + 1);
    return [...z.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  });
  const chipArt = (t: string) => { const x = bausteinStufe(t) ?? 3; return x <= 2 ? 'pos' : x >= 4 ? 'neg' : 'neu'; };

  // Notizen
  const notizen = $derived(d.notizen.filter((n) => n.schuelerId === s.id).sort((a, b) => b.datum.localeCompare(a.datum)));
  let neueNotiz = $state('');
  function notizSpeichern() {
    if (!neueNotiz.trim()) return;
    d.notizen.push({ id: neueId(), schuelerId: s.id, datum: heuteISO(), text: neueNotiz.trim() });
    neueNotiz = '';
    speichern();
  }
  function notizLoeschen(id: string) {
    const i = d.notizen.findIndex((n) => n.id === id);
    const [n] = d.notizen.splice(i, 1);
    speichern();
    zeige('Notiz gelöscht', () => { d.notizen.splice(i, 0, n); speichern(); });
  }
  const wert = (lid: string) => { const z = kurs?.zellen[zellSchluessel(lid, s.id)]; return z?.status ?? (z?.wert !== undefined ? String(z.wert) : '·'); };
  const ost = (x: number | null) => (kurs && x !== null && !bestanden(kurs.profil, x) ? 'warn' : '');
</script>

<svelte:head><title>{s ? name(s) : 'Schüler'}</title></svelte:head>

{#if s && kurs && erg && fz}
  <header class="kopf">
    <a href="/kurs/{kurs.id}" class="zurueck">‹ {kurs.name}</a>
    {#if kurse.length > 1}
      <select class="eingabe" bind:value={kursId}>{#each kurse as k}<option value={k.id}>{k.name}</option>{/each}</select>
    {/if}
  </header>

  <div class="seite">
    <section class="karte person">
      <h1>{name(s)} {#if s.nta}<span class="nta" title={s.nta}>N</span>{/if}</h1>
      <p class="leise">{s.geschlecht === 'w' ? 'weiblich' : s.geschlecht === 'm' ? 'männlich' : 'divers'} · {alter(s)} Jahre · {kurs.klasse}</p>
      <p>{s.mailDienst} <span class="leise">(dienstlich)</span><br />{#if s.mailPrivat}{s.mailPrivat} <span class="leise">(privat)</span>{:else}<span class="leise">privat nicht hinterlegt</span>{/if}</p>
      {#if s.nta}<p class="akzent">{s.nta} · von Klassenleitung</p>{/if}
    </section>

    <section class="karte noten">
      <div class="zeile"><h2 class="raum">Noten</h2><span class="klein leise">{kurs.profil} · {fos ? 'Notenpunkte' : 'Noten'}</span></div>
      <div class="kacheln">
        {#each klausurTermine as l}<div class="kz"><span class="klein leise">{l.name}</span><b class="zahl {wert(l.id) === 'UE' ? 'warn' : ''}">{wert(l.id)}</b></div>{/each}
        <div class="kz"><span class="klein leise">Mitarbeit Ø</span><b class="zahl ber {ost(erg.mitarbeit)}">{zahl(erg.mitarbeit)}</b></div>
        <div class="kz"><span class="klein leise">Tests und Sonstiges Ø</span><b class="zahl ber {ost(erg.sl)}">{zahl(erg.sl)}</b></div>
        <div class="kz"><span class="klein leise">AT (Sonstige)</span><b class="zahl ber {ost(erg.sonstige)}">{zahl(erg.sonstige)}</b></div>
      </div>
      <details>
        <summary class="klein">ⓘ Rechenweg</summary>
        <div class="weg">{#each erg.weg as w}<div>{w}</div>{/each}</div>
      </details>
      {#if erg.nachschreiben.length}<p class="klein">Nachschreiben offen: {erg.nachschreiben.join(', ')}</p>{/if}
    </section>

    <section class="karte fehl">
      <div class="zeile"><h2 class="raum">Fehlzeiten</h2><span class="klein leise">Beispieldaten, später aus WebUntis</span></div>
      <div class="kacheln vier">
        <div class="kz"><b class="zahl">{fz.tageE}</b><span class="klein leise">Tage entschuldigt</span></div>
        <div class="kz"><b class="zahl" class:warn={fz.tageUE > 0}>{fz.tageUE}</b><span class="klein leise">Tage unentschuldigt</span></div>
        <div class="kz"><b class="zahl">{fz.stunden}</b><span class="klein leise">Fehlstunden</span></div>
        <div class="kz"><b class="zahl" class:warn={fz.quote > 0.3}>{prozent(fz.quote)}</b><span class="klein leise">von {kurs.stundenGehalten} Std.</span></div>
      </div>
      <div class="quote" aria-hidden="true">
        <div class="qv" style:width="{Math.min(1, fz.quote / 0.4) * 100}%" class:hoch={fz.quote > 0.3}></div>
        <span class="mark" style:left="50%">20 %</span><span class="mark" style:left="75%">30 %</span>
      </div>
      {#if fz.quote > 0.3}<p class="klein warn">Über 30 %: „N“ im Halbjahreszeugnis möglich, Zeugniskonferenz entscheidet (E62).</p>{/if}
      <p class="klein leise">Nach Wochentag</p>
      <div class="wt">
        {#each tage as t, i}
          <div class="wts"><span class="zahl klein">{nachTag[i]}</span><div class="wtb" class:max={nachTag[i] === maxTag && nachTag[i] > 0} style:height="{(nachTag[i] / maxTag) * 70 + 3}px"></div><span class="klein leise">{t}</span></div>
        {/each}
      </div>
      {#if muster}<div class="muster klein"><b>Muster:</b> {muster}</div>{/if}
      <p class="klein leise">Letzte Fehltage</p>
      <ul class="fl">{#each fz.liste.slice(-5).reverse() as f}<li><span>{datumWt(f.datum)}</span><span class="kennz" class:ue={f.status === 'UE'}>{f.status}</span><span class="leise klein">{f.stunden} Std.</span></li>{/each}</ul>
    </section>

    <section class="karte mit">
      <div class="zeile"><h2 class="raum">Mitarbeit</h2><span class="klein leise">Ø Smileys als Note</span></div>
      <p class="klein leise">Verlauf nach Monat · Anteil der Einschätzungen</p>
      {#each monate as m}
        <div class="mz">
          <span class="mn">{m.name}</span>
          <div class="mb">{#each m.anteile as a, i}{#if a > 0}<div style:width="{a * 100}%" style:background="var(--leo-mitb-{i + 1})"></div>{/if}{/each}</div>
          <span class="klein leise zahl">{m.n} · <b class="tinte">{zahl(m.schnitt)}</b></span>
        </div>
      {/each}
      <div class="legende klein leise">{#each STUFEN as st}<span><i style:background="var(--leo-mitb-{st.stufe})"></i>{st.name}</span>{/each}</div>
      {#if haeufig.length}
        <p class="klein leise">Häufigste Bausteine</p>
        <div class="chips">{#each haeufig as [t, n]}<span class="chip {chipArt(t)}">{t} <b>{n}×</b></span>{/each}</div>
      {/if}
      <p class="klein leise">Letzte Einträge</p>
      <ul class="le">
        {#each eintraege.slice(0, 5) as e}
          <li><Smiley stufe={e.stufe} groesse={28} /><span class="raum">{[...e.bausteine, e.kommentar].filter(Boolean).join(', ') || 'nur Smiley (schnell erfasst)'}</span><span class="leise klein">{datumWt(e.zeit)}</span></li>
        {/each}
      </ul>
    </section>

    <section class="karte notizen">
      <h2>Notizen</h2>
      <div class="zeile neu">
        <textarea class="eingabe raum" rows="2" bind:value={neueNotiz} placeholder="Neue Notiz (Stift und Diktat gehen auch)"></textarea>
        <button class="knopf" onclick={notizSpeichern} disabled={!neueNotiz.trim()}>+ Notiz</button>
      </div>
      <div class="nraster">
        {#each notizen as n}
          <div class="notiz"><div class="zeile"><span class="klein leise raum">{datumKurz(n.datum)}</span><button class="x" onclick={() => notizLoeschen(n.id)} aria-label="Notiz löschen">×</button></div><p>{n.text}</p></div>
        {/each}
      </div>
    </section>
  </div>
{/if}

<style>
  .kopf { padding: 14px 32px 0; display: flex; gap: 14px; align-items: center; }
  .zurueck { text-decoration: none; font-weight: 600; padding: 8px 0; }
  .seite { padding: 14px 32px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  .person h1 { display: flex; align-items: center; gap: 8px; }
  .person p { margin: 8px 0 0; line-height: 1.6; }
  .akzent { color: var(--leo-akzent); }
  .kacheln { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; margin: 12px 0; }
  .kacheln.vier { grid-template-columns: repeat(4, 1fr); }
  .kz { border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); padding: 10px 12px; background: var(--leo-flaeche-leise); display: flex; flex-direction: column; gap: 4px; }
  .kz b { font-size: 22px; font-weight: 750; }
  .kz b.ber { font-weight: 600; color: var(--leo-berechnet); }
  .warn { color: var(--leo-warnung) !important; }
  .weg { background: var(--leo-akzent-hell); border-radius: var(--leo-r-m); padding: 10px 14px; font-family: var(--leo-schrift-mono); font-size: 12px; line-height: 1.7; margin-top: 8px; }
  summary { cursor: pointer; color: var(--leo-akzent); font-weight: 600; padding: 6px 0; }
  .quote { position: relative; height: 10px; background: var(--leo-taste); border-radius: 99px; margin: 6px 0 22px; }
  .qv { height: 100%; border-radius: 99px; background: var(--leo-akzent); }
  .qv.hoch { background: var(--leo-warnung); }
  .mark { position: absolute; top: 12px; transform: translateX(-50%); font-size: 10px; color: var(--leo-leise); border-left: 1px solid var(--leo-leise); padding-left: 3px; }
  .wt { display: flex; gap: 8px; align-items: flex-end; height: 110px; }
  .wts { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; justify-content: flex-end; height: 100%; }
  .wtb { width: 100%; background: #c9d9da; border-radius: 6px 6px 0 0; }
  .wtb.max { background: var(--leo-akzent); }
  .muster { background: var(--leo-stern-hell); border: 1px solid #ecd28a; border-radius: var(--leo-r-m); padding: 10px 12px; margin-top: 12px; }
  .fl, .le { list-style: none; padding: 0; margin: 0; }
  .fl li { display: flex; gap: 12px; align-items: center; padding: 6px 0; border-top: 1px dashed var(--leo-linie); }
  .mz { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
  .mn { width: 34px; font-size: 13px; }
  .mb { flex: 1; display: flex; height: 18px; border-radius: 5px; overflow: hidden; gap: 2px; }
  .tinte { color: var(--leo-tinte); }
  .legende { display: flex; gap: 12px; flex-wrap: wrap; margin: 8px 0; }
  .legende i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .le li { display: flex; gap: 10px; align-items: center; padding: 7px 0; border-top: 1px dashed var(--leo-linie); }
  .notizen { grid-column: 1 / -1; }
  .neu { margin: 12px 0; align-items: flex-start; }
  .nraster { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  .notiz { border-top: 1px solid var(--leo-linie); padding-top: 6px; }
  .notiz p { margin: 4px 0; }
  .x { border: 0; background: none; color: var(--leo-leise); font-size: 18px; min-width: 36px; min-height: 36px; }
  section p.klein.leise { margin: 14px 0 6px; }
  @media (max-width: 900px) { .seite { grid-template-columns: 1fr; padding: 12px 16px 40px; } .kopf { padding: 12px 16px 0; } .kacheln.vier { grid-template-columns: 1fr 1fr; } }
</style>
