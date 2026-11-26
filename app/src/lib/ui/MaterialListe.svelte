<script lang="ts">
  // Dateiablage je Stunde (V14): Liste mit Öffnen, Hinzufügen (Datei oder Link) und aufklappenden Aktionen. Keine Dialoge.
  import { app, speichern, zeige, abgleich, dateiAblegen, dateiStand, materialOeffnen, neueId } from '$lib/speicher.svelte';
  import { kennzeichen, groesseText, titelAusName, titelAusLink, linkAus, alsGezeigt, kopieFuer, ortText, MAX_DATEI } from '$lib/material';
  import { datumKurz, datumWt, heuteISO } from '$lib/hilfen';
  import type { Kurs, Material } from '$lib/typen';
  import { untrack } from 'svelte';

  let {
    kurs,
    eintraege,
    ziel,
    live = false,
    ortZeigen = true,
    leer = 'Noch kein Material.',
    offen = false,
    ohneNeu = false
  }: {
    kurs: Kurs;
    eintraege: Material[];
    ziel: { ort: Material['ort']; reiheId?: string; datum?: string }; // wohin Neues kommt
    live?: boolean; // Live-Stunde: Öffnen merkt „gezeigt“
    ortZeigen?: boolean;
    leer?: string;
    offen?: boolean; // Hinzufügen gleich aufgeklappt
    ohneNeu?: boolean; // nur ansehen (Suche über alles)
  } = $props();

  const d = app.d!;
  const heute = heuteISO();
  let neu = $state(untrack(() => offen));
  let linkText = $state('');
  let linkTitel = $state('');
  let ziehen = $state(false);
  let laedt = $state(false);
  let aktion = $state<string | null>(null); // id des Materials mit offenen Aktionen
  let kopieZiel = $state('');
  let dateiFeld = $state<HTMLInputElement>();

  // Wo liegt der Inhalt? Für „nur auf diesem Gerät“ / „auf einem anderen Gerät“
  let stand = $state<Record<string, 'hier' | 'oben' | 'fehlt'>>({});
  const dateiIds = $derived(eintraege.flatMap((m) => (m.datei ? [m.datei.id] : [])).join('|'));
  $effect(() => { const ids = dateiIds ? dateiIds.split('|') : []; dateiStand(ids).then((s) => (stand = s)).catch(() => {}); });
  const standText = (m: Material) => {
    if (!m.datei) return '';
    const s = stand[m.datei.id];
    if (s === 'fehlt') return abgleich.verbunden ? 'kommt beim Öffnen vom Server' : 'liegt auf einem anderen Gerät';
    if (s === 'hier' && !abgleich.verbunden) return 'nur auf diesem Gerät';
    return '';
  };

  function anlegen(m: Omit<Material, 'id' | 'kursId' | 'erstellt' | 'ort'>) {
    const x: Material = { id: 'm' + neueId(), kursId: kurs.id, ort: ziel.ort, ...(ziel.reiheId ? { reiheId: ziel.reiheId } : {}), ...(ziel.datum ? { datum: ziel.datum } : {}), erstellt: new Date().toISOString(), ...m };
    d.material.push(x);
    return x;
  }

  async function dateienDazu(liste: FileList | File[] | null | undefined) {
    const fs = [...(liste ?? [])];
    if (!fs.length) return;
    laedt = true;
    let n = 0;
    try {
      for (const f of fs) {
        if (f.size > MAX_DATEI) { zeige(`${f.name}: größer als 15 MB, lieber als Link ablegen`); continue; }
        try {
          const datei = await dateiAblegen(f);
          anlegen({ titel: titelAusName(f.name), art: 'datei', datei });
          n++;
        } catch (e) { zeige((e as Error).message); }
      }
    } finally { laedt = false; }
    if (n) { speichern(); zeige(n === 1 ? 'Datei abgelegt' : `${n} Dateien abgelegt`); }
  }
  function linkDazu(e: Event) {
    e.preventDefault();
    const url = linkAus(linkText);
    if (!url) { zeige('Das ist kein gültiger Link (https://…)'); return; }
    anlegen({ titel: linkTitel.trim() || titelAusLink(url), art: 'link', url });
    linkText = linkTitel = '';
    speichern();
    zeige('Link abgelegt');
  }
  function fallen(e: DragEvent) {
    e.preventDefault();
    ziehen = false;
    const fs = e.dataTransfer?.files;
    if (fs?.length) { dateienDazu(fs); return; }
    const t = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain');
    if (t && linkAus(t)) { linkText = t; neu = true; }
  }

  async function oeffnen(m: Material, herunter = false) {
    const ok = await materialOeffnen(m, herunter);
    if (ok && live && alsGezeigt(m, heute)) speichern();
    if (ok && m.datei) stand = { ...stand, ...(await dateiStand([m.datei.id]).catch(() => ({}))) }; // ggf. eben vom Server geholt
  }
  function entfernen(m: Material) {
    const i = d.material.indexOf(m);
    if (i < 0) return;
    d.material.splice(i, 1);
    aktion = null;
    speichern();
    zeige(`„${m.titel}“ entfernt`, () => { d.material.splice(Math.min(i, d.material.length), 0, m); speichern(); });
  }
  function kopieren(m: Material) {
    const k = d.kurse.find((x) => x.id === kopieZiel);
    if (!k) return;
    d.material.push(kopieFuer(m, k, 'm' + neueId(), m.reiheId));
    speichern();
    zeige(`In ${k.name} kopiert`);
    kopieZiel = '';
  }
  function anKlasse(m: Material) {
    m.ort = 'klasse'; delete m.reiheId; delete m.datum;
    speichern();
    zeige('Liegt jetzt bei der Klasse');
  }
  const andereKlassen = $derived(d.kurse.filter((k) => k.id !== kurs.id));
</script>

<div class="ablage" class:ziehen role="group" aria-label="Material"
  ondragover={(e) => { e.preventDefault(); ziehen = true; }} ondragleave={() => (ziehen = false)} ondrop={fallen}>
  {#if eintraege.length}
    <ul class="liste">
      {#each eintraege as m (m.id)}
        {@const st = standText(m)}
        <li>
          <button class="oeffnen" onclick={() => oeffnen(m)} title={m.art === 'link' ? m.url : m.datei?.name}>
            <span class="kennz">{kennzeichen(m)}</span>
            <span class="titel">{m.titel || m.datei?.name || m.url}</span>
            <span class="klein leise meta">
              {#if m.loesung}<b>Lösung</b>{/if}
              {#if ortZeigen}<span>{ortText(m, kurs, datumKurz)}</span>{/if}
              {#if m.datei}<span class="zahl">{groesseText(m.datei.groesse)}</span>{/if}
              {#if st}<span>{st}</span>{/if}
              {#if m.gezeigt?.length}<span>✓ gezeigt {m.gezeigt.includes(heute) ? 'heute' : datumKurz(m.gezeigt[m.gezeigt.length - 1])}</span>{/if}
            </span>
          </button>
          <button class="knopf leise mini" aria-expanded={aktion === m.id} aria-label="Aktionen für {m.titel}" onclick={() => (aktion = aktion === m.id ? null : m.id)}>…</button>
          {#if aktion === m.id}
            <div class="aktionen">
              <label class="feld"><span>Titel</span><input class="eingabe" bind:value={m.titel} oninput={speichern} /></label>
              <div class="zeile wrap">
                <button class="pille" aria-pressed={!!m.loesung} onclick={() => { m.loesung = !m.loesung || undefined; speichern(); }}>Lösung (nur für mich)</button>
                {#if m.datei}<button class="pille" onclick={() => oeffnen(m, true)}>herunterladen</button>{/if}
                {#if m.ort !== 'klasse'}<button class="pille" onclick={() => anKlasse(m)}>zur Klasse legen</button>{/if}
                {#if andereKlassen.length}
                  <select class="eingabe" bind:value={kopieZiel} aria-label="In andere Klasse kopieren">
                    <option value="">kopieren in …</option>
                    {#each andereKlassen as k}<option value={k.id}>{k.name}</option>{/each}
                  </select>
                  {#if kopieZiel}<button class="pille" onclick={() => kopieren(m)}>kopieren</button>{/if}
                {/if}
                <button class="pille" onclick={() => entfernen(m)}>entfernen</button>
              </div>
              {#if m.gezeigt?.length}<p class="klein leise">Gezeigt: {m.gezeigt.map(datumWt).join(', ')}</p>{/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="klein leise">{leer}</p>
  {/if}

  {#if neu && !ohneNeu}
    <div class="neu">
      <div class="zeile wrap">
        <button class="knopf" onclick={() => dateiFeld?.click()} disabled={laedt}>{laedt ? 'wird abgelegt …' : 'Datei wählen'}</button>
        <span class="klein leise">oder hierher ziehen · bis 15 MB · keine Schülerarbeiten oder Schülerdaten</span>
      </div>
      <input type="file" multiple hidden bind:this={dateiFeld} onchange={(e) => { dateienDazu(e.currentTarget.files); e.currentTarget.value = ''; }} />
      <form class="link" onsubmit={linkDazu}>
        <input class="eingabe" inputmode="url" autocapitalize="none" spellcheck="false" placeholder="Link einfügen (IServ, Moodle, YouTube …)" bind:value={linkText} aria-label="Link" />
        <input class="eingabe" placeholder="Titel (optional)" bind:value={linkTitel} aria-label="Titel des Links" />
        <button class="knopf" disabled={!linkText.trim()}>Link ablegen</button>
      </form>
    </div>
  {/if}
  {#if !ohneNeu}<button class="pille dazu" aria-expanded={neu} onclick={() => (neu = !neu)}>{neu ? 'fertig' : '+ Datei oder Link'}</button>{/if}
</div>

<style>
  .ablage { display: flex; flex-direction: column; gap: 8px; border-radius: var(--leo-r-s); }
  .ablage.ziehen { outline: 2px dashed var(--leo-akzent); outline-offset: 4px; }
  .liste { list-style: none; padding: 0; margin: 0; display: grid; gap: 2px; }
  .liste li { display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; }
  .oeffnen { display: grid; grid-template-columns: auto 1fr; column-gap: 8px; align-items: center; text-align: left; border: 0; background: none; padding: 6px 4px; border-radius: var(--leo-r-s); color: inherit; font: inherit; cursor: pointer; min-height: 44px; }
  .oeffnen:hover { background: var(--leo-auswahl); }
  .oeffnen .kennz { grid-row: 1 / span 2; min-width: 48px; }
  .titel { font-weight: 600; overflow-wrap: anywhere; }
  .meta { display: flex; flex-wrap: wrap; gap: 0 8px; }
  .meta b { font-weight: 600; color: var(--leo-tinte); }
  .mini { min-height: 32px; min-width: 32px; padding: 0 8px; }
  .aktionen { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px; padding: 8px 4px 12px 60px; border-bottom: 1px dashed var(--leo-linie); }
  .aktionen select { min-height: 32px; }
  .neu { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px dashed var(--leo-linie); border-radius: var(--leo-r-s); }
  .link { display: grid; grid-template-columns: 2fr 1fr auto; gap: 8px; }
  .dazu { align-self: flex-start; }
  @media (max-width: 700px) {
    .link { grid-template-columns: 1fr; }
    .aktionen { padding-left: 4px; }
  }
</style>
