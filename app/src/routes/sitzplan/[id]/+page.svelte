<script lang="ts">
  // Sitzplan-Editor (E86): Vorlage wählen, Tische ein-/ausschalten, Schüler ziehen (Maus) oder antippen und Platz antippen (Touch, Stift).
  import { page } from '$app/state';
  import { app, speichern, zeige, neueId } from '$lib/speicher.svelte';
  import { schuelerVon, kurzname, name } from '$lib/hilfen';
  import { VORLAGEN, ausVorlage, ausEigener, alsVorlage, verteilen, lehrersicht } from '$lib/sitzplan';
  import KursKopf from '$lib/ui/KursKopf.svelte';

  const d = app.d!;
  const kurs = $derived(d.kurse.find((k) => k.id === page.params.id)!);
  const sp = $derived(kurs.sitzplan);
  const liste = $derived(schuelerVon(d, kurs));
  const platzVon = (sid: string) => Object.entries(sp.belegung).find(([, v]) => v === sid)?.[0];
  const ohnePlatz = $derived(liste.filter((s) => platzVon(s.id) === undefined));
  let tischeBearbeiten = $state(false);
  let gewaehlt = $state<string | null>(null); // Schüler-ID zum Setzen per Antippen
  let ziehen: string | null = null;

  function setzen(sid: string, ziel: number) {
    const alt = platzVon(sid);
    const dort = sp.belegung[ziel];
    if (alt !== undefined) delete sp.belegung[Number(alt)];
    if (dort && alt !== undefined) sp.belegung[Number(alt)] = dort; // tauschen
    sp.belegung[ziel] = sid;
    speichern();
  }
  function platzKlick(i: number) {
    if (tischeBearbeiten) {
      sp.tische[i] = !sp.tische[i];
      if (!sp.tische[i]) delete sp.belegung[i];
      speichern();
      return;
    }
    if (!sp.tische[i]) return;
    if (gewaehlt) { setzen(gewaehlt, i); gewaehlt = null; }
    else if (sp.belegung[i]) gewaehlt = sp.belegung[i];
  }
  function entfernen(sid: string) {
    const p = platzVon(sid);
    if (p !== undefined) { delete sp.belegung[Number(p)]; speichern(); }
  }
  const eigene = $derived(d.einstellungen.eigeneVorlagen ?? []);
  const vorlagenName = (id: string) => eigene.find((v) => v.id === id)?.name ?? VORLAGEN.find((v) => v.id === id)?.name;
  function vorlage(id: string) {
    const alt = JSON.parse(JSON.stringify(kurs.sitzplan));
    const ev = eigene.find((v) => v.id === id);
    const neu = ev ? ausEigener(ev) : ausVorlage(id);
    verteilen(neu, liste.map((s) => s.id).filter((x) => Object.values(alt.belegung).includes(x)).concat(liste.map((s) => s.id).filter((x) => !Object.values(alt.belegung).includes(x))));
    kurs.sitzplan = neu;
    speichern();
    zeige(`Vorlage „${vorlagenName(id)}“`, () => { kurs.sitzplan = alt; speichern(); });
  }
  // Eigene Vorlagen (E86): aktuelle Tische unter einem Namen merken, ohne Dialog direkt in der Werkzeugleiste
  let neuerName = $state<string | null>(null);
  function vorlageSpeichern() {
    const n = neuerName?.trim();
    if (!n) return;
    const vorhanden = eigene.find((v) => v.name.toLowerCase() === n.toLowerCase());
    const v = alsVorlage(sp, vorhanden?.id ?? 'eigen-' + neueId(), n);
    d.einstellungen.eigeneVorlagen = [...eigene.filter((x) => x.id !== v.id), v];
    sp.vorlage = v.id;
    speichern();
    zeige(vorhanden ? `Vorlage „${n}“ aktualisiert` : `Vorlage „${n}“ gespeichert, gilt für alle Klassen`);
    neuerName = null;
  }
  function vorlageLoeschen(id: string) {
    const alt = [...eigene];
    d.einstellungen.eigeneVorlagen = eigene.filter((v) => v.id !== id);
    speichern();
    zeige(`Vorlage gelöscht, der Sitzplan bleibt`, () => { d.einstellungen.eigeneVorlagen = alt; speichern(); });
  }
  function neuVerteilen(art: 'abc' | 'zufall') {
    const alt = { ...sp.belegung };
    const ids = liste.map((s) => s.id);
    if (art === 'zufall') ids.sort(() => Math.random() - 0.5);
    verteilen(sp, ids);
    speichern();
    zeige(art === 'abc' ? 'Alphabetisch gesetzt' : 'Zufällig gesetzt', () => { sp.belegung = alt; speichern(); });
  }
  function groesse(dsp: number, dre: number) {
    const neuS = Math.max(2, Math.min(14, sp.spalten + dsp));
    const neuR = Math.max(2, Math.min(12, sp.reihen + dre));
    const tische: boolean[] = [];
    const bel: Record<number, string> = {};
    for (let r = 0; r < neuR; r++) for (let s = 0; s < neuS; s++) {
      const altI = r * sp.spalten + s;
      const drin = r < sp.reihen && s < sp.spalten;
      tische.push(drin ? sp.tische[altI] : false);
      if (drin && sp.belegung[altI]) bel[r * neuS + s] = sp.belegung[altI];
    }
    kurs.sitzplan = { ...sp, spalten: neuS, reihen: neuR, tische, belegung: bel };
    speichern();
  }
  const sch = (sid: string) => d.schueler.find((x) => x.id === sid);
  const plaetze = $derived(sp.tische.filter(Boolean).length);
</script>

<svelte:head><title>{kurs?.name} · Sitzplan</title></svelte:head>

{#if kurs}
  <KursKopf {kurs} aktiv="sitzplan" />
  <div class="seite">
    <div class="werkzeug karte">
      <label class="feld"><span>Vorlage</span>
        <select value={sp.vorlage} onchange={(e) => vorlage((e.currentTarget as HTMLSelectElement).value)}>
          <optgroup label="Vorlagen">{#each VORLAGEN as v}<option value={v.id}>{v.name}</option>{/each}</optgroup>
          {#if eigene.length}<optgroup label="Eigene">{#each eigene as v}<option value={v.id}>{v.name}</option>{/each}</optgroup>{/if}
        </select>
      </label>
      {#if neuerName === null}
        <button class="pille" onclick={() => (neuerName = vorlagenName(sp.vorlage) && eigene.some((v) => v.id === sp.vorlage) ? vorlagenName(sp.vorlage)! : '')}>Als Vorlage merken</button>
        {#if eigene.some((v) => v.id === sp.vorlage)}<button class="pille" onclick={() => vorlageLoeschen(sp.vorlage)}>Vorlage löschen</button>{/if}
      {:else}
        <form class="zeile klein" onsubmit={(e) => { e.preventDefault(); vorlageSpeichern(); }}>
          <!-- svelte-ignore a11y_autofocus -->
          <input class="eingabe vname" bind:value={neuerName} placeholder="z. B. Raum 204" aria-label="Name der Vorlage" autofocus />
          <button class="knopf" type="submit" disabled={!neuerName.trim()}>Merken</button>
          <button class="knopf leise" type="button" onclick={() => (neuerName = null)}>Abbrechen</button>
        </form>
      {/if}
      <button class="pille" aria-pressed={tischeBearbeiten} onclick={() => { tischeBearbeiten = !tischeBearbeiten; gewaehlt = null; }}>{tischeBearbeiten ? 'Tische bearbeiten: an' : 'Tische bearbeiten'}</button>
      <div class="zeile klein">Raster
        <button class="mini" onclick={() => groesse(-1, 0)} aria-label="Spalte weniger">−</button>{sp.spalten}<button class="mini" onclick={() => groesse(1, 0)} aria-label="Spalte mehr">+</button>
        ×
        <button class="mini" onclick={() => groesse(0, -1)} aria-label="Reihe weniger">−</button>{sp.reihen}<button class="mini" onclick={() => groesse(0, 1)} aria-label="Reihe mehr">+</button>
      </div>
      <span class="raum"></span>
      <button class="knopf leise" onclick={() => neuVerteilen('abc')}>Alphabetisch setzen</button>
      <button class="knopf leise" onclick={() => neuVerteilen('zufall')}>Zufällig setzen</button>
    </div>

    <div class="bereich">
      <section class="karte raumplan">
        <p class="klein leise sicht">Lehrersicht: du schaust von vorne auf die Klasse.</p>
        <div class="raster" style:grid-template-columns="repeat({sp.spalten}, minmax(0, 1fr))">
          <!-- Lehrersicht (E91): Raster um 180° gedreht, vorne (Reihe 0) ist unten -->
          {#each lehrersicht(sp.tische.length) as i (i)}
            {@const tisch = sp.tische[i]}
            {@const s = sp.belegung[i] ? sch(sp.belegung[i]) : undefined}
            <button class="zelle" class:tisch class:bearbeiten={tischeBearbeiten} class:belegt={!!s} class:auswahl={!!s && gewaehlt === s.id}
              aria-label={tisch ? (s ? `Platz von ${name(s)}` : 'freier Platz') : 'kein Tisch'}
              draggable={!!s && !tischeBearbeiten}
              ondragstart={(e) => { if (s) { ziehen = s.id; e.dataTransfer?.setData('text/plain', s.id); } }}
              ondragover={(e) => { if (tisch && !tischeBearbeiten) e.preventDefault(); }}
              ondrop={(e) => { e.preventDefault(); const sid = ziehen ?? e.dataTransfer?.getData('text/plain'); if (sid && tisch) setzen(sid, i); ziehen = null; }}
              onclick={() => platzKlick(i)}>
              {#if s}{kurzname(s)}{:else if tisch}<span class="leise">frei</span>{/if}
            </button>
          {/each}
        </div>
        <div class="tafel klein leise">Lehrertisch · Tafel</div>
        <p class="klein leise">{plaetze} Plätze · {liste.length} Schüler. {tischeBearbeiten ? 'Felder antippen schaltet Tische ein oder aus.' : 'Ziehen oder antippen und Zielplatz antippen. Auf einen besetzten Platz ziehen tauscht.'}</p>
      </section>

      <aside class="karte" ondragover={(e) => e.preventDefault()} ondrop={(e) => { e.preventDefault(); if (ziehen) entfernen(ziehen); ziehen = null; }} role="region" aria-label="Ohne Platz">
        <h2>Ohne Platz <span class="leise klein">{ohnePlatz.length}</span></h2>
        <p class="klein leise">Hierher ziehen nimmt jemanden vom Platz.</p>
        <div class="namen">
          {#each ohnePlatz as s (s.id)}
            <button class="name" class:auswahl={gewaehlt === s.id} draggable="true"
              ondragstart={(e) => { ziehen = s.id; e.dataTransfer?.setData('text/plain', s.id); }}
              onclick={() => (gewaehlt = gewaehlt === s.id ? null : s.id)}>{name(s)}</button>
          {/each}
          {#if ohnePlatz.length === 0}<p class="leise klein">Alle haben einen Platz.</p>{/if}
        </div>
        {#if gewaehlt}
          <p class="klein">Gewählt: <b>{name(sch(gewaehlt)!)}</b>, jetzt Platz antippen.</p>
          {#if platzVon(gewaehlt) !== undefined}<button class="knopf leise" onclick={() => { if (gewaehlt) entfernen(gewaehlt); gewaehlt = null; }}>Vom Platz nehmen</button>{/if}
        {/if}
      </aside>
    </div>
  </div>
{/if}

<style>
  .seite { padding: 18px 32px 40px; display: flex; flex-direction: column; gap: 16px; }
  .werkzeug { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
  .vname { width: 160px; min-height: 36px; }
  .mini { width: 32px; height: 32px; border: 1px solid var(--leo-linie); background: var(--leo-karte); border-radius: var(--leo-r-s); margin: 0 4px; }
  .bereich { display: grid; grid-template-columns: 1fr 280px; gap: 16px; align-items: start; }
  .tafel { text-align: center; border-top: 3px solid var(--leo-linie); margin: 16px 20% 12px; padding-top: 4px; }
  .sicht { margin: 0 0 12px; text-align: center; }
  .raster { display: grid; gap: 6px; }
  .zelle { min-height: 56px; border: 1px dashed transparent; border-radius: var(--leo-r-m); background: transparent; font-size: 13px; font-weight: 600; padding: 4px; overflow: hidden; text-overflow: ellipsis; }
  .zelle.bearbeiten { border-color: var(--leo-linie); }
  .zelle.tisch { background: var(--leo-flaeche-leise); border: 1px solid var(--leo-linie); }
  .zelle.belegt { background: var(--leo-karte); cursor: grab; }
  .zelle.auswahl, .name.auswahl { background: var(--leo-auswahl); border: 2px solid var(--leo-akzent); }
  .namen { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
  .name { text-align: left; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); background: var(--leo-karte); padding: 10px 12px; cursor: grab; }
  aside h2 { display: flex; gap: 8px; align-items: baseline; }
  @media (max-width: 900px) { .bereich { grid-template-columns: 1fr; } .seite { padding: 12px; } .zelle { font-size: 11px; min-height: 48px; } }
</style>
