<script lang="ts">
  import { istAn } from '$lib/module';
  import { page } from '$app/state';
  import { app, speichern, zeige, neueId, materialOeffnen } from '$lib/speicher.svelte';
  import { schuelerVon, kurznameIn, name, minuten, datumKurz, datumWt, mitarbeitTrend, PFEIL } from '$lib/hilfen';
  import { STUFEN, bausteinStufe, bausteineVon } from '$lib/bausteine';
  import { druck } from '$lib/druck';
  import Smiley from '$lib/ui/Smiley.svelte';
  import KursKopf from '$lib/ui/KursKopf.svelte';
  import type { MitarbeitEintrag, Stufe, Schueler } from '$lib/typen';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { stundeBestimmen, erfassbar, zeitstempel, stundenZahl, terminText, stundenAdresse, istTestKurs, testklasse } from '$lib/stundenzeit';
  import { lehrersicht, spaltenVorlage } from '$lib/sitzplan';
  import Werkzeuge from '$lib/ui/Werkzeuge.svelte';
  import { blockAm, reiheText } from '$lib/semester';
  import MaterialListe from '$lib/ui/MaterialListe.svelte';
  import { materialListe, zuletztGezeigt, alsGezeigt } from '$lib/material';
  import { standSetzen, letzteStunde, tageZwischen, seitText, LANGE_PAUSE, verlauf, vorschlaege as standVorschlaegeFuer, faelligeMerker, merkerDazu, merkerWeg, MERKER_VORSCHLAEGE } from '$lib/stand';
  import type { Merker } from '$lib/typen';

  const d = app.d!;
  const kurs = $derived(d.kurse.find((k) => k.id === page.params.id)!);
  const liste = $derived(kurs ? schuelerVon(d, kurs) : []);
  const kurzname = $derived(kurznameIn(liste)); // eindeutig bei gleichen Namen (B4)
  // Welche Stunde ist das? (E126) Echte Klassen nur zu ihren festen Zeiten, die Teststunde läuft ab Start.
  let jetzt = $state(new Date());
  onMount(() => {
    const t = setInterval(() => (jetzt = new Date()), 20_000);
    return () => clearInterval(t);
  });
  const minJetzt = $derived(jetzt.getHours() * 60 + jetzt.getMinutes());
  const slot = $derived(kurs ? stundeBestimmen(d, kurs, jetzt, {
    datum: page.url.searchParams.get('datum'), beginn: page.url.searchParams.get('beginn'), test: page.url.searchParams.get('test')
  }) : undefined)!;
  // Alles, was hier erfasst wird, bekommt das Datum der Stunde (auch beim Nachtragen am Wochenende)
  const heute = $derived(slot.datum);
  const nachgetragen = $derived(slot.art === 'nachtrag' || slot.art === 'vorab');
  const istTest = $derived(istTestKurs(kurs));
  const MARKE = { live: 'Läuft', bald: 'Gleich', vorbei: 'Vorbei', nachtrag: 'Nachtrag', vorab: 'Vorab', test: 'Teststunde', keine: '' } as const;
  const anteil = $derived(Math.max(0, Math.min(1, (minJetzt - minuten(slot.beginn)) / Math.max(1, minuten(slot.ende) - minuten(slot.beginn)))));
  const zeitText = $derived(minJetzt < minuten(slot.beginn) ? `beginnt in ${minuten(slot.beginn) - minJetzt} min` : minJetzt < minuten(slot.ende) ? `noch ${minuten(slot.ende) - minJetzt} min` : 'vorbei');
  function teststunde() {
    const id = testklasse(d);
    speichern();
    goto(`/stunde/${id}?test=${Date.now()}`);
  }

  // Einträge dieser Stunde = heute in diesem Kurs
  const heuteEintraege = $derived(d.mitarbeit.filter((e) => e.kursId === kurs.id && e.zeit.slice(0, 10) === heute));
  const letzter = (sid: string) => heuteEintraege.filter((e) => e.schuelerId === sid).at(-1);
  const fehlt = (sid: string) => d.fehlzeiten.find((f) => f.kursId === kurs.id && f.schuelerId === sid && f.datum === heute);
  const anwesend = $derived(liste.filter((s) => !fehlt(s.id)));
  const ohneEintrag = $derived(anwesend.filter((s) => !letzter(s.id)).length);

  function bewerten(s: Schueler, stufe: Stufe) {
    const alt = letzter(s.id);
    if (alt) {
      const vorher = alt.stufe;
      alt.stufe = stufe;
      speichern();
      zeige(`${kurzname(s)}: ${STUFEN[stufe - 1].name}`, () => { alt.stufe = vorher; speichern(); });
    } else {
      const e: MitarbeitEintrag = { id: neueId(), kursId: kurs.id, schuelerId: s.id, zeit: zeitstempel(slot), stufe, bausteine: [] };
      d.mitarbeit.push(e);
      speichern();
      zeige(`${kurzname(s)}: ${STUFEN[stufe - 1].name} gespeichert`, () => {
        d.mitarbeit.splice(d.mitarbeit.findIndex((x) => x.id === e.id), 1);
        speichern();
      });
    }
  }

  // Anwesenheit (E84): nur da / fehlt. Zweiter Klick auf „fehlt“ erfasst eine Verspätung.
  const zuSpaet = (sid: string) => d.verspaetungen.find((v) => v.kursId === kurs.id && v.schuelerId === sid && v.datum === heute);
  const hhmm = (dt = new Date()) => `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  function fehltSetzen(s: Schueler) {
    const v = zuSpaet(s.id);
    if (v) d.verspaetungen.splice(d.verspaetungen.indexOf(v), 1);
    if (!fehlt(s.id)) d.fehlzeiten.push({ id: neueId(), kursId: kurs.id, schuelerId: s.id, datum: heute, stunden: stundenZahl(slot), status: 'offen' });
    speichern();
  }
  function daSetzen(s: Schueler) {
    const f = fehlt(s.id);
    if (f) d.fehlzeiten.splice(d.fehlzeiten.indexOf(f), 1);
    const v = zuSpaet(s.id);
    if (v) d.verspaetungen.splice(d.verspaetungen.indexOf(v), 1);
    speichern();
  }
  let verspaetung = $state<{ s: Schueler; zeit: string } | null>(null);
  function anwesenheitKlick(s: Schueler) {
    if (fehlt(s.id)) verspaetung = { s, zeit: nachgetragen ? vorschlaege[0].zeit : hhmm() }; // zweiter Klick: Verspätung anbieten
    else if (zuSpaet(s.id)) verspaetung = { s, zeit: zuSpaet(s.id)!.ankunft };
    else {
      fehltSetzen(s);
      zeige(`${kurzname(s)} fehlt · nochmal tippen für Verspätung`, () => daSetzen(s));
    }
  }
  // Zeitvorschläge (E84): jetzt oder Minuten nach Stundenbeginn, eigene Zeit über das Feld
  const vorschlaege = $derived([5, 10, 15, 20, 30].map((m) => {
    const t = minuten(slot.beginn) + m;
    return { m, zeit: `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` };
  }));
  // Sitzplan-Ansicht: Antippen erfasst Anwesenheit oder öffnet die mündlichen Leistungen
  // Module (module.ts): was aus ist, erscheint in der Stunde nicht; erfasst wird trotzdem nichts anders
  const muendlichAn = $derived(istAn(d.einstellungen, 'muendlich'));
  const sitzplanAn = $derived(istAn(d.einstellungen, 'sitzplan'));
  const zufallAn = $derived(istAn(d.einstellungen, 'zufall'));
  const ansicht = $derived(sitzplanAn ? d.einstellungen.liveAnsicht : 'liste');
  let sitzModus = $state<'anwesenheit' | 'mitarbeit'>(page.url.searchParams.has('mitarbeit') && istAn(app.d?.einstellungen, 'muendlich') ? 'mitarbeit' : 'anwesenheit');
  function platzKlick(s: Schueler) {
    if (sitzModus === 'anwesenheit') anwesenheitKlick(s);
    else oeffnen(s);
  }
  function verspaetungSpeichern() {
    if (!verspaetung) return;
    const { s, zeit } = verspaetung;
    daSetzen(s);
    const min = Math.max(0, minuten(zeit) - minuten(slot.beginn));
    d.verspaetungen.push({ id: neueId(), kursId: kurs.id, schuelerId: s.id, datum: heute, ankunft: zeit, minuten: min });
    speichern();
    zeige(`${kurzname(s)}: ${min} min verspätet`);
    verspaetung = null;
  }

  // Fenster mit Textbausteinen und Kommentar
  let fenster = $state<{ s: Schueler } | null>(null);
  function oeffnen(s: Schueler, stufe?: Stufe) {
    if (stufe && !fehlt(s.id)) {
      const e = letzter(s.id);
      if (!e) bewerten(s, stufe);
      else if (e.stufe !== stufe) { e.stufe = stufe; speichern(); }
    }
    fenster = { s };
  }
  const fensterEintrag = $derived(fenster ? letzter(fenster.s.id) : undefined);
  function fensterStufe(stufe: Stufe) {
    if (!fenster) return;
    const e = fensterEintrag;
    if (e) { e.stufe = stufe; speichern(); } else bewerten(fenster.s, stufe);
  }
  function baustein(t: string) {
    const e = fensterEintrag;
    if (!e) return;
    const i = e.bausteine.indexOf(t);
    if (i >= 0) e.bausteine.splice(i, 1); else e.bausteine.push(t);
    speichern();
  }
  const bausteine = $derived(bausteineVon(d.einstellungen)); // eigene Bausteine (E110)
  const bausteineSortiert = $derived(
    fensterEintrag ? [...bausteine].sort((a, b) => Math.abs(a.stufe - fensterEintrag.stufe) - Math.abs(b.stufe - fensterEintrag.stufe)) : bausteine
  );
  const chipArt = (t: string) => { const s = bausteinStufe(t, bausteine) ?? 3; return s <= 2 ? 'pos' : s >= 4 ? 'neg' : 'neu'; };

  // Zufall und Gruppen (P5–P8, E109) als eigener Baustein
  let gewaehltId = $state<string | undefined>();
  const zufallName = $derived(gewaehltId ? d.schueler.find((s) => s.id === gewaehltId) : undefined);
  const gruppeVon = $derived.by(() => {
    const satz = kurs.gruppenAktiv ? kurs.gruppensaetze?.find((x) => x.id === kurs.gruppenAktiv) : undefined;
    const m = new Map<string, number>();
    satz?.gruppen.forEach((g, i) => g.forEach((id) => m.set(id, i + 1)));
    return m;
  });

  // Lernstoff (E70, E78)
  $effect.pre(() => {
    if (kurs && !kurs.lernstoff[heute]) kurs.lernstoff[heute] = { text: '', hausaufgabe: '' };
  });
  const lernstoff = $derived(kurs?.lernstoff[heute]);
  // Semesterplanung (E114): welcher Block der Reihe ist heute dran? Nur wenn das Modul an ist
  const planAn = $derived(istAn(d.einstellungen, 'planung'));
  const block = $derived(planAn ? blockAm(d, kurs, heute) : undefined);
  let mehrBlock = $state(false);
  // Dateiablage (V14): Material der Stunde, der Reihe und der Klasse; was zuletzt gezeigt wurde
  const ablageAn = $derived(istAn(d.einstellungen, 'ablage'));
  const material = $derived(ablageAn ? materialListe(d.material, kurs.id, heute, block?.reihe?.id) : []);
  const zuletzt = $derived(ablageAn ? zuletztGezeigt(d.material, kurs.id, heute) : null);
  async function wiederOeffnen(m: (typeof d.material)[number]) {
    if ((await materialOeffnen(m)) && alsGezeigt(m, heute)) speichern();
  }
  function blockMehr() {
    if (!block?.reihe) return;
    const r = kurs.reihen?.find((x) => x.id === block.reihe!.id);
    if (!r) return;
    r.bloecke += mehrBlock ? -1 : 1;
    mehrBlock = !mehrBlock;
    speichern();
    zeige(mehrBlock ? `${r.titel}: ein Block mehr, der Plan verschiebt sich` : 'zurückgenommen');
  }
  // Wo wir stehengeblieben sind (Modul „stand“, V18): oben der Stand der letzten Stunde, rechts der Stand für die nächste.
  // Der neue Stand wird beim Tippen gespeichert, „Stunde abschließen“ ist dafür nicht mehr nötig.
  const standAn = $derived(istAn(d.einstellungen, 'stand'));
  const vorher = $derived(standAn ? letzteStunde(kurs, heute) : undefined);
  const davor = $derived(vorher && tageZwischen(vorher.datum, heute) >= LANGE_PAUSE ? verlauf(kurs, ablageAn ? d.material : [], vorher.datum, 4).slice(1) : []);
  let davorZeigen = $state(false);
  const merkerJetzt = $derived(standAn ? faelligeMerker(kurs, heute) : []);
  const merkerNeu = $derived((kurs?.merker ?? []).filter((m) => m.seit >= heute));
  let standText = $state('');
  let standFuer = '';
  $effect.pre(() => {
    if (kurs && standFuer !== kurs.id + heute) { standFuer = kurs.id + heute; standText = kurs.lernstoff[heute]?.stand ?? ''; davorZeigen = false; }
  });
  let standFeld = $state<HTMLTextAreaElement>();
  const thema = $derived(lernstoff?.text?.trim() || block?.reihe?.titel || '');
  const standVorschlaege = $derived(standVorschlaegeFuer(thema));
  function standTippen() { standSetzen(kurs, heute, standText); speichern(); }
  function standVorschlag(v: { wert: string; offen: boolean }) {
    standText = v.wert;
    standTippen();
    if (v.offen && standFeld) { const f = standFeld; setTimeout(() => { f.focus(); f.setSelectionRange(f.value.length, f.value.length); }); }
  }
  let merkerText = $state('');
  function merken(text = merkerText) {
    if (!merkerDazu(kurs, text, neueId(), heute)) return;
    if (text === merkerText) merkerText = '';
    speichern();
  }
  function abhaken(m: Merker, wort = 'erledigt') {
    const zurueck = merkerWeg(kurs, m.id);
    speichern();
    zeige(`„${m.text}“ ${wort}`, () => { zurueck?.(); speichern(); });
  }
  function abschliessen() {
    speichern();
    const teile = ['Stunde gespeichert'];
    if (muendlichAn && ohneEintrag && d.einstellungen.stundenendeHinweis) teile.push(`${ohneEintrag} ohne mündliche Bewertung`);
    if (standAn && !standText.trim()) teile.push('noch kein Stand für das nächste Mal');
    zeige(teile.join(' · '));
  }
  let nurMitarbeit = $state(page.url.searchParams.has('mitarbeit') && istAn(app.d?.einstellungen, 'muendlich'));
  let nurOhne = $state(false);

</script>

<svelte:head><title>{kurs?.name} · Stunde</title></svelte:head>

{#if kurs}
  <KursKopf {kurs} aktiv="stunde" info="{slot.art === 'keine' ? 'Heute keine Stunde' : slot.art === 'test' ? 'Teststunde' : nachgetragen ? 'Nachtrag' : 'Live-Stunde'} · Raum {kurs.raum} · {anwesend.length} von {liste.length} da">
    {#snippet rechts()}
      {#if erfassbar(slot)}
      {#if sitzplanAn}
      <div class="umschalter" role="group" aria-label="Ansicht">
        <button aria-pressed={d.einstellungen.liveAnsicht === 'liste'} onclick={() => { d.einstellungen.liveAnsicht = 'liste'; speichern(); }}>Alphabet</button>
        <button aria-pressed={d.einstellungen.liveAnsicht === 'sitzplan'} onclick={() => { d.einstellungen.liveAnsicht = 'sitzplan'; speichern(); }}>Sitzplan</button>
      </div>
      {/if}
      {#if muendlichAn}
      <button class="pille" aria-pressed={nurOhne} onclick={() => (nurOhne = !nurOhne)}>Noch nicht bewertet <b>{ohneEintrag}</b></button>
      <button class="pille" aria-pressed={nurMitarbeit} onclick={() => (nurMitarbeit = !nurMitarbeit)}>Nur mündlich</button>
      {/if}
      <button class="knopf haupt" onclick={abschliessen}>Stunde abschließen</button>
      {/if}
    {/snippet}
  </KursKopf>

  <div class="seite">
    {#if !erfassbar(slot)}
      <section class="karte keine">
        <h2>Heute keine Stunde in {kurs.klasse}</h2>
        <p class="leise">Stunden laufen zu ihren festen Zeiten laut Stundenplan. So landet alles, was du erfasst, am richtigen Tag.</p>
        <div class="zeile wrap">
          {#if slot.letzte}<a class="knopf haupt" href={stundenAdresse(kurs.id, slot.letzte)}>Letzte Stunde nachtragen · {terminText(slot.letzte)}</a>{/if}
          {#if slot.naechste}<a class="knopf" href={stundenAdresse(kurs.id, slot.naechste)}>Nächste Stunde · {terminText(slot.naechste)}</a>{/if}
          <button class="knopf leise" onclick={teststunde}>Teststunde starten</button>
        </div>
        {#if !slot.letzte && !slot.naechste}<p class="klein leise">Für diese Klasse steht nichts im Stundenplan. Unter <a href="/mehr/webuntis">Mehr › WebUntis</a> abgleichen.</p>{/if}
        <p class="klein leise">Die Teststunde läuft in einer Testklasse mit erfundenen Namen, die Zeit läuft ab dem Start. Deine echten Klassen bleiben unberührt.</p>
      </section>
    {:else}
    <!-- Die Kachel füllt sich mit der Zeit (statt eigenem Balken), die Uhrzeit steht nur einmal da -->
    <div class="balken karte" class:test={slot.art === 'test'} class:nachtrag={nachgetragen}
      role={slot.balken ? 'progressbar' : undefined} aria-valuemin="0" aria-valuemax="100" aria-valuenow={slot.balken ? Math.round(anteil * 100) : undefined}>
      {#if slot.balken}<div class="fuellung" class:voll={anteil >= 1} style:width="{anteil * 100}%"></div>{/if}
      <div class="zeile wrap inhalt">
        <span class="marke" class:test={slot.art === 'test'}>{MARKE[slot.art]}</span>
        <b class="zahl">{nachgetragen ? terminText(slot) : `${slot.beginn}–${slot.ende}`}</b>
        {#if slot.balken}<span class="zahl">{zeitText}</span>{/if}
        {#if slot.ausfall}<span class="klein leise">fällt laut WebUntis aus</span>
        {:else if nachgetragen}<span class="klein leise">wird für diesen Tag gespeichert</span>
        {:else if slot.art === 'test'}<span class="klein leise">erfundene Namen</span>{/if}
        <span class="raum"></span>
        {#if slot.art === 'test'}<button class="pille" onclick={teststunde}>Neu starten</button>
        {:else if istTest}<button class="pille" onclick={teststunde}>Als Teststunde starten</button>{/if}
      </div>
    </div>
    {#if standAn && (vorher || merkerJetzt.length)}
      <div class="stehen">
        <div class="zeile wrap stehkopf">
          <b>Wo wir stehengeblieben sind</b>
          {#if vorher}<span class="leise klein">{datumWt(vorher.standDatum)} · {seitText(vorher.standDatum, heute)}</span>{/if}
          {#if davor.length}<button class="pille klein" aria-pressed={davorZeigen} onclick={() => (davorZeigen = !davorZeigen)}>{davorZeigen ? 'davor ausblenden' : `Lange Pause · ${davor.length === 1 ? 'die Stunde' : `${davor.length} Stunden`} davor`}</button>{/if}
        </div>
        {#if vorher?.stand}<p class="standtext">{vorher.stand}</p>
        {:else if vorher?.thema}<p><span class="leise">Thema:</span> {vorher.thema}</p>{/if}
        {#if vorher?.hausaufgabe}<p class="klein"><span class="leise">Hausaufgabe bis heute{vorher.datum !== vorher.standDatum ? ` (aufgegeben ${datumKurz(vorher.datum)})` : ''}:</span> {vorher.hausaufgabe}</p>{/if}
        {#if merkerJetzt.length}
          <div class="merker" role="group" aria-label="Nicht vergessen">
            <span class="klein leise">Nicht vergessen:</span>
            {#each merkerJetzt as m (m.id)}<button class="chip merk" onclick={() => abhaken(m)} title="Antippen, wenn erledigt"><span class="kasten" aria-hidden="true"></span>{m.text}</button>{/each}
          </div>
        {/if}
        {#if block && (reiheText(block) || lernstoff?.text)}<p class="klein"><span class="leise">Heute geplant:</span> {[reiheText(block), lernstoff?.text].filter(Boolean).join(' · ')}</p>{/if}
        {#if zuletzt}<p class="klein zuletzt"><span class="leise">Zuletzt gezeigt ({datumKurz(zuletzt.datum)}):</span> {#each zuletzt.material as m}<button class="pille" onclick={() => wiederOeffnen(m)}>{m.titel}</button>{/each}</p>{/if}
        {#if davorZeigen}
          <ol class="davor">
            {#each davor as v (v.datum)}
              <li><b class="klein">{datumWt(v.datum)}</b> <span>{v.stand || v.thema || 'ohne Eintrag'}</span>{#if v.hausaufgabe}<span class="klein leise"> · HA: {v.hausaufgabe}</span>{/if}{#if v.gezeigt.length}<span class="klein leise"> · gezeigt: {v.gezeigt.join(', ')}</span>{/if}</li>
            {/each}
          </ol>
        {/if}
      </div>
    {:else if block && reiheText(block)}
      <div class="stehen geplant"><b>Heute geplant</b> <span class="leise klein">{reiheText(block)}</span>{#if lernstoff?.text}<p>{lernstoff.text}</p>{/if}</div>
    {/if}

    <div class="bereich" class:breit={nurMitarbeit}>
      <section class="karte schueler">
        {#if ansicht === 'sitzplan'}
          {@const sp = kurs.sitzplan}
          <div class="zeile sitzkopf">
            {#if muendlichAn}
            <div class="umschalter" role="group" aria-label="Antippen bedeutet">
              <button aria-pressed={sitzModus === 'anwesenheit'} onclick={() => (sitzModus = 'anwesenheit')}>Anwesenheit</button>
              <button aria-pressed={sitzModus === 'mitarbeit'} onclick={() => (sitzModus = 'mitarbeit')}>Mündlich</button>
            </div>
            {/if}
            <span class="klein leise">{sitzModus === 'anwesenheit' ? 'Antippen: fehlt · nochmal: kommt später' : 'Antippen: Smiley, Bausteine, Kommentar'}</span>
          </div>
          <div class="wisch"><div class="sitze" style:grid-template-columns={spaltenVorlage(sp, 46)}>
            {#each lehrersicht(sp.tische.length) as i (i)}
              {@const tisch = sp.tische[i]}
              {@const sid = sp.belegung[i]}
              {@const s = sid ? d.schueler.find((x) => x.id === sid) : undefined}
              {#if !tisch}<div></div>
              {:else if !s}<div class="platz frei"></div>
              {:else}
                {@const f = fehlt(s.id)}
                {@const v = zuSpaet(s.id)}
                {@const e = letzter(s.id)}
                <button class="platz" class:fehlt={!!f} class:spaet={!!v} class:gewaehlt={zufallName?.id === s.id} onclick={() => platzKlick(s)}
                  aria-label="{name(s)}: {f ? 'fehlt' : v ? `${v.minuten} min verspätet` : 'da'}">
                  <span class="pn">{#if gruppeVon.get(s.id)}<b class="gnr">G{gruppeVon.get(s.id)}</b> {/if}{kurzname(s)}</span>
                  <span class="pu">
                    {#if f}<span class="kennz ue">fehlt</span>{:else if v}<span class="kennz">+{v.minuten}′</span>{/if}
                    {#if e && !f}<Smiley stufe={e.stufe} groesse={24} />{/if}
                  </span>
                </button>
              {/if}
            {/each}
          </div></div>
          <div class="tafel klein leise">Lehrertisch · Tafel</div>
          {@const ohnePlatz = liste.filter((x) => !Object.values(sp.belegung).includes(x.id))}
          {#if ohnePlatz.length}<p class="klein leise">Ohne Platz: {ohnePlatz.map(kurzname).join(', ')} · <a href="/sitzplan/{kurs.id}">Sitzplan bearbeiten</a></p>{/if}
          <p class="klein leise hilfe">Oben umschalten, was Antippen bedeutet. <a href="/sitzplan/{kurs.id}">Sitzplan bearbeiten</a></p>
        {:else}
        <div class="raster">
          {#each (nurOhne ? liste.filter((x) => !letzter(x.id) && !fehlt(x.id)) : liste) as s (s.id)}
            {@const f = fehlt(s.id)}
            {@const e = letzter(s.id)}
            {@const v = zuSpaet(s.id)}
            {@const tr = mitarbeitTrend(d, kurs.id, s.id)}
            <div class="sk" class:fehlt={!!f} class:gewaehlt={zufallName?.id === s.id}>
              <div class="zeile">
                <button class="nm" onclick={() => oeffnen(s)} title="Bausteine, Kommentar, Anwesenheit">{kurzname(s)}</button>
                {#if tr}<span class="trend {tr}" title="mündlich {tr} als im Vormonat">{PFEIL[tr]}</span>{/if}
                <button class="anw" class:fehlt={!!f} class:spaet={!!v} onclick={() => anwesenheitKlick(s)} aria-label="Anwesenheit {name(s)}">{f ? 'fehlt' : v ? `+${v.minuten}′` : 'da'}</button>
              </div>
              {#if f}
                <div class="klein leise fehltext">fehlt · nochmal auf „fehlt“ tippen, wenn jemand später kommt</div>
              {:else if muendlichAn}
                <div class="smileys" role="group" aria-label="Mündlich {name(s)}">
                  {#each STUFEN as st}
                    <button class="sm" class:an={e?.stufe === st.stufe} aria-pressed={e?.stufe === st.stufe} aria-label={st.name}
                      use:druck={{ kurz: () => bewerten(s, st.stufe), lang: () => oeffnen(s, st.stufe) }}>
                      <Smiley stufe={st.stufe} groesse={34} leer={!!e && e.stufe !== st.stufe} />
                    </button>
                  {/each}
                </div>
                {#if e && (e.bausteine.length || e.kommentar)}
                  <div class="klein leise bs">{[...e.bausteine, e.kommentar].filter(Boolean).join(', ')}</div>
                {/if}
              {/if}
            </div>
          {/each}
        </div>
        <p class="klein leise hilfe">
          {#if muendlichAn}Tipp auf ein Smiley speichert sofort. Doppelklick oder langes Drücken öffnet Textbausteine und Kommentar.{/if} „da“ antippen = fehlt, nochmal = Verspätung mit Uhrzeit.
          {#if muendlichAn && d.einstellungen.stundenendeHinweis && ohneEintrag}<br /><b>{ohneEintrag} Anwesende noch ohne mündliche Bewertung.</b>{/if}
        </p>
        {/if}
      </section>

      {#if !nurMitarbeit}
        <aside>
          {#if zufallAn}<Werkzeuge {kurs} {anwesend} bind:gewaehlt={gewaehltId} />{/if}
          {#if lernstoff}
          <section class="karte stapel">
            <h2>Lernstoff</h2>
            <label class="feld"><span>Inhalt der Stunde</span><textarea rows="3" bind:value={lernstoff.text} oninput={speichern} placeholder="Tippen oder diktieren"></textarea></label>
            <label class="feld"><span>Hausaufgabe</span><input bind:value={lernstoff.hausaufgabe} oninput={speichern} /></label>
          </section>
          {/if}
          {#if ablageAn}
          <section class="karte stapel">
            <h2>Material</h2>
            <MaterialListe {kurs} eintraege={material} ziel={{ ort: 'stunde', datum: heute }} live leer="Für heute liegt nichts bereit. Neues hängt an dieser Stunde." />
          </section>
          {/if}
          {#if standAn}
          <section class="karte stapel">
            <h2>Für die nächste Stunde</h2>
            {#if standVorschlaege.length}
              <div class="vorschlag" role="group" aria-label="Stand antippen">
                {#each standVorschlaege as v}<button class="chip" aria-pressed={standText === v.wert} onclick={() => standVorschlag(v)}>{v.text}</button>{/each}
              </div>
            {/if}
            <label class="feld"><span>Wo seid ihr stehengeblieben? (nur für dich)</span><textarea rows="2" bind:this={standFeld} bind:value={standText} oninput={standTippen} placeholder="z. B. Aufgabenblock A bis Nr. 4 verglichen"></textarea></label>
            <span class="klein leise">Wird beim Tippen gespeichert. Die nächste Stunde {kurs.klasse} {kurs.fach} beginnt damit.</span>
            {#if block?.reihe}
              <button class="pille" aria-pressed={mehrBlock} onclick={blockMehr} title="Die Reihe braucht länger: alle folgenden Blöcke rücken einen weiter">{mehrBlock ? `✓ ${block.reihe.titel} +1 Block` : `${block.reihe.titel} braucht 1 Block mehr`}</button>
            {/if}
            <div class="feld">
              <span>Nicht vergessen beim nächsten Mal</span>
              <div class="zeile merkzeile"><input class="eingabe raum" bind:value={merkerText} onkeydown={(e) => e.key === 'Enter' && merken()} placeholder="z. B. Tests zurückgeben" aria-label="Neuer Merker" /><button class="knopf" onclick={() => merken()} disabled={!merkerText.trim()}>Merken</button></div>
              <div class="vorschlag" role="group" aria-label="Merker antippen">
                {#each MERKER_VORSCHLAEGE.filter((t) => !(kurs.merker ?? []).some((m) => m.text === t)) as t}<button class="chip" onclick={() => merken(t)}>+ {t}</button>{/each}
              </div>
              {#each merkerNeu as m (m.id)}<span class="chip gemerkt">{m.text}<button class="weg" aria-label="„{m.text}“ entfernen" onclick={() => abhaken(m, 'entfernt')}>×</button></span>{/each}
            </div>
          </section>
          {/if}
        </aside>
      {/if}
    </div>
    {/if}
  </div>

  {#if verspaetung}
    <div class="hintergrund" role="presentation" onclick={(ev) => ev.target === ev.currentTarget && (verspaetung = null)}>
      <div class="schweben dialog klein-dlg" role="dialog" aria-modal="true" aria-label="Verspätung">
        <h2>{name(verspaetung.s)} kommt später</h2>
        <p class="klein leise">Ankunft antippen oder eigene Zeit eingeben. Stundenbeginn {slot.beginn}. Verspätungen zählen nicht zu den Fehlzeiten.</p>
        <div class="chips vorschlag" role="group" aria-label="Zeitvorschläge">
          <button class="chip" aria-pressed={verspaetung.zeit === hhmm()} onclick={() => verspaetung && (verspaetung.zeit = hhmm())}>jetzt · {hhmm()}</button>
          {#each vorschlaege as v}<button class="chip" aria-pressed={verspaetung.zeit === v.zeit} onclick={() => verspaetung && (verspaetung.zeit = v.zeit)}>+{v.m} min</button>{/each}
        </div>
        <div class="zeile">
          <input class="eingabe zeitfeld" type="time" bind:value={verspaetung.zeit} aria-label="eigene Ankunftszeit" />
          <span class="leise">= {Math.max(0, minuten(verspaetung.zeit || '00:00') - minuten(slot.beginn))} min</span>
        </div>
        <div class="zeile ende wrap">
          <button class="knopf leise" onclick={() => { if (verspaetung) fehltSetzen(verspaetung.s); verspaetung = null; }}>Fehlt doch</button>
          <button class="knopf leise" onclick={() => { if (verspaetung) daSetzen(verspaetung.s); verspaetung = null; }}>Pünktlich da</button>
          <button class="knopf haupt" onclick={verspaetungSpeichern}>Verspätung speichern</button>
        </div>
      </div>
    </div>
  {/if}

  {#if fenster}
    {@const s = fenster.s}
    {@const f = fehlt(s.id)}
    {@const v = zuSpaet(s.id)}
    <div class="hintergrund" role="presentation" onclick={(ev) => ev.target === ev.currentTarget && (fenster = null)}>
      <div class="schweben dialog" role="dialog" aria-modal="true" aria-label="Mündlich {name(s)}">
        <div class="zeile"><h2 class="raum">{name(s)}</h2><a class="klein" href="/schueler/{s.id}?kurs={kurs.id}">Schülerkarte</a></div>
        <div class="anwzeile">
          <button class="pille" aria-pressed={!f && !v} onclick={() => daSetzen(s)}>anwesend</button>
          <button class="pille" aria-pressed={!!f} onclick={() => fehltSetzen(s)}>fehlt</button>
          <button class="pille" aria-pressed={!!v} onclick={() => { fenster = null; verspaetung = { s, zeit: v?.ankunft ?? hhmm() }; }}>{v ? `verspätet ${v.minuten} min` : 'verspätet …'}</button>
        </div>
        {#if !f}
          <p class="klein leise">Mündlich heute</p>
          <div class="grosse">
            {#each STUFEN as st}
              <button class="sm gross" class:an={fensterEintrag?.stufe === st.stufe} aria-pressed={fensterEintrag?.stufe === st.stufe} aria-label={st.name} onclick={() => fensterStufe(st.stufe)}>
                <Smiley stufe={st.stufe} groesse={54} leer={!!fensterEintrag && fensterEintrag.stufe !== st.stufe} />
              </button>
            {/each}
          </div>
          {#if fensterEintrag}
            <p class="klein leise">Textbausteine (optional, mehrere möglich)</p>
            <div class="chips">
              {#each bausteineSortiert as b}
                <button class="chip {chipArt(b.text)}" aria-pressed={fensterEintrag.bausteine.includes(b.text)} onclick={() => baustein(b.text)}>{b.text}</button>
              {/each}
            </div>
            <label class="feld"><span>Eigener Kommentar (nur dieser Eintrag)</span>
              <input bind:value={fensterEintrag.kommentar} oninput={speichern} placeholder="z. B. Vortrag gut strukturiert" />
            </label>
          {:else}
            <p class="klein leise">Erst ein Smiley wählen, dann Bausteine.</p>
          {/if}
        {/if}
        <div class="zeile ende"><button class="knopf haupt" onclick={() => (fenster = null)}>Fertig</button></div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .seite { padding: 18px 32px 40px; display: flex; flex-direction: column; gap: 16px; }
  .balken { position: relative; overflow: hidden; padding: 14px 20px; }
  .balken .inhalt { position: relative; }
  .fuellung { position: absolute; inset: 0 auto 0 0; background: var(--leo-akzent-hell); border-right: 2px solid var(--leo-akzent); transition: width 20s linear; }
  .fuellung.voll { border-right: 0; }
  .balken.test .fuellung { background: var(--leo-stern-hell); border-right-color: var(--leo-stern); }
  .bereich { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
  .bereich.breit { grid-template-columns: 1fr; }
  .schueler { padding: 16px; }
  .raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(228px, 1fr)); gap: 10px; }
  .sk { border: 1px solid var(--leo-linie); border-radius: var(--leo-r-l); padding: 8px 10px 10px; background: var(--leo-karte); display: flex; flex-direction: column; gap: 6px; }
  .sk.fehlt { background: var(--leo-taste); }
  .sk.fehlt .nm { color: var(--leo-leise); }
  .sk.gewaehlt { background: var(--leo-auswahl); border: 2px solid var(--leo-akzent); }
  .nm { flex: 1; text-align: left; background: none; border: 0; font-weight: 650; font-size: 15px; padding: 6px 0; min-height: 36px; }
  .anw { min-width: 44px; min-height: 32px; border-radius: var(--leo-r-s); border: 1px solid var(--leo-linie); background: var(--leo-karte); color: var(--leo-leise); font-size: 12px; font-weight: 700; }
  .anw.fehlt { background: var(--leo-warnung-hell); color: var(--leo-warnung); border-color: transparent; }
  .anw.spaet { background: var(--leo-stern-hell); color: #8a6200; border-color: transparent; }
  .smileys { display: flex; justify-content: space-between; }
  .sm { border: 0; background: none; padding: 3px; border-radius: 50%; line-height: 0; -webkit-touch-callout: none; user-select: none; touch-action: manipulation; }
  .sm.an { box-shadow: 0 0 0 2px var(--leo-akzent); }
  .bs { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fehltext { padding: 8px 0; }
  .hilfe { margin: 14px 4px 0; }
  aside { display: flex; flex-direction: column; gap: 16px; }
  .umschalter { display: inline-flex; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-pill); overflow: hidden; }
  .umschalter button { border: 0; background: var(--leo-karte); padding: 0 14px; min-height: 34px; color: var(--leo-leise); }
  .umschalter button[aria-pressed='true'] { background: var(--leo-akzent); color: var(--leo-auf-akzent); font-weight: 600; }
  .tafel { text-align: center; border-top: 3px solid var(--leo-linie); margin: 14px 20% 6px; padding-top: 4px; }
  .wisch { overflow-x: auto; }
  .sitze { display: grid; gap: 6px; }
  .platz { min-height: 64px; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); background: var(--leo-karte); padding: 6px 8px; display: flex; flex-direction: column; justify-content: space-between; text-align: left; }
  .platz.frei { background: var(--leo-flaeche-leise); border-style: dashed; }
  .platz.fehlt { background: var(--leo-taste); color: var(--leo-leise); }
  .platz.spaet { border-color: #e3bf3c; }
  .sitzkopf { margin-bottom: 10px; flex-wrap: wrap; }
  .vorschlag { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0 12px; }
  .vorschlag .chip[aria-pressed='true'] { background: var(--leo-akzent-hell); }

  .platz.gewaehlt { background: var(--leo-auswahl); border: 2px solid var(--leo-akzent); }
  .pn { font-weight: 650; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pu { display: flex; justify-content: flex-end; align-items: center; gap: 4px; line-height: 0; }
  .zeitfeld { font-size: 20px; }
  .klein-dlg { width: min(440px, 100%); }
  .wrap { flex-wrap: wrap; }
  .stehen { background: var(--leo-stern-hell); border: 1px solid #ecd28a; border-radius: var(--leo-r-l); padding: 12px 18px; }
  .stehen p { margin: 4px 0 0; font-size: 15px; }
  .zuletzt { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 6px 0 0; }
  .stehkopf { gap: 10px; }
  .merkzeile input { min-width: 0; }
  .standtext { font-weight: 600; }
  .merker { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 8px 0 0; }
  .merk { background: var(--leo-karte); border-color: #ecd28a; }
  .kasten { width: 14px; height: 14px; border: 2px solid var(--leo-leise); border-radius: 3px; display: inline-block; }
  .merk:hover .kasten { border-color: var(--leo-akzent); background: var(--leo-akzent-hell); }
  .davor { margin: 10px 0 0; padding: 8px 0 0 18px; border-top: 1px dashed #ecd28a; display: flex; flex-direction: column; gap: 4px; }
  .gemerkt { background: var(--leo-flaeche-leise); margin: 0 6px 6px 0; }
  .weg { border: 0; background: none; color: var(--leo-leise); font-size: 16px; padding: 0 2px 0 6px; min-height: 28px; }
  .stehen.geplant { background: var(--leo-flaeche-leise); border-color: var(--leo-linie-fein); }
  .gnr { color: var(--leo-akzent); font-size: 11px; margin-right: 3px; }
  .stapel { display: flex; flex-direction: column; gap: 10px; }
  .stapel h2 { margin-bottom: 2px; }
  .anwzeile { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 6px; }
  .grosse { display: flex; gap: 8px; flex-wrap: wrap; }
  .sm.gross { padding: 4px; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  .chip { cursor: pointer; }
  .ende { justify-content: flex-end; margin-top: 18px; }
  .dialog p { margin: 14px 0 8px; }
  @media (max-width: 1000px) { .bereich { grid-template-columns: 1fr; } }
  @media (max-width: 720px) { .seite { padding: 12px; } .raster { grid-template-columns: 1fr; } .sitze { gap: 4px; } .platz { padding: 4px; min-height: 58px; } .pn { font-size: 11px; white-space: normal; overflow-wrap: break-word; hyphens: auto; line-height: 1.2; } }
  .keine { display: flex; flex-direction: column; gap: 10px; }
  .keine h2, .keine p { margin: 0; }
  .balken.test { border-color: var(--leo-stern); }
  .marke { font-size: var(--leo-text-s); font-weight: 600; padding: 2px 10px; border-radius: 99px; background: var(--leo-akzent-hell); color: var(--leo-akzent); }
  .marke.test { background: var(--leo-stern-hell); color: var(--leo-stern); }
  .link { background: none; border: 0; padding: 0; font: inherit; color: var(--leo-akzent); text-decoration: underline; cursor: pointer; }
</style>
