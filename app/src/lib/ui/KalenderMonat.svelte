<script lang="ts">
  // Kalender (K2, PB14, E115): Monat als Raster, darunter der gewählte Tag mit Einträgen und dem Formular für eigene Termine.
  // Kein Dialog: Formular klappt unter dem Tag auf. Klausuren, Tests, Nachschreiben, Ferien und Ausfälle kommen von selbst.
  import { app, speichern, zeige } from '$lib/speicher.svelte';
  import { isoDatum, heuteISO } from '$lib/hilfen';
  import { eintraege, amTag, ARTEN_TERMIN, artName, alsIcs, ausIcs, icsUebernehmen, QUELLEN, type Eintrag } from '$lib/kalender';
  import { fenster } from '$lib/iserv';
  import type { Termin, TerminArt } from '$lib/typen';
  import KalenderQuellen from './KalenderQuellen.svelte';
  import { untrack } from 'svelte';

  // `start`: Tag, der zuerst gewählt ist (z. B. aus dem Stundenplan über ?tag=)
  let { start }: { start?: string } = $props();
  const d = app.d!;
  const heute = heuteISO();
  const anfang = untrack(() => (start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : heute)); // nur der Anfangswert
  let monat = $state(new Date(+anfang.slice(0, 4), +anfang.slice(5, 7) - 1, 1));
  let gewaehlt = $state(anfang);

  const tage = $derived.by(() => {
    const erster = new Date(monat);
    const start = new Date(erster); start.setDate(1 - ((erster.getDay() + 6) % 7));
    const out: { datum: string; tag: number; imMonat: boolean; we: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const t = new Date(start); t.setDate(start.getDate() + i);
      if (i >= 35 && t.getMonth() !== erster.getMonth()) break;
      out.push({ datum: isoDatum(t), tag: t.getDate(), imMonat: t.getMonth() === erster.getMonth(), we: t.getDay() === 0 || t.getDay() === 6 });
    }
    return out;
  });
  const liste = $derived(eintraege(d, tage[0].datum, tage[tage.length - 1].datum));
  const tagListe = $derived(amTag(liste, gewaehlt));
  const titel = $derived(monat.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }));
  const blaettern = (um: number) => (monat = new Date(monat.getFullYear(), monat.getMonth() + um, 1));

  // Formular (neu oder bearbeiten). Abgeglichene Termine (IServ, WebUntis): nur Art, Klassen und „fällt aus“ änderbar.
  let form = $state<Termin | null>(null);
  const abgeglichen = $derived(form?.quelle === 'iserv' || form?.quelle === 'untis');
  let bearbeitet = $state(false);
  function neu() {
    form = { id: 't' + Date.now().toString(36), datum: gewaehlt, titel: '', art: 'konferenz', kursIds: [] };
    bearbeitet = false;
  }
  function bearbeiten(e: Eintrag) { if (e.termin) { form = $state.snapshot(e.termin) as Termin; form.kursIds ??= []; bearbeitet = true; } }
  function artWahl(a: TerminArt) {
    if (!form) return;
    form.art = a;
    if (a === 'ausfall' || a === 'frei' || a === 'ausflug') form.unterrichtFrei = true;
    else if (a === 'konferenz' || a === 'aufsicht' || a === 'sprechtag') form.unterrichtFrei = false;
  }
  function klasseUmschalten(id: string) {
    if (!form) return;
    form.kursIds = form.kursIds?.includes(id) ? form.kursIds.filter((x) => x !== id) : [...(form.kursIds ?? []), id];
  }
  function sichern() {
    if (!form) return;
    const t: Termin = { ...form, titel: form.titel.trim() || artName(form.art) };
    if (!t.beginn) { delete t.beginn; delete t.ende; }
    if (!t.bis || t.bis <= t.datum) delete t.bis;
    if (!t.kursIds?.length) delete t.kursIds;
    if (!t.unterrichtFrei) delete t.unterrichtFrei;
    if (!t.notiz?.trim()) delete t.notiz;
    if (t.quelle === 'iserv' || t.quelle === 'untis') t.angepasst = true; // bleibt beim nächsten Abgleich
    const i = d.termine.findIndex((x) => x.id === t.id);
    if (i >= 0) d.termine[i] = t; else d.termine.push(t);
    speichern();
    zeige(t.unterrichtFrei ? 'Termin gespeichert · zählt in der Semesterplanung als Ausfall' : 'Termin gespeichert');
    gewaehlt = t.datum;
    form = null;
  }
  function loeschen() {
    if (!form) return;
    const id = form.id;
    if (abgeglichen) {
      // Abgeglichene Termine kämen beim nächsten Abgleich wieder: ausblenden statt löschen
      const t = d.termine.find((x) => x.id === id);
      if (t) { t.ausgeblendet = true; t.angepasst = true; }
      speichern();
      zeige('Termin ausgeblendet', () => { const x = d.termine.find((y) => y.id === id); if (x) { x.ausgeblendet = false; speichern(); } });
      form = null;
      return;
    }
    d.termine = d.termine.filter((x) => x.id !== id);
    speichern();
    zeige('Termin entfernt');
    form = null;
  }

  // ICS: Export bis Schuljahresende, Import aus einer Datei (z. B. IServ-Kalender)
  function exportieren() {
    const von = isoDatum(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
    const bis = isoDatum(new Date(new Date().getFullYear() + 1, 7, 31));
    const blob = new Blob([alsIcs(d, von, bis)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'leo-kalender.ics';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  let datei = $state<HTMLInputElement>();
  async function importieren(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const { von, bis } = fenster();
    const n = icsUebernehmen(d, ausIcs(await f.text(), von, bis));
    speichern();
    zeige(n ? `${n} Termine aus „${f.name}“ übernommen` : 'In der Datei waren keine Termine.');
    (ev.target as HTMLInputElement).value = '';
  }
  const importiert = $derived((d.termine ?? []).filter((t) => t.quelle === 'ics').length);
  function importierteEntfernen() { d.termine = d.termine.filter((t) => t.quelle !== 'ics'); speichern(); zeige('Importierte Termine entfernt'); }
  const ausgeblendet = $derived((d.termine ?? []).filter((t) => t.ausgeblendet).length);
  function alleZeigen() { for (const t of d.termine) if (t.ausgeblendet) t.ausgeblendet = false; speichern(); zeige('Ausgeblendete Termine wieder sichtbar'); }
  function datumUebernehmen(e: Eintrag) {
    const x = e.klausurOhneDatum;
    const l = x && d.kurse.find((k) => k.id === x.kursId)?.leistungen.find((y) => y.id === x.leistungId);
    if (!l) return;
    l.datum = e.datum;
    speichern();
    zeige(`${l.name}: Datum ${new Date(e.datum + 'T12:00').toLocaleDateString('de-DE')} aus WebUntis übernommen`, () => { l.datum = undefined; speichern(); });
  }
  const herkunft = (e: Eintrag) =>
    e.quelle && e.art !== 'ferien' ? QUELLEN[e.quelle] : e.termin ? artName(e.art) : e.art === 'klausur' ? 'Klausur' : e.art === 'test' ? 'Leistung' : e.art === 'ferien' ? 'Ferien/Feiertag' : 'Nachschreiben';
  const kl = (e: Eintrag) => e.klasse!.split(', ').map((x) => x.split(' ')[0]).join(', ');
  // Prüfung einer anderen Lehrkraft: Klasse vorn, damit sie in der schmalen Zelle nicht abgeschnitten wird (E125)
  const kurz = (e: Eintrag) => e.termin?.fremd && e.klasse ? `${kl(e)}: ${e.titel.replace(' (andere Lehrkraft)', '')} (andere LK)`
    : (e.beginn ? `${e.beginn} ` : '') + e.titel + (e.klasse && e.art !== 'nachschreiben' ? ` · ${kl(e)}` : '');
</script>

<div class="zeile wrap">
  <button class="knopf leise" onclick={() => blaettern(-1)} aria-label="Voriger Monat">‹</button>
  <b class="monat">{titel}</b>
  <button class="knopf leise" onclick={() => blaettern(1)} aria-label="Nächster Monat">›</button>
  {#if monat.getMonth() !== new Date().getMonth() || gewaehlt !== heute}<button class="knopf leise" onclick={() => { monat = new Date(new Date().getFullYear(), new Date().getMonth(), 1); gewaehlt = heute; }}>Heute</button>{/if}
  <span class="raum"></span>
  <button class="pille" onclick={exportieren} title="Eigene Termine, Klausuren, Tests und Nachschreiben als .ics (ohne Schülernamen)">Als .ics exportieren</button>
  <button class="pille" onclick={() => datei?.click()} title="Kalenderdatei, z. B. aus IServ">.ics importieren</button>
  <input type="file" accept=".ics,text/calendar" hidden bind:this={datei} onchange={importieren} />
</div>

<div class="monatsraster" role="grid" aria-label="Kalender {titel}">
  {#each ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as w}<div class="wt klein leise">{w}</div>{/each}
  {#each tage as t (t.datum)}
    {@const es = amTag(liste, t.datum)}
    <button class="tag" class:aus={!t.imMonat} class:we={t.we} class:heute={t.datum === heute} class:gewaehlt={t.datum === gewaehlt}
      class:ferien={es.some((e) => e.art === 'ferien')} onclick={() => (gewaehlt = t.datum)} aria-pressed={t.datum === gewaehlt}>
      <span class="nr zahl">{t.tag}</span>
      {#each es.filter((e) => e.art !== 'ferien').slice(0, 3) as e (e.art + e.id)}
        <span class="ev {e.art}" class:frei={e.frei} class:fremd={e.termin?.fremd}>{kurz(e)}</span>
      {/each}
      {#if es.filter((e) => e.art !== 'ferien').length > 3}<span class="klein leise">+{es.filter((e) => e.art !== 'ferien').length - 3}</span>{/if}
      {#if es.some((e) => e.art === 'ferien') && t.imMonat && !t.we}<span class="klein leise fname">{es.find((e) => e.art === 'ferien')?.titel}</span>{/if}
    </button>
  {/each}
</div>

<section class="karte tagkarte">
  <div class="zeile wrap">
    <h2 class="raum">{new Date(gewaehlt + 'T12:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
    {#if !form}<button class="knopf haupt" onclick={neu}>+ Termin</button>{/if}
  </div>
  {#if !tagListe.length && !form}<p class="leise">Nichts eingetragen.</p>{/if}
  <ul class="tagliste">
    {#each tagListe as e (e.art + e.id)}
      <li>
        <span class="marke {e.art}" class:fremd={e.termin?.fremd}></span>
        <span class="zahl klein leise">{e.beginn ? `${e.beginn}${e.ende ? '–' + e.ende : ''}` : 'ganztägig'}</span>
        <span><b>{e.titel}</b>{#if e.klasse} <span class="leise">· {e.klasse}</span>{/if}{#if e.frei} <span class="kennz">unterrichtsfrei</span>{/if}{#if e.auchUntis} <span class="kennz">auch in WebUntis</span>{/if}
          {#if e.termin?.ort}<br /><span class="klein leise">{e.termin.ort}</span>{/if}
          {#if e.klausurOhneDatum}<br /><button class="link klein" onclick={() => datumUebernehmen(e)}>Datum für „{e.klausurOhneDatum.name}“ ins Notenbuch übernehmen</button>{/if}
          {#if e.termin?.notiz}<br /><span class="klein leise">{e.termin.notiz}</span>{/if}</span>
        <span class="klein leise">{herkunft(e)}</span>
        {#if e.termin}<button class="knopf leise" onclick={() => bearbeiten(e)}>Ändern</button>
        {:else if e.href}<a class="knopf leise" href={e.href}>öffnen</a>{:else}<span></span>{/if}
      </li>
    {/each}
  </ul>

  {#if form}
    <div class="formular">
      {#if abgeglichen}<p class="klein leise">Aus {QUELLEN[form.quelle!]}: Titel und Zeit kommen von dort. Art, Klassen und „Unterricht fällt aus“ legst du fest, das bleibt beim nächsten Abgleich.</p>{/if}
      <div class="chips" role="group" aria-label="Art">
        {#each ARTEN_TERMIN as a}<button class="chip" aria-pressed={form.art === a.art} onclick={() => artWahl(a.art)}>{a.name}</button>{/each}
      </div>
      <div class="felder">
        <label class="feld breit"><span>Titel</span><input bind:value={form.titel} placeholder={artName(form.art)} disabled={abgeglichen} /></label>
        <label class="feld"><span>Datum</span><input type="date" bind:value={form.datum} disabled={abgeglichen} /></label>
        <label class="feld"><span>bis (mehrtägig)</span><input type="date" bind:value={form.bis} min={form.datum} disabled={abgeglichen} /></label>
        <label class="feld"><span>Beginn (leer = ganztägig)</span><input type="time" bind:value={form.beginn} disabled={abgeglichen} /></label>
        <label class="feld"><span>Ende</span><input type="time" bind:value={form.ende} disabled={!form.beginn || abgeglichen} /></label>
      </div>
      <div class="zeile wrap">
        <span class="klein leise">Klassen:</span>
        {#each d.kurse as k}<button class="chip" aria-pressed={form.kursIds?.includes(k.id)} onclick={() => klasseUmschalten(k.id)}>{k.klasse} {k.fach}</button>{/each}
      </div>
      <label class="zeile klein"><input type="checkbox" bind:checked={form.unterrichtFrei} /> Unterricht fällt aus ({form.kursIds?.length ? 'nur die gewählten Klassen' : 'alle eigenen Klassen'}), zählt in der Semesterplanung nicht als Block</label>
      <label class="feld"><span>Notiz</span><input bind:value={form.notiz} placeholder="Raum, Material, …" disabled={abgeglichen} /></label>
      <div class="zeile wrap">
        <button class="knopf haupt" onclick={sichern}>Speichern</button>
        <button class="knopf leise" onclick={() => (form = null)}>Abbrechen</button>
        {#if bearbeitet}<span class="raum"></span><button class="knopf leise" onclick={loeschen}>{abgeglichen ? 'Ausblenden' : 'Entfernen'}</button>{/if}
      </div>
    </div>
  {/if}
</section>

<KalenderQuellen />

<p class="klein leise">
  Von selbst im Kalender: Klausuren und Tests mit Datum, Nachschreibetermine, Ferien und Feiertage{d.einstellungen.ferien?.length ? ' (WebUntis)' : d.einstellungen.kalender?.iservFerien?.length ? ' (IServ)' : ' (Beispiel Berlin, bitte prüfen)'}, mit WebUntis auch Ausfälle und Prüfungen, mit IServ die Schultermine.
  Der Export enthält nur eigene Termine, Klausuren, Tests und Nachschreiben, keine Schülernamen und nichts aus IServ oder WebUntis.
  {#if importiert}{importiert} aus Dateien importierte Termine · <button class="link" onclick={importierteEntfernen}>alle importierten entfernen</button>{/if}
  {#if ausgeblendet}{importiert ? ' · ' : ''}{ausgeblendet} ausgeblendet · <button class="link" onclick={alleZeigen}>wieder zeigen</button>{/if}
</p>

<style>
  .monat { font-size: 17px; min-width: 150px; text-align: center; }
  .wrap { flex-wrap: wrap; }
  .monatsraster { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)) repeat(2, minmax(0, .55fr)); gap: 4px; }
  .wt { padding: 2px 6px; }
  .tag { font: inherit; text-align: left; min-height: 92px; padding: 6px; border-radius: var(--leo-r-m); border: 1px solid var(--leo-linie); background: var(--leo-karte); color: var(--leo-tinte);
    display: flex; flex-direction: column; gap: 2px; min-width: 0; cursor: pointer; }
  .tag.we { background: transparent; border-color: var(--leo-linie-fein); }
  .tag.aus { opacity: .45; }
  .tag.ferien:not(.we) { background: var(--leo-flaeche-leise); border-style: dashed; }
  .tag.heute .nr { background: var(--leo-akzent); color: var(--leo-auf-akzent); border-radius: 99px; padding: 0 6px; }
  .tag.gewaehlt { outline: 2px solid var(--leo-akzent); outline-offset: -1px; }
  .nr { font-weight: 650; font-size: 13px; align-self: flex-start; }
  .fname { margin-top: auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ev { font-size: 11.5px; line-height: 1.3; padding: 1px 5px; border-radius: 4px; background: var(--leo-taste); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-left: 3px solid var(--leo-leise); }
  .ev.klausur, .marke.klausur { border-color: var(--leo-stern); }
  .ev.klausur { background: var(--leo-stern-hell); }
  .ev.test, .marke.test, .ev.abgabe, .marke.abgabe { border-color: var(--leo-akzent); }
  .ev.nachschreiben, .marke.nachschreiben { border-color: var(--leo-akzent); background: var(--leo-akzent-hell); }
  .ev.frei, .ev.ausfall, .marke.ausfall { border-color: var(--leo-warnung); }
  .ev.pruefung, .marke.pruefung { border-color: var(--leo-stern); }
  .ev.fremd, .marke.fremd { border-left-style: dashed; border-color: var(--leo-leise); background: transparent; }
  .tagkarte { display: grid; gap: 10px; }
  .tagliste { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .tagliste li { display: grid; grid-template-columns: 4px 110px 1fr auto auto; gap: 12px; align-items: center; padding: 6px 0; border-top: 1px dashed var(--leo-linie-fein); }
  .marke { width: 4px; height: 100%; min-height: 28px; border-radius: 2px; background: var(--leo-leise); border-left: 4px solid var(--leo-leise); }
  .marke.ferien { border-color: var(--leo-linie); }
  .formular { display: grid; gap: 12px; border-top: 1px solid var(--leo-linie); padding-top: 12px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .felder { display: grid; grid-template-columns: 2fr repeat(4, 1fr); gap: 10px; }
  .link { background: none; border: 0; padding: 0; color: var(--leo-akzent); text-decoration: underline; font: inherit; cursor: pointer; }
  @media (max-width: 720px) {
    .tag { min-height: 56px; }
    .ev { font-size: 0; height: 6px; padding: 0; border-left-width: 0; background: var(--leo-akzent); }
    .ev.klausur, .ev.pruefung { background: var(--leo-stern); }
    .ev.fremd { background: var(--leo-linie); }
    .felder { grid-template-columns: 1fr 1fr; }
    .breit { grid-column: 1 / -1; }
    .tagliste li { grid-template-columns: 4px 1fr auto; }
    .tagliste li > :nth-child(4) { display: none; }
  }
</style>
