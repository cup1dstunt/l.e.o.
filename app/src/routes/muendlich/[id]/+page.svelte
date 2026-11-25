<script lang="ts">
  // Mündliche Leistungen einer Klasse (FB7, E110, Weg 2): je Monat Smileys oder Raster.
  // Hat jemand im Monat zu wenige Smileys, bietet L.E.O. das Kriterienraster an; dessen Ergebnis wird die Monatsnote.
  import { page } from '$app/state';
  import { app, speichern, zeige, neueId } from '$lib/speicher.svelte';
  import { name } from '$lib/hilfen';
  import { zellSchluessel, monatsVorschlag, zahl } from '$lib/rechnen';
  import { bausteineVon } from '$lib/bausteine';
  import {
    alleRaster, rasterFuer, mindestSmileys, rasterErgebnis, einschaetzungSchluessel, smileysImMonat, belege,
    monatsSpalte, monatsNameLang, STANDARD_MINDEST, rasterDerEinschaetzung, kriteriumAktiv
  } from '$lib/raster';
  import type { Schueler } from '$lib/typen';
  import KursKopf from '$lib/ui/KursKopf.svelte';
  import Smiley from '$lib/ui/Smiley.svelte';

  const d = app.d!;
  const kurs = $derived(d.kurse.find((k) => k.id === page.params.id)!);
  const fos = $derived(kurs?.profil === 'FOS');
  let monat = $state(page.url.searchParams.get('monat') ?? new Date().toISOString().slice(0, 7));
  const rasterKlasse = $derived(rasterFuer(d, kurs));
  const mindest = $derived(mindestSmileys(kurs));
  const bausteine = $derived(bausteineVon(d.einstellungen));
  const spalte = $derived(kurs.leistungen.find((l) => l.gruppe === 'mitarbeit' && l.monat === monat));

  const zeilen = $derived(
    kurs.schueler.map((id) => d.schueler.find((s) => s.id === id)).filter((s): s is Schueler => !!s)
      .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de'))
      .map((s) => {
        const sm = smileysImMonat(d, kurs.id, s.id, monat);
        const ein = kurs.einschaetzungen?.[einschaetzungSchluessel(monat, s.id)];
        const steht = spalte ? kurs.zellen[zellSchluessel(spalte.id, s.id)]?.wert : undefined;
        const vSmiley = monatsVorschlag(kurs.profil, sm.map((e) => e.stufe));
        return { s, n: sm.length, schnitt: vSmiley?.note ?? null, ein, steht, wenig: sm.length < mindest };
      })
  );
  const zuWenig = $derived(zeilen.filter((z) => z.wenig && !z.ein).length);
  let nurWenig = $state(false);
  const sichtbar = $derived(nurWenig ? zeilen.filter((z) => z.wenig) : zeilen);
  let gewaehlt = $state<string | null>(page.url.searchParams.get('s'));
  const akt = $derived(zeilen.find((z) => z.s.id === gewaehlt) ?? null);

  const schluessel = $derived(akt ? einschaetzungSchluessel(monat, akt.s.id) : '');
  // Eine vorhandene Einschätzung bleibt bei ihrem Raster, auch wenn die Klasse inzwischen ein anderes nutzt
  const raster = $derived(rasterDerEinschaetzung(d, kurs, akt?.ein));
  const stufen = $derived(akt?.ein?.rasterId === raster.id ? akt.ein.stufen : {});
  const erg = $derived(rasterErgebnis(raster, stufen, kurs.profil, (kr) => kriteriumAktiv(kurs, kr)));
  let wegOffen = $state(false);

  function waehle(kid: string, st: 1 | 2 | 3 | 4) {
    if (!akt) return;
    kurs.einschaetzungen ??= {};
    const alt = kurs.einschaetzungen[schluessel];
    const neu = { ...(alt?.rasterId === raster.id ? alt.stufen : {}) };
    if (neu[kid] === st) delete neu[kid]; else neu[kid] = st;
    kurs.einschaetzungen[schluessel] = { rasterId: raster.id, stufen: neu, zeit: new Date().toISOString() };
    speichern();
  }
  function verwerfen() {
    if (!akt || !kurs.einschaetzungen?.[schluessel]) return;
    const alt = kurs.einschaetzungen[schluessel];
    const k = schluessel;
    delete kurs.einschaetzungen[k];
    speichern();
    zeige('Einschätzung verworfen', () => { kurs.einschaetzungen![k] = alt; speichern(); });
  }
  function uebernehmen() {
    if (!akt || erg.note === null) return;
    const l = monatsSpalte(kurs, monat, neueId)!;
    const key = zellSchluessel(l.id, akt.s.id);
    const alt = kurs.zellen[key] ? { ...kurs.zellen[key] } : undefined;
    kurs.zellen[key] = { ...alt, wert: erg.note, status: undefined };
    speichern();
    const wer = akt.s;
    zeige(`${name(wer)}: ${l.name} = ${erg.note}`, () => { if (alt) kurs.zellen[key] = alt; else delete kurs.zellen[key]; speichern(); });
    // weiter zum Nächsten, der noch eine Einschätzung braucht
    const i = zeilen.findIndex((z) => z.s.id === wer.id);
    const next = [...zeilen.slice(i + 1), ...zeilen.slice(0, i)].find((z) => z.wenig && !z.ein && z.steht === undefined);
    if (next) gewaehlt = next.s.id;
  }
  function zusatzUmschalten(kid: string) {
    const z = new Set(kurs.muendlich?.zusatz ?? []);
    if (z.has(kid)) z.delete(kid); else z.add(kid);
    kurs.muendlich = { rasterId: rasterKlasse.id, mindestSmileys: mindest, zusatz: [...z] };
    speichern();
  }
  function rasterSetzen(id: string) {
    kurs.muendlich = { ...kurs.muendlich, rasterId: id, mindestSmileys: mindest };
    if (akt?.ein && akt.ein.rasterId !== id) zeige('Vorhandene Einschätzungen behalten ihr bisheriges Raster');
    speichern();
  }
  function mindestSetzen(n: number) {
    kurs.muendlich = { ...kurs.muendlich, rasterId: rasterKlasse.id, mindestSmileys: n };
    speichern();
  }
  const STUFE_NAME = ['', 'Stufe 1', 'Stufe 2', 'Stufe 3', 'Stufe 4'];
  const anzeige = (w: number | undefined | null) => (w === undefined || w === null ? '–' : fos ? String(w) : zahl(w));
</script>

<svelte:head><title>{kurs?.name} · Mündlich</title></svelte:head>

{#if kurs}
  <KursKopf {kurs} aktiv="muendlich" info="Mündliche Leistungen · {monatsNameLang(monat)}">
    {#snippet rechts()}
      <label class="feld klein-feld"><span>Monat</span><input type="month" bind:value={monat} /></label>
    {/snippet}
  </KursKopf>

  <div class="seite">
    <section class="karte einst">
      <div class="zeile wrap">
        <label class="feld raum"><span>Raster dieser Klasse</span>
          <select value={rasterKlasse.id} onchange={(e) => rasterSetzen((e.currentTarget as HTMLSelectElement).value)}>
            {#each alleRaster(d) as r (r.id)}<option value={r.id}>{r.name}{r.fach ? ` · ${r.fach}` : ''}{r.vorlage ? ' (Vorlage)' : ''}</option>{/each}
          </select>
        </label>
        <div class="feld"><span>Raster anbieten bei weniger als</span>
          <div class="zeile">{#each [2, 3, 4, 5] as n}<button class="pille" aria-pressed={mindest === n} onclick={() => mindestSetzen(n)}>{n}</button>{/each}<span class="klein leise">Smileys</span></div>
        </div>
        <a class="knopf leise" href="/mehr/muendlich">Raster und Bausteine bearbeiten</a>
      </div>
      <p class="klein leise">Die Monatsnote kommt aus den Smileys. Wer in {monatsNameLang(monat)} weniger als {mindest} hat, bekommt hier das Raster angeboten; du kannst es aber für alle nutzen. Standard: {STANDARD_MINDEST}.</p>
    </section>

    <div class="haupt">
      <section class="karte liste">
        <div class="zeile"><h2 class="raum">Schüler</h2><button class="pille" aria-pressed={nurWenig} onclick={() => (nurWenig = !nurWenig)}>Zu wenige Smileys <b>{zuWenig}</b></button></div>
        <ul>
          {#each sichtbar as z (z.s.id)}
            <li>
              <button class="sz" aria-current={gewaehlt === z.s.id} onclick={() => (gewaehlt = z.s.id)}>
                <span class="raum"><b>{name(z.s)}</b>
                  <span class="klein leise block">{z.n} Smiley{z.n === 1 ? '' : 's'}{z.schnitt !== null ? ` · Ø ${zahl(z.schnitt)}` : ''}</span></span>
                {#if z.ein}<span class="marke raster">Raster</span>{:else if z.wenig}<span class="marke wenig">zu wenig</span>{/if}
                <b class="zahl note">{anzeige(z.steht)}</b>
              </button>
            </li>
          {/each}
        </ul>
        <p class="klein leise">Rechts: die eingetragene Monatsnote {spalte ? `(Spalte ${spalte.name})` : '(Spalte entsteht beim ersten Übernehmen)'}.</p>
      </section>

      <section class="karte raster">
        {#if !akt}
          <p class="leise">Wähle links einen Schüler. Mit „Zu wenige Smileys“ siehst du nur die, für die das Raster gedacht ist.</p>
        {:else}
          {@const sm = smileysImMonat(d, kurs.id, akt.s.id, monat)}
          <div class="zeile wrap"><h2 class="raum">{name(akt.s)} · {raster.name}</h2>{#if raster.id !== rasterKlasse.id}<span class="klein leise">(eingeschätzt mit diesem Raster)</span>{/if}
            {#if sm.length}<span class="smileys">{#each sm.slice(0, 8) as e (e.id)}<Smiley stufe={e.stufe} groesse={20} />{/each}{#if sm.length > 8}<span class="klein leise">+{sm.length - 8}</span>{/if}</span>{/if}
          </div>
          {#each raster.bereiche as b (b.name)}
            <h3>{b.name} <span class="leise">· Gewicht {zahl(b.gewicht)}</span></h3>
            {#each b.kriterien as kr (kr.id)}
              {@const bl = belege(d, bausteine, kurs.id, akt.s.id, monat, kr)}
              {@const an = kriteriumAktiv(kurs, kr)}
              <div class="krit" class:aus={!an}>
                <div class="kname"><b>{kr.name}</b>{#if kr.optional}<button class="pille mini" aria-pressed={an} onclick={() => zusatzUmschalten(kr.id)}>{an ? 'eingeschaltet' : 'einschalten'}</button>{/if}{#if bl.length && an}<span class="klein leise block">{bl.join(' · ')}</span>{/if}</div>
                <div class="stufen" role="group" aria-label={kr.name}>
                  {#each [4, 3, 2, 1] as st, i}
                    <button class="stufe" disabled={!an} aria-pressed={an && stufen[kr.id] === st} title={STUFE_NAME[st]} onclick={() => waehle(kr.id, st as 1 | 2 | 3 | 4)}>
                      <b>{st}</b> <span>{kr.stufen[i]}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/each}
          {/each}
        {/if}
      </section>

      {#if akt}
        <aside class="karte vorschlag">
          <h2>Vorschlag</h2>
          <div class="gross zahl">{anzeige(erg.note)}</div>
          <p class="klein leise">{erg.offen ? `${erg.offen} Kriterien noch offen, sie zählen nicht mit.` : 'Alle Kriterien eingeschätzt.'}</p>
          <button class="knopf leise klein" aria-expanded={wegOffen} onclick={() => (wegOffen = !wegOffen)}>{wegOffen ? '▾' : '▸'} Rechenweg</button>
          {#if wegOffen}<ol class="weg klein zahl">{#each erg.weg as w}<li>{w}</li>{/each}</ol>{/if}
          <button class="knopf haupt" disabled={erg.note === null} onclick={uebernehmen}>Als Monatsnote übernehmen</button>
          {#if akt.steht !== undefined}<p class="klein leise">Steht schon: {anzeige(akt.steht)}{akt.schnitt !== null ? ` · aus Smileys wäre es ${anzeige(monatsVorschlag(kurs.profil, smileysImMonat(d, kurs.id, akt.s.id, monat).map((e) => e.stufe))?.wert)}` : ''}</p>{/if}
          {#if akt.ein}<button class="knopf leise" onclick={verwerfen}>Einschätzung verwerfen</button>{/if}
          <p class="klein leise">Selbsteinschätzung der Schüler per Link kommt in einem nächsten Schritt.</p>
        </aside>
      {/if}
    </div>
  </div>
{/if}

<style>
  .seite { padding: 20px 32px; display: flex; flex-direction: column; gap: 16px; }
  .wrap { flex-wrap: wrap; align-items: flex-end; }
  .einst p { margin: 10px 0 0; }
  .klein-feld input { min-height: 34px; }
  .haupt { display: grid; grid-template-columns: 280px 1fr 260px; gap: 16px; align-items: start; }
  .liste ul { list-style: none; margin: 8px 0; padding: 0; }
  .sz { width: 100%; display: flex; align-items: center; gap: 8px; text-align: left; padding: 8px; min-height: 44px; border-radius: var(--leo-r-m); border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
  .sz[aria-current='true'] { background: var(--leo-auswahl); }
  .block { display: block; }
  .note { min-width: 26px; text-align: right; }
  .marke { font-size: var(--leo-text-xs); border-radius: var(--leo-r-pill); padding: 2px 8px; }
  .marke.raster { background: var(--leo-akzent-hell); color: var(--leo-akzent); font-weight: 600; }
  .marke.wenig { background: var(--leo-stern-hell); color: var(--leo-stern); font-weight: 600; }
  h3 { font-size: var(--leo-text-s); color: var(--leo-leise); text-transform: uppercase; letter-spacing: .04em; margin: 16px 0 4px; }
  .krit { display: grid; grid-template-columns: 150px 1fr; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--leo-linie-fein); }
  .stufen { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .stufe { text-align: left; border: 1px solid var(--leo-linie); background: var(--leo-taste); border-radius: var(--leo-r-s); padding: 6px 8px; min-height: 44px; font: inherit; font-size: var(--leo-text-s); color: var(--leo-tinte); cursor: pointer; line-height: 1.3; }
  .stufe[aria-pressed='true'] { background: var(--leo-akzent); border-color: var(--leo-akzent); color: var(--leo-auf-akzent); }
  .krit.aus .stufen { opacity: .4; }
  .stufe:disabled { cursor: default; }
  .mini { min-height: 26px; padding: 0 10px; font-size: var(--leo-text-xs); margin-left: 8px; }
  .smileys { display: inline-flex; gap: 2px; align-items: center; }
  .vorschlag { display: flex; flex-direction: column; gap: 10px; position: sticky; top: 120px; }
  .vorschlag .knopf { white-space: normal; display: block; width: 100%; text-align: center; height: auto; min-height: 44px; padding-block: 8px; line-height: 1.25; }
  .liste .pille { white-space: nowrap; }
  .gross { font-size: 40px; font-weight: 700; line-height: 1; }
  .weg { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
  .vorschlag p { margin: 0; }
  @media (max-width: 1100px) { .haupt { grid-template-columns: 240px 1fr; } .vorschlag { grid-column: 1 / -1; position: static; } }
  @media (max-width: 720px) {
    .seite { padding: 16px; }
    .haupt { grid-template-columns: 1fr; }
    .krit { grid-template-columns: 1fr; }
    .stufen { grid-template-columns: repeat(2, 1fr); }
  }
</style>
