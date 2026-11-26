<script lang="ts">
  // Einrichtungsassistent beim ersten Start (docs/MODULE.md): Herkunft → Module → Daten → Fertig.
  // Keine Pflichtfragen: „Später“ übernimmt die Standardauswahl, alles ist unter Mehr › Module änderbar.
  import { goto } from '$app/navigation';
  import { app, abgleich, speichern, zeige, leerStarten } from '$lib/speicher.svelte';
  import { STARTWEGE, MODULE, auswahlFuer, istAn, type Herkunft } from '$lib/module';
  import ModulAuswahl from '$lib/ui/ModulAuswahl.svelte';

  const d = app.d!;
  // Beispieldaten nur anbieten zu ersetzen, solange nichts Echtes da ist
  const nurBeispiel = !d.einstellungen.untis && !abgleich.verbunden;
  const schritte = nurBeispiel ? ['Bisher', 'Module', 'Daten', 'Fertig'] : ['Bisher', 'Module', 'Fertig'];
  let schritt = $state(0);
  let herkunft = $state<Herkunft | undefined>(d.einstellungen.herkunft);
  let entwurf = $state<Partial<Record<string, boolean>> | undefined>(d.einstellungen.module ? { ...d.einstellungen.module } : undefined);
  let hinweis = $state('');
  let daten = $state<'untis' | 'beispiel' | 'leer'>('beispiel');
  const weg = $derived(STARTWEGE.find((w) => w.id === herkunft));
  const name = $derived(schritte[schritt]);
  const anzahlAn = $derived(MODULE.filter((m) => !m.kern && !m.bald && istAn({ module: entwurf }, m.id)).length);

  function waehle(h: Herkunft) {
    herkunft = h;
    entwurf = auswahlFuer(h); // Vorschlag; im nächsten Schritt änderbar
    hinweis = '';
    schritt = 1;
  }
  function abschliessen(ziel?: string) {
    d.einstellungen.module = entwurf;
    d.einstellungen.herkunft = herkunft;
    d.einstellungen.eingerichtet = true;
    if (nurBeispiel && daten === 'leer') leerStarten();
    speichern();
    zeige('Eingerichtet. Unter Mehr › Module kannst du jederzeit umstellen.');
    goto(ziel ?? (nurBeispiel && daten === 'untis' ? '/mehr/webuntis' : '/'));
  }
  function spaeter() {
    d.einstellungen.eingerichtet = true;
    speichern();
    goto('/');
  }
</script>

<div class="flaeche">
  <section class="karte box" aria-labelledby="einr-titel">
    <header class="kopf">
      <img src="/wortmarke.svg" alt="L.E.O." width="110" class="hell" />
      <img src="/wortmarke-dunkel.svg" alt="L.E.O." width="110" class="dunkel" />
      <span class="raum"></span>
      <button class="knopf leise" onclick={spaeter}>Später</button>
    </header>
    <ol class="schritte klein" aria-label="Schritte">
      {#each schritte as s, i}
        <li class:aktiv={i === schritt} class:fertig={i < schritt}><button disabled={i > schritt} onclick={() => (schritt = i)}>{i + 1}. {s}</button></li>
      {/each}
    </ol>

    {#if name === 'Bisher'}
      <h1 id="einr-titel">Womit arbeitest du bisher?</h1>
      <p class="leise">L.E.O. stellt dir danach passende Module zusammen. Alles lässt sich später ändern.</p>
      <div class="wege">
        {#each STARTWEGE as w (w.id)}
          <button class="weg" class:gewaehlt={herkunft === w.id} onclick={() => waehle(w.id)}>
            <b>{w.name}</b><span class="klein leise">{w.text}</span>
          </button>
        {/each}
      </div>

    {:else if name === 'Module'}
      <h1 id="einr-titel">Was brauchst du?</h1>
      <p class="leise">{weg ? `Vorschlag für „${weg.name}“. ` : ''}Schalte ein, was dir Arbeit abnimmt. Ausgeschaltetes verschwindet aus Navigation und Reitern, Daten gehen nie verloren.</p>
      <ModulAuswahl module={entwurf} kompakt aendern={(neu, h) => { entwurf = neu; hinweis = h; }} />
      {#if hinweis}<p class="klein hinweis" role="status">{hinweis}</p>{/if}
      <div class="fuss"><button class="knopf leise" onclick={() => (schritt = 0)}>Zurück</button><span class="raum"></span><span class="klein leise">{anzahlAn} zugeschaltet</span><button class="knopf haupt" onclick={() => (schritt += 1)}>Weiter</button></div>

    {:else if name === 'Daten'}
      <h1 id="einr-titel">Woher kommen deine Klassen?</h1>
      <div class="wege">
        <button class="weg" class:gewaehlt={daten === 'untis'} onclick={() => (daten = 'untis')}>
          <b>Aus WebUntis</b><span class="klein leise">Klassen, Schüler, Stundenplan und Fehlzeiten aus deinem WebUntis-Konto. Nur lesen, nichts wird dort geändert.</span>
        </button>
        <button class="weg" class:gewaehlt={daten === 'beispiel'} onclick={() => (daten = 'beispiel')}>
          <b>Erst mit Beispieldaten ausprobieren</b><span class="klein leise">Erfundene Klassen zum gefahrlosen Testen. WebUntis kannst du jederzeit unter Mehr verbinden.</span>
        </button>
        <button class="weg" class:gewaehlt={daten === 'leer'} onclick={() => (daten = 'leer')}>
          <b>Leer anfangen</b><span class="klein leise">Ohne Beispielklassen. Klassen kommen später aus WebUntis{MODULE.find((m) => m.id === 'import')?.bald ? ' oder dem Import (in Vorbereitung)' : ' oder dem Import'}.</span>
        </button>
      </div>
      <div class="fuss"><button class="knopf leise" onclick={() => (schritt -= 1)}>Zurück</button><span class="raum"></span><button class="knopf haupt" onclick={() => (schritt += 1)}>Weiter</button></div>

    {:else}
      <h1 id="einr-titel">Gut zu wissen</h1>
      {#if weg}
        <ul class="tipps">{#each weg.tipps as t}<li>{t}</li>{/each}</ul>
      {/if}
      <p class="klein leise">Dabei: {MODULE.filter((m) => !m.bald && istAn({ module: entwurf }, m.id)).map((m) => m.name).join(', ')}.</p>
      {#if nurBeispiel && daten === 'leer'}<p class="klein warn">Die Beispielklassen werden entfernt.</p>{/if}
      <div class="fuss"><button class="knopf leise" onclick={() => (schritt -= 1)}>Zurück</button><span class="raum"></span>
        <button class="knopf haupt" onclick={() => abschliessen()}>{nurBeispiel && daten === 'untis' ? 'Weiter zu WebUntis' : 'Los geht’s'}</button></div>
    {/if}
  </section>
</div>

<style>
  .flaeche { min-height: 100dvh; display: grid; place-items: center; padding: 16px; }
  .box { width: min(720px, 100%); display: flex; flex-direction: column; gap: var(--leo-a4); padding: var(--leo-a5) var(--leo-a6); }
  .kopf { display: flex; align-items: center; gap: var(--leo-a3); }
  .box h1 { font-size: var(--leo-text-xl); margin: 0; }
  .box p { margin: 0; line-height: 1.5; }
  .schritte { display: flex; gap: var(--leo-a2); list-style: none; padding: 0; margin: 0; flex-wrap: wrap; }
  .schritte button { background: none; border: 0; padding: 4px 10px; border-radius: var(--leo-r-pill); color: var(--leo-leise); font: inherit; }
  .schritte .aktiv button { background: var(--leo-akzent-hell); color: var(--leo-akzent); font-weight: 650; }
  .schritte .fertig button { color: var(--leo-tinte); }
  .schritte button:disabled { opacity: .6; }
  .wege { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--leo-a3); }
  .weg { text-align: left; display: flex; flex-direction: column; gap: 4px; padding: var(--leo-a4); border: 1px solid var(--leo-linie); border-radius: var(--leo-r-l); background: var(--leo-karte); color: var(--leo-tinte); font: inherit; min-height: 88px; }
  .weg:hover { border-color: var(--leo-akzent); }
  .weg.gewaehlt { border: 2px solid var(--leo-akzent); background: var(--leo-akzent-hell); padding: calc(var(--leo-a4) - 1px); }
  .weg b { font-weight: 650; }
  .fuss { display: flex; align-items: center; gap: var(--leo-a3); margin-top: var(--leo-a2); position: sticky; bottom: 0; background: var(--leo-karte); padding-top: var(--leo-a2); }
  .hinweis { color: var(--leo-akzent); }
  .tipps { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: var(--leo-a2); line-height: 1.5; }
  .warn { color: var(--leo-warnung); }
  .dunkel { display: none; }
  :global(:root[data-theme='dunkel']) .dunkel { display: block; }
  :global(:root[data-theme='dunkel']) .hell { display: none; }
  @media (max-width: 720px) { .box { padding: var(--leo-a4); } }
</style>
