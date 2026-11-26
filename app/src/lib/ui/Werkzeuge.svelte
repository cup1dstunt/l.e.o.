<script lang="ts">
  // Werkzeuge der Live-Stunde: fairer Zufall (P5, E109) und Gruppen (P7, P8), dazu die Beamer-Ansicht (P6, PF25).
  import { app, speichern, zeige, neueId } from '$lib/speicher.svelte';
  import { kurzname, name, datumKurz, heuteISO } from '$lib/hilfen';
  import { rechne } from '$lib/rechnen';
  import { ziehe, zuruecknehmen, neuerStand, lose, rundenStand } from '$lib/zufall';
  import { bilden, staerke, verstoesse, tauschen, regelUmschalten, gruppenAnzahl, satzKuerzen } from '$lib/gruppen';
  import { laufendesProjekt, satzAbgleichen } from '$lib/projekt';
  import { goto } from '$app/navigation';
  import type { Kurs, Schueler, Gruppensatz } from '$lib/typen';
  import Beamer from './Beamer.svelte';
  import { untrack } from 'svelte';

  let { kurs, anwesend, gewaehlt = $bindable() }: { kurs: Kurs; anwesend: Schueler[]; gewaehlt?: string } = $props();
  const d = app.d!;
  const person = (id: string) => d.schueler.find((s) => s.id === id);
  const kn = (id: string) => { const s = person(id); return s ? kurzname(s) : '?'; };

  // ---- Zufall ----
  const stand = $derived(kurs.zufall ?? neuerStand(true));
  const losVon = (id: string) => lose(kurs, d.mitarbeit, id).anzahl;
  let aktuell = $state<string | undefined>();
  let uebersprungen = $state<string[]>([]);
  $effect(() => { gewaehlt = aktuell; });
  const rs = $derived(rundenStand(stand, anwesend.map((s) => s.id)));
  const grund = $derived(aktuell && stand.gewichtet ? lose(kurs, d.mitarbeit, aktuell) : null);

  function ziehen(): string | undefined {
    kurs.zufall ??= neuerStand(true);
    const ohne = anwesend.map((s) => s.id).filter((id) => !uebersprungen.includes(id));
    const id = ziehe(kurs.zufall, ohne.length ? ohne : anwesend.map((s) => s.id), losVon) ?? undefined;
    aktuell = id;
    speichern();
    return id;
  }
  function weiter() { uebersprungen = []; return ziehen(); }
  function passtNicht() {
    if (!kurs.zufall || !aktuell) return;
    zuruecknehmen(kurs.zufall);
    uebersprungen = [...uebersprungen, aktuell];
    ziehen();
  }
  function neueRunde() {
    const alt = $state.snapshot(kurs.zufall);
    kurs.zufall = { ...(kurs.zufall ?? neuerStand(true)), runde: {}, rundeSeit: new Date().toISOString() };
    aktuell = undefined;
    speichern();
    zeige('Neue Runde: alle sind wieder dran', () => { kurs.zufall = alt; speichern(); });
  }
  function gewichtUmschalten() {
    kurs.zufall ??= neuerStand(true);
    kurs.zufall.gewichtet = !kurs.zufall.gewichtet;
    speichern();
  }
  let protokollAuf = $state(false);

  // ---- Gruppen ----
  let art = $state<'groesse' | 'anzahl'>('groesse');
  let zahl = $state(4);
  let leistung = $state(false);
  let geschlecht = $state(false);
  const regeln = $derived(kurs.gruppenRegeln ?? { nicht: [], gern: [] });
  let gruppen = $state<string[][]>([]);
  let satzId = $state<string | undefined>(untrack(() => kurs.gruppenAktiv));
  let markiert = $state<string | undefined>();
  const v = $derived(verstoesse(gruppen, regeln));
  const anzahlVorschau = $derived(gruppenAnzahl(anwesend.length, { art, zahl }));

  $effect.pre(() => {
    // gespeicherte, im Sitzplan gezeigte Gruppen beim Öffnen anzeigen
    if (!gruppen.length && kurs.gruppenAktiv) {
      const s = kurs.gruppensaetze?.find((x) => x.id === kurs.gruppenAktiv);
      if (s) gruppen = s.gruppen.map((g) => [...g]);
    }
  });

  function gruppenBilden() {
    const mitglieder = anwesend.map((s) => ({ id: s.id, geschlecht: s.geschlecht, staerke: staerke(kurs.profil, rechne(kurs, s.id).gesamtExakt) }));
    gruppen = bilden(mitglieder, { art, zahl, leistung, geschlecht, regeln });
    satzId = undefined;
    markiert = undefined;
  }
  function antippen(id: string) {
    if (!markiert) { markiert = id; return; }
    if (markiert !== id) { gruppen = tauschen(gruppen, markiert, id); satzId = undefined; }
    markiert = undefined;
  }
  function speichernSatz(zeigen: boolean) {
    if (!gruppen.length) return;
    kurs.gruppensaetze ??= [];
    let s = satzId ? kurs.gruppensaetze.find((x) => x.id === satzId) : undefined;
    if (s) {
      s.gruppen = gruppen.map((g) => [...g]);
      // Satz eines Projekts: getauschte Mitglieder auch im Projekt übernehmen (gleiche Gruppenzahl)
      const p = s.projektId ? kurs.projekte?.find((x) => x.id === s!.projektId) : undefined;
      if (p && p.gruppen.length === gruppen.length) p.gruppen.forEach((g, i) => (g.mitglieder = [...gruppen[i]]));
    } else {
      s = { id: neueId(), name: `${datumKurz(heuteISO())} · ${gruppen.length} Gruppen`, datum: heuteISO(), gruppen: gruppen.map((g) => [...g]) } satisfies Gruppensatz;
      kurs.gruppensaetze.unshift(s);
      kurs.gruppensaetze = satzKuerzen(kurs.gruppensaetze);
      satzId = s.id;
    }
    if (zeigen) kurs.gruppenAktiv = s.id;
    speichern();
    zeige(zeigen ? 'Gruppen gespeichert und im Sitzplan sichtbar' : 'Gruppen gespeichert');
  }
  function laden(id: string) {
    const s = kurs.gruppensaetze?.find((x) => x.id === id);
    if (s) { gruppen = s.gruppen.map((g) => [...g]); satzId = s.id; }
  }
  function sitzplanAus() { kurs.gruppenAktiv = undefined; speichern(); }

  // Gruppenarbeit (P9, E116): laufendes Projekt zeigen, aktuelle Gruppen als Projekt festhalten
  const projekt = $derived(laufendesProjekt(kurs, heuteISO()));
  function projektZeigen() {
    if (!projekt) return;
    const s = satzAbgleichen(kurs, projekt, neueId);
    kurs.gruppenAktiv = s.id;
    gruppen = s.gruppen.map((g) => [...g]);
    satzId = s.id;
    speichern();
    zeige(`Gruppen aus „${projekt.titel}“ im Sitzplan`);
  }
  function alsProjekt() {
    if (!gruppen.length) return;
    sessionStorage.setItem('leo-projekt-gruppen', JSON.stringify(gruppen));
    goto(`/gruppenarbeit/${kurs.id}?neu=1`);
  }

  // Regeln: „nicht zusammen“ / „gern zusammen“
  let regelnAuf = $state(false);
  let ra = $state('');
  let rb = $state('');
  function regel(artR: 'nicht' | 'gern', a = ra, b = rb) {
    if (!a || !b || a === b) return;
    kurs.gruppenRegeln = regelUmschalten($state.snapshot(regeln) as typeof regeln, artR, a, b);
    speichern();
    rb = '';
  }
  const klasse = $derived(kurs.schueler.map(person).filter((s): s is Schueler => !!s).sort((a, b) => a.nachname.localeCompare(b.nachname, 'de')));

  let beamer = $state(false);
</script>

<section class="karte">
  <div class="zeile kopf"><h2>Zufall</h2><button class="pille" aria-pressed={stand.gewichtet} onclick={gewichtUmschalten} title="Wer mündlich mittel oder schwächer steht, noch keine Bewertung hat oder zwischen zwei Noten liegt, bekommt mehr Lose">gewichtet</button></div>
  <p class="klein leise">nur Anwesende · über mehrere Stunden, bis alle dran waren</p>
  <p class="zufall">{aktuell ? kn(aktuell) : '…'}</p>
  {#if grund && grund.gruende.length}<p class="klein leise">{grund.anzahl} Lose: {grund.gruende.join(', ')}</p>{/if}
  <p class="klein leise">{rs.dran} von {rs.von} in dieser Runde dran · seit {datumKurz(stand.rundeSeit)}</p>
  <div class="zeile wrap">
    <button class="knopf haupt" onclick={weiter}>{aktuell ? 'Nächster' : 'Ziehen'}</button>
    {#if aktuell}<button class="knopf leise" onclick={passtNicht} title="Zählt nicht als Aufruf">Passt gerade nicht</button>{/if}
  </div>
  <div class="zeile wrap unten">
    <button class="link klein" onclick={() => (protokollAuf = !protokollAuf)}>{protokollAuf ? 'Protokoll zu' : `Protokoll (${stand.protokoll.length})`}</button>
    <button class="link klein" onclick={neueRunde}>Neue Runde</button>
    <button class="link klein" onclick={() => (beamer = true)}>Beamer</button>
  </div>
  {#if protokollAuf}
    <ol class="prot klein">
      {#each stand.protokoll.slice(-15).reverse() as a}
        <li><span>{kn(a.schuelerId)}</span><span class="leise">{new Date(a.zeit).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></li>
      {:else}<li class="leise">Noch niemand gezogen.</li>{/each}
    </ol>
  {/if}
</section>

<section class="karte">
  <div class="zeile kopf"><h2>Gruppen</h2><button class="link klein" onclick={() => (regelnAuf = true)}>Regeln ({regeln.nicht.length + regeln.gern.length})</button></div>
  {#if projekt}
    <div class="projekt">
      <span class="raum"><b>Projekt läuft:</b> {projekt.titel}<span class="klein leise block">{projekt.gruppen.length} Gruppen · bis {datumKurz(projekt.bis)}</span></span>
      <button class="knopf leise" onclick={projektZeigen}>{kurs.gruppenAktiv === projekt.satzId ? 'Im Sitzplan' : 'Gruppen zeigen'}</button>
      <a class="link klein" href="/gruppenarbeit/{kurs.id}?p={projekt.id}">Öffnen ›</a>
    </div>
  {/if}
  <div class="zeile wrap gz">
    <div class="umschalter" role="group" aria-label="Einteilen nach">
      <button aria-pressed={art === 'groesse'} onclick={() => (art = 'groesse')}>je</button>
      <button aria-pressed={art === 'anzahl'} onclick={() => (art = 'anzahl')}>Anzahl</button>
    </div>
    <select class="eingabe kl" bind:value={zahl} aria-label={art === 'groesse' ? 'Personen je Gruppe' : 'Anzahl Gruppen'}>
      {#each art === 'groesse' ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7, 8, 9, 10] as n}<option value={n}>{n}</option>{/each}
    </select>
    <span class="klein leise">= {anzahlVorschau} Gruppen</span>
  </div>
  <div class="zeile wrap gz">
    <button class="pille" aria-pressed={leistung} onclick={() => (leistung = !leistung)}>leistungsgemischt</button>
    <button class="pille" aria-pressed={geschlecht} onclick={() => (geschlecht = !geschlecht)}>Geschlecht ausgewogen</button>
  </div>
  <button class="knopf" onclick={gruppenBilden}>{gruppen.length ? 'Neu bilden' : 'Gruppen bilden'}</button>
  {#if gruppen.length}
    {#if v.nicht.length || v.gern.length}
      <p class="klein warn">{[...v.nicht.map((p) => `${kn(p[0])} und ${kn(p[1])} zusammen`), ...v.gern.map((p) => `${kn(p[0])} und ${kn(p[1])} getrennt`)].join(' · ')}</p>
    {/if}
    <ol class="gl">
      {#each gruppen as g, i}
        <li><b class="gn">G{i + 1}</b>
          {#each g as id}<button class="nmk" class:mark={markiert === id} onclick={() => antippen(id)}>{kn(id)}</button>{/each}
        </li>
      {/each}
    </ol>
    <p class="klein leise">Zwei Namen nacheinander antippen tauscht sie.</p>
    <div class="zeile wrap">
      <button class="knopf leise" onclick={() => speichernSatz(false)}>Speichern</button>
      <button class="knopf leise" onclick={() => speichernSatz(true)}>Im Sitzplan zeigen</button>
      {#if !satzId || !kurs.gruppensaetze?.find((x) => x.id === satzId)?.projektId}<button class="knopf leise" onclick={alsProjekt} title="Gruppen über mehrere Stunden festhalten und bewerten">Als Projekt festhalten</button>{/if}
    </div>
  {/if}
  {#if kurs.gruppensaetze?.length}
    <div class="zeile wrap unten">
      <select class="eingabe kl" value={satzId ?? ''} onchange={(e) => laden(e.currentTarget.value)} aria-label="Gespeicherte Gruppen">
        <option value="" disabled>Gespeicherte Gruppen …</option>
        {#each kurs.gruppensaetze as s}<option value={s.id}>{s.name}{s.id === kurs.gruppenAktiv ? ' · im Sitzplan' : ''}</option>{/each}
      </select>
      {#if kurs.gruppenAktiv}<button class="link klein" onclick={sitzplanAus}>im Sitzplan ausblenden</button>{/if}
    </div>
  {/if}
</section>

{#if regelnAuf}
  <div class="hintergrund" role="presentation" onclick={(ev) => ev.target === ev.currentTarget && (regelnAuf = false)}>
    <div class="schweben dialog" role="dialog" aria-modal="true" aria-label="Gruppenregeln">
      <h2>Regeln für Gruppen · {kurs.name}</h2>
      <p class="klein leise">Gilt für alle Gruppen dieser Klasse. Zwei Personen wählen, dann „nicht zusammen“ oder „gern zusammen“.</p>
      <div class="zeile wrap">
        <select class="eingabe" bind:value={ra} aria-label="Erste Person"><option value="">Person …</option>{#each klasse as s}<option value={s.id}>{name(s)}</option>{/each}</select>
        <select class="eingabe" bind:value={rb} aria-label="Zweite Person"><option value="">mit …</option>{#each klasse.filter((s) => s.id !== ra) as s}<option value={s.id}>{name(s)}</option>{/each}</select>
      </div>
      <div class="zeile wrap gz">
        <button class="knopf leise" disabled={!ra || !rb} onclick={() => regel('nicht')}>nicht zusammen</button>
        <button class="knopf leise" disabled={!ra || !rb} onclick={() => regel('gern')}>gern zusammen</button>
      </div>
      {#each [['nicht', 'Nicht zusammen'], ['gern', 'Gern zusammen']] as [artR, titel]}
        {@const liste = regeln[artR as 'nicht' | 'gern']}
        {#if liste.length}
          <p class="klein leise">{titel}</p>
          <div class="chips">
            {#each liste as p}<button class="chip" title="Regel entfernen" onclick={() => regel(artR as 'nicht' | 'gern', p[0], p[1])}>{kn(p[0])} · {kn(p[1])} ✕</button>{/each}
          </div>
        {/if}
      {/each}
      <div class="zeile ende"><button class="knopf haupt" onclick={() => (regelnAuf = false)}>Fertig</button></div>
    </div>
  </div>
{/if}

{#if beamer}
  <Beamer {kurs} {anwesend} {gruppen} aktuell={aktuell} ziehen={weiter} neuBilden={gruppenBilden} schliessen={() => (beamer = false)} />
{/if}

<style>
  .kopf { justify-content: space-between; }
  .zufall { font-size: 34px; font-weight: 800; margin: 10px 0 2px; }
  .wrap { flex-wrap: wrap; }
  .unten { margin-top: 10px; gap: 14px; }
  .link { background: none; border: 0; padding: 4px 0; color: var(--leo-akzent); font-weight: 600; min-height: 32px; }
  .prot { margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
  .prot li { display: flex; justify-content: space-between; gap: 8px; }
  .gz { margin: 10px 0; }
  .kl { min-height: 34px; padding: 4px 8px; }
  .umschalter { display: inline-flex; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-pill); overflow: hidden; }
  .umschalter button { border: 0; background: var(--leo-karte); padding: 0 12px; min-height: 34px; color: var(--leo-leise); }
  .umschalter button[aria-pressed='true'] { background: var(--leo-akzent); color: var(--leo-auf-akzent); font-weight: 600; }
  .gl { margin: 12px 0 6px; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .gl li { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
  .gn { min-width: 30px; font-size: 12px; color: var(--leo-akzent); }
  .nmk { border: 1px solid var(--leo-linie); background: var(--leo-karte); border-radius: var(--leo-r-pill); padding: 2px 10px; min-height: 30px; font-size: 13px; }
  .nmk.mark { background: var(--leo-auswahl); border: 2px solid var(--leo-akzent); }
  .warn { color: var(--leo-warnung); margin: 8px 0 0; }
  .projekt { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: var(--leo-akzent-hell); border-radius: var(--leo-r-m); padding: 8px 10px; margin: 8px 0 4px; }
  .block { display: block; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  .ende { justify-content: flex-end; margin-top: 18px; }
  .dialog p { margin: 12px 0 8px; }
</style>
