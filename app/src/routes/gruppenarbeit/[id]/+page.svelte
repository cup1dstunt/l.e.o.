<script lang="ts">
  // Gruppenarbeit einer Klasse (P9, E118): Projekte mit festen Gruppen über mehrere Stunden,
  // Gruppennote aus dem Projektraster, Abweichung je Mitglied, Übernahme als eine Notenbuchspalte.
  import { page } from '$app/state';
  import { app, speichern, zeige, neueId } from '$lib/speicher.svelte';
  import { name, kurzname, datumKurz, heuteISO, isoDatum } from '$lib/hilfen';
  import { rechne, zahl } from '$lib/rechnen';
  import { bilden, staerke } from '$lib/gruppen';
  import { fuellen, mailLink, schulAdresse } from '$lib/nachschreiben';
  import {
    projektRasterAlle, projektRaster, gruppenErgebnis, projektErgebnis, nichtEingeteilt, laeuft, neuesProjekt, satzAbgleichen,
    verschieben, belegeMitglied, insNotenbuch, projektMailWerte, PROJEKT_MAIL_STANDARD, PROJEKT_PLATZHALTER,
    produktKriterien, arbeitKriterien, kriteriumGewichtP, anteilProdukt, einzelStufeSetzen, STANDARD_ANTEIL_PRODUKT
  } from '$lib/projekt';
  import type { Projekt, Schueler } from '$lib/typen';
  import KursKopf from '$lib/ui/KursKopf.svelte';

  const d = app.d!;
  const kurs = $derived(d.kurse.find((k) => k.id === page.params.id)!);
  const fos = $derived(kurs?.profil === 'FOS');
  const heute = heuteISO();
  const person = (id: string) => d.schueler.find((s) => s.id === id);
  const kn = (id: string) => { const s = person(id); return s ? kurzname(s) : '?'; };
  const anzeige = (w: number | null | undefined) => (w === null || w === undefined ? '–' : fos ? String(w) : zahl(w, 0));

  let projektId = $state<string | null>(page.url.searchParams.get('p'));
  const projekte = $derived(kurs?.projekte ?? []);
  const p = $derived(projekte.find((x) => x.id === projektId) ?? projekte.find((x) => laeuft(x, heute)) ?? projekte[0]);
  const raster = $derived(p ? projektRaster(d, p) : null);
  const kriterien = $derived(raster ? raster.bereiche.flatMap((b) => b.kriterien) : []);
  const kProdukt = $derived(raster ? produktKriterien(raster) : []);
  const kArbeit = $derived(raster ? arbeitKriterien(raster) : []);
  const anteil = $derived(p && raster ? anteilProdukt(raster, p) : STANDARD_ANTEIL_PRODUKT);
  let gruppeId = $state<string | null>(null);
  const g = $derived(p?.gruppen.find((x) => x.id === gruppeId) ?? p?.gruppen[0]);
  const erg = $derived(p && raster && g ? gruppenErgebnis(raster, g, kurs.profil, p) : null);
  const ohne = $derived(p ? nichtEingeteilt(kurs, p) : []);
  const spalte = $derived(p?.leistungId ? kurs.leistungen.find((l) => l.id === p.leistungId) : undefined);
  const note = (gid: string) => { const x = p?.gruppen.find((y) => y.id === gid); return x && raster ? gruppenErgebnis(raster, x, kurs.profil, p!).note : null; };

  // ---------- Neues Projekt ----------
  let neuOffen = $state(false);
  let nTitel = $state('');
  let nVon = $state(heute);
  let nBis = $state(isoDatum(new Date(Date.now() + 28 * 864e5)));
  let nRaster = $state('pv-praesentation');
  let nZaehlt = $state<Projekt['zaehltAls']>('sl');
  let nQuelle = $state<'live' | 'satz' | 'neu'>('neu');
  let nSatz = $state('');
  let nGroesse = $state(4);
  let nLeistung = $state(true);
  let liveGruppen = $state<string[][] | null>(null);

  $effect.pre(() => {
    if (page.url.searchParams.has('neu') && !neuOffen && liveGruppen === null) {
      try { liveGruppen = JSON.parse(sessionStorage.getItem('leo-projekt-gruppen') ?? 'null'); sessionStorage.removeItem('leo-projekt-gruppen'); } catch { liveGruppen = null; }
      neuOffen = true;
      nQuelle = liveGruppen?.length ? 'live' : 'neu';
    }
  });
  const saetze = $derived((kurs?.gruppensaetze ?? []).filter((s) => !s.projektId));

  function anlegen() {
    const titel = nTitel.trim() || 'Gruppenarbeit';
    let gruppen: string[][];
    if (nQuelle === 'live' && liveGruppen?.length) gruppen = liveGruppen;
    else if (nQuelle === 'satz' && saetze.find((s) => s.id === nSatz)) gruppen = saetze.find((s) => s.id === nSatz)!.gruppen;
    else {
      const mitglieder = kurs.schueler.map(person).filter((s): s is Schueler => !!s)
        .map((s) => ({ id: s.id, geschlecht: s.geschlecht, staerke: staerke(kurs.profil, rechne(kurs, s.id).gesamtExakt) }));
      gruppen = bilden(mitglieder, { art: 'groesse', zahl: nGroesse, leistung: nLeistung, geschlecht: false, regeln: kurs.gruppenRegeln });
    }
    const np = neuesProjekt({ titel, von: nVon, bis: nBis < nVon ? nVon : nBis, rasterId: nRaster, zaehltAls: nZaehlt }, gruppen, neueId);
    kurs.projekte ??= [];
    kurs.projekte.unshift(np);
    satzAbgleichen(kurs, np, neueId);
    speichern();
    projektId = np.id;
    gruppeId = null;
    neuOffen = false;
    nTitel = '';
    liveGruppen = null;
    zeige(`Projekt „${titel}“ angelegt`);
  }

  // ---------- Bewerten ----------
  function stufe(kid: string, st: 1 | 2 | 3 | 4) {
    if (!g) return;
    if (g.stufen[kid] === st) delete g.stufen[kid]; else g.stufen[kid] = st;
    speichern();
  }
  function einzeln(sid: string, kid: string, st: 1 | 2 | 3 | 4) {
    if (!p || !g) return;
    einzelStufeSetzen(p, g, sid, kid, st);
    speichern();
  }

  // ---------- Gruppen ändern ----------
  let markiert = $state<string | null>(null);
  function zuGruppe(zielId: string) {
    if (!p || !markiert) return;
    verschieben(p, markiert, zielId);
    satzAbgleichen(kurs, p, neueId);
    speichern();
    zeige(`${kn(markiert)} → ${p.gruppen.find((x) => x.id === zielId)?.name}`);
    markiert = null;
  }
  function gruppeHinzu() {
    if (!p) return;
    p.gruppen.push({ id: neueId(), name: `G${p.gruppen.length + 1}`, thema: '', mitglieder: [], stufen: {}, notizen: [] });
    speichern();
  }
  let notizNeu = $state('');
  function notiz() {
    if (!g || !notizNeu.trim()) return;
    g.notizen.unshift({ datum: heute, text: notizNeu.trim() });
    notizNeu = '';
    speichern();
  }

  // ---------- Projekt ----------
  function sitzplan() {
    if (!p) return;
    const s = satzAbgleichen(kurs, p, neueId);
    kurs.gruppenAktiv = kurs.gruppenAktiv === s.id ? undefined : s.id;
    speichern();
    zeige(kurs.gruppenAktiv ? 'Projektgruppen im Sitzplan sichtbar' : 'Gruppen im Sitzplan ausgeblendet');
  }
  function uebernehmen() {
    if (!p || !raster) return;
    const vorher = { leistungen: $state.snapshot(kurs.leistungen), zellen: $state.snapshot(kurs.zellen), leistungId: p.leistungId };
    const r = insNotenbuch(kurs, p, raster, neueId);
    speichern();
    zeige(`${r.leistung.name}: ${r.gesetzt} Noten im Notenbuch${r.ohne ? `, ${r.ohne} noch ohne Gruppennote` : ''}`, () => {
      kurs.leistungen = vorher.leistungen as typeof kurs.leistungen; kurs.zellen = vorher.zellen as typeof kurs.zellen; p.leistungId = vorher.leistungId; speichern();
    });
  }
  function abschliessen() {
    if (!p) return;
    p.abgeschlossen = !p.abgeschlossen;
    if (p.abgeschlossen && kurs.gruppenAktiv === p.satzId) kurs.gruppenAktiv = undefined;
    speichern();
  }
  function loeschen() {
    if (!p) return;
    const alt = $state.snapshot(p) as Projekt;
    const satz = kurs.gruppensaetze?.find((s) => s.id === p.satzId);
    kurs.projekte = projekte.filter((x) => x.id !== alt.id);
    if (satz) kurs.gruppensaetze = kurs.gruppensaetze!.filter((s) => s !== satz);
    if (kurs.gruppenAktiv === alt.satzId) kurs.gruppenAktiv = undefined;
    speichern();
    projektId = null;
    zeige(`„${alt.titel}“ gelöscht, Noten im Notenbuch bleiben`, () => { kurs.projekte = [alt, ...(kurs.projekte ?? [])]; if (satz) kurs.gruppensaetze = [satz, ...(kurs.gruppensaetze ?? [])]; speichern(); projektId = alt.id; });
  }
  let einstOffen = $state(false);
  let wegOffen = $state(false);
  let gewOffen = $state(false);
  const gz = (x: number) => x.toLocaleString('de-DE', { maximumFractionDigits: 1 });
  function gewSetzen(kid: string, w: number) {
    if (!p) return;
    p.gewichte = { ...(p.gewichte ?? {}), [kid]: Math.max(0, Math.min(5, Math.round(w * 2) / 2)) };
    speichern();
  }
  const gewVon = (kr: (typeof kriterien)[number]) => (p ? kriteriumGewichtP(p, kr) : 1);
  const summe = (ks: typeof kriterien) => ks.reduce((a, kr) => a + gewVon(kr), 0);
  function anteilSetzen(w: number) {
    if (!p) return;
    p.anteilProdukt = Math.max(0, Math.min(100, Math.round(w / 5) * 5));
    speichern();
  }

  // ---------- Mail ----------
  const vorlage = $derived(d.einstellungen.projektMail ?? PROJEKT_MAIL_STANDARD);
  let mailOffen = $state(false);
  function vorlageAendern(feld: 'betreff' | 'text', wert: string) { d.einstellungen.projektMail = { ...vorlage, [feld]: wert }; speichern(); }
  function vorlageZurueck() { delete d.einstellungen.projektMail; speichern(); }
  function mail(s: Schueler) {
    if (!p || !raster) return '#';
    const w = projektMailWerte(kurs, p, raster, s);
    return mailLink(schulAdresse(s, d.schueler).adresse, fuellen(vorlage.betreff, w), fuellen(vorlage.text, w));
  }
  function mailGeoeffnet(sid: string) { if (!p) return; p.mails = { ...(p.mails ?? {}), [sid]: heute }; speichern(); }
</script>

<svelte:head><title>{kurs?.name} · Gruppenarbeit</title></svelte:head>

{#if kurs}
  <KursKopf {kurs} aktiv="gruppenarbeit" info={p ? `${p.titel} · ${datumKurz(p.von)}–${datumKurz(p.bis)}` : 'Gruppenarbeit über mehrere Stunden'}>
    {#snippet rechts()}<button class="knopf haupt" onclick={() => (neuOffen = true)}>+ Neues Projekt</button>{/snippet}
  </KursKopf>

  <div class="seite">
    {#if projekte.length > 1}
      <div class="zeile wrap projekte" role="group" aria-label="Projekte">
        {#each projekte as x (x.id)}
          <button class="pille" aria-pressed={x.id === p?.id} onclick={() => { projektId = x.id; gruppeId = null; }}>
            {x.titel} <span class="klein">{laeuft(x, heute) ? 'läuft' : x.abgeschlossen ? 'abgeschlossen' : x.von > heute ? 'geplant' : 'vorbei'}</span>
          </button>
        {/each}
      </div>
    {/if}

    {#if !p}
      <section class="karte leer">
        <h2>Noch keine Gruppenarbeit</h2>
        <p class="leise">Ein Projekt hält Gruppen über mehrere Stunden fest, z. B. für einen Podcast oder eine Präsentation. Du bewertest das Ergebnis der Gruppe mit einem kurzen Raster und weichst nur dort ab, wo jemand mehr oder weniger beigetragen hat. Die Noten landen als eine Spalte im Notenbuch.</p>
        <p class="leise klein">Gruppen kannst du hier neu bilden, aus gespeicherten Gruppen übernehmen oder in der Live-Stunde mit „Als Projekt festhalten“.</p>
        <button class="knopf haupt" onclick={() => (neuOffen = true)}>Projekt anlegen</button>
      </section>
    {:else if raster}
      <div class="spalten">
        <!-- Gruppen -->
        <section class="karte liste">
          <div class="zeile"><h2 class="raum">Gruppen</h2><span class="klein leise">{p.gruppen.length}</span></div>
          <ul>
            {#each p.gruppen as x (x.id)}
              {@const n = note(x.id)}
              <li>
                <button class="gz" aria-current={g?.id === x.id} onclick={() => (markiert ? zuGruppe(x.id) : (gruppeId = x.id))}>
                  <span class="raum"><b>{x.name}</b>{#if x.thema}<span class="leise"> · {x.thema}</span>{/if}
                    <span class="klein leise block">{x.mitglieder.map(kn).join(', ') || 'leer'}</span></span>
                  {#if markiert}<span class="marke ziel">hierhin</span>{:else}<b class="zahl note" class:offen={n === null}>{anzeige(n)}</b>{/if}
                </button>
              </li>
            {/each}
          </ul>
          {#if ohne.length}
            <p class="klein leise">Nicht eingeteilt, antippen und dann eine Gruppe wählen:</p>
            <div class="chips">{#each ohne as sid}<button class="chip" aria-pressed={markiert === sid} onclick={() => (markiert = markiert === sid ? null : sid)}>{kn(sid)}</button>{/each}</div>
          {/if}
          {#if markiert}<button class="link klein" onclick={() => (markiert = null)}>Verschieben abbrechen</button>{/if}
          <button class="link klein" onclick={gruppeHinzu}>+ Gruppe</button>
        </section>

        <!-- Gruppe bewerten -->
        <section class="karte bewerten">
          {#if g}
            <div class="zeile wrap kopfz">
              <input class="eingabe gname" bind:value={g.name} oninput={() => { speichern(); satzAbgleichen(kurs, p, neueId); }} aria-label="Name der Gruppe" />
              <input class="eingabe raum" bind:value={g.thema} oninput={speichern} placeholder="Thema der Gruppe, z. B. Fast Fashion" aria-label="Thema" />
            </div>
            {#snippet kriterium(kr: (typeof kriterien)[number])}
              <div class="krit">
                <div class="kname"><b>{kr.name}</b><button class="gchip" onclick={() => (gewOffen = true)} title="Gewicht ändern">×{gz(gewVon(kr))}</button></div>
                <div class="stufen" role="group" aria-label={kr.name}>
                  {#each [4, 3, 2, 1] as st, i}
                    <button class="stufe" aria-pressed={g!.stufen[kr.id] === st} onclick={() => stufe(kr.id, st as 1 | 2 | 3 | 4)}><b>{st}</b> <span>{kr.stufen[i]}</span></button>
                  {/each}
                </div>
              </div>
            {/snippet}
            {#if kProdukt.length}
              <h3>Handlungsprodukt · für die ganze Gruppe{kArbeit.length ? ` · ${anteil} %` : ''}</h3>
              {#each kProdukt as kr (kr.id)}{@render kriterium(kr)}{/each}
            {/if}
            {#if kArbeit.length}
              <h3>Arbeitsweise · {100 - anteil} %</h3>
              <p class="klein leise">Was du hier für die Gruppe wählst, gilt für alle. Bei den Mitgliedern unten änderst du es je Person, z. B. für die Beteiligung.</p>
              {#each kArbeit as kr (kr.id)}{@render kriterium(kr)}{/each}
            {/if}

            <h3>Mitglieder</h3>
            <p class="klein leise">Daneben steht, was L.E.O. im Projektzeitraum weiß.{kArbeit.length ? ' Umrandet = Stufe der Gruppe, gefüllt = eigene Stufe.' : ''}</p>
            <ul class="mitglieder">
              {#each g.mitglieder as sid (sid)}
                {@const s = person(sid)}
                {@const b = belegeMitglied(d, kurs.id, p, sid)}
                {@const pe = projektErgebnis(raster, g, sid, kurs.profil, p)}
                {@const eigen = p.einzelStufen?.[sid] ?? {}}
                {#if s}
                  <li class="mg">
                    <div class="mzeile">
                      <button class="mname" onclick={() => (markiert = markiert === sid ? null : sid)} aria-pressed={markiert === sid} title="Antippen, dann links eine andere Gruppe wählen">{name(s)}</button>
                      <span class="belege klein leise">
                        {#if b.fehlStunden}<span class:warnt={b.fehlStunden >= 4}>fehlte {b.fehlStunden} Std. ({b.fehlTage.map(datumKurz).join(', ')})</span>{:else}nie gefehlt{/if}
                        · {b.smileys ? `${b.smileys} Smileys Ø ${zahl(b.schnitt, 1)}` : 'keine Smileys'}{b.zuSpaet ? ` · ${b.zuSpaet}× zu spät` : ''}
                      </span>
                      <b class="zahl note gross-n" title={pe.weg.join('\n')}>{anzeige(pe.note)}</b>
                      <a class="link klein" href={mail(s)} onclick={() => mailGeoeffnet(sid)} title="Rückmeldung an die schulische Adresse">{p.mails?.[sid] ? '✓ Mail' : 'Mail'}</a>
                    </div>
                    {#if kArbeit.length}
                      <div class="einzel">
                        {#each kArbeit as kr (kr.id)}
                          <div class="ez"><span class="klein">{kr.name}</span>
                            <span class="mini-stufen" role="group" aria-label="{kr.name} für {name(s)}">
                              {#each [4, 3, 2, 1] as st, i}
                                <button class="ms" class:vorgabe={eigen[kr.id] === undefined && g.stufen[kr.id] === st} aria-pressed={eigen[kr.id] === st} title={kr.stufen[i]} onclick={() => einzeln(sid, kr.id, st as 1 | 2 | 3 | 4)}>{st}</button>
                              {/each}
                            </span>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </li>
                {/if}
              {:else}<li class="leise klein">Noch niemand in dieser Gruppe.</li>{/each}
            </ul>

            <h3>Stand der Gruppe</h3>
            <div class="zeile">
              <input class="eingabe raum" bind:value={notizNeu} placeholder="z. B. Skript fertig, Aufnahme nächste Woche" onkeydown={(e) => e.key === 'Enter' && notiz()} aria-label="Neuer Stand" />
              <button class="knopf leise" disabled={!notizNeu.trim()} onclick={notiz}>Merken</button>
            </div>
            <ul class="notizen klein">{#each g.notizen as n}<li><span class="leise zahl">{datumKurz(n.datum)}</span> {n.text}</li>{/each}</ul>
          {/if}
        </section>

        <!-- Projekt -->
        <aside class="karte projekt">
          <button class="kachel" onclick={() => (gewOffen = true)} title="Gewichte ändern">
            <span class="zeile"><h2 class="raum">Note {g?.name}</h2><span class="klein akzent">Gewichte ›</span></span>
            <span class="gross zahl">{anzeige(erg?.note)}</span>
            {#if kArbeit.length && kProdukt.length}<span class="klein leise">Handlungsprodukt {anteil} % · Arbeitsweise {100 - anteil} %. Ohne eigene Stufen der Mitglieder.</span>{/if}
          </button>
          {#if erg}<p class="klein leise">{erg.offen ? `${erg.offen} Kriterien noch offen, sie zählen nicht mit.` : 'Alle Kriterien eingeschätzt.'}</p>
            <button class="knopf leise klein" aria-expanded={wegOffen} onclick={() => (wegOffen = !wegOffen)}>{wegOffen ? '▾' : '▸'} Rechenweg</button>
            {#if wegOffen}<ol class="weg klein zahl">{#each erg.weg as w}<li>{w}</li>{/each}</ol>{/if}
          {/if}
          <button class="knopf haupt" onclick={uebernehmen}>{spalte ? 'Notenbuch aktualisieren' : 'Ins Notenbuch übernehmen'}</button>
          <p class="klein leise">Eine Spalte „{p.titel}“ unter {p.zaehltAls === 'sl' ? 'Tests/Sonstiges' : 'mündlichen Leistungen'}, Gewicht im Notenbuch änderbar.{spalte ? ` Steht schon im Notenbuch.` : ''}</p>
          <button class="knopf leise" onclick={sitzplan}>{kurs.gruppenAktiv && kurs.gruppenAktiv === p.satzId ? 'Im Sitzplan ausblenden' : 'Gruppen im Sitzplan zeigen'}</button>
          <button class="knopf leise klein" aria-expanded={einstOffen} onclick={() => (einstOffen = !einstOffen)}>{einstOffen ? '▾' : '▸'} Projekt einstellen</button>
          {#if einstOffen}
            <div class="einst">
              <label class="feld"><span>Titel</span><input bind:value={p.titel} oninput={() => { speichern(); satzAbgleichen(kurs, p, neueId); }} /></label>
              <div class="zeile"><label class="feld raum"><span>von</span><input type="date" bind:value={p.von} onchange={speichern} /></label><label class="feld raum"><span>bis</span><input type="date" bind:value={p.bis} onchange={speichern} /></label></div>
              <label class="feld"><span>Raster</span><select bind:value={p.rasterId} onchange={speichern}>{#each projektRasterAlle(d) as r (r.id)}<option value={r.id}>{r.name}{r.vorlage ? ' (Vorlage)' : ''}</option>{/each}</select></label>
              <div class="feld"><span>Zählt im Notenbuch als</span>
                <div class="zeile"><button class="pille" aria-pressed={p.zaehltAls === 'sl'} onclick={() => { p.zaehltAls = 'sl'; speichern(); }}>Tests/Sonstiges</button><button class="pille" aria-pressed={p.zaehltAls === 'mitarbeit'} onclick={() => { p.zaehltAls = 'mitarbeit'; speichern(); }}>mündlich</button></div>
              </div>
              <a class="link klein" href="/mehr/muendlich#projektraster">Eigene Projektraster anlegen ›</a>
              <div class="zeile"><button class="knopf leise" onclick={abschliessen}>{p.abgeschlossen ? 'Wieder öffnen' : 'Abschließen'}</button><button class="knopf leise warn" onclick={loeschen}>Löschen</button></div>
            </div>
          {/if}
          <button class="knopf leise klein" aria-expanded={mailOffen} onclick={() => (mailOffen = !mailOffen)}>{mailOffen ? '▾' : '▸'} Mailtext der Rückmeldung · {d.einstellungen.projektMail ? 'eigene Vorlage' : 'Standard'}</button>
          {#if mailOffen}
            <div class="einst">
              <label class="feld"><span>Betreff</span><input value={vorlage.betreff} onchange={(e) => vorlageAendern('betreff', (e.currentTarget as HTMLInputElement).value)} /></label>
              <label class="feld"><span>Text</span><textarea rows="10" value={vorlage.text} onchange={(e) => vorlageAendern('text', (e.currentTarget as HTMLTextAreaElement).value)}></textarea></label>
              <p class="klein leise">Platzhalter: {PROJEKT_PLATZHALTER.map((x) => `{${x}}`).join(' ')}. Die Mail öffnet sich in deinem Mailprogramm, dort kannst du sie für jede Person noch ändern. Sie geht nur an die schulische Adresse.</p>
              {#if d.einstellungen.projektMail}<button class="knopf leise" onclick={vorlageZurueck}>Standard wiederherstellen</button>{/if}
            </div>
          {/if}
          <p class="klein leise">Selbst- und Partnereinschätzung der Gruppen per Link kommt mit der Selbsteinschätzung (FB7b).</p>
        </aside>
      </div>
    {/if}
  </div>

  {#if neuOffen}
    <div class="hintergrund" role="presentation" onclick={(e) => e.target === e.currentTarget && (neuOffen = false)}>
      <div class="schweben dialog" role="dialog" aria-modal="true" aria-label="Neues Projekt">
        <h2>Neues Projekt · {kurs.name}</h2>
        <div class="einst">
          <label class="feld"><span>Titel</span><input bind:value={nTitel} placeholder="z. B. Podcast Nachhaltigkeit" /></label>
          <div class="zeile"><label class="feld raum"><span>von</span><input type="date" bind:value={nVon} /></label><label class="feld raum"><span>bis (Abgabe oder Präsentation)</span><input type="date" bind:value={nBis} /></label></div>
          <label class="feld"><span>Raster für das Ergebnis</span><select bind:value={nRaster}>{#each projektRasterAlle(d) as r (r.id)}<option value={r.id}>{r.name}</option>{/each}</select></label>
          <div class="feld"><span>Zählt im Notenbuch als</span>
            <div class="zeile"><button class="pille" aria-pressed={nZaehlt === 'sl'} onclick={() => (nZaehlt = 'sl')}>Tests/Sonstiges</button><button class="pille" aria-pressed={nZaehlt === 'mitarbeit'} onclick={() => (nZaehlt = 'mitarbeit')}>mündlich</button></div>
          </div>
          <div class="feld"><span>Gruppen</span>
            <div class="zeile wrap">
              {#if liveGruppen?.length}<button class="pille" aria-pressed={nQuelle === 'live'} onclick={() => (nQuelle = 'live')}>aus der Stunde ({liveGruppen.length})</button>{/if}
              {#if saetze.length}<button class="pille" aria-pressed={nQuelle === 'satz'} onclick={() => { nQuelle = 'satz'; nSatz ||= saetze[0].id; }}>gespeicherte</button>{/if}
              <button class="pille" aria-pressed={nQuelle === 'neu'} onclick={() => (nQuelle = 'neu')}>neu bilden</button>
            </div>
          </div>
          {#if nQuelle === 'satz'}
            <select class="eingabe" bind:value={nSatz} aria-label="Gespeicherte Gruppen">{#each saetze as s}<option value={s.id}>{s.name}</option>{/each}</select>
          {:else if nQuelle === 'neu'}
            <div class="zeile wrap">
              <span class="klein leise">je</span>
              {#each [2, 3, 4, 5, 6] as n}<button class="pille" aria-pressed={nGroesse === n} onclick={() => (nGroesse = n)}>{n}</button>{/each}
              <button class="pille" aria-pressed={nLeistung} onclick={() => (nLeistung = !nLeistung)}>leistungsgemischt</button>
            </div>
            <p class="klein leise">Aus der ganzen Klasse, mit den Gruppenregeln der Klasse. Tauschen geht danach jederzeit.</p>
          {/if}
        </div>
        <div class="gfuss"><button class="knopf leise" onclick={() => (neuOffen = false)}>Abbrechen</button><button class="knopf haupt" onclick={anlegen}>Anlegen</button></div>
      </div>
    </div>
  {/if}

  {#if gewOffen && p}
    <div class="hintergrund" role="presentation" onclick={(e) => e.target === e.currentTarget && (gewOffen = false)}>
      <div class="schweben dialog" role="dialog" aria-label="Gewichte">
        <h2>Gewichte · {p.titel}</h2>
        {#if kProdukt.length && kArbeit.length}
          <div class="anteil">
            <span class="raum">Handlungsprodukt <b class="zahl">{anteil} %</b></span>
            <button class="knopf leise rund" onclick={() => anteilSetzen(anteil - 10)} aria-label="weniger Handlungsprodukt">−</button>
            <button class="knopf leise rund" onclick={() => anteilSetzen(anteil + 10)} aria-label="mehr Handlungsprodukt">+</button>
            <span class="raum rechts">Arbeitsweise <b class="zahl">{100 - anteil} %</b></span>
          </div>
        {/if}
        {#each [['Handlungsprodukt', kProdukt], ['Arbeitsweise', kArbeit]] as [titel, ks]}
          {@const liste = ks as typeof kriterien}
          {#if liste.length}
            <h3>{titel}</h3>
            <table class="gtab"><tbody>
              {#each liste as kr (kr.id)}
                {@const w = gewVon(kr)}
                <tr><td>{kr.name}</td>
                  <td class="zeile"><button class="knopf leise rund" onclick={() => gewSetzen(kr.id, w - 0.5)} aria-label="weniger">−</button><b class="zahl gwert">{gz(w)}</b><button class="knopf leise rund" onclick={() => gewSetzen(kr.id, w + 0.5)} aria-label="mehr">+</button></td>
                  <td class="zahl leise">{summe(liste) ? Math.round((w / summe(liste)) * 100) : 0} %</td></tr>
              {/each}
            </tbody></table>
          {/if}
        {/each}
        <p class="klein leise">Handlungsprodukt und Arbeitsweise sind je der gewichtete Durchschnitt ihrer Stufen; beide zusammen nach deinem Anteil. Die Prozente in den Tabellen gelten innerhalb des Teils. Stufe 4 = {fos ? '14 Punkte (wie Smileys; 15 nur bei direkt eingetragener Note)' : 'Note 1'}. Alles gilt nur für dieses Projekt.</p>
        <div class="gfuss"><button class="knopf leise" disabled={!p.gewichte && p.anteilProdukt === undefined} onclick={() => { delete p.gewichte; delete p.anteilProdukt; speichern(); }}>Standard</button><button class="knopf haupt" onclick={() => (gewOffen = false)}>Fertig</button></div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .seite { padding: 20px 32px; display: flex; flex-direction: column; gap: 16px; }
  .wrap { flex-wrap: wrap; }
  .leer { max-width: 640px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
  .leer p { margin: 0; line-height: 1.5; }
  .spalten { display: grid; grid-template-columns: 260px 1fr 270px; gap: 16px; align-items: start; }
  .spalten > * { min-width: 0; }
  .liste ul { list-style: none; margin: 8px 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
  .gz { width: 100%; display: flex; align-items: center; gap: 8px; text-align: left; padding: 8px; min-height: 52px; border-radius: var(--leo-r-m); border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
  .gz[aria-current='true'] { background: var(--leo-auswahl); }
  .block { display: block; }
  .note { min-width: 26px; text-align: right; }
  .note.offen { color: var(--leo-leise); font-weight: 400; }
  .marke.ziel { font-size: var(--leo-text-xs); border-radius: var(--leo-r-pill); padding: 2px 8px; background: var(--leo-akzent-hell); color: var(--leo-akzent); font-weight: 600; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0; }
  .link { background: none; border: 0; padding: 4px 0; color: var(--leo-akzent); font-weight: 600; min-height: 32px; text-decoration: none; cursor: pointer; }
  .liste .link { display: block; }
  .kopfz { gap: 8px; }
  .gname { width: 80px; font-weight: 700; }
  h3 { font-size: var(--leo-text-s); color: var(--leo-leise); text-transform: uppercase; letter-spacing: .04em; margin: 18px 0 4px; }
  .krit { display: grid; grid-template-columns: 150px 1fr; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--leo-linie-fein); }
  .stufen { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .stufe { text-align: left; border: 1px solid var(--leo-linie); background: var(--leo-taste); border-radius: var(--leo-r-s); padding: 6px 8px; min-height: 44px; font: inherit; font-size: var(--leo-text-s); color: var(--leo-tinte); cursor: pointer; line-height: 1.3; }
  .stufe[aria-pressed='true'] { background: var(--leo-akzent); border-color: var(--leo-akzent); color: var(--leo-auf-akzent); }
  .gchip { margin-left: 6px; border: 1px solid var(--leo-linie); background: var(--leo-flaeche-leise); color: var(--leo-akzent); border-radius: var(--leo-r-pill); font: inherit; font-size: var(--leo-text-xs); font-weight: 600; padding: 1px 7px; cursor: pointer; }
  .mitglieder { list-style: none; margin: 6px 0; padding: 0; }
  .mg { padding: 8px 0; border-bottom: 1px solid var(--leo-linie-fein); }
  .mzeile { display: grid; grid-template-columns: 150px 1fr 36px 48px; align-items: center; gap: 10px; }
  .mname { border: 0; background: none; font: inherit; font-weight: 600; text-align: left; color: inherit; padding: 4px; border-radius: var(--leo-r-s); cursor: pointer; }
  .mname[aria-pressed='true'] { background: var(--leo-auswahl); outline: 2px solid var(--leo-akzent); }
  .warnt { color: var(--leo-warnung); font-weight: 600; }
  .rund { min-width: 40px; justify-content: center; }
  .gross-n { font-size: 18px; }
  .einzel { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 6px 0 0 4px; }
  .ez { display: inline-flex; align-items: center; gap: 8px; }
  .mini-stufen { display: inline-flex; gap: 4px; }
  .ms { min-width: 36px; min-height: 36px; border: 1px solid var(--leo-linie); background: var(--leo-taste); border-radius: var(--leo-r-s); font: inherit; font-weight: 700; color: var(--leo-tinte); cursor: pointer; }
  .ms.vorgabe { border: 2px solid var(--leo-akzent); background: var(--leo-karte); color: var(--leo-akzent); }
  .ms[aria-pressed='true'] { background: var(--leo-akzent); border-color: var(--leo-akzent); color: var(--leo-auf-akzent); }
  .anteil { display: flex; align-items: center; gap: 8px; background: var(--leo-flaeche-leise); border-radius: var(--leo-r-m); padding: 10px 12px; margin: 8px 0; }
  .anteil .rechts { text-align: right; }
  .dialog h3 { margin: 12px 0 0; }
  .notizen { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .projekt { display: flex; flex-direction: column; gap: 10px; position: sticky; top: 120px; }
  .projekt .knopf { white-space: normal; justify-content: center; text-align: center; height: auto; min-height: 44px; padding-block: 8px; line-height: 1.25; }
  .projekt p { margin: 0; }
  .kachel { display: flex; flex-direction: column; gap: 6px; text-align: left; background: none; border: 1px solid transparent; border-radius: var(--leo-r-m); padding: 6px; margin: -6px; font: inherit; color: inherit; cursor: pointer; }
  .kachel:hover { border-color: var(--leo-linie); background: var(--leo-flaeche-leise); }
  .akzent { color: var(--leo-akzent); font-weight: 600; }
  .gross { font-size: 40px; font-weight: 700; line-height: 1; }
  .weg { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
  .einst { display: flex; flex-direction: column; gap: 10px; }
  .gtab { width: 100%; border-collapse: collapse; margin: 8px 0; }
  .gtab td { padding: 6px 4px; border-bottom: 1px solid var(--leo-linie-fein); }
  .gwert { min-width: 32px; text-align: center; }
  .gfuss { display: flex; justify-content: space-between; gap: 12px; margin-top: 16px; }
  .dialog h2 { margin-bottom: 12px; }
  @media (max-width: 1150px) { .spalten { grid-template-columns: 230px 1fr; } .projekt { grid-column: 1 / -1; position: static; } }
  @media (max-width: 720px) {
    .seite { padding: 16px; }
    .spalten { grid-template-columns: 1fr; }
    .krit { grid-template-columns: 1fr; }
    .stufen { grid-template-columns: repeat(2, 1fr); }
    .mzeile { grid-template-columns: 1fr 40px; }
    .belege { grid-column: 1 / -1; grid-row: 2; }
    .mzeile .link { grid-column: 1 / -1; }
  }
</style>
