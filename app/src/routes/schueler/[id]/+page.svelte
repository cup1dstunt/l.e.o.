<script lang="ts">
  // Schülerkarte: jede Kennzahl ist eine Kachel, die ihre Herkunft öffnet (E89).
  import { page } from '$app/state';
  import { app, speichern, zeige, neueId } from '$lib/speicher.svelte';
  import { name, alter, fehlzeitenVon, verspaetungenVon, prozent, datumWt, datumKurz, heuteISO, nachWochentag, WOCHENTAGE } from '$lib/hilfen';
  import { rechne, zahl, zellSchluessel, bestanden, zellWert, mittel } from '$lib/rechnen';
  import { STUFEN, bausteinStufe, bausteineVon } from '$lib/bausteine';
  import { mindestSmileys, einschaetzungVon } from '$lib/raster';
  import { nachschreibLage, schulAdresse } from '$lib/nachschreiben';
  import Smiley from '$lib/ui/Smiley.svelte';
  import SchnittKachel from '$lib/ui/SchnittKachel.svelte';
  import Rechenweg from '$lib/ui/Rechenweg.svelte';
  import WasWaereWenn from '$lib/ui/WasWaereWenn.svelte';

  const d = app.d!;
  const s = $derived(d.schueler.find((x) => x.id === page.params.id)!);
  const kurse = $derived(d.kurse.filter((k) => k.schueler.includes(s.id)));
  let kursId = $state(page.url.searchParams.get('kurs') ?? '');
  const kurs = $derived(kurse.find((k) => k.id === kursId) ?? kurse[0]);
  const erg = $derived(kurs ? rechne(kurs, s.id) : null);
  const aufrufe = $derived(kurs?.zufall?.protokoll.filter((a) => a.schuelerId === s.id) ?? []); // Zufall (P5)
  const fz = $derived(kurs ? fehlzeitenVon(d, kurs.id, s.id) : null);
  const fos = $derived(kurs?.profil === 'FOS');
  const ost = (x: number | null) => (kurs && x !== null && !bestanden(kurs.profil, x) ? 'warn' : '');

  // ---------- Noten (Reihenfolge laut Feedback 12) ----------
  let notenOffen = $state<string | null>(null);
  const klausuren = $derived(kurs?.leistungen.filter((l) => l.gruppe === 'klausuren') ?? []);
  const zelle = (lid: string) => kurs?.zellen[zellSchluessel(lid, s.id)];
  const wert = (lid: string) => { const z = zelle(lid); return z?.status ?? (z?.wert !== undefined ? String(z.wert) : '·'); };
  const klassenSchnitt = (lid: string) => mittel(kurs.schueler.map((x) => ({ wert: zellWert(kurs.profil, kurs.zellen[zellSchluessel(lid, x)]), gewicht: 1 })));
  // Verlauf der Monatsnoten (mündliche Leistungen)
  const monatsNoten = $derived((kurs?.leistungen.filter((l) => l.gruppe === 'mitarbeit') ?? []).map((l) => ({ name: l.name, w: zelle(l.id)?.wert ?? null })));
  const umschalten = (k: string) => (notenOffen = notenOffen === k ? null : k);

  // ---------- Fehlzeiten und Verspätungen ----------
  let fehlOffen = $state<string | null>(null);
  const verspaetungen = $derived(verspaetungenVon(d, kurs?.id, s.id));
  const minutenGesamt = $derived(verspaetungen.reduce((a, v) => a + v.minuten, 0));
  let wtArt = $state<'fehl' | 'spaet'>('fehl');
  const wt = $derived(wtArt === 'fehl' ? nachWochentag(fz?.liste.map((f) => f.datum) ?? []) : nachWochentag(verspaetungen.map((v) => v.datum)));
  const wtMax = $derived(Math.max(1, ...wt));
  const muster = $derived.by(() => {
    const gesamt = wt.reduce((a, b) => a + b, 0);
    if (gesamt < 3) return '';
    const i = wt.indexOf(Math.max(...wt));
    const was = wtArt === 'fehl' ? 'Fehltagen' : 'Verspätungen';
    return wt[i] >= 3 && wt[i] / gesamt >= 0.4 ? `${wt[i]} von ${gesamt} ${was} an einem ${['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'][i]}.` : '';
  });
  const fehlListe = $derived(
    fehlOffen === 'E' || fehlOffen === 'UE' || fehlOffen === 'offen' ? fz?.liste.filter((f) => f.status === fehlOffen) ?? [] : fz?.liste ?? []
  );
  // Nachschreiben (F8): Fälle dieses Schülers in dieser Klasse
  const meineFaelle = $derived(kurs ? nachschreibLage(d).faelle.filter((f) => f.schueler.id === s.id && f.kurs.id === kurs.id) : []);
  const fallZu = (lid: string) => meineFaelle.find((f) => f.leistung.id === lid);
  // Schulische Adresse: hinterlegt oder Vorschlag nach Muster (E106)
  const adr = $derived(schulAdresse(s, d.schueler));
  function adresseSetzen(wert: string) { s.mailDienst = wert.trim(); speichern(); }
  const STATUS: Record<string, string> = { E: 'entschuldigt', UE: 'unentschuldigt', offen: 'noch offen (E/UE folgt)' };

  // ---------- Mitarbeit (Smileys) ----------
  const eintraege = $derived(d.mitarbeit.filter((e) => e.kursId === kurs?.id && e.schuelerId === s.id).sort((a, b) => b.zeit.localeCompare(a.zeit)));
  let monatOffen = $state<string | null>(null);
  const monate = $derived.by(() => {
    const m = new Map<string, number[]>();
    for (const e of eintraege) { const k = e.zeit.slice(0, 7); m.set(k, [...(m.get(k) ?? []), e.stufe]); }
    // Monate mit Notenspalte bis heute auch ohne Smileys zeigen, damit das Raster einspringen kann (E110)
    const jetzt = new Date().toISOString().slice(0, 7);
    for (const l of kurs?.leistungen ?? []) if (l.gruppe === 'mitarbeit' && l.monat && l.monat <= jetzt && !m.has(l.monat)) m.set(l.monat, []);
    const min = kurs ? mindestSmileys(kurs) : 3;
    const liste = [...m.entries()].sort().map(([k, st]) => ({
      k, name: new Date(k + '-01T12:00').toLocaleDateString('de-DE', { month: 'short' }), n: st.length,
      anteile: [1, 2, 3, 4, 5].map((x) => (st.length ? st.filter((y) => y === x).length / st.length : 0)),
      schnitt: st.length ? st.reduce((a, b) => a + b, 0) / st.length : null, trend: '',
      wenig: st.length < min, raster: kurs ? !!einschaetzungVon(kurs, k, s.id) : false,
      selbst: !!kurs?.selbst?.[k]?.antworten[s.id] // Selbsteinschätzung per Link (E116)
    }));
    liste.forEach((x, i) => { const v = liste[i - 1]; if (i > 0 && x.schnitt !== null && v.schnitt !== null) { const dlt = x.schnitt - v.schnitt; x.trend = dlt < -0.25 ? '↗' : dlt > 0.25 ? '↘' : '→'; } });
    return liste;
  });
  const haeufig = $derived.by(() => {
    const z = new Map<string, number>();
    for (const e of eintraege) for (const b of e.bausteine) z.set(b, (z.get(b) ?? 0) + 1);
    return [...z.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  });
  const chipArt = (t: string) => { const x = bausteinStufe(t, bausteineVon(d.einstellungen)) ?? 3; return x <= 2 ? 'pos' : x >= 4 ? 'neg' : 'neu'; };

  // ---------- Notizen ----------
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

  // Liniengraph der Monatsnoten
  const graph = $derived.by(() => {
    const pkt = monatsNoten.map((m, i) => ({ ...m, i })).filter((m) => m.w !== null) as { name: string; w: number; i: number }[];
    const n = Math.max(1, monatsNoten.length - 1);
    const max = fos ? 15 : 6, min = fos ? 0 : 1;
    const x = (i: number) => 30 + (i / n) * 340;
    const y = (w: number) => (fos ? 10 + (1 - (w - min) / (max - min)) * 90 : 10 + ((w - min) / (max - min)) * 90);
    return { pkt, x, y, pfad: pkt.map((p, j) => `${j ? 'L' : 'M'}${x(p.i)},${y(p.w)}`).join(' ') };
  });
</script>

<svelte:head><title>{s ? name(s) : 'Schüler'}</title></svelte:head>

{#if s && kurs && erg && fz}
  <header class="kopf">
    <a href="/kurs/{kurs.id}" class="zurueck">‹ {kurs.name}</a>
    {#if kurse.length > 1}<select class="eingabe" bind:value={kursId}>{#each kurse as k}<option value={k.id}>{k.name}</option>{/each}</select>{/if}
  </header>

  <div class="seite">
    <section class="karte person">
      <h1>{name(s)} {#if s.nta}<span class="nta" title={s.nta}>N</span>{/if}</h1>
      <p class="leise">{s.geschlecht === 'w' ? 'weiblich' : s.geschlecht === 'm' ? 'männlich' : 'divers'} · {alter(s) === null ? 'Alter unbekannt' : `${alter(s)} Jahre`} · {kurs.klasse}</p>
      <label class="feld adresse"><span>Schulische Adresse{adr.vorschlag ? ' · Vorschlag nach Muster' : ''}</span>
        <span class="zeile"><input class="raum" value={s.mailDienst} placeholder={adr.adresse} onchange={(e) => adresseSetzen((e.currentTarget as HTMLInputElement).value)} aria-label="Schulische Mailadresse" />
          {#if adr.vorschlag && adr.adresse}<button class="knopf leise" onclick={() => adresseSetzen(adr.adresse)}>übernehmen</button>{/if}</span>
      </label>
      {#if adr.pruefen.length}<p class="klein gold">Bitte prüfen: {adr.pruefen.join(', ')}</p>{/if}
      <p>{#if s.mailPrivat}{s.mailPrivat} <span class="leise">(privat)</span>{:else}<span class="leise">privat nicht hinterlegt</span>{/if}</p>
      {#if s.nta}<p class="akzent">{s.nta} · von Klassenleitung</p>{/if}
    </section>

    <section class="karte noten">
      <div class="zeile"><h2 class="raum">Noten</h2><span class="klein leise">{kurs.profil} · {fos ? 'Notenpunkte' : 'Noten'} · Kachel antippen für Details</span></div>
      <div class="kacheln">
        {#each klausuren as l}
          <button class="kz" aria-expanded={notenOffen === l.id} onclick={() => umschalten(l.id)}><span class="klein leise">{l.name}</span><b class="zahl {wert(l.id) === 'UE' ? 'warn' : ost(zellWert(kurs.profil, zelle(l.id)))}">{wert(l.id)}</b></button>
        {/each}
        <button class="kz" aria-expanded={notenOffen === 'at'} onclick={() => umschalten('at')}><span class="klein leise">AT (Sonstige)</span><b class="zahl ber {ost(erg.sonstige)}">{zahl(erg.sonstige)}</b></button>
        <button class="kz" aria-expanded={notenOffen === 'mitarbeit'} onclick={() => umschalten('mitarbeit')}><span class="klein leise">mündlich Ø</span><b class="zahl ber {ost(erg.mitarbeit)}">{zahl(erg.mitarbeit)}</b></button>
        <button class="kz" aria-expanded={notenOffen === 'sl'} onclick={() => umschalten('sl')}><span class="klein leise">Tests/Sonstiges Ø</span><b class="zahl ber {ost(erg.sl)}">{zahl(erg.sl)}</b></button>
      </div>
      {#if notenOffen}
        <div class="detail">
          {#if notenOffen === 'at'}
            <Rechenweg {erg} profil={kurs.profil} nur={['mitarbeit', 'sl', 'at']} offen={['at']} />
            <div class="abstand"><WasWaereWenn {kurs} sid={s.id} /></div>
          {:else if notenOffen === 'mitarbeit'}
            {#if graph.pkt.length}
              <svg viewBox="0 0 400 120" class="graph" role="img" aria-label="Verlauf der Monatsnoten">
                <line x1="30" x2="370" y1={graph.y(fos ? 5 : 4)} y2={graph.y(fos ? 5 : 4)} class="grenze" />
                <path d={graph.pfad} class="linie" />
                {#each graph.pkt as p}<circle cx={graph.x(p.i)} cy={graph.y(p.w)} r="4" class="punkt" /><text x={graph.x(p.i)} y={graph.y(p.w) - 8} text-anchor="middle" class="wert">{p.w}</text>{/each}
                {#each monatsNoten as m, i}<text x={graph.x(i)} y="116" text-anchor="middle" class="achse">{m.name}</text>{/each}
              </svg>
            {/if}
            <SchnittKachel {kurs} sid={s.id} gruppe="mitarbeit" />
          {:else if notenOffen === 'sl'}
            <SchnittKachel {kurs} sid={s.id} gruppe="sl" />
          {:else}
            {@const l = klausuren.find((x) => x.id === notenOffen)}
            {#if l}
              {@const z = zelle(l.id)}
              {@const f = fallZu(l.id)}
              <div class="zeilen">
                <div><span class="leise">Datum</span><b>{l.datum ? datumWt(l.datum) : '–'}</b></div>
                <div><span class="leise">Eintrag</span><b>{z?.status === 'UE' ? 'UE · zählt als ' + zellWert(kurs.profil, z) : z?.status ? `${z.status === 'E' ? 'E' : 'offen'} · Nachschreiben` : f ? `fehlte (${f.status}) · Nachschreiben` : (z?.wert ?? 'noch leer')}</b></div>
                {#if f}<div><span class="leise">Nachschreibetermin</span><b><a href="/nachschreiben?{f.termin ? `kurs=${kurs.id}` : `fall=${encodeURIComponent(f.key)}`}">{f.termin ? `${datumWt(f.termin.datum)} ${f.termin.beginn}, Raum ${f.termin.raum}` : 'noch keiner, festlegen ›'}</a></b></div>{/if}
                <div><span class="leise">Klassen-Ø</span><b>{zahl(klassenSchnitt(l.id), 1)}</b></div>
                {#if z?.gewicht !== undefined}<div><span class="leise">Einzelgewicht</span><b>{z.gewicht}</b></div>{/if}
                {#if z?.stern}<div><span class="leise">★ Vorbehalt</span><b>{z.stern}</b></div>{/if}
              </div>
              <div class="abstand"><WasWaereWenn {kurs} sid={s.id} gruppe="klausuren" /></div>
            {/if}
          {/if}
        </div>
      {/if}
    </section>

    <section class="karte fehl">
      <div class="zeile"><h2 class="raum">Fehlzeiten und Verspätungen</h2><span class="klein leise">{d.einstellungen.untis ? `WebUntis, Stand ${new Date(d.einstellungen.untis.abgerufen).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'E/UE später aus WebUntis'}</span></div>
      <div class="kacheln">
        {#if fz.tageOffen}<button class="kz" aria-expanded={fehlOffen === 'offen'} onclick={() => (fehlOffen = fehlOffen === 'offen' ? null : 'offen')}><b class="zahl">{fz.tageOffen}</b><span class="klein leise">Tage noch offen</span></button>{/if}
        <button class="kz" aria-expanded={fehlOffen === 'E'} onclick={() => (fehlOffen = fehlOffen === 'E' ? null : 'E')}><b class="zahl">{fz.tageE}</b><span class="klein leise">Tage entschuldigt</span></button>
        <button class="kz" aria-expanded={fehlOffen === 'UE'} onclick={() => (fehlOffen = fehlOffen === 'UE' ? null : 'UE')}><b class="zahl" class:warn={fz.tageUE > 0}>{fz.tageUE}</b><span class="klein leise">Tage unentschuldigt</span></button>
        <button class="kz" aria-expanded={fehlOffen === 'alle'} onclick={() => (fehlOffen = fehlOffen === 'alle' ? null : 'alle')}><b class="zahl" class:warn={fz.quote > 0.3}>{prozent(fz.quote)}</b><span class="klein leise">{fz.stunden} von {kurs.stundenGehalten} Std.</span></button>
        <button class="kz" aria-expanded={fehlOffen === 'spaet'} onclick={() => (fehlOffen = fehlOffen === 'spaet' ? null : 'spaet')}><b class="zahl">{verspaetungen.length}</b><span class="klein leise">Verspätungen · {minutenGesamt} min</span></button>
      </div>
      {#if meineFaelle.length}
        <ul class="nachliste">
          {#each meineFaelle as f (f.key)}
            <li><span class="kennz">{f.status === 'offen' ? '?' : 'E'}</span><span class="raum">{f.leistung.name}{f.leistung.datum ? ` am ${datumWt(f.leistung.datum)}` : ''} verpasst</span>
              <a href="/nachschreiben?{f.termin ? `kurs=${kurs.id}` : `fall=${encodeURIComponent(f.key)}`}">{f.termin ? `Nachschreiben ${datumWt(f.termin.datum)} ${f.termin.beginn}` : 'Termin festlegen ›'}</a></li>
          {/each}
        </ul>
      {/if}
      {#if fehlOffen}
        <div class="detail">
          {#if fehlOffen === 'spaet'}
            <ul class="fl">{#each verspaetungen as v}<li><span>{datumWt(v.datum)}</span><span class="kennz">+{v.minuten} min</span><span class="leise klein">Ankunft {v.ankunft}</span></li>{/each}</ul>
            {#if verspaetungen.length === 0}<p class="leise klein">Keine Verspätungen.</p>{/if}
          {:else}
            <ul class="fl">{#each [...fehlListe].reverse() as f}<li><span>{datumWt(f.datum)}</span><span class="kennz" class:ue={f.status === 'UE'}>{f.status === 'offen' ? '?' : f.status}</span><span class="leise klein">{f.stunden} Std. · {STATUS[f.status]}{f.grund ? ` · ${f.grund}` : ''}{f.quelle === 'untis' ? ' · WebUntis' : ' · eigene Erfassung'}</span></li>{/each}</ul>
            {#if fehlListe.length === 0}<p class="leise klein">Keine Tage.</p>{/if}
          {/if}
        </div>
      {/if}
      <div class="quote" aria-hidden="true">
        <div class="qv" style:width="{Math.min(1, fz.quote / 0.4) * 100}%" class:hoch={fz.quote > 0.3}></div>
        <span class="mark" style:left="50%">20 %</span><span class="mark" style:left="75%">30 %</span>
      </div>
      {#if fz.quote > 0.3}<p class="klein warn">Über 30 %: „N“ im Halbjahreszeugnis möglich, Zeugniskonferenz entscheidet (E62).</p>{/if}
      <div class="zeile">
        <p class="klein leise raum">Nach Wochentag</p>
        <div class="umschalter" role="group" aria-label="Wochentag-Analyse">
          <button aria-pressed={wtArt === 'fehl'} onclick={() => (wtArt = 'fehl')}>Fehltage</button>
          <button aria-pressed={wtArt === 'spaet'} onclick={() => (wtArt = 'spaet')}>Verspätungen</button>
        </div>
      </div>
      <div class="wt">
        {#each WOCHENTAGE as t, i}
          <div class="wts"><span class="zahl klein">{wt[i]}</span><div class="wtb" class:max={wt[i] === wtMax && wt[i] > 0} style:height="{(wt[i] / wtMax) * 70 + 3}px"></div><span class="klein leise">{t}</span></div>
        {/each}
      </div>
      {#if muster}<div class="muster klein"><b>Muster:</b> {muster}</div>{/if}
    </section>

    <section class="karte mit">
      <div class="zeile"><h2 class="raum">Mündliche Leistungen</h2><span class="klein leise">Smileys als Note · Monat antippen</span></div>
      <p class="klein leise">Verlauf nach Monat · Anteil der Einschätzungen · Tendenz zum Vormonat</p>
      {#each monate as m}
        <button class="mz" aria-expanded={monatOffen === m.k} onclick={() => (monatOffen = monatOffen === m.k ? null : m.k)}>
          <span class="mn">{m.name}</span>
          <span class="mb">{#each m.anteile as a, i}{#if a > 0}<span style:width="{a * 100}%" style:background="var(--leo-mitv-{i + 1})"></span>{/if}{/each}</span>
          <span class="klein leise zahl mzahl">{#if m.selbst}<span class="rmarke">Selbst</span> {/if}{#if m.raster}<span class="rmarke">Raster</span> {/if}{m.n} · <b class="tinte">{m.schnitt === null ? '–' : zahl(m.schnitt)}</b></span>
          <span class="trend {m.trend === '↗' ? 'besser' : m.trend === '↘' ? 'schlechter' : 'gleich'}" title={m.trend === '↗' ? 'besser als Vormonat' : m.trend === '↘' ? 'schlechter als Vormonat' : m.trend ? 'gleich wie Vormonat' : ''}>{m.trend}</span>
        </button>
        {#if monatOffen === m.k}
          {#if m.wenig || m.raster || m.selbst}
            <div class="eingerueckt rhinweis klein">{m.selbst && !m.raster ? 'Selbsteinschätzung liegt vor, im Raster neben deiner sehen.' : m.raster ? `Für diesen Monat gibt es eine Raster-Einschätzung${m.selbst ? ' und eine Selbsteinschätzung' : ''}.` : `Nur ${m.n} Smiley${m.n === 1 ? '' : 's'}, zu wenig für eine Note.`}
              <a class="knopf {m.raster || m.selbst ? 'leise' : 'haupt'}" href="/muendlich/{kurs.id}?monat={m.k}&s={s.id}">{m.raster || m.selbst ? 'Raster öffnen' : 'Mit Raster einschätzen'}</a></div>
          {/if}
          <ul class="le eingerueckt">
            {#each eintraege.filter((e) => e.zeit.startsWith(m.k)) as e}
              <li><Smiley stufe={e.stufe} groesse={24} /><span class="raum">{[...e.bausteine, e.kommentar].filter(Boolean).join(', ') || 'nur Smiley'}</span><span class="leise klein">{datumWt(e.zeit)}</span></li>
            {/each}
          </ul>
        {/if}
      {/each}
      <div class="legende klein leise">{#each STUFEN as st}<span><i style:background="var(--leo-mitv-{st.stufe})"></i>{st.name}</span>{/each}<span>↗ besser · ↘ schlechter</span></div>
      {#if haeufig.length}
        <p class="klein leise">Häufigste Bausteine</p>
        <div class="chips">{#each haeufig as [t, n]}<span class="chip {chipArt(t)}">{t} <b>{n}×</b></span>{/each}</div>
      {/if}
    </section>

    <section class="karte notizen">
      <h2>Notizen</h2>
      {#if aufrufe.length}<p class="klein leise">Zufall: {aufrufe.length} Aufrufe, zuletzt {datumKurz(aufrufe.at(-1)!.zeit)}</p>{/if}
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
  .kacheln { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; margin: 12px 0; }
  .kz { border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); padding: 10px 12px; background: var(--leo-flaeche-leise); display: flex; flex-direction: column; gap: 4px; text-align: left; position: relative; }
  .kz:hover { border-color: var(--leo-akzent); }
  .kz[aria-expanded='true'] { border: 2px solid var(--leo-akzent); background: var(--leo-akzent-hell); padding: 9px 11px; }
  .kz b { font-size: 22px; font-weight: 750; }
  .kz b.ber { font-weight: 600; color: var(--leo-berechnet); }
  .detail { border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); padding: 12px; margin-bottom: 12px; }
  .zeilen div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--leo-linie-fein); gap: 12px; }
  .warn { color: var(--leo-warnung) !important; }
  .abstand { margin-top: 10px; }
  .graph { width: 100%; height: auto; margin-bottom: 8px; }
  .linie { fill: none; stroke: var(--leo-akzent); stroke-width: 2.5; }
  .punkt { fill: var(--leo-karte); stroke: var(--leo-akzent); stroke-width: 2.5; }
  .grenze { stroke: var(--leo-warnung); stroke-dasharray: 4 4; opacity: .5; }
  .wert { font-size: 11px; font-weight: 700; fill: var(--leo-tinte); }
  .achse { font-size: 10px; fill: var(--leo-leise); }
  .quote { position: relative; height: 10px; background: var(--leo-taste); border-radius: 99px; margin: 6px 0 22px; }
  .qv { height: 100%; border-radius: 99px; background: var(--leo-akzent); }
  .qv.hoch { background: var(--leo-warnung); }
  .mark { position: absolute; top: 12px; transform: translateX(-50%); font-size: 10px; color: var(--leo-leise); border-left: 1px solid var(--leo-leise); padding-left: 3px; }
  .umschalter { display: inline-flex; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-pill); overflow: hidden; }
  .umschalter button { border: 0; background: var(--leo-karte); padding: 0 12px; min-height: 32px; color: var(--leo-leise); font-size: 12px; }
  .umschalter button[aria-pressed='true'] { background: var(--leo-akzent); color: var(--leo-auf-akzent); font-weight: 600; }
  .wt { display: flex; gap: 8px; align-items: flex-end; height: 110px; }
  .wts { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; justify-content: flex-end; height: 100%; }
  .wtb { width: 100%; background: #c9d9da; border-radius: 6px 6px 0 0; }
  .wtb.max { background: var(--leo-akzent); }
  .muster { background: var(--leo-stern-hell); border: 1px solid #ecd28a; border-radius: var(--leo-r-m); padding: 10px 12px; margin-top: 12px; }
  .fl, .le { list-style: none; padding: 0; margin: 0; }
  .fl li { display: flex; gap: 12px; align-items: center; padding: 6px 0; border-top: 1px dashed var(--leo-linie); }
  .fl li:first-child { border-top: 0; }
  .mz { display: flex; align-items: center; gap: 10px; margin: 4px 0; width: 100%; background: none; border: 0; padding: 4px 0; border-radius: var(--leo-r-s); }
  .mz:hover, .mz[aria-expanded='true'] { background: var(--leo-flaeche-leise); }
  .mn { width: 34px; font-size: 13px; text-align: left; }
  .mb { flex: 1; display: flex; height: 20px; border-radius: 5px; overflow: hidden; gap: 2px; }
  .mzahl { width: 64px; text-align: right; }
  .mz .trend { width: 22px; font-size: 18px; }
  .tinte { color: var(--leo-tinte); }
  .eingerueckt { margin: 0 0 8px 44px; }
  .legende { display: flex; gap: 12px; flex-wrap: wrap; margin: 8px 0; }
  .legende i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; align-items: flex-start; }
  .le li { display: flex; gap: 10px; align-items: center; padding: 6px 0; border-top: 1px dashed var(--leo-linie); }
  .notizen { grid-column: 1 / -1; }
  .neu { margin: 12px 0; align-items: flex-start; }
  .nraster { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  .notiz { border-top: 1px solid var(--leo-linie); padding-top: 6px; }
  .notiz p { margin: 4px 0; }
  .x { border: 0; background: none; color: var(--leo-leise); font-size: 18px; min-width: 36px; min-height: 36px; }
  section p.klein.leise { margin: 14px 0 6px; }
  @media (max-width: 900px) { .seite { grid-template-columns: 1fr; padding: 12px 16px 40px; } .kopf { padding: 12px 16px 0; } }
  .adresse { margin: 8px 0 4px; }
  .adresse input { min-height: 38px; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); padding: 6px 10px; background: var(--leo-karte); min-width: 0; }
  .gold { color: #8a6200; font-weight: 600; }
  .nachliste { list-style: none; padding: 8px 12px; margin: 10px 0 0; border: 1px solid var(--leo-stern); background: var(--leo-stern-hell); border-radius: var(--leo-r-m); }
  .nachliste li { display: flex; gap: 10px; align-items: center; padding: 4px 0; flex-wrap: wrap; }
  .nachliste a { font-weight: 600; }
  .rmarke { font-size: var(--leo-text-xs); background: var(--leo-akzent-hell); color: var(--leo-akzent); font-weight: 600; border-radius: var(--leo-r-pill); padding: 1px 6px; }
  .rhinweis { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: var(--leo-stern-hell); border-radius: var(--leo-r-m); padding: 8px 10px; margin: 4px 0; }
</style>
