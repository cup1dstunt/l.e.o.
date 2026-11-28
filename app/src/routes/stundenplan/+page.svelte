<script lang="ts">
  import { istAn } from '$lib/module';
  import { app } from '$lib/speicher.svelte';
  import { minuten, WOCHENTAGE } from '$lib/hilfen';
  import type { Stunde } from '$lib/typen';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { eintraege as kalEintraege, amTag } from '$lib/kalender';
  import { bezugstag, wochenVersatz, tagesStand } from '$lib/wochenplan';

  // Stundenplan als Woche (Raster) oder als Tag (Liste), Entwurf A + B vom 19.11.2026.
  // Seit 28.11.2026 (E125): Kalender ist ein eigener Reiter; nach Schulschluss zeigt der Plan den nächsten Unterrichtstag.
  const d = app.d!;
  const MERK = 'leo-stundenplan-ansicht';
  const kalenderAn = $derived(istAn(d.einstellungen, 'kalender'));
  let ansicht = $state<'woche' | 'tag'>('woche');
  try {
    const m = localStorage.getItem(MERK);
    if (m === 'tag' || (!m && innerWidth < 700)) ansicht = 'tag';
  } catch { /* egal */ }
  const wunsch = page.url.searchParams.get('ansicht');
  // Alte Links auf die Monatsansicht führen in den Kalender
  if (wunsch === 'monat') goto('/kalender', { replaceState: true });
  if (wunsch === 'woche' || wunsch === 'tag') ansicht = wunsch;
  $effect(() => { try { localStorage.setItem(MERK, ansicht); } catch { /* egal */ } });

  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const montagVon = (x: Date) => { const m = new Date(x); m.setHours(12, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };

  let jetzt = $state(new Date());
  $effect(() => { const t = setInterval(() => (jetzt = new Date()), 30_000); return () => clearInterval(t); });
  const heute = $derived(iso(jetzt));
  const minJetzt = $derived(jetzt.getHours() * 60 + jetzt.getMinutes());

  // Bezugstag: heute, solange heute noch Unterricht kommt, sonst der nächste Unterrichtstag
  const start = bezugstag(d.stundenplan, new Date());
  const wtVon = (iso: string) => ((new Date(iso + 'T12:00').getDay() + 6) % 7) + 1;
  let woche = $state(wochenVersatz(new Date(), start.datum)); // Versatz in Wochen
  const montag = $derived(new Date(montagVon(jetzt).getTime() + woche * 7 * 864e5));
  const tage = $derived(WOCHENTAGE.map((w, i) => { const t = new Date(montag.getTime() + i * 864e5); return { nr: i + 1, w, datum: iso(t), kurz: t.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) }; }));
  const kw = $derived.by(() => {
    const t = new Date(montag); t.setDate(t.getDate() + 3);
    const j = new Date(t.getFullYear(), 0, 4);
    return 1 + Math.round(((t.getTime() - j.getTime()) / 864e5 - 3 + ((j.getDay() + 6) % 7)) / 7);
  });

  let tag = $state(Math.min(5, wtVon(start.datum)));

  const zeiten = $derived([...new Set(d.stundenplan.map((s) => s.beginn))].sort((a, b) => minuten(a) - minuten(b)));
  const kurs = (id: string) => d.kurse.find((k) => k.id === id);
  const ausfaelle = $derived(new Set(d.einstellungen.untis?.ausfaelle ?? []));

  const stand = (t: { nr: number; datum: string }) => tagesStand(eintraege(t).map((s) => ({ ...s, ausfall: s.zustand === 'ausfall' })), t.datum, jetzt);
  // Entwurf 28.11.2026: drei Konzepte für den Zeitverlauf im Wochenplan, umschaltbar (Konstantin wählt eins)
  const KONZEPTE = [{ nr: 1, name: 'Kacheln verblassen' }, { nr: 2, name: 'Schleier über den Tag' }, { nr: 3, name: 'Leiste neben dem Tag' }] as const;
  let konzept = $state(1);
  try { const k = Number(page.url.searchParams.get('konzept') || localStorage.getItem('leo-wochenplan-konzept')); if (k >= 1 && k <= 3) konzept = k; } catch { /* egal */ }
  $effect(() => { try { localStorage.setItem('leo-wochenplan-konzept', String(konzept)); } catch { /* egal */ } });
  // Wie weit der heutige Tag im Raster ist (0–100 % der Zeilen), Zeilen gleich hoch gedacht:
  // innerhalb einer Zeile linear von ihrem Beginn bis zum Beginn der nächsten (letzte Zeile: bis Ende der letzten Stunde)
  const tagEnde = $derived(Math.max(0, ...d.stundenplan.map((s) => minuten(s.ende))));
  const rasterPos = $derived.by(() => {
    const n = zeiten.length;
    if (!n) return 0;
    for (let i = n - 1; i >= 0; i--) {
      const a = minuten(zeiten[i]);
      if (minJetzt < a) continue;
      const b = i + 1 < n ? minuten(zeiten[i + 1]) : tagEnde;
      return Math.min(100, ((i + Math.min(1, (minJetzt - a) / Math.max(1, b - a))) / n) * 100);
    }
    return 0;
  });
  const heuteSpalte = $derived(tage.findIndex((t) => t.datum === heute));
  const uhrJetzt = $derived(`${String(jetzt.getHours()).padStart(2, '0')}:${String(jetzt.getMinutes()).padStart(2, '0')}`);
  const LANG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  const terminLink = (e: { href?: string; datum: string }, datum: string) => e.href ?? (kalenderAn ? `/kalender?tag=${datum}` : undefined);

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
  const standTag = $derived(stand(tagWahl));
  const summe = $derived(tage.flatMap((t) => eintraege(t)));
  const fortschritt = (s: Eintrag) => Math.min(100, ((minJetzt - minuten(s.beginn)) / (minuten(s.ende) - minuten(s.beginn))) * 100);

  // „Heute“ führt zum Bezugstag (nach Schulschluss der nächste Unterrichtstag)
  const amBezug = $derived(woche === wochenVersatz(jetzt, start.datum) && (ansicht === 'woche' || tagWahl.datum === start.datum));
  function zuHeute() { woche = wochenVersatz(new Date(), start.datum); tag = Math.min(5, wtVon(start.datum)); }
  const startText = new Date(start.datum + 'T12:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
</script>

<div class="seite">
  <div class="zeile wrap kopf">
    <h1>Stundenplan</h1>
    <div class="zeile wrap" role="group" aria-label="Ansicht">
      <button class="pille" aria-pressed={ansicht === 'woche'} onclick={() => (ansicht = 'woche')}>Woche</button>
      <button class="pille" aria-pressed={ansicht === 'tag'} onclick={() => (ansicht = 'tag')}>Tag</button>
      {#if kalenderAn}<a class="pille nurgross" href="/kalender">Kalender ›</a>{/if}
    </div>
  </div>

  {#if start.versetzt && amBezug}
    <p class="hinweisbox klein">Heute ist kein Unterricht mehr. Du siehst den nächsten Unterrichtstag: <b>{startText}</b></p>
  {/if}

  <div class="zeile wrap">
    <button class="knopf leise" onclick={() => woche--} aria-label="Vorige Woche">‹</button>
    <b class="zahl">KW {kw} · {tage[0].kurz} bis {tage[4].kurz}</b>
    <button class="knopf leise" onclick={() => woche++} aria-label="Nächste Woche">›</button>
    {#if !amBezug}<button class="knopf leise" onclick={zuHeute}>{start.versetzt ? 'Nächster Unterrichtstag' : 'Heute'}</button>{/if}
  </div>

  {#if !d.stundenplan.length}
    <section class="karte"><p>Noch kein Stundenplan. Unter <a href="/mehr/webuntis">Mehr › WebUntis</a> abgleichen.</p></section>
  {:else if ansicht === 'woche'}
    <div class="konzepte zeile wrap" role="group" aria-label="Entwurf: Zeitverlauf">
      <span class="klein leise">Entwurf Zeitverlauf:</span>
      {#each KONZEPTE as k}<button class="pille" aria-pressed={konzept === k.nr} onclick={() => (konzept = k.nr)}>{k.nr} · {k.name}</button>{/each}
    </div>
    <div class="rasterbox">
      <div class="raster" style:grid-template-rows="auto repeat({zeiten.length}, minmax(74px, auto))">
        <div style:grid-area="1 / 1"></div>
        {#each tage as t}
          {@const st = stand(t)}
          <div class="tagkopf" class:heute={t.datum === heute} style:grid-area="1 / {t.nr + 1}">
            <button class="tagknopf" onclick={() => { tag = t.nr; ansicht = 'tag'; }} title="{LANG[t.nr - 1]} als Tagesansicht öffnen">
              <span class="wtag">{LANG[t.nr - 1]}</span>
              <span class="datum zahl">{t.kurz}</span>
            </button>
            {#if st.zustand !== 'frei' && !(t.datum === heute && konzept !== 1)}
              <span class="tagbalken {st.zustand}" title={st.text} role="progressbar" aria-label="Tagesverlauf {LANG[t.nr - 1]}" aria-valuenow={st.prozent} aria-valuemin={0} aria-valuemax={100}><span style:width="{st.prozent}%"></span></span>
            {/if}
            {#if t.datum === heute && st.zustand !== 'frei'}<span class="klein tagtext">{st.text}</span>{/if}
            {#each amTag(termineWoche, t.datum) as e (e.art + e.id)}
              {@const ziel = terminLink(e, t.datum)}
              <svelte:element this={ziel ? 'a' : 'span'} href={ziel} class="termin {e.art}" class:ufrei={e.frei} class:fremd={e.termin?.fremd} title="{e.titel}{e.klasse ? ' · ' + e.klasse : ''}">
                <span class="ttitel">{e.beginn ? e.beginn + ' ' : ''}{e.titel}</span>{#if e.klasse}<span class="tklasse">{e.klasse}</span>{/if}
              </svelte:element>
            {/each}
          </div>
        {/each}
        {#each zeiten as z, zi}
          <div class="zeit zahl klein leise" style:grid-area="{zi + 2} / 1">{z}</div>
          {#each tage as t}
            {@const s = eintraege(t).find((x) => x.beginn === z)}
            {#if s}
              {@const k = kurs(s.kursId)!}
              <a class="st {s.zustand} k{konzept}" href={s.zustand === 'ausfall' ? undefined : `/stunde/${k.id}`} style:grid-area="{zi + 2} / {t.nr + 1}" style:--p="{s.zustand === 'jetzt' ? fortschritt(s) : 0}%">
                <b>{k.klasse}</b><span>{k.fach}</span>
                <span class="klein leise">{s.beginn}–{s.ende}{k.raum ? ` · ${k.raum}` : ''}</span>
                {#if s.zustand === 'ausfall'}<span class="klein hinweis">Ausfall</span>{/if}
                {#if s.zustand === 'jetzt' && konzept === 1}<span class="klein bis">noch {minuten(s.ende) - minJetzt} Min.</span>{/if}
              </a>
            {:else}
              <div class="zelle" class:heute={t.datum === heute} style:grid-area="{zi + 2} / {t.nr + 1}"></div>
            {/if}
          {/each}
        {/each}
        {#if heuteSpalte >= 0 && zeiten.length && konzept === 2}
          <!-- Konzept 2: ein Schleier legt sich von oben über den Tag, an der Kante die Uhrzeit -->
          <div class="ueber" style:grid-area="2 / {heuteSpalte + 2} / span {zeiten.length} / span 1" aria-hidden="true">
            <div class="schleier" style:height="{rasterPos}%">{#if rasterPos > 0 && rasterPos < 100}<span class="jetztmarke zahl">{uhrJetzt}</span>{/if}</div>
          </div>
        {/if}
        {#if heuteSpalte >= 0 && zeiten.length && konzept === 3}
          <!-- Konzept 3: eine Leiste neben dem heutigen Tag füllt sich von oben, ein Punkt zeigt jetzt -->
          <div class="ueber" style:grid-area="2 / {heuteSpalte + 2} / span {zeiten.length} / span 1" aria-hidden="true">
            <div class="leiste"><span style:height="{rasterPos}%"></span>{#if rasterPos > 0 && rasterPos < 100}<i style:top="{rasterPos}%" title={uhrJetzt}></i>{/if}</div>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="tagwahl">
      {#each tage as t}
        <button class="pille" class:heute={t.datum === heute} aria-pressed={t.nr === tag} onclick={() => (tag = t.nr)} title={t.datum === heute ? 'heute' : undefined}>{t.w} {t.kurz.slice(0, 3)}</button>
      {/each}
    </div>
    <div class="liste">
        <div class="tagzeile">
          <span><b class="wtag-gross">{LANG[tagWahl.nr - 1]}</b> <span class="zahl datum-gross">{tagWahl.kurz}</span>{#if tagWahl.datum === heute} <span class="klein marke">heute</span>{/if}</span>
          {#if standTag.zustand !== 'frei'}
            <span class="tagbalken gross {standTag.zustand}" role="progressbar" aria-label="Tagesverlauf" aria-valuenow={standTag.prozent} aria-valuemin={0} aria-valuemax={100}><span style:width="{standTag.prozent}%"></span></span>
            <span class="klein leise">{standTag.text}</span>
          {/if}
        </div>
      {#each amTag(termineWoche, tagWahl.datum) as e (e.art + e.id)}
        <a class="termin gross {e.art}" class:ufrei={e.frei} class:fremd={e.termin?.fremd} href={terminLink(e, tagWahl.datum)}>{e.beginn ? e.beginn + ' · ' : 'ganztägig · '}{e.titel}{e.klasse ? ` · ${e.klasse}` : ''}{e.frei ? ' · unterrichtsfrei' : ''}</a>
      {/each}
      {#each tagListe as s, i}
        {@const k = kurs(s.kursId)!}
        {@const vor = tagListe[i - 1]}
        {#if vor && minuten(s.beginn) - minuten(vor.ende) > 30}<div class="frei klein leise">Frei {vor.ende}–{s.beginn}</div>{/if}
        <a class="st stk {s.zustand}" href={s.zustand === 'ausfall' ? undefined : `/stunde/${k.id}`}>
          <span class="uhr zahl">{s.beginn}<br /><span class="klein leise">{s.ende}</span></span>
          <span class="mitte">
            <b>{k.klasse}</b> {k.fach}<br />
            <span class="klein leise">{k.raum ? `Raum ${k.raum} · ` : ''}Schüler ({k.schueler.length}){s.zustand === 'jetzt' ? ' · läuft gerade' : ''}</span>
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

  <p class="klein leise">
    {summe.filter((s) => s.zustand !== 'ausfall').length} Stunden diese Woche{summe.some((s) => s.zustand === 'ausfall') ? `, ${summe.filter((s) => s.zustand === 'ausfall').length} Ausfall` : ''}.
    Quelle: {d.einstellungen.untis ? `WebUntis, abgeglichen ${new Date(d.einstellungen.untis.abgerufen).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} (Wochenmuster, Ausfälle bis zum Abgleich)` : 'Beispieldaten'}.
  </p>
</div>

<style>
  .seite { padding: 24px 32px 40px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
  @media (max-width: 720px) { .seite { padding: 16px; } }
  .kopf { justify-content: space-between; }
  .wrap { flex-wrap: wrap; }
  .tagwahl { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; max-width: 620px; }
  .tagwahl .pille { justify-content: center; padding: 0 6px; }
  @media (max-width: 720px) { .nurgross { display: none; } }
  .pille.heute:not([aria-pressed='true']) { border-color: var(--leo-akzent); color: var(--leo-akzent); }
  .rasterbox { overflow-x: auto; }
  .raster { display: grid; grid-template-columns: 56px repeat(5, minmax(130px, 1fr)); gap: 6px; min-width: 720px; }
  .tagkopf { display: flex; flex-direction: column; gap: 4px; padding: 6px 8px 8px; border-radius: var(--leo-r-m); min-width: 0; }
  .tagkopf.heute { background: var(--leo-akzent-hell); }
  .tagknopf { font: inherit; text-align: left; padding: 2px 4px; margin: -2px -4px 0; border: 0; border-radius: 6px; background: transparent; color: var(--leo-tinte); cursor: pointer; display: flex; flex-direction: column; }
  .tagknopf:hover .wtag, .tagknopf:focus-visible .wtag { text-decoration: underline; text-underline-offset: 3px; }
  .wtag { font-size: 15px; font-weight: 650; }
  .datum { font-size: 20px; font-weight: 650; line-height: 1.15; }
  .heute .tagknopf { color: var(--leo-akzent); }
  .tagtext { color: var(--leo-akzent); font-weight: 600; }
  .tagbalken { display: block; height: 6px; border-radius: 9px; background: var(--leo-linie-fein); overflow: hidden; }
  .tagbalken span { display: block; height: 100%; background: var(--leo-akzent); border-radius: 9px; transition: width .6s ease; }
  .tagbalken.vorbei span { background: var(--leo-leise); opacity: .45; }
  .heute .tagbalken { background: color-mix(in srgb, var(--leo-akzent) 18%, var(--leo-karte)); }
  .tagbalken.gross { height: 8px; flex: 1; min-width: 140px; }
  .tagzeile { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .wtag-gross { font-size: 20px; font-weight: 650; }
  .datum-gross { font-size: 20px; color: var(--leo-leise); }
  .marke { color: var(--leo-akzent); font-weight: 650; margin-left: 6px; }
  .hinweisbox { margin: 0; padding: 10px 14px; border-radius: var(--leo-r-m); background: var(--leo-akzent-hell); color: var(--leo-tinte); }
  .zeit { padding-top: 8px; }
  a.pille { text-decoration: none; }
  .termin { display: flex; flex-direction: column; }
  .ttitel { overflow: hidden; text-overflow: ellipsis; }
  .tklasse { font-size: 11px; font-weight: 650; color: var(--leo-leise); overflow: hidden; text-overflow: ellipsis; }
  .termin.gross { display: block; }
  .termin.gross .tklasse { display: inline; font-size: inherit; }
  .termin.gross .tklasse::before { content: ' · '; }
  .termin.fremd { border-left-style: dashed; background: transparent; border: 1px dashed var(--leo-linie); border-left: 3px dashed var(--leo-leise); }
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
  .st { position: relative; overflow: hidden; }
  .bis { margin-top: 4px; font-weight: 600; }
  /* Konzept 1: die laufende Kachel verblasst von links nach rechts, so weit die Stunde um ist */
  .st.jetzt.k1::after { content: ''; position: absolute; inset: 0 auto 0 0; width: var(--p); background: color-mix(in srgb, var(--leo-papier) 55%, transparent); transition: width .6s ease; pointer-events: none; }
  .st.jetzt.k1::before { content: ''; position: absolute; top: 0; bottom: 0; left: var(--p); width: 2px; background: var(--leo-auf-akzent); opacity: .9; z-index: 1; }
  /* Konzept 3: die laufende Kachel füllt sich von oben mit Petrol */
  .st.jetzt.k3 { background: var(--leo-akzent-hell); color: var(--leo-tinte); border-color: var(--leo-akzent); }
  .st.jetzt.k3 .leise { color: var(--leo-leise); opacity: 1; }
  .st.jetzt.k3::after { content: ''; position: absolute; inset: 0 0 auto 0; height: var(--p); background: color-mix(in srgb, var(--leo-akzent) 30%, transparent); transition: height .6s ease; pointer-events: none; }
  .ueber { position: relative; pointer-events: none; z-index: 2; }
  /* Konzept 2 */
  .schleier { position: absolute; left: -3px; right: -3px; top: 0; background: color-mix(in srgb, var(--leo-papier) 58%, transparent); border-bottom: 2px solid var(--leo-akzent); border-radius: var(--leo-r-m) var(--leo-r-m) 0 0; transition: height .6s ease; }
  .jetztmarke { position: absolute; right: 0; bottom: -11px; font-size: 11px; font-weight: 700; color: var(--leo-auf-akzent); background: var(--leo-akzent); border-radius: 9px; padding: 1px 7px; }
  /* Konzept 3 */
  .leiste { position: absolute; left: -6px; top: 0; bottom: 0; width: 4px; border-radius: 9px; background: color-mix(in srgb, var(--leo-akzent) 15%, transparent); }
  .leiste span { position: absolute; left: 0; right: 0; top: 0; border-radius: 9px; background: var(--leo-akzent); transition: height .6s ease; }
  .leiste i { position: absolute; left: -4px; width: 12px; height: 12px; margin-top: -6px; border-radius: 50%; background: var(--leo-akzent); box-shadow: 0 0 0 3px var(--leo-karte); }
  .konzepte { gap: 6px; }
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
