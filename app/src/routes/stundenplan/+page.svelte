<script lang="ts">
  import { app } from '$lib/speicher.svelte';
  import { minuten, WOCHENTAGE } from '$lib/hilfen';
  import type { Stunde } from '$lib/typen';
  import { page } from '$app/state';
  import { eintraege as kalEintraege, amTag } from '$lib/kalender';
  import KalenderMonat from '$lib/ui/KalenderMonat.svelte';

  // Stundenplan als Woche (Raster) oder als Tag (Liste), Entwurf A + B vom 19.11.2026.
  const d = app.d!;
  const MERK = 'leo-stundenplan-ansicht';
  // Monat = Kalender (E115), nur wenn das Modul an ist
  const kalenderAn = $derived(d.einstellungen.module?.kalender !== false);
  let ansicht = $state<'woche' | 'tag' | 'monat'>('woche');
  try {
    const m = localStorage.getItem(MERK);
    if (m === 'tag' || m === 'monat' || (!m && innerWidth < 700)) ansicht = (m as 'tag' | 'monat') || 'tag';
  } catch { /* egal */ }
  const wunsch = page.url.searchParams.get('ansicht');
  if (wunsch === 'monat' || wunsch === 'woche' || wunsch === 'tag') ansicht = wunsch;
  $effect(() => { if (ansicht === 'monat' && !kalenderAn) ansicht = 'woche'; });
  $effect(() => { try { localStorage.setItem(MERK, ansicht); } catch { /* egal */ } });

  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const montagVon = (x: Date) => { const m = new Date(x); m.setHours(12, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };

  let jetzt = $state(new Date());
  $effect(() => { const t = setInterval(() => (jetzt = new Date()), 30_000); return () => clearInterval(t); });
  const heute = $derived(iso(jetzt));
  const minJetzt = $derived(jetzt.getHours() * 60 + jetzt.getMinutes());

  let woche = $state(0); // Versatz in Wochen
  const montag = $derived(new Date(montagVon(jetzt).getTime() + woche * 7 * 864e5));
  const tage = $derived(WOCHENTAGE.map((w, i) => { const t = new Date(montag.getTime() + i * 864e5); return { nr: i + 1, w, datum: iso(t), kurz: t.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) }; }));
  const kw = $derived.by(() => {
    const t = new Date(montag); t.setDate(t.getDate() + 3);
    const j = new Date(t.getFullYear(), 0, 4);
    return 1 + Math.round(((t.getTime() - j.getTime()) / 864e5 - 3 + ((j.getDay() + 6) % 7)) / 7);
  });

  let tag = $state(Math.min(5, Math.max(1, new Date().getDay() || 1)));

  const zeiten = $derived([...new Set(d.stundenplan.map((s) => s.beginn))].sort((a, b) => minuten(a) - minuten(b)));
  const kurs = (id: string) => d.kurse.find((k) => k.id === id);
  const ausfaelle = $derived(new Set(d.einstellungen.untis?.ausfaelle ?? []));

  type Eintrag = Stunde & { datum: string; zustand: '' | 'jetzt' | 'vorbei' | 'ausfall' };
  function eintraege(t: { nr: number; datum: string }): Eintrag[] {
    return d.stundenplan
      .filter((s) => s.tag === t.nr && kurs(s.kursId))
      .sort((a, b) => minuten(a.beginn) - minuten(b.beginn))
      .map((s) => {
        const ausfall = ausfaelle.has(`${s.kursId}|${t.datum}|${s.beginn}`);
        const lauf = t.datum === heute && minuten(s.beginn) <= minJetzt && minJetzt < minuten(s.ende);
        const vorbei = t.datum < heute || (t.datum === heute && minuten(s.ende) <= minJetzt);
        return { ...s, datum: t.datum, zustand: ausfall ? 'ausfall' : lauf ? 'jetzt' : vorbei ? 'vorbei' : '' };
      });
  }
  const termineWoche = $derived(kalenderAn ? kalEintraege(d, tage[0].datum, tage[4].datum) : []);
  const tagWahl = $derived(tage[tag - 1]);
  const tagListe = $derived(eintraege(tagWahl));
  const summe = $derived(tage.flatMap((t) => eintraege(t)));
  const fortschritt = (s: Eintrag) => Math.min(100, ((minJetzt - minuten(s.beginn)) / (minuten(s.ende) - minuten(s.beginn))) * 100);

  function zuHeute() { woche = 0; tag = Math.min(5, Math.max(1, new Date().getDay() || 1)); }
</script>

<div class="seite">
  <div class="zeile wrap kopf">
    <h1>Stundenplan</h1>
    <div class="zeile wrap" role="group" aria-label="Ansicht">
      <button class="pille" aria-pressed={ansicht === 'woche'} onclick={() => (ansicht = 'woche')}>Woche</button>
      <button class="pille" aria-pressed={ansicht === 'tag'} onclick={() => (ansicht = 'tag')}>Tag</button>
      {#if kalenderAn}<button class="pille" aria-pressed={ansicht === 'monat'} onclick={() => (ansicht = 'monat')}>Monat</button>{/if}
    </div>
  </div>

  {#if ansicht === 'monat'}
    <KalenderMonat />
  {:else}
  <div class="zeile wrap">
    <button class="knopf leise" onclick={() => woche--} aria-label="Vorige Woche">‹</button>
    <b class="zahl">KW {kw} · {tage[0].kurz} bis {tage[4].kurz}</b>
    <button class="knopf leise" onclick={() => woche++} aria-label="Nächste Woche">›</button>
    {#if woche !== 0 || (ansicht === 'tag' && tagWahl.datum !== heute)}<button class="knopf leise" onclick={zuHeute}>Heute</button>{/if}
  </div>

  {#if !d.stundenplan.length}
    <section class="karte"><p>Noch kein Stundenplan. Unter <a href="/mehr/webuntis">Mehr › WebUntis</a> abgleichen.</p></section>
  {:else if ansicht === 'woche'}
    <div class="rasterbox">
      <div class="raster" style:grid-template-rows="auto repeat({zeiten.length}, minmax(74px, auto))">
        <div></div>
        {#each tage as t}
          <button class="tagkopf" class:heute={t.datum === heute} onclick={() => { tag = t.nr; ansicht = 'tag'; }} title="Tagesansicht">{t.w} {t.kurz}
            {#each amTag(termineWoche, t.datum) as e (e.art + e.id)}<span class="termin {e.art}" class:ufrei={e.frei}>{e.beginn ? e.beginn + ' ' : ''}{e.titel}</span>{/each}
          </button>
        {/each}
        {#each zeiten as z}
          <div class="zeit zahl klein leise">{z}</div>
          {#each tage as t}
            {@const s = eintraege(t).find((x) => x.beginn === z)}
            {#if s}
              {@const k = kurs(s.kursId)!}
              <a class="st {s.zustand}" href={s.zustand === 'ausfall' ? undefined : `/stunde/${k.id}`}>
                <b>{k.klasse}</b><span>{k.fach}</span>
                <span class="klein leise">{s.beginn}–{s.ende}{k.raum ? ` · ${k.raum}` : ''}</span>
                {#if s.zustand === 'ausfall'}<span class="klein hinweis">Ausfall</span>{/if}
                {#if s.zustand === 'jetzt'}<span class="mini-balken"><span style:width="{fortschritt(s)}%"></span></span>{/if}
              </a>
            {:else}
              <div class="zelle" class:heute={t.datum === heute}></div>
            {/if}
          {/each}
        {/each}
      </div>
    </div>
  {:else}
    <div class="zeile wrap">
      {#each tage as t}
        <button class="pille" class:heute={t.datum === heute} aria-pressed={t.nr === tag} onclick={() => (tag = t.nr)} title={t.datum === heute ? 'heute' : undefined}>{t.w} {t.kurz.slice(0, 3)}</button>
      {/each}
    </div>
    <div class="liste">
      {#each amTag(termineWoche, tagWahl.datum) as e (e.art + e.id)}
        <a class="termin gross {e.art}" class:ufrei={e.frei} href={e.href ?? '/stundenplan?ansicht=monat'}>{e.beginn ? e.beginn + ' · ' : 'ganztägig · '}{e.titel}{e.klasse ? ` · ${e.klasse}` : ''}{e.frei ? ' · unterrichtsfrei' : ''}</a>
      {/each}
      {#each tagListe as s, i}
        {@const k = kurs(s.kursId)!}
        {@const vor = tagListe[i - 1]}
        {#if vor && minuten(s.beginn) - minuten(vor.ende) > 30}<div class="frei klein leise">Frei {vor.ende}–{s.beginn}</div>{/if}
        <a class="st stk {s.zustand}" href={s.zustand === 'ausfall' ? undefined : `/stunde/${k.id}`}>
          <span class="uhr zahl">{s.beginn}<br /><span class="klein leise">{s.ende}</span></span>
          <span class="mitte">
            <b>{k.klasse}</b> {k.fach}<br />
            <span class="klein leise">{k.raum ? `Raum ${k.raum} · ` : ''}{k.schueler.length} Schüler{s.zustand === 'jetzt' ? ' · läuft gerade' : ''}</span>
            {#if s.zustand === 'ausfall'}<br /><span class="klein hinweis">Ausfall laut WebUntis</span>{/if}
            {#if s.zustand === 'jetzt'}<span class="mini-balken"><span style:width="{fortschritt(s)}%"></span></span>{/if}
          </span>
          <span class="klein leise">{s.zustand === 'ausfall' ? '' : 'öffnen ›'}</span>
        </a>
      {:else}
        <section class="karte"><p class="leise">An diesem Tag keine Stunden.</p></section>
      {/each}
    </div>
  {/if}

  {/if}

  {#if ansicht !== 'monat'}
  <p class="klein leise">
    {summe.filter((s) => s.zustand !== 'ausfall').length} Stunden diese Woche{summe.some((s) => s.zustand === 'ausfall') ? `, ${summe.filter((s) => s.zustand === 'ausfall').length} Ausfall` : ''}.
    Quelle: {d.einstellungen.untis ? `WebUntis, abgeglichen ${new Date(d.einstellungen.untis.abgerufen).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} (Wochenmuster, Ausfälle bis zum Abgleich)` : 'Beispieldaten'}.
  </p>
  {/if}
</div>

<style>
  .seite { padding: 24px 32px 40px; display: grid; gap: 14px; }
  @media (max-width: 720px) { .seite { padding: 16px; } }
  .kopf { justify-content: space-between; }
  .pille.heute:not([aria-pressed='true']) { border-color: var(--leo-akzent); color: var(--leo-akzent); }
  .rasterbox { overflow-x: auto; }
  .raster { display: grid; grid-template-columns: 56px repeat(5, minmax(130px, 1fr)); gap: 6px; min-width: 720px; }
  .tagkopf { font: inherit; font-size: 13px; font-weight: 600; text-align: left; padding: 6px 10px; border-radius: 8px; border: 0; background: transparent; color: var(--leo-tinte); cursor: pointer; }
  .tagkopf.heute { background: var(--leo-akzent-hell); color: var(--leo-akzent); }
  .zeit { padding-top: 8px; }
  .tagkopf { display: flex; flex-direction: column; gap: 3px; }
  .termin { font-size: 11.5px; font-weight: 500; padding: 1px 6px; border-radius: 4px; background: var(--leo-taste); border-left: 3px solid var(--leo-leise); color: var(--leo-tinte); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-decoration: none; }
  .termin.klausur { background: var(--leo-stern-hell); border-color: var(--leo-stern); }
  .termin.ferien { border-color: var(--leo-linie); color: var(--leo-leise); }
  .termin.ufrei { border-color: var(--leo-warnung); }
  .termin.gross { font-size: 14px; padding: 8px 12px; border-radius: var(--leo-r-m); }
  .zelle { border-radius: var(--leo-r-m); border: 1px dashed var(--leo-linie-fein); }
  .zelle.heute { background: color-mix(in srgb, var(--leo-akzent-hell) 45%, transparent); }
  .st { border-radius: var(--leo-r-m); border: 1px solid var(--leo-linie); background: var(--leo-karte); color: var(--leo-tinte); text-decoration: none; padding: 8px 10px; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .st b { font-weight: 650; }
  .st.jetzt { background: var(--leo-akzent); border-color: var(--leo-akzent); color: var(--leo-auf-akzent); }
  .st.jetzt .leise { color: var(--leo-auf-akzent); opacity: .8; }
  .st.vorbei { opacity: .6; }
  .st.ausfall { background: transparent; border-style: dashed; color: var(--leo-leise); cursor: default; }
  .st.ausfall b { text-decoration: line-through; }
  .hinweis { color: var(--leo-warnung); font-weight: 600; }
  .mini-balken { height: 4px; border-radius: 9px; background: rgba(255,255,255,.3); margin-top: 6px; overflow: hidden; display: block; }
  .mini-balken span { display: block; height: 100%; background: var(--leo-auf-akzent); }
  .liste { display: grid; gap: 8px; max-width: 620px; }
  .stk { display: grid; grid-template-columns: 56px 1fr auto; gap: 12px; align-items: center; padding: 12px 14px; }
  .uhr { font-weight: 600; }
  .mitte { min-width: 0; }
  .frei { padding: 4px 14px; border-left: 2px dotted var(--leo-linie); margin-left: 34px; }
</style>
