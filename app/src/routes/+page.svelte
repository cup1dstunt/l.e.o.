<script lang="ts">
  import { app } from '$lib/speicher.svelte';
  import { stundenHeute, datumKurz, name, minuten, heuteISO } from '$lib/hilfen';
  import { sitzung } from '$lib/sitzung.svelte';
  import { zellSchluessel, rechne, warnungen } from '$lib/rechnen';
  import Zeitbalken from '$lib/ui/Zeitbalken.svelte';
  import { onMount } from 'svelte';

  const d = app.d!;
  let jetzt = $state(new Date());
  onMount(() => {
    const t = setInterval(() => (jetzt = new Date()), 30_000);
    return () => clearInterval(t);
  });
  const plan = $derived(stundenHeute(d, jetzt));
  const kurs = (id: string) => d.kurse.find((k) => k.id === id)!;
  const haupt = $derived(plan.laeuft ?? plan.naechste);

  // Frühwarnliste (I37): unter der Grenze oder auf der Kippe, über alle Kurse
  const frueh = $derived(
    d.kurse.flatMap((k) => k.schueler.map((sid) => {
      const w = warnungen(k, rechne(k, sid)).filter((x) => x.art !== 'wenig');
      const s = d.schueler.find((x) => x.id === sid)!;
      return w.length ? { s, k, w } : null;
    })).filter((x) => x !== null)
  );

  const hISO = heuteISO();
  const heuteMitarbeit = $derived(d.mitarbeit.filter((e) => e.zeit.slice(0, 10) === hISO).length);
  const heuteFehlt = $derived(d.fehlzeiten.filter((f) => f.datum === hISO).length);
  const heuteZuSpaet = $derived(d.verspaetungen.filter((v) => v.datum === hISO).length);

  // Offene Punkte: Nachschreiben (E bei Klausuren, I44) und offene Monatsnoten
  const offen = $derived.by(() => {
    const liste: { text: string; href: string }[] = [];
    for (const k of d.kurse) {
      let e = 0;
      for (const l of k.leistungen.filter((l) => l.gruppe === 'klausuren'))
        for (const s of k.schueler) if (k.zellen[zellSchluessel(l.id, s)]?.status === 'E') e++;
      if (e) liste.push({ text: `${k.name}: ${e} × Nachschreiben offen`, href: `/kurs/${k.id}` });
      const monat = jetzt.toISOString().slice(0, 7);
      const ml = k.leistungen.find((l) => l.monat === monat);
      if (ml && k.schueler.some((s) => k.zellen[zellSchluessel(ml.id, s)]?.wert === undefined))
        liste.push({ text: `${k.name}: Monatsnote ${ml.name} noch offen`, href: `/kurs/${k.id}?monatsnote=1` });
    }
    return liste;
  });
</script>

<header class="kopf">
  <h1>Heute</h1>
  <span class="leise">{jetzt.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })} · {plan.heute.length} {plan.heute.length === 1 ? 'Stunde' : 'Stunden'}</span>
  <span class="raum"></span>
  <button class="pille" onclick={() => (sitzung.suche = true)}>Suchen <b>Strg K</b></button>
  <button class="pille" onclick={() => (sitzung.entsperrt = false)}>Sperren</button>
</header>

<div class="seite">
  {#if plan.heute.length}
    <nav class="leiste" aria-label="Stunden heute">
      {#each plan.heute as s}
        {@const k = kurs(s.kursId)}
        {@const vorbei = minuten(s.ende) <= plan.min}
        <a href="/stunde/{k.id}" class="stunde" class:jetzt={s === plan.laeuft} class:vorbei>
          <span class="zahl klein">{s.beginn}{s === plan.laeuft ? ' · läuft' : vorbei ? ' · ✓' : ''}</span>
          <b>{k.fach} {k.klasse}</b>
          {#if s === plan.laeuft}<span class="mini-balken"><span style:width="{Math.min(100, ((plan.min - minuten(s.beginn)) / (minuten(s.ende) - minuten(s.beginn))) * 100)}%"></span></span>{/if}
        </a>
      {/each}
    </nav>
  {/if}

  <div class="raster">
    {#if haupt}
      {@const k = kurs(haupt.kursId)}
      <section class="karte laeuft" class:aktiv={!!plan.laeuft}>
        <div class="oben">
          <span class="marke">{plan.laeuft ? 'Läuft gerade' : `Als Nächstes${'tagText' in haupt && haupt.tagText ? ' · ' + haupt.tagText : ''}`}</span>
          <span class="leise">Raum {k.raum} · {k.schueler.length} Schüler</span>
        </div>
        <h2 class="kursname">{k.name}</h2>
        {#if plan.laeuft}
          <Zeitbalken beginn={haupt.beginn} ende={haupt.ende} jetzt={plan.min} />
        {:else}
          <p class="leise zahl">{haupt.beginn} bis {haupt.ende}</p>
        {/if}
        {#if k.uebergang}
          <div class="uebergang"><span class="klein leise">Übergang aus der letzten Stunde ({datumKurz(k.uebergang.datum)})</span><p>{k.uebergang.text}</p></div>
        {/if}
        <div class="knoepfe">
          <a class="knopf haupt" href="/stunde/{k.id}">Stunde öffnen</a>
          <a class="knopf" href="/stunde/{k.id}?mitarbeit=1">Mitarbeit/Anwesenheit</a>
          <a class="knopf" href="/kurs/{k.id}?neu=1">+ Leistung</a>
          <a class="knopf leise" href="/kurs/{k.id}">Noten</a>
        </div>
        {#if !plan.laeuft}<p class="klein leise">Zum Testen kannst du jede Stunde jederzeit öffnen.</p>{/if}
      </section>
    {/if}

    <section class="karte">
      <h2>Heute erfasst</h2>
      <div class="zahlen">
        <div><b class="zahl">{heuteMitarbeit}</b><span class="klein leise">Mitarbeit-Einträge</span></div>
        <div><b class="zahl">{heuteFehlt}</b><span class="klein leise">fehlen</span></div>
        <div><b class="zahl">{heuteZuSpaet}</b><span class="klein leise">verspätet</span></div>
      </div>
    </section>

    <section class="karte">
      <h2>Offen</h2>
      {#if offen.length === 0}<p class="leise">Nichts offen.</p>{/if}
      <ul class="liste">
        {#each offen as o}<li><a href={o.href}>{o.text}</a></li>{/each}
      </ul>
    </section>

    <section class="karte">
      <h2>Frühwarnung</h2>
      {#if frueh.length === 0}<p class="leise">Niemand unter der Grenze oder auf der Kippe.</p>{/if}
      <ul class="liste">
        {#each frueh as f}
          <li><a href="/schueler/{f.s.id}?kurs={f.k.id}">{name(f.s)}</a><span class="klein {f.w[0].art === 'unter' ? 'rot' : 'gold'}">{f.w.map((x) => x.text).join(', ')}</span><span class="klein leise mini2">{f.k.klasse}</span></li>
        {/each}
      </ul>
    </section>

    <section class="karte platzhalter">
      <h2>Kalender</h2>
      <p class="leise">Folgt später (V9, E76). Hier erscheinen Klausurtermine und Termine der Schule.</p>
    </section>
  </div>
</div>

<style>
  .kopf { background: var(--leo-karte); border-bottom: 1px solid var(--leo-linie); padding: 14px 32px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .kopf h1 { font-size: 20px; }
  .seite { padding: 20px 32px 40px; max-width: 1500px; }
  .leiste { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(170px, 1fr); gap: 12px; margin-bottom: 18px; overflow-x: auto; padding-bottom: 2px; }
  .stunde { background: var(--leo-karte); border: 1px solid var(--leo-linie); border-radius: var(--leo-r-l); padding: 12px 18px; text-decoration: none; color: var(--leo-tinte); display: flex; flex-direction: column; gap: 2px; min-height: 72px; }
  .stunde b { font-size: 16px; }
  .stunde.jetzt { background: var(--leo-akzent); border-color: var(--leo-akzent); color: var(--leo-auf-akzent); }
  .stunde.vorbei { opacity: .6; }
  .mini-balken { height: 4px; border-radius: 9px; background: rgba(255,255,255,.3); margin-top: 6px; overflow: hidden; }
  .mini-balken span { display: block; height: 100%; background: var(--leo-auf-akzent); }
  .zahlen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
  .zahlen div { display: flex; flex-direction: column; }
  .zahlen b { font-size: 26px; font-weight: 750; }
  .raster { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; align-items: start; }
  .laeuft { grid-row: span 2; display: flex; flex-direction: column; gap: 14px; padding: 22px 26px; }
  .laeuft.aktiv { border: 2px solid var(--leo-akzent); }
  .oben { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .marke { color: var(--leo-akzent); font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
  .kursname { font-size: 30px; font-weight: 750; }
  .uebergang { background: var(--leo-flaeche-leise); border: 1px solid var(--leo-linie-fein); border-radius: var(--leo-r-m); padding: 10px 14px; }
  .uebergang p { margin: 4px 0 0; }
  .knoepfe { display: flex; gap: 10px; flex-wrap: wrap; }
  .knoepfe .knopf { min-height: 48px; }
  .liste { list-style: none; padding: 0; margin: 10px 0 0; }
  .liste li { display: flex; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px dashed var(--leo-linie); }
  .liste li:first-child { border-top: 0; }
  .liste a { text-decoration: none; color: var(--leo-tinte); }
  .rot { color: var(--leo-warnung); font-weight: 600; }
  .gold { color: #8a6200; font-weight: 600; }
  .mini2 { margin-left: auto; }
  .platzhalter { border-style: dashed; background: transparent; }
  @media (max-width: 900px) { .raster { grid-template-columns: 1fr; } .laeuft { grid-row: auto; } .seite { padding: 16px; } .kopf { padding: 12px 16px; } }
</style>
