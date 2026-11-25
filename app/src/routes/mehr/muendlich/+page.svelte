<script lang="ts">
  // Mündliche Leistungen einrichten (E110): eigene Textbausteine mit Kriterium, eigene Kriterienraster je Fach.
  import { app, speichern, zeige, neueId } from '$lib/speicher.svelte';
  import { BAUSTEINE, STUFEN, bausteineVon } from '$lib/bausteine';
  import { VORLAGEN, alleRaster, rasterKopie, MAX_KRITERIEN } from '$lib/raster';
  import type { Raster, Stufe } from '$lib/typen';

  const d = app.d!;

  // ---------- Bausteine ----------
  const liste = $derived(bausteineVon(d.einstellungen));
  const kriterienNamen = $derived([...new Set(alleRaster(d).flatMap((r) => r.bereiche.flatMap((b) => b.kriterien.map((k) => k.name))))].sort((a, b) => a.localeCompare(b, 'de')));
  /** Beim ersten Ändern den Startsatz übernehmen, damit eigene Bausteine gespeichert werden. */
  function eigene() {
    d.einstellungen.bausteine ??= BAUSTEINE.map((b) => ({ ...b }));
    return d.einstellungen.bausteine;
  }
  function aendern(i: number, feld: 'text' | 'stufe' | 'kriterium', wert: string) {
    const b = eigene()[i];
    if (feld === 'stufe') b.stufe = Number(wert) as Stufe;
    else if (feld === 'kriterium') { if (wert) b.kriterium = wert; else delete b.kriterium; }
    else b.text = wert;
    speichern();
  }
  let neuText = $state('');
  let neuStufe = $state<Stufe>(3);
  let neuKrit = $state('');
  function hinzu() {
    const t = neuText.trim();
    if (!t) return;
    if (liste.some((b) => b.text === t)) { zeige('Diesen Baustein gibt es schon'); return; }
    eigene().push({ text: t, stufe: neuStufe, ...(neuKrit ? { kriterium: neuKrit } : {}) });
    neuText = '';
    speichern();
  }
  function weg(i: number) {
    const l = eigene();
    const [alt] = l.splice(i, 1);
    speichern();
    zeige(`„${alt.text}“ entfernt`, () => { l.splice(i, 0, alt); speichern(); });
  }
  function startsatz() {
    const alt = d.einstellungen.bausteine;
    delete d.einstellungen.bausteine;
    speichern();
    zeige('Startsatz wiederhergestellt', () => { d.einstellungen.bausteine = alt; speichern(); });
  }

  // ---------- Raster ----------
  let offen = $state<string | null>(null);
  function kopieren(r: Raster) {
    d.einstellungen.raster ??= [];
    const k = rasterKopie(r, neueId());
    d.einstellungen.raster.unshift(k);
    offen = k.id;
    speichern();
    zeige(`„${k.name}“ angelegt, jetzt anpassen`);
  }
  function rasterWeg(r: Raster) {
    const l = d.einstellungen.raster!;
    const i = l.indexOf(r);
    l.splice(i, 1);
    speichern();
    zeige(`„${r.name}“ gelöscht`, () => { l.splice(i, 0, r); speichern(); });
  }
  const anzahl = (r: Raster) => r.bereiche.reduce((a, b) => a + b.kriterien.filter((k) => !k.optional).length, 0);
  function kriteriumHinzu(r: Raster, bi: number) {
    r.bereiche[bi].kriterien.push({ id: neueId(), name: 'Neues Kriterium', stufen: ['', '', '', ''] });
    speichern();
  }
  function bereichHinzu(r: Raster) {
    r.bereiche.push({ name: 'Neuer Bereich', gewicht: 1, kriterien: [] }); // gewicht nur aus Kompatibilität (E113)
    speichern();
  }
  const verwendet = (r: Raster) => d.kurse.filter((k) => k.muendlich?.rasterId === r.id).map((k) => k.name);
</script>

<svelte:head><title>Mündliche Leistungen einrichten</title></svelte:head>

<div class="seite">
  <a class="klein leise" href="/mehr">← Mehr</a>
  <h1>Mündliche Leistungen einrichten</h1>

  <section class="karte">
    <div class="zeile"><h2 class="raum">Textbausteine</h2>{#if d.einstellungen.bausteine}<button class="knopf leise" onclick={startsatz}>Startsatz wiederherstellen</button>{/if}</div>
    <p class="klein leise">Bausteine erscheinen in der Live-Stunde beim Smiley. Mit einem Kriterium stehen sie im Raster als Beleg beim passenden Kriterium. Umbenennen ändert alte Einträge nicht.</p>
    <table>
      <thead><tr><th>Text</th><th>Stufe</th><th>Kriterium</th><th></th></tr></thead>
      <tbody>
        {#each liste as b, i (i + b.text)}
          <tr>
            <td><input class="eingabe" value={b.text} onchange={(e) => aendern(i, 'text', (e.currentTarget as HTMLInputElement).value)} aria-label="Text" /></td>
            <td><select class="eingabe" value={String(b.stufe)} onchange={(e) => aendern(i, 'stufe', (e.currentTarget as HTMLSelectElement).value)} aria-label="Stufe">
              {#each STUFEN as st}<option value={String(st.stufe)}>{st.stufe} {st.name}</option>{/each}</select></td>
            <td><select class="eingabe" value={b.kriterium ?? ''} onchange={(e) => aendern(i, 'kriterium', (e.currentTarget as HTMLSelectElement).value)} aria-label="Kriterium">
              <option value="">keins</option>{#each kriterienNamen as k}<option value={k}>{k}</option>{/each}</select></td>
            <td><button class="x" onclick={() => weg(i)} aria-label="entfernen">×</button></td>
          </tr>
        {/each}
        <tr class="neu">
          <td><input class="eingabe" placeholder="Neuer Baustein" bind:value={neuText} onkeydown={(e) => e.key === 'Enter' && hinzu()} /></td>
          <td><select class="eingabe" bind:value={neuStufe} aria-label="Stufe">{#each STUFEN as st}<option value={st.stufe}>{st.stufe} {st.name}</option>{/each}</select></td>
          <td><select class="eingabe" bind:value={neuKrit} aria-label="Kriterium"><option value="">keins</option>{#each kriterienNamen as k}<option value={k}>{k}</option>{/each}</select></td>
          <td><button class="knopf" onclick={hinzu} disabled={!neuText.trim()}>+</button></td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="karte">
    <h2>Kriterienraster</h2>
    <p class="klein leise">Jedes Fach hat eigene Kriterien. Das Gewicht hier ist der Standard; je Klasse änderst du es im Reiter „Mündlich“ mit Klick auf „Vorschlag“. Vorlagen kopierst du und passt sie an; welches Raster eine Klasse nutzt, wählst du im Reiter „Mündlich“ der Klasse. Stufentexte in Ich-Form, damit sie später auch für die Selbsteinschätzung passen.</p>
    {#each alleRaster(d) as r (r.id)}
      {@const v = verwendet(r)}
      <div class="raster">
        <div class="zeile wrap">
          <button class="knopf leise kopf raum" aria-expanded={offen === r.id} onclick={() => (offen = offen === r.id ? null : r.id)}>
            {offen === r.id ? '▾' : '▸'} <b>{r.name}</b> <span class="klein leise">{r.fach || 'fachübergreifend'} · {anzahl(r)} Kriterien{r.vorlage ? ' · Vorlage' : ''}{v.length ? ` · in ${v.join(', ')}` : ''}</span>
          </button>
          <button class="knopf leise" onclick={() => kopieren(r)}>Kopieren</button>
          {#if !r.vorlage}<button class="knopf leise warn" onclick={() => rasterWeg(r)}>Löschen</button>{/if}
        </div>
        {#if offen === r.id}
          {#if r.vorlage}
            {#each r.bereiche as b}
              <h3>{b.name}</h3>
              <ul class="klein">{#each b.kriterien as k}<li><b>{k.name}{k.optional ? ' (optional)' : ''}{(k.gewicht ?? 1) !== 1 ? ` ×${k.gewicht}` : ''}:</b> {k.stufen.join(' | ')}</li>{/each}</ul>
            {/each}
            <p class="klein leise">Vorlagen sind fest. Zum Ändern kopieren.</p>
          {:else}
            <div class="zeile wrap">
              <label class="feld raum"><span>Name</span><input bind:value={r.name} oninput={speichern} /></label>
              <label class="feld"><span>Fach (leer = fachübergreifend)</span><input bind:value={r.fach} oninput={speichern} /></label>
            </div>
            {#each r.bereiche as b, bi}
              <div class="bereich">
                <div class="zeile wrap">
                  <label class="feld raum"><span>Bereich</span><input bind:value={b.name} oninput={speichern} /></label>
                  <button class="x" onclick={() => { r.bereiche.splice(bi, 1); speichern(); }} aria-label="Bereich entfernen">×</button>
                </div>
                {#each b.kriterien as k, ki (k.id)}
                  <div class="krit">
                    <div class="zeile"><input class="eingabe raum" bind:value={k.name} oninput={speichern} aria-label="Kriterium" />
                      <label class="feld gew"><span>Gewicht</span><input type="number" min="0" max="5" step="0.5" value={k.gewicht ?? 1} oninput={(e) => { k.gewicht = Number((e.currentTarget as HTMLInputElement).value) || 0; speichern(); }} /></label>
                      <label class="klein opt"><input type="checkbox" checked={!!k.optional} onchange={(e) => { if ((e.currentTarget as HTMLInputElement).checked) k.optional = true; else delete k.optional; speichern(); }} /> optional (je Klasse zuschalten)</label><button class="x" onclick={() => { b.kriterien.splice(ki, 1); speichern(); }} aria-label="Kriterium entfernen">×</button></div>
                    <div class="stufen">
                      {#each [4, 3, 2, 1] as st, i}
                        <label class="feld"><span>Stufe {st}</span><textarea rows="2" bind:value={k.stufen[i]} oninput={speichern}></textarea></label>
                      {/each}
                    </div>
                  </div>
                {/each}
                <button class="knopf leise" disabled={anzahl(r) >= MAX_KRITERIEN} onclick={() => kriteriumHinzu(r, bi)}>+ Kriterium</button>
              </div>
            {/each}
            <button class="knopf leise" onclick={() => bereichHinzu(r)}>+ Bereich</button>
            <p class="klein leise">Höchstens {MAX_KRITERIEN} feste Kriterien, damit eine Einschätzung etwa 10 Sekunden dauert. Optionale (z. B. Hausaufgaben) zählen nicht mit.</p>
          {/if}
        {/if}
      </div>
    {/each}
    <p class="klein leise">Eingebaut: {VORLAGEN.map((r) => r.name).join(', ')}. Word- oder PDF-Raster hochladen kommt später.</p>
  </section>
</div>

<style>
  .seite { padding: 24px 32px; max-width: 980px; display: flex; flex-direction: column; gap: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: var(--leo-text-s); color: var(--leo-leise); font-weight: 600; padding: 6px 4px; }
  td { padding: 4px; vertical-align: middle; }
  td:first-child { width: 45%; }
  td .eingabe { width: 100%; box-sizing: border-box; }
  td select.eingabe { min-height: 40px; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); background: var(--leo-karte); padding: 0 8px; font: inherit; color: inherit; }
  .x { border: 0; background: none; font-size: 20px; color: var(--leo-leise); cursor: pointer; min-width: 36px; min-height: 36px; }
  .raster { border-top: 1px solid var(--leo-linie-fein); padding: 10px 0; }
  .kopf { justify-content: flex-start; text-align: left; gap: 6px; }
  .wrap { flex-wrap: wrap; align-items: flex-end; }
  .bereich { border-left: 3px solid var(--leo-akzent-hell); padding: 8px 0 8px 12px; margin: 10px 0; display: flex; flex-direction: column; gap: 8px; }
  .gew input { width: 80px; }
  .krit { background: var(--leo-flaeche-leise); border-radius: var(--leo-r-m); padding: 8px; display: flex; flex-direction: column; gap: 6px; }
  .stufen { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  h3 { font-size: var(--leo-text-s); color: var(--leo-leise); margin: 10px 0 4px; }
  ul { margin: 0; padding-left: 18px; line-height: 1.5; }
  .opt { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; color: var(--leo-leise); }
  .warn { color: var(--leo-warnung); }
  @media (max-width: 720px) { .seite { padding: 16px; } .stufen { grid-template-columns: 1fr 1fr; } td:first-child { width: auto; } }
</style>
