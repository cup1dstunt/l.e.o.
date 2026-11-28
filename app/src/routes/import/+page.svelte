<script lang="ts">
  // Import-Modul (V20, docs/MODUL_IMPORT.md): Klassen und Noten aus UPZ, eigener Excel-Tabelle oder iDoceo-Export.
  // Ablauf ohne Dialog, alles auf einer Seite: Datei → Wohin → Spalten → Schüler → Vorschau → übernehmen (mit Rückgängig).
  // Die Datei bleibt im Gerät. Nichts Bestehendes wird überschrieben, solange es nicht ausdrücklich eingeschaltet ist.
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { app, speichern, zeige, neueId } from '$lib/speicher.svelte';
  import { name as sName, schuelerVon, heuteISO } from '$lib/hilfen';
  import { istAn } from '$lib/module';
  import { rechne } from '$lib/rechnen';
  import { verteilen } from '$lib/sitzplan';
  import { mappeAusDatei, type Mappe } from '$lib/xlsx';
  import {
    paketAus, blattVorschlag, kursVorschlag, schuelerZuordnen, spalteVorschlag, vorschau, anwenden, kursAnlegen, zellText,
    type Paket, type Skala
  } from '$lib/import';
  import type { Gruppe, Kurs, Profil } from '$lib/typen';

  const d = app.d!;
  let eingabe = $state<HTMLInputElement>();
  let fehler = $state('');
  let laedt = $state(false);
  let mappe = $state.raw<Mappe | null>(null);
  let dateiname = $state('');
  let blattNr = $state(0);
  let nachnameZuerst = $state(false);
  let p = $state<Paket | null>(null);

  let ziel = $state<string>(page.url.searchParams.get('kurs') ?? ''); // Kurs-id oder '' = neue Klasse
  let neu = $state({ name: '', klasse: '', fach: '', profil: 'OSZ' as Profil });
  let zuordnung = $state<{ ziel: string; sicher: boolean }[]>([]);
  let spaltenZiel = $state<Record<string, string | null>>({});
  let ueberschreiben = $state(false);
  let gewichte = $state(false);

  const kurs = $derived(ziel ? d.kurse.find((k) => k.id === ziel) ?? null : null);
  const profil = $derived<Profil>(kurs?.profil ?? neu.profil);
  const klassenListe = $derived(kurs ? schuelerVon(d, kurs) : []);

  async function lesen() {
    const f = eingabe?.files?.[0];
    if (eingabe) eingabe.value = '';
    if (!f) return;
    laedt = true;
    fehler = '';
    const m = await mappeAusDatei(new Uint8Array(await f.arrayBuffer()), f.name);
    laedt = false;
    if ('fehler' in m) { fehler = m.fehler; mappe = null; p = null; return; }
    mappe = m;
    dateiname = f.name;
    blattNr = blattVorschlag(m);
    nachnameZuerst = false;
    verstehen(true);
  }

  /** Datei (neu) deuten und alle Vorschläge setzen. `wohin` = auch die Zielklasse neu vorschlagen. */
  function verstehen(wohin: boolean) {
    if (!mappe) return;
    const neuP = paketAus(mappe, dateiname, blattNr, { nachnameZuerst });
    if (!neuP.schueler.length) { fehler = 'In der Datei stehen keine Schüler. Ist das richtige Blatt gewählt?'; }
    else fehler = '';
    p = neuP;
    if (wohin) {
      const vor = page.url.searchParams.get('kurs') ?? kursVorschlag(d.kurse, neuP, d.schueler);
      ziel = vor && d.kurse.some((k) => k.id === vor) ? vor : '';
      neu = {
        name: [neuP.klasse, neuP.fach].filter(Boolean).join(' ') || dateiname.replace(/\.[^.]+$/, ''),
        klasse: neuP.klasse ?? '', fach: neuP.fach ?? '', profil: neuP.profil ?? 'OSZ'
      };
    }
    zielGewaehlt();
  }

  /** Nach Wahl der Zielklasse: Schüler und Spalten neu zuordnen. */
  function zielGewaehlt() {
    if (!p) return;
    const k = ziel ? d.kurse.find((x) => x.id === ziel) ?? null : null;
    zuordnung = schuelerZuordnen(p.schueler, k ? schuelerVon(d, k) : [], !k);
    spaltenZiel = Object.fromEntries(p.spalten.map((s) => [s.id, spalteVorschlag(k, s)]));
    ueberschreiben = false;
    gewichte = !k && !!p.gewichte;
  }

  function zuweisen(i: number, wert: string) {
    if (wert && wert !== '+') for (const z of zuordnung) if (z.ziel === wert) z.ziel = '';
    zuordnung[i] = { ziel: wert, sicher: false };
  }
  function gruppeSetzen(id: string, g: Gruppe | null) {
    const s = p!.spalten.find((x) => x.id === id)!;
    s.gruppe = g;
    if (g && !s.art) s.art = g === 'klausuren' ? 'Klausur' : g === 'mitarbeit' ? 'Mündlich' : 'Sonstige';
    spaltenZiel[id] = spalteVorschlag(kurs, s);
  }

  const ziele = $derived(zuordnung.map((z) => z.ziel));
  const v = $derived(p ? vorschau(kurs, p, ziele, spaltenZiel, profil) : []);
  const zaehl = $derived({
    neu: v.reduce((a, x) => a + x.neu, 0),
    gleich: v.reduce((a, x) => a + x.gleich, 0),
    abweichend: v.reduce((a, x) => a + x.abweichend, 0),
    schuelerNeu: ziele.filter((z) => z === '+').length,
    weg: ziele.filter((z) => !z).length
  });
  const schreibt = $derived(zaehl.neu + (ueberschreiben ? zaehl.abweichend : 0));
  const nichtInDatei = $derived(klassenListe.filter((s) => !ziele.includes(s.id)));

  // Probelauf an einer Kopie: was rechnet L.E.O. danach, und was hatte die Datei ausgerechnet?
  const probe = $derived.by(() => {
    if (!p || !v.length) return null;
    const k: Kurs = kurs ? ($state.snapshot(kurs) as Kurs) : kursAnlegen('probe', { ...neu, profil });
    const alle = $state.snapshot(d.schueler) as typeof d.schueler;
    let n = 0;
    const ids: string[] = [];
    anwenden(alle, k, $state.snapshot(p) as Paket, ziele, $state.snapshot(v) as typeof v, { ueberschreiben, gewichte, neueId: () => `probe${n++}`, heute: heuteISO() });
    let i = 0;
    for (const z of ziele) ids.push(z === '+' ? `probe${i++}` : z);
    // anwenden vergibt die ids der Reihe nach, zuerst an neue Schüler: probe0, probe1 … in der Reihenfolge der Datei
    return ziele.map((z, j) => {
      if (!z) return null;
      const e = rechne(k, ids[j]);
      return { leo: e.vorschlag, datei: p!.zeugnis?.[j] ?? null };
    });
  });
  const vergleich = $derived.by(() => {
    if (!probe || !p?.zeugnis) return null;
    const paare = probe.filter((x): x is { leo: number[]; datei: number | null } => !!x && x.datei !== null && x.leo.length > 0);
    return { gleich: paare.filter((x) => x.leo.includes(x.datei!)).length, alle: paare.length };
  });

  const wert = (j: number, sid: string) => {
    const out: { text: string; art: string; alt?: string }[] = [];
    for (const sv of v) {
      const z = sv.zellen.find((x) => x.i === j);
      out.push(!z ? { text: '·', art: 'leer' } : { text: zellText(z.neu), art: z.aenderung, alt: zellText(z.alt) });
    }
    return out;
  };

  function los() {
    if (!p) return;
    const vorher = { schueler: JSON.stringify(d.schueler), kurse: JSON.stringify(d.kurse) };
    let k = kurs;
    const neuAngelegt = !k;
    if (!k) {
      k = kursAnlegen(neueId(), { name: neu.name.trim() || 'Neue Klasse', fach: neu.fach.trim(), klasse: neu.klasse.trim(), profil: neu.profil });
      d.kurse.push(k);
      k = d.kurse[d.kurse.length - 1];
    }
    const r = anwenden(d.schueler, k, $state.snapshot(p) as Paket, ziele, $state.snapshot(v) as typeof v, { ueberschreiben, gewichte, neueId, heute: heuteISO() });
    if (neuAngelegt) verteilen(k.sitzplan, [...k.schueler]);
    speichern();
    const teile = [
      r.zellen ? `${r.zellen} Noten` : '',
      r.spaltenNeu ? `${r.spaltenNeu} neue Spalten` : '',
      r.schuelerNeu ? `${r.schuelerNeu} Schüler neu` : ''
    ].filter(Boolean);
    zeige(`Übernommen: ${teile.join(', ') || 'nichts Neues'}${r.uebersprungen ? `. ${r.uebersprungen} abweichende Werte behalten` : ''}`, () => {
      d.schueler = JSON.parse(vorher.schueler);
      d.kurse = JSON.parse(vorher.kurse);
      speichern();
    });
    goto(`/kurs/${k.id}`);
  }

  const GRUPPEN: [Gruppe | null, string][] = [['klausuren', 'Klausur'], ['sl', 'Tests/Sonstiges'], ['mitarbeit', 'mündlich'], [null, 'nicht übernehmen']];
  const SKALEN: [Skala, string][] = [['np', 'Punkte 0–15'], ['note', 'Noten 1–6'], ['prozent', 'Prozent']];
  const QUELLE = { upz: 'UPZ-Datei', idoceo: 'Export aus iDoceo', tabelle: 'Eigene Tabelle' } as const;
  const LABEL: Record<string, string> = { neu: 'neu', gleich: 'gleich', abweichend: 'weicht ab', leer: '' };
</script>

<svelte:head><title>Import · L.E.O.</title></svelte:head>

<div class="seite">
  <div class="zeile"><h1 class="raum">Klassen und Noten übernehmen</h1><a class="knopf leise" href="/klassen">Zurück zu Klassen</a></div>

  {#if !istAn(d.einstellungen, 'import')}
    <p class="karte">Der Import ist ausgeschaltet. Einschalten unter <a href="/mehr#module">Mehr › Module</a>.</p>
  {:else}
    <section class="karte">
      <h2>1 · Datei wählen</h2>
      <div class="quellen">
        <div><b>UPZ</b><p class="klein leise">Die Excel-Datei der Schule (eine Klasse, ein Fach). L.E.O. liest Namen, Klassenarbeiten bzw. Klausuren, sonstige Leistungen mit Gewichten und die mündliche Mitarbeit und rechnet mit denselben Schlüsseln (OSZ, IHK, FOS).</p></div>
        <div><b>Eigene Excel-Tabelle</b><p class="klein leise">.xlsx oder .csv, eine Zeile je Schüler, oben die Spaltentitel. Spalten wie „Klausur 1“, „Test“, „Okt“ erkennt L.E.O., alles andere stellst du unten ein.</p></div>
        <div><b>iDoceo</b><p class="klein leise">In iDoceo die Klasse als Excel exportieren. Übernommen werden die Zahlen. Smileys und Anmerkungen bleiben in iDoceo.</p></div>
      </div>
      <div class="zeile wrap">
        <button class="knopf haupt" onclick={() => eingabe?.click()} disabled={laedt}>{laedt ? 'Lese …' : mappe ? 'Andere Datei wählen' : 'Datei wählen'}</button>
        <input type="file" accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" bind:this={eingabe} onchange={lesen} hidden />
        {#if p}<span class="klein"><b>{QUELLE[p.quelle]}</b> · {dateiname}{p.klasse ? ` · ${p.klasse}` : ''}{p.fach ? ` · ${p.fach}` : ''}{p.halbjahr ? ` · ${p.halbjahr}` : ''} · {p.schueler.length} Schüler</span>{/if}
      </div>
      <p class="klein leise">Die Datei bleibt auf diesem Gerät. Mit Kennwort geschützte Dateien vorher in Excel ohne Kennwort als Kopie speichern.</p>
      {#if fehler}<p class="klein warn">{fehler}</p>{/if}
      {#if mappe && p && p.quelle !== 'upz' && mappe.blaetter.length > 1}
        <p class="klein leise">Welches Tabellenblatt?</p>
        <div class="zeile wrap">{#each mappe.blaetter as b, i}<button class="pille" aria-pressed={blattNr === i} onclick={() => { blattNr = i; verstehen(false); }}>{b.name}</button>{/each}</div>
      {/if}
    </section>

    {#if p && p.schueler.length}
      <section class="karte">
        <h2>2 · In welche Klasse?</h2>
        <div class="zeile wrap">
          {#each d.kurse as k}<button class="pille" aria-pressed={ziel === k.id} onclick={() => { ziel = k.id; zielGewaehlt(); }}>{k.name}</button>{/each}
          <button class="pille" aria-pressed={ziel === ''} onclick={() => { ziel = ''; zielGewaehlt(); }}>+ neue Klasse</button>
        </div>
        {#if !kurs}
          <div class="neu-klasse">
            <label class="feld"><span>Name</span><input bind:value={neu.name} /></label>
            <label class="feld"><span>Klasse</span><input bind:value={neu.klasse} placeholder="z. B. 2FOS 25-1" /></label>
            <label class="feld"><span>Fach</span><input bind:value={neu.fach} /></label>
            <div class="feld"><span>Rechnet in</span><div class="zeile">
              <button class="pille" aria-pressed={neu.profil === 'FOS'} onclick={() => (neu.profil = 'FOS')}>Punkten 0–15 (FOS)</button>
              <button class="pille" aria-pressed={neu.profil === 'OSZ'} onclick={() => (neu.profil = 'OSZ')}>Noten 1–6 (OSZ)</button>
            </div></div>
          </div>
          {#if d.einstellungen.untis}<p class="klein warn">Du hast WebUntis verbunden. Kommt die Klasse auch aus WebUntis, wähle sie oben statt einer neuen Klasse, sonst gibt es sie zweimal.</p>{/if}
        {:else}
          <p class="klein leise">{kurs.name} rechnet in {kurs.profil === 'FOS' ? 'Punkten 0–15' : 'Noten 1–6'}. Die Werte der Datei werden dahin umgerechnet{p.quelle === 'upz' ? ` (Schlüssel ${p.schluessel})` : ''}.{#if p.profil && p.profil !== kurs.profil} <b class="warn">Die Datei rechnet in {p.profil === 'FOS' ? 'Punkten' : 'Noten'}. Ist das die richtige Klasse?</b>{/if}</p>
        {/if}
      </section>

      <section class="karte">
        <h2>3 · Welche Spalten?</h2>
        <p class="klein leise">Zwischenergebnisse (Gesamtnote, Durchschnitte) übernimmt L.E.O. nicht, es rechnet sie selbst. Klausuren : Sonstige bleibt 50 : 50.</p>
        <div class="spalten">
          {#each p.spalten as s (s.id)}
            <div class="spalte" class:aus={!s.gruppe}>
              <div class="zeile wrap">
                <span class="titel"><b>{s.titel}</b> <span class="klein leise">{s.werte.filter(Boolean).length} Werte · {s.herkunft}</span></span>
              </div>
              <div class="zeile wrap">
                {#each GRUPPEN as [g, t]}<button class="pille klein" aria-pressed={s.gruppe === g} onclick={() => gruppeSetzen(s.id, g)}>{t}</button>{/each}
              </div>
              {#if s.gruppe}
                <div class="zeile wrap">
                  {#if p.quelle !== 'upz'}
                    <label class="feld kurz"><span>Werte sind</span>
                      <select value={s.skala} onchange={(e) => { s.skala = e.currentTarget.value as Skala; s.prozentAlsZahl = s.werte.some((w) => w && 'zahl' in w && w.zahl > 1.5); }}>
                        {#each SKALEN as [k, t]}<option value={k}>{t}</option>{/each}
                      </select></label>
                  {/if}
                  <label class="feld kurz"><span>In Spalte</span>
                    <select value={spaltenZiel[s.id] ?? ''} onchange={(e) => (spaltenZiel[s.id] = e.currentTarget.value || null)}>
                      <option value="">neu: „{s.name}“</option>
                      {#each kurs?.leistungen.filter((l) => l.gruppe === s.gruppe) ?? [] as l}<option value={l.id}>{l.name}</option>{/each}
                    </select></label>
                  {#if !spaltenZiel[s.id]}
                    <label class="feld kurz"><span>Name</span><input bind:value={s.name} /></label>
                    <label class="feld schmal"><span>Gewicht</span><input type="number" min="0" step="0.1" bind:value={s.gewicht} /></label>
                  {/if}
                </div>
              {/if}
              {#if s.grund}<p class="klein leise">{s.grund}</p>{/if}
            </div>
          {/each}
          {#if !p.spalten.length}<p class="klein leise">Keine Spalten mit Zahlen gefunden. Dann übernimmt L.E.O. nur die Schülerliste.</p>{/if}
        </div>
      </section>

      <section class="karte">
        <div class="zeile"><h2 class="raum">4 · Schüler</h2>
          <span class="klein">{ziele.filter((z) => z && z !== '+').length} zugeordnet{zaehl.schuelerNeu ? ` · ${zaehl.schuelerNeu} neu` : ''}{#if zaehl.weg} · <b class="warn">{zaehl.weg} nicht übernommen</b>{/if}</span>
        </div>
        {#if p.namenEinspaltig || nachnameZuerst}
          <label class="zeile schalter klein"><input type="checkbox" bind:checked={nachnameZuerst} onchange={() => verstehen(false)} /> In der Namensspalte steht der Nachname zuerst (ohne Komma)</label>
        {/if}
        <div class="rolle"><table>
          <thead><tr><th>In der Datei</th><th>In L.E.O.</th>{#each v as sv}<th class="r">{sv.spalte.name}</th>{/each}{#if probe}<th class="r">L.E.O.</th>{/if}{#if p.zeugnis}<th class="r">laut Datei</th>{/if}</tr></thead>
          <tbody>
            {#each p.schueler as s, j}
              {@const zo = zuordnung[j]}
              <tr class:weg={!zo?.ziel}>
                <td>{s.nachname}{s.vorname ? `, ${s.vorname}` : ''}</td>
                <td>
                  {#if zo?.sicher}{sName(klassenListe.find((x) => x.id === zo.ziel)!)}
                  {:else}
                    <select class:warn={!zo?.ziel} value={zo?.ziel ?? ''} onchange={(e) => zuweisen(j, e.currentTarget.value)} aria-label="Schüler zuordnen">
                      <option value="">– nicht übernehmen –</option>
                      <option value="+">+ neu {kurs ? 'in die Klasse aufnehmen' : 'anlegen'}</option>
                      {#each klassenListe as k}<option value={k.id}>{sName(k)}</option>{/each}
                    </select>
                  {/if}
                </td>
                {#each wert(j, zo?.ziel ?? '') as w}
                  <td class="r z-{w.art}" title={w.art === 'abweichend' ? `bisher ${w.alt}, Datei ${w.text}` : LABEL[w.art]}>{#if w.art === 'abweichend'}<span class="alt">{w.alt}</span> → {/if}{zo?.ziel ? w.text : '·'}</td>
                {/each}
                {#if probe}<td class="r"><b>{probe[j] ? probe[j]!.leo.join(' / ') || '–' : ''}</b></td>{/if}
                {#if p.zeugnis}<td class="r" class:anders={probe?.[j] && p.zeugnis[j] !== null && probe[j]!.leo.length && !probe[j]!.leo.includes(p.zeugnis[j]!)}>{p.zeugnis[j] ?? '·'}</td>{/if}
              </tr>
            {/each}
          </tbody>
        </table></div>
        {#if nichtInDatei.length}<p class="klein leise">Nicht in der Datei: {nichtInDatei.map(sName).join(', ')}. Ihre Noten bleiben, wie sie sind.</p>{/if}
        {#if vergleich && vergleich.alle}
          <p class="klein" class:warn={vergleich.gleich < vergleich.alle}>
            <b>Vergleich mit der Datei:</b> bei {vergleich.gleich} von {vergleich.alle} Schülern schlägt L.E.O. dieselbe Zeugnisnote vor.
            {#if vergleich.gleich < vergleich.alle}{profil === 'OSZ' ? 'Die UPZ rechnet in der Berufsschule mit Prozenten bis zum Schluss, L.E.O. mit dem Schnitt der Noten. Die markierten Fälle bitte ansehen, die Endnote legst du fest.' : 'Kleine Abweichungen kommen vom Runden: L.E.O. rechnet jede Leistung in Punkte um, die UPZ fasst erst die Prozente zusammen. Die Endnote legst du fest.'}{/if}
          </p>
        {/if}
      </section>

      <section class="karte">
        <h2>5 · Übernehmen</h2>
        <ul class="klein liste">
          <li><b>{zaehl.neu}</b> Noten kommen neu dazu{zaehl.gleich ? `, ${zaehl.gleich} stehen schon genauso da` : ''}.</li>
          {#if zaehl.abweichend}
            <li><b class="warn">{zaehl.abweichend}</b> Werte weichen von dem ab, was schon in L.E.O. steht (gelb markiert). Sie bleiben, außer du schaltest es hier ein:
              <label class="zeile schalter"><input type="checkbox" bind:checked={ueberschreiben} /> Werte aus der Datei übernehmen und die bisherigen ersetzen</label></li>
          {/if}
          {#if zaehl.schuelerNeu}<li><b>{zaehl.schuelerNeu}</b> Schüler werden neu angelegt (nur Name und Geschlecht). Ein späterer WebUntis-Abgleich ordnet sie über den Namen zu.</li>{/if}
          {#if p.gewichte}
            <li>Die Datei gewichtet mündlich : Tests/Sonstiges {Math.round(p.gewichte.mitarbeit * 100)} : {Math.round(p.gewichte.sl * 100)}{kurs ? `, deine Klasse ${Math.round(kurs.gewichte.mitarbeit * 100)} : ${Math.round(kurs.gewichte.sl * 100)}` : ''}.
              <label class="zeile schalter"><input type="checkbox" bind:checked={gewichte} /> Gewichte aus der Datei übernehmen</label></li>
          {/if}
          {#each p.hinweise as h}<li class="leise">{h}</li>{/each}
        </ul>
        <div class="zeile wrap">
          <button class="knopf haupt" disabled={!schreibt && !zaehl.schuelerNeu && !!kurs} onclick={los}>
            {kurs ? `${schreibt} Noten in ${kurs.name} übernehmen` : `Klasse anlegen und ${schreibt} Noten übernehmen`}
          </button>
          <a class="knopf leise" href="/klassen">Abbrechen</a>
        </div>
        <p class="klein leise">Danach kannst du alles mit „Rückgängig“ in der Hinweisleiste zurücknehmen.</p>
      </section>
    {/if}
  {/if}
</div>

<style>
  .seite { padding: 24px 32px 40px; max-width: 1100px; display: flex; flex-direction: column; gap: 16px; }
  .wrap { flex-wrap: wrap; margin: 10px 0; }
  .quellen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 8px 0; }
  .quellen p { margin: 4px 0 0; }
  .neu-klasse { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 12px; }
  .spalten { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .spalte { border: 1px solid var(--leo-linie-fein); border-radius: var(--leo-r-m); padding: 10px 14px; }
  .spalte.aus { background: var(--leo-flaeche-leise); }
  .spalte.aus .titel b { color: var(--leo-leise); }
  .spalte .wrap { margin: 6px 0; }
  .spalte p { margin: 4px 0 0; }
  .pille.klein { min-height: 30px; padding: 0 12px; }
  .feld.kurz { min-width: 180px; }
  .feld.schmal { width: 90px; }
    .rolle { overflow-x: auto; margin-top: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: var(--leo-text-s); color: var(--leo-leise); font-weight: 600; padding: 6px 8px; border-bottom: 1px solid var(--leo-linie); white-space: nowrap; }
  td { padding: 6px 8px; border-bottom: 1px dashed var(--leo-linie-fein); white-space: nowrap; }
  tr.weg td { color: var(--leo-leise); }
  td.z-gleich { color: var(--leo-leise); }
  td.z-abweichend { background: var(--leo-stern-hell); }
  td.anders { background: var(--leo-warnung-hell); font-weight: 700; }
  .alt { color: var(--leo-leise); text-decoration: line-through; }
  .r { text-align: right; }
  select { min-height: 34px; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-s); background: var(--leo-karte); color: var(--leo-tinte); padding: 0 8px; }
  select.warn { border-color: var(--leo-warnung); }
  .warn { color: var(--leo-warnung); }
  .liste { margin: 8px 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
  .schalter { gap: 8px; margin-top: 4px; }
  @media (max-width: 720px) {
    .seite { padding: 12px 16px 40px; }
    .quellen { grid-template-columns: 1fr; gap: 8px; }
    td, th { padding: 6px 4px; }
  }
</style>
