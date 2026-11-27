<script lang="ts">
  import { page } from '$app/state';
  import { istAn } from '$lib/module';
  import { app, speichern, zeige, neueId } from '$lib/speicher.svelte';
  import { schuelerVon, name, alter, datumKurz, datumWt, mitarbeitTrend, PFEIL } from '$lib/hilfen';
  import { nachschreibLage, fallSchluessel } from '$lib/nachschreiben';
  import { rechne, mittel, zellSchluessel, zahl, bestanden, SKALA, monatsVorschlag, zellWert, warnungen } from '$lib/rechnen';
  import { einschaetzungVon, rasterErgebnis, rasterDerEinschaetzung, mindestSmileys } from '$lib/raster';
  import KursKopf from '$lib/ui/KursKopf.svelte';
  import SchnittKachel from '$lib/ui/SchnittKachel.svelte';
  import WasWaereWenn from '$lib/ui/WasWaereWenn.svelte';
  import Rechenweg from '$lib/ui/Rechenweg.svelte';
  import type { Gruppe, Leistung, Schueler, Zelle } from '$lib/typen';

  const d = app.d!;
  const kurs = $derived(d.kurse.find((k) => k.id === page.params.id)!);
  const liste = $derived(kurs ? schuelerVon(d, kurs) : []);
  const skala = $derived(SKALA[kurs.profil]);
  const fos = $derived(kurs.profil === 'FOS');
  let breite = $state(1200);
  let tabelleErzwingen = $state(false);
  const alsListe = $derived(breite < 720 && !tabelleErzwingen);

  const spalten = $derived({
    klausuren: kurs.leistungen.filter((l) => l.gruppe === 'klausuren'),
    mitarbeit: kurs.leistungen.filter((l) => l.gruppe === 'mitarbeit'),
    sl: kurs.leistungen.filter((l) => l.gruppe === 'sl')
  });
  // Reihenfolge der Eingabespalten für die Tastatur
  const eingabeSpalten = $derived([...spalten.klausuren, ...spalten.mitarbeit, ...spalten.sl]);
  const ergebnisse = $derived(Object.fromEntries(liste.map((s) => [s.id, rechne(kurs, s.id)])));
  const g = $derived(kurs.gewichte);
  const pz = (a: number, b: number) => Math.round((a / (a + b || 1)) * 100) + ' %';
  const gewText = (x: number) => (x === 1 ? '' : '×' + x.toLocaleString('de-DE'));

  // ---------- Zellen bearbeiten ----------
  const zelle = (l: Leistung, s: Schueler): Zelle | undefined => kurs.zellen[zellSchluessel(l.id, s.id)];
  const anzeige = (z?: Zelle) => (z?.status ? z.status : z?.wert !== undefined ? String(z.wert) : '');
  let aktiv = $state<{ l: Leistung; s: Schueler } | null>(null);
  // Nachschreiben (F8): Fälle dieser Klasse, auch aus den Fehlzeiten bei noch leerer Zelle
  const faelle = $derived(new Map(nachschreibLage(d).faelle.filter((f) => f.kurs.id === kurs.id).map((f) => [f.key, f])));
  const fallVon = (l: Leistung, s: Schueler) => faelle.get(fallSchluessel(kurs.id, l.id, s.id));
  const grob = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

  function setzen(l: Leistung, s: Schueler, eingabe: string): boolean {
    const t = eingabe.trim().toUpperCase().replace(',', '.');
    const key = zellSchluessel(l.id, s.id);
    const alt = kurs.zellen[key] ? { ...kurs.zellen[key] } : undefined;
    const behalte = { gewicht: alt?.gewicht, stern: alt?.stern };
    let neu: Zelle | undefined;
    if (t === '') neu = behalte.gewicht || behalte.stern ? { ...behalte } : undefined;
    else if (t === 'E' || t === 'UE') neu = { ...behalte, status: t };
    else if (t === '?' || t === 'OFFEN') neu = { ...behalte, status: 'offen' }; // gefehlt, Status ungeklärt (E104)
    else {
      const n = Number(t);
      if (!Number.isInteger(n) || n < skala.min || n > skala.max) {
        zeige(`Bitte ${skala.min} bis ${skala.max}, E, UE oder ? (offen) eingeben`);
        return false;
      }
      neu = { ...behalte, wert: n };
    }
    if (neu) {
      for (const k of Object.keys(neu) as (keyof Zelle)[]) if (neu[k] === undefined) delete neu[k];
      kurs.zellen[key] = neu;
    } else delete kurs.zellen[key];
    if (JSON.stringify(alt) !== JSON.stringify(neu)) speichern();
    return true;
  }

  function feld(li: number, si: number) {
    return document.querySelector<HTMLInputElement>(`input[data-p="${li}-${si}"]`);
  }
  function taste(ev: KeyboardEvent, li: number, si: number) {
    const ziel = ev.currentTarget as HTMLInputElement;
    const weiter = (dl: number, ds: number) => {
      const f = feld(li + dl, si + ds);
      if (f) { ev.preventDefault(); f.focus(); }
    };
    if (ev.key === 'Enter' || ev.key === 'ArrowDown') { if (setzen(eingabeSpalten[li], liste[si], ziel.value)) weiter(0, ev.shiftKey && ev.key === 'Enter' ? -1 : 1); }
    else if (ev.key === 'ArrowUp') { setzen(eingabeSpalten[li], liste[si], ziel.value); weiter(0, -1); }
    else if (ev.key === 'ArrowRight' && ziel.selectionStart === ziel.value.length) { setzen(eingabeSpalten[li], liste[si], ziel.value); weiter(1, 0); }
    else if (ev.key === 'ArrowLeft' && ziel.selectionStart === 0) { setzen(eingabeSpalten[li], liste[si], ziel.value); weiter(-1, 0); }
    else if (ev.key === 'Escape') { ziel.value = anzeige(zelle(eingabeSpalten[li], liste[si])); ziel.blur(); }
  }
  function verlassen(ev: FocusEvent, l: Leistung, s: Schueler) {
    const f = ev.currentTarget as HTMLInputElement;
    if (!setzen(l, s, f.value)) f.value = anzeige(zelle(l, s));
    setTimeout(() => { if (!document.activeElement?.closest('.notenleiste, input[data-p]')) aktiv = null; }, 50);
  }
  // Notenleiste (Tablet/Handy und Maus): Wert setzen und eine Zeile weiter
  function leiste(wert: string) {
    if (!aktiv) return;
    const li = eingabeSpalten.indexOf(aktiv.l);
    const si = liste.indexOf(aktiv.s);
    setzen(aktiv.l, aktiv.s, wert);
    const f = feld(li, si + 1) ?? feld(li, si);
    f?.focus();
  }
  let sternText = $state('');
  let sternOffen = $state(false);
  function stern() {
    if (!aktiv) return;
    const z = (kurs.zellen[zellSchluessel(aktiv.l.id, aktiv.s.id)] ??= {});
    if (sternText.trim()) z.stern = sternText.trim(); else delete z.stern;
    sternOffen = false;
    speichern();
  }
  function einzelgewicht(x: number | null) {
    if (!aktiv) return;
    const z = (kurs.zellen[zellSchluessel(aktiv.l.id, aktiv.s.id)] ??= {});
    if (x === null) delete z.gewicht; else z.gewicht = x;
    speichern();
  }

  // ---------- Ø-Kachel (Feedback 9): Mouse-over zeigt die Noten, Klick hält sie offen mit Was-wäre-wenn ----------
  let kachel = $state<{ s: Schueler; gruppe: Gruppe; x: number; y: number; oben: boolean; fest: boolean } | null>(null);
  let kz: ReturnType<typeof setTimeout> | undefined;
  const fein = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover)').matches;
  function kachelAuf(ev: Event, s: Schueler, gruppe: Gruppe, fest: boolean) {
    if (!fest && (!fein || kachel?.fest)) return;
    clearTimeout(kz);
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const oben = r.bottom > innerHeight * 0.55;
    const setzen = () => (kachel = { s, gruppe, x: Math.max(12, Math.min(innerWidth - 452, r.left - 160)), y: oben ? innerHeight - r.top + 6 : r.bottom + 6, oben, fest });
    if (fest) setzen(); else kz = setTimeout(setzen, 250);
  }
  function kachelWeg() {
    clearTimeout(kz);
    if (kachel && !kachel.fest) kz = setTimeout(() => { if (kachel && !kachel.fest) kachel = null; }, 200);
  }
  const GN: Record<Gruppe, string> = { klausuren: 'Klausuren', mitarbeit: 'Mündliche Leistungen', sl: 'Tests und Sonstiges' };

  // ---------- Dialoge ----------
  let dlg = $state<null | 'neu' | 'gewichte' | 'monat' | { l: Leistung } | { s: Schueler }>(null);
  const ARTEN = [
    { art: 'Klausur', gruppe: 'klausuren' as Gruppe },
    { art: 'Test', gruppe: 'sl' as Gruppe },
    { art: 'Präsentation', gruppe: 'sl' as Gruppe },
    { art: 'Abgabe', gruppe: 'sl' as Gruppe },
    { art: 'Referat', gruppe: 'sl' as Gruppe },
    { art: 'Sonstiges', gruppe: 'sl' as Gruppe }
  ];
  let neu = $state({ art: 'Test', name: '', datum: '', gewicht: 1 });
  function neueAnlegen() {
    const a = ARTEN.find((x) => x.art === neu.art)!;
    const anzahl = kurs.leistungen.filter((l) => l.art === neu.art).length + 1;
    const l: Leistung = { id: neueId(), name: neu.name.trim() || `${neu.art} ${anzahl}`, art: neu.art, gruppe: a.gruppe, gewicht: Number(neu.gewicht) || 1, datum: neu.datum || undefined };
    const letzte = kurs.leistungen.findLastIndex((x) => x.gruppe === a.gruppe);
    kurs.leistungen.splice(letzte + 1, 0, l);
    speichern();
    dlg = null;
    neu = { art: 'Test', name: '', datum: '', gewicht: 1 };
    zeige(`${l.name} angelegt`, () => { kurs.leistungen.splice(kurs.leistungen.indexOf(l), 1); speichern(); });
  }
  function loeschen(l: Leistung) {
    const i = kurs.leistungen.indexOf(l);
    const zellen = Object.fromEntries(Object.entries(kurs.zellen).filter(([k]) => k.startsWith(l.id + ':')));
    kurs.leistungen.splice(i, 1);
    for (const k of Object.keys(zellen)) delete kurs.zellen[k];
    speichern();
    dlg = null;
    zeige(`${l.name} gelöscht`, () => { kurs.leistungen.splice(i, 0, l); Object.assign(kurs.zellen, zellen); speichern(); });
  }

  // Monatsnote aus Smileys vorschlagen (E68)
  let monat = $state(new Date().toISOString().slice(0, 7));
  const monatSpalte = $derived(spalten.mitarbeit.find((l) => l.monat === monat));
  const vorschlaege = $derived(
    liste.map((s) => {
      const stufen = d.mitarbeit.filter((e) => e.kursId === kurs.id && e.schuelerId === s.id && e.zeit.startsWith(monat)).map((e) => e.stufe);
      // Raster-Einschätzung des Monats geht vor (E110)
      const ein = einschaetzungVon(kurs, monat, s.id);
      const r = ein ? rasterErgebnis(rasterDerEinschaetzung(d, kurs, ein), ein.stufen, kurs.profil, kurs) : null;
      const v = r?.note != null ? { note: r.smiley!, wert: r.note } : monatsVorschlag(kurs.profil, stufen);
      return { s, n: stufen.length, v, raster: r?.note != null, wenig: stufen.length < mindestSmileys(kurs) };
    })
  );
  let geaendert = $state<Record<string, string>>({});
  function monatUebernehmen(sid?: string) {
    let l = monatSpalte;
    if (!l) {
      l = { id: neueId(), name: new Date(monat + '-01').toLocaleDateString('de-DE', { month: 'short' }).replace('.', ''), art: 'Monatsnote', gruppe: 'mitarbeit', gewicht: 1, monat };
      kurs.leistungen.splice(kurs.leistungen.findLastIndex((x) => x.gruppe === 'mitarbeit') + 1, 0, l);
    }
    for (const r of vorschlaege) {
      if (sid && r.s.id !== sid) continue;
      const w = geaendert[r.s.id] ?? (r.v ? String(r.v.wert) : '');
      if (w !== '') setzen(l, r.s, w);
    }
    speichern();
    if (!sid) { dlg = null; zeige(`Monatsnoten ${l.name} übernommen`); }
  }
  if (page.url.searchParams.has('monatsnote')) dlg = 'monat';
  // Aus der Tagesübersicht: neue Leistung für heute anlegen
  function neuFuerHeute() {
    const h = new Date();
    neu.datum = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
    dlg = 'neu';
  }
  if (page.url.searchParams.has('neu')) neuFuerHeute();

  // Endnote festlegen (E40, E46)
  function festlegen(s: Schueler, n: number | null) {
    if (n === null) delete kurs.endnoten[s.id]; else kurs.endnoten[s.id] = n;
    speichern();
  }
  const ost = (x: number | null) => (x !== null && !bestanden(kurs.profil, x) ? 'warn' : '');
  const spaltenSchnitt = (l: Leistung) => mittel(liste.map((s) => ({ wert: zellWert(kurs.profil, zelle(l, s)), gewicht: 1 })));
</script>

<svelte:window bind:innerWidth={breite} />
<svelte:head><title>{kurs?.name} · Noten</title></svelte:head>

{#if kurs}
  <KursKopf {kurs} aktiv="noten">
    {#snippet rechts()}
      <button class="pille" onclick={() => (dlg = 'gewichte')}>Profil <b>{kurs.profil}</b> · Gewichte</button>
      {#if istAn(d.einstellungen, 'muendlich')}<button class="pille" onclick={() => (dlg = 'monat')}>Monatsnote vorschlagen</button>{/if}
      {#if istAn(d.einstellungen, 'ewh')}<a class="pille" href="/ewh/{kurs.id}">Aus EWH übernehmen</a>{/if}
      <button class="knopf haupt" onclick={() => (dlg = 'neu')}>+ Leistung</button>
    {/snippet}
  </KursKopf>

  <div class="seite">
    {#if !liste.length}
      <section class="karte leer"><p>Noch keine Schülerinnen und Schüler in dieser Klasse. Unter <a href="/mehr/webuntis">Mehr › WebUntis</a> holst du die Klassenliste aus WebUntis oder aus dem Stammdaten-Export.</p></section>
    {/if}
    {#if alsListe}
      <div class="karte liste">
        {#each liste as s}
          {@const e = ergebnisse[s.id]}
          <a class="lz" href="/schueler/{s.id}?kurs={kurs.id}">
            <div><b>{name(s)}</b>{#if s.nta}&nbsp;<span class="nta">N</span>{/if}<div class="klein leise">Kl. {zahl(e.klausuren)} · mündl. {zahl(e.mitarbeit)} {#if mitarbeitTrend(d, kurs.id, s.id)}{@const tr = mitarbeitTrend(d, kurs.id, s.id)}<span class="trend {tr}" title="{tr} als im Vormonat">{PFEIL[tr]}</span>{/if} · Tests {zahl(e.sl)}{#each warnungen(kurs, e) as w} · <span class="w-{w.art}">{w.text}</span>{/each}</div></div>
            <div class="lnote zahl {ost(e.gesamt)}">{fos ? (e.gesamt ?? '–') : zahl(e.gesamt)}</div>
          </a>
        {/each}
      </div>
      <button class="knopf leise" onclick={() => (tabelleErzwingen = true)}>Ganze Tabelle zeigen</button>
    {:else}
      <div class="tabwrap karte">
        <table class="zahl">
          <thead>
            <tr>
              <th rowspan="3" class="name kopfname">Schüler</th>
              <th colspan={spalten.klausuren.length + 1} rowspan="2" class="gk"><div class="gkb fest">Klausuren</div></th>
              <th colspan={spalten.mitarbeit.length + spalten.sl.length + 2} class="gk"><div class="gkb fest">Sonstige Leistungen (AT)</div></th>
              <th rowspan="3" class="ges kopfges">Gesamtnote<div class="klein">live · {fos ? 'Notenpunkte' : 'Note'}</div></th>
            </tr>
            <tr>
              <th colspan={spalten.mitarbeit.length + 1} class="gk"><button class="gkb" onclick={() => (dlg = 'gewichte')} title="Gewichtung ändern">Mündliche Leistungen <span>{pz(g.mitarbeit, g.sl)} ✎</span></button></th>
              <th colspan={spalten.sl.length + 1} class="gk"><button class="gkb" onclick={() => (dlg = 'gewichte')} title="Gewichtung ändern">Tests und Sonstiges <span>{pz(g.sl, g.mitarbeit)} ✎</span></button></th>
            </tr>
            <tr>
              {#each [spalten.klausuren, spalten.mitarbeit, spalten.sl] as gruppe}
                {#each gruppe as l}
                  <th class="sp"><button onclick={() => (dlg = { l })} title="Name, Datum, Gewicht">{l.name}<span class="klein leise">{l.datum ? datumKurz(l.datum) : ''} {gewText(l.gewicht)}</span></button></th>
                {/each}
                <th class="sp schnitt">Ø</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each liste as s, si}
              {@const e = ergebnisse[s.id]}
              <tr class:aktivzeile={aktiv?.s === s}>
                <th class="name" scope="row"><a href="/schueler/{s.id}?kurs={kurs.id}">{name(s)}</a>{#if s.nta}&nbsp;<span class="nta" title={s.nta}>N</span>{/if}<div class="klein leise">{alter(s) === null ? 'Alter ?' : `${alter(s)} J.`}{#each warnungen(kurs, e) as w} · <span class="w-{w.art}">{w.text}</span>{/each}</div></th>
                {#each [spalten.klausuren, spalten.mitarbeit, spalten.sl] as gruppe, gi}
                  {#each gruppe as l}
                    {@const z = zelle(l, s)}
                    {@const li = eingabeSpalten.indexOf(l)}
                    {@const fall = l.gruppe === 'klausuren' ? fallVon(l, s) : undefined}
                    <td class="zelle" class:ue={z?.status === 'UE'} class:e={z?.status === 'E' || z?.status === 'offen' || fall?.quelle === 'fehlzeit'} class:rot={z?.wert !== undefined && !bestanden(kurs.profil, z.wert)}>
                      <input data-p="{li}-{si}" value={anzeige(z)} inputmode={grob ? 'none' : 'text'} autocomplete="off" aria-label="{l.name} {name(s)}"
                        onfocus={(ev) => { aktiv = { l, s }; sternText = z?.stern ?? ''; (ev.currentTarget as HTMLInputElement).select(); }}
                        onblur={(ev) => verlassen(ev, l, s)} onkeydown={(ev) => taste(ev, li, si)} placeholder={fall?.quelle === 'fehlzeit' ? 'fehlte' : '·'} title={fall ? (fall.termin ? `Nachschreiben ${datumWt(fall.termin.datum)} ${fall.termin.beginn}` : 'Nachschreiben: noch kein Termin') : undefined} />
                      {#if fall?.termin}<span class="nt" aria-hidden="true">{datumKurz(fall.termin.datum)}</span>{/if}
                      {#if z?.stern}<span class="stern" title={z.stern}>★</span>{/if}
                      {#if z?.gewicht !== undefined}<span class="eg">{gewText(z.gewicht) || '×1'}</span>{/if}
                    </td>
                  {/each}
                  {@const w = gi === 0 ? e.klausuren : gi === 1 ? e.mitarbeit : e.sl}
                  {@const gr = (['klausuren', 'mitarbeit', 'sl'] as const)[gi]}
                  <td class="schnitt"><button class="ber {ost(w)}" onclick={(ev) => kachelAuf(ev, s, gr, true)} onmouseenter={(ev) => kachelAuf(ev, s, gr, false)} onmouseleave={kachelWeg}>{w === null ? '·' : zahl(w)}</button></td>
                {/each}
                <td class="ges">
                  <button class="gesb" onclick={() => (dlg = { s })}>
                    {#if fos}
                      <span class="gn {ost(e.gesamt)}">{e.gesamt ?? '–'}</span>
                      <span class="klein">{kurs.endnoten[s.id] !== undefined ? `festgelegt ${kurs.endnoten[s.id]}` : `ungerundet ${zahl(e.gesamtExakt)}`}</span>
                    {:else}
                      <span class="gn {ost(e.gesamt)}">{zahl(e.gesamt)}</span>
                      <span class="klein">{kurs.endnoten[s.id] !== undefined ? `festgelegt ${kurs.endnoten[s.id]}` : e.vorschlag.length ? `Vorschlag ${e.vorschlag.join(' oder ')}${e.vorschlag.length > 1 ? '?' : ''}` : ''}</span>
                    {/if}
                    {#if kurs.endnoten[s.id] !== undefined && !e.vorschlag.includes(kurs.endnoten[s.id])}<span class="klein hinweis">★ Rechnung geändert</span>{/if}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr>
              <th class="name leise">Ø Kurs</th>
              {#each [spalten.klausuren, spalten.mitarbeit, spalten.sl] as gruppe}
                {#each gruppe as l}<td class="leise">{zahl(spaltenSchnitt(l), 1)}</td>{/each}
                <td></td>
              {/each}
              <td class="ges"></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p class="klein leise">Eintippen wie in Excel: Zahl, E, UE oder ? (offen = gefehlt, Status ungeklärt, darf nachschreiben), Enter oder Pfeiltasten springen weiter. Klick auf eine Spalte ändert Name, Datum und Gewicht, Klick auf die Gesamtnote zeigt den Rechenweg.</p>
    {/if}
  </div>

  {#if aktiv}
    {@const z = zelle(aktiv.l, aktiv.s)}
    {@const fall = aktiv.l.gruppe === 'klausuren' ? fallVon(aktiv.l, aktiv.s) : undefined}
    <div class="notenleiste schweben" role="toolbar" aria-label="Notenleiste" tabindex="-1" onmousedown={(e) => e.preventDefault()}>
      <div class="kopfzeile klein"><b>{name(aktiv.s)}</b> · {aktiv.l.name}
        {#if fall && istAn(d.einstellungen, 'nachschreiben')}· <a href="/nachschreiben?{fall.termin ? `kurs=${kurs.id}` : `fall=${encodeURIComponent(fall.key)}`}">{fall.termin ? `Nachschreiben ${datumWt(fall.termin.datum)} ${fall.termin.beginn}, Raum ${fall.termin.raum}` : `${fall.quelle === 'fehlzeit' ? `fehlte (${fall.status === 'offen' ? 'offen' : 'E'})` : fall.status === 'offen' ? 'offen' : 'E'}: Nachschreibetermin festlegen ›`}</a>{/if}
      </div>
      <div class="tasten">
        {#each skala.werte as w}
          <button class="taste" class:rot={!bestanden(kurs.profil, w)} class:an={z?.wert === w} onclick={() => leiste(String(w))}>{w}</button>
        {/each}
      </div>
      <div class="tasten sonder">
        <button class="taste rahmen" onclick={() => leiste('E')}>E</button>
        <button class="taste rahmen" onclick={() => leiste('?')}>offen</button>
        <button class="taste rahmen rot" onclick={() => leiste('UE')}>UE</button>
        <button class="taste rahmen" onclick={() => leiste('')}>leeren</button>
        <button class="taste rahmen" class:an={!!z?.stern} onclick={() => (sternOffen = !sternOffen)}>★ Vorbehalt</button>
        <button class="taste rahmen" class:an={z?.gewicht === 0.5} onclick={() => einzelgewicht(z?.gewicht === 0.5 ? null : 0.5)}>×½</button>
        <button class="taste rahmen" class:an={z?.gewicht === 0} onclick={() => einzelgewicht(z?.gewicht === 0 ? null : 0)}>zählt nicht</button>
        <label class="taste rahmen gewfeld">Gewicht
          <input inputmode="decimal" placeholder={String(aktiv.l.gewicht).replace('.', ',')} value={z?.gewicht !== undefined ? String(z.gewicht).replace('.', ',') : ''}
            onchange={(e) => { const t = (e.currentTarget as HTMLInputElement).value.trim().replace(',', '.'); const n = Number(t); einzelgewicht(t === '' ? null : Number.isFinite(n) && n >= 0 ? n : null); }} aria-label="Einzelgewicht frei" />
        </label>
      </div>
      {#if sternOffen}
        <div class="zeile sternzeile">
          <input class="eingabe raum" bind:value={sternText} placeholder="z. B. knapp an 11, wenn die Vokabelliste kommt" onkeydown={(e) => e.key === 'Enter' && stern()} />
          <button class="knopf" onclick={stern}>Merken</button>
        </div>
      {/if}
    </div>
  {/if}

  {#if kachel}
    {@const k = kachel}
    {#if k.fest}<div class="kachelfang" role="presentation" onclick={() => (kachel = null)}></div>{/if}
    <div class="schweben skachel" role="dialog" tabindex="-1" aria-label="Ø {GN[k.gruppe]}" style:left="{k.x}px" style:top={k.oben ? 'auto' : `${k.y}px`} style:bottom={k.oben ? `${k.y}px` : 'auto'}
      onmouseenter={() => clearTimeout(kz)} onmouseleave={kachelWeg}>
      <div class="zeile"><b class="raum">Ø {GN[k.gruppe]} · {name(k.s)}</b>{#if k.fest}<button class="x" onclick={() => (kachel = null)} aria-label="schließen">×</button>{/if}</div>
      <SchnittKachel {kurs} sid={k.s.id} gruppe={k.gruppe} mitWenn={k.fest} />
      {#if !k.fest}<p class="klein leise">Klicken für Was-wäre-wenn</p>{/if}
    </div>
  {/if}

  {#if dlg}
    <div class="hintergrund" role="presentation" onclick={(ev) => ev.target === ev.currentTarget && (dlg = null)}>
      <div class="schweben dialog" role="dialog" aria-modal="true">
        {#if dlg === 'neu'}
          <h2>Neue Leistung</h2>
          <div class="kacheln">
            {#each ARTEN as a}<button class="kachel" aria-pressed={neu.art === a.art} onclick={() => (neu.art = a.art)}>{a.art}<span class="klein leise">{a.gruppe === 'klausuren' ? 'Klausuren' : 'Tests und Sonstiges'}</span></button>{/each}
          </div>
          <div class="formular">
            <label class="feld"><span>Name</span><input bind:value={neu.name} placeholder="{neu.art} {kurs.leistungen.filter((l) => l.art === neu.art).length + 1}" /></label>
            <label class="feld"><span>Datum (auch in der Zukunft)</span><input type="date" bind:value={neu.datum} /></label>
            <label class="feld"><span>Gewicht in der Gruppe</span><input type="number" min="0" step="0.1" bind:value={neu.gewicht} /></label>
          </div>
          <div class="zeile ende"><button class="knopf leise" onclick={() => (dlg = null)}>Abbrechen</button><button class="knopf haupt" onclick={neueAnlegen}>Anlegen</button></div>
        {:else if dlg === 'gewichte'}
          <h2>Profil und Gewichte</h2>
          <p class="leise klein"><b>Klausuren : AT = 50 : 50</b> ist Schulvorgabe und nicht änderbar (E83). Frei ist die Gewichtung innerhalb der AT. Gewichte sind relativ (E41): 1 : 1 und 50 : 50 rechnen gleich. Voreinstellung nach UPZ 0,6 : 0,4.</p>
          <div class="formular zwei">
            <label class="feld"><span>Mündliche Leistungen</span><input type="number" min="0" step="0.05" bind:value={kurs.gewichte.mitarbeit} oninput={speichern} /></label>
            <label class="feld"><span>Tests und Sonstiges</span><input type="number" min="0" step="0.05" bind:value={kurs.gewichte.sl} oninput={speichern} /></label>
          </div>
          {@const sa = (g.mitarbeit + g.sl) || 1}
          <p class="klein anteile">Anteil an der Gesamtnote: <b>Klausuren 50 %</b> · <b>mündlich {Math.round((g.mitarbeit / sa) * 500) / 10} %</b> · <b>Tests und Sonstiges {Math.round((g.sl / sa) * 500) / 10} %</b></p>
          <div class="zeile vorlagen">
            {#each [[0.6, 0.4, 'UPZ 60 : 40'], [0.5, 0.5, '50 : 50'], [0.4, 0.6, '40 : 60']] as [m, t, txt]}
              <button class="pille" aria-pressed={Math.abs(g.mitarbeit / sa - (m as number)) < 1e-9} onclick={() => { kurs.gewichte.mitarbeit = m as number; kurs.gewichte.sl = t as number; speichern(); }}>{txt}</button>
            {/each}
          </div>
          <label class="feld"><span>Rechenprofil</span>
            <select bind:value={kurs.profil} onchange={speichern}>
              <option value="FOS">FOS: Notenpunkte 0–15, Rundung in Stufen (UPZ)</option>
              <option value="OSZ">OSZ: Noten 1–6, Notenschnitt (vereinfacht)</option>
            </select>
          </label>
          <p class="klein leise">Achtung: Beim Wechsel des Profils bleiben die eingetragenen Zahlen stehen und werden nicht umgerechnet.</p>
          <div class="zeile ende"><button class="knopf haupt" onclick={() => (dlg = null)}>Fertig</button></div>
        {:else if dlg === 'monat'}
          <h2>Monatsnote vorschlagen</h2>
          <p class="klein leise">Monatsnote der mündlichen Leistungen aus den Mitarbeit-Smileys des Monats: Smiley 1 bis 5 = Note 1 bis 5{fos ? ', umgerechnet in Notenpunkte (Note 1 = 14, 2 = 11, 3 = 8, 4 = 5, 5 = 2)' : ''}. Gibt es für den Monat eine Raster-Einschätzung, gilt deren Ergebnis. Du kannst jeden Vorschlag ändern.</p>
          <div class="zeile">
            <label class="feld raum"><span>Monat</span><input type="month" bind:value={monat} /></label>
            <button class="knopf haupt" onclick={() => monatUebernehmen()}>Alle übernehmen</button>
          </div>
          <table class="mtab zahl">
            <tbody>
              {#each vorschlaege as r}
                {@const ist = monatSpalte ? zelle(monatSpalte, r.s) : undefined}
                <tr>
                  <td>{name(r.s)}<div class="klein leise">{#if r.raster}aus dem Raster · {r.n} Smileys{:else}{r.n} Einträge{r.v ? ` · Ø Smiley ${zahl(r.v.note)}` : ''}{/if}{#if r.wenig && !r.raster} · <a href="/muendlich/{kurs.id}?monat={monat}&s={r.s.id}">mit Raster einschätzen</a>{/if}</div></td>
                  <td><input class="eingabe klein-in" value={geaendert[r.s.id] ?? (r.v ? r.v.wert : '')} oninput={(e) => (geaendert[r.s.id] = (e.currentTarget as HTMLInputElement).value)} aria-label="Vorschlag {name(r.s)}" /></td>
                  <td>{#if ist?.wert !== undefined}<span class="leise klein">steht: {ist.wert}</span>{/if}</td>
                  <td><button class="knopf leise" disabled={!r.v && !geaendert[r.s.id]} onclick={() => monatUebernehmen(r.s.id)} aria-label="übernehmen">✓</button></td>
                </tr>
              {/each}
            </tbody>
          </table>
          <div class="zeile ende"><button class="knopf leise" onclick={() => (dlg = null)}>Schließen</button></div>
        {:else if 'l' in dlg}
          {@const l = dlg.l}
          <h2>{l.name}</h2>
          <div class="formular">
            <label class="feld"><span>Name</span><input bind:value={l.name} oninput={speichern} /></label>
            {#if l.gruppe !== 'mitarbeit'}<label class="feld"><span>Datum</span><input type="date" bind:value={l.datum} oninput={speichern} /></label>{/if}
            <label class="feld"><span>Gewicht in der Gruppe (relativ)</span><input type="number" min="0" step="0.1" bind:value={l.gewicht} oninput={speichern} /></label>
          </div>
          <p class="klein leise">Spalten-Ø {zahl(spaltenSchnitt(l))} · eingetragen {liste.filter((s) => zelle(l, s)?.wert !== undefined || zelle(l, s)?.status).length} von {liste.length}</p>
          <div class="zeile ende"><button class="knopf leise warn" onclick={() => loeschen(l)}>Löschen</button><span class="raum"></span><button class="knopf haupt" onclick={() => (dlg = null)}>Fertig</button></div>
        {:else if 's' in dlg}
          {@const s = dlg.s}
          {@const e = ergebnisse[s.id]}
          <div class="zeile"><h2 class="raum">{name(s)}</h2><a class="klein" href="/schueler/{s.id}?kurs={kurs.id}">Schülerkarte</a></div>
          <p class="klein leise">Rechenweg · Stufe antippen für die Zahlen</p>
          <Rechenweg erg={e} profil={kurs.profil} offen={['gesamt']} />
          {#if e.nachschreiben.length}<p class="klein">Nachschreiben offen: {e.nachschreiben.join(', ')}</p>{/if}
          {#each Object.entries(kurs.zellen).filter(([k, z]) => k.endsWith(':' + s.id) && z.stern) as [k, z]}
            <p class="klein"><span class="stern-i">★</span> {kurs.leistungen.find((l) => k.startsWith(l.id + ':'))?.name}: {z.stern}</p>
          {/each}
          <WasWaereWenn {kurs} sid={s.id} />
          <p class="klein leise">Endnote festlegen {e.vorschlag.length > 1 ? '(genau ,50: du entscheidest)' : ''}</p>
          <div class="tasten">
            {#each skala.werte as w}
              <button class="taste" class:vorschlag={e.vorschlag.includes(w)} class:an={kurs.endnoten[s.id] === w} class:rot={!bestanden(kurs.profil, w)} onclick={() => festlegen(s, w)}>{w}</button>
            {/each}
          </div>
          <div class="zeile ende">
            {#if kurs.endnoten[s.id] !== undefined}<button class="knopf leise" onclick={() => festlegen(s, null)}>Festlegung aufheben</button>{/if}
            <span class="raum"></span><button class="knopf haupt" onclick={() => (dlg = null)}>Fertig</button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  .leer { margin-bottom: 14px; }
  .seite { padding: 18px 32px 200px; }
  .tabwrap { padding: 0; overflow: auto; max-height: calc(100dvh - 190px); }
  table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 14px; }
  th, td { border-bottom: 1px solid var(--leo-linie-fein); border-right: 1px solid var(--leo-linie-fein); padding: 0; text-align: center; }
  thead th { background: var(--leo-flaeche-leise); position: sticky; z-index: 3; font-weight: 600; }
  thead tr:nth-child(1) th { top: 0; height: 44px; }
  thead tr:nth-child(2) th { top: 44px; height: 40px; }
  thead tr:nth-child(3) th { top: 84px; }
  .name { position: sticky; left: 0; background: var(--leo-karte); text-align: left; padding: 6px 14px; min-width: 180px; z-index: 2; font-weight: 500; }
  thead .name, tfoot .name { background: var(--leo-flaeche-leise); z-index: 4; }
  .name a { color: var(--leo-tinte); text-decoration: none; }
  .gk { text-align: left; }
  .gkb { width: 100%; height: 100%; display: flex; justify-content: space-between; gap: 12px; background: none; border: 0; padding: 0 14px; font-weight: 650; }
  .gkb span { color: var(--leo-leise); font-weight: 500; }
  .sp button { background: none; border: 0; padding: 8px 6px; display: flex; flex-direction: column; align-items: center; width: 100%; font-weight: 600; min-width: 64px; }
  .schnitt { background: var(--leo-flaeche-leise); min-width: 62px; }
  .zelle { position: relative; min-width: 62px; }
  .zelle input { width: 100%; height: 48px; border: 0; background: transparent; text-align: center; font-weight: 700; font-size: var(--leo-text-note); font-variant-numeric: tabular-nums; padding: 0 4px; color: var(--leo-tinte); }
  .zelle input::placeholder { color: var(--leo-linie); }
  .zelle input:focus { outline: 2px solid var(--leo-akzent); outline-offset: -2px; background: var(--leo-auswahl); }
  .zelle.rot input, .zelle.ue input { color: var(--leo-warnung); }
  .zelle.ue input { background: var(--leo-warnung-hell); font-size: 12px; }
  .zelle.e input { font-size: 12px; color: var(--leo-leise); }
  .zelle.e input::placeholder { color: var(--leo-leise); }
  .nt { position: absolute; left: 3px; bottom: 2px; font-size: 9px; color: var(--leo-akzent); font-weight: 700; pointer-events: none; }
  .stern { position: absolute; top: 2px; right: 4px; color: var(--leo-stern); font-size: 12px; pointer-events: none; }
  .eg { position: absolute; bottom: 2px; right: 4px; color: var(--leo-akzent); font-size: 10px; font-weight: 700; pointer-events: none; }
  .ber { color: var(--leo-berechnet); font-size: 13px; font-weight: 500; text-decoration: underline dotted; text-underline-offset: 3px; }
  .warn { color: var(--leo-warnung) !important; }
  .ges { position: sticky; right: 0; background: var(--leo-akzent-hell); border-left: 3px solid var(--leo-akzent); min-width: 130px; z-index: 2; }
  .kopfges { color: var(--leo-akzent); z-index: 4; background: var(--leo-akzent-hell) !important; }
  .gesb { background: none; border: 0; width: 100%; padding: 6px 8px; display: flex; flex-direction: column; align-items: center; }
  .gn { font-size: var(--leo-text-endnote); font-weight: 800; }
  .hinweis { color: var(--leo-stern); }
  tr.aktivzeile .name { background: var(--leo-auswahl); }
  tfoot td, tfoot th { font-size: 12px; padding: 8px 4px; background: var(--leo-flaeche-leise); }
  .notenleiste { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(16px + var(--unten, 0px)); z-index: 30; padding: 10px 12px; width: min(980px, calc(100vw - 24px)); }
  .kopfzeile { margin: 0 4px 8px; }
  .tasten { display: flex; flex-wrap: wrap; gap: 6px; }
  .tasten.sonder { margin-top: 6px; }
  .taste { min-width: 46px; height: 46px; border-radius: var(--leo-r-m); border: 0; background: var(--leo-taste); font-weight: 700; font-size: 16px; padding: 0 10px; font-variant-numeric: tabular-nums; }
  .taste.rot { color: var(--leo-warnung); }
  .taste.rahmen { background: var(--leo-karte); border: 1px solid var(--leo-linie); font-size: 14px; font-weight: 600; }
  .taste.an { background: var(--leo-akzent); color: var(--leo-auf-akzent); }
  .taste.vorschlag { outline: 2px solid var(--leo-akzent); }
  .sternzeile { margin-top: 8px; }
  .gewfeld { display: inline-flex; align-items: center; gap: 6px; }
  .gewfeld input { width: 56px; height: 32px; border: 1px solid var(--leo-linie); border-radius: var(--leo-r-s); text-align: center; background: var(--leo-karte); }
  .gkb.fest { cursor: default; align-items: center; }
  .schnitt .ber { background: none; border: 0; padding: 12px 6px; width: 100%; cursor: pointer; font-variant-numeric: tabular-nums; }
  .skachel { position: fixed; z-index: 35; width: 440px; max-width: calc(100vw - 24px); max-height: 70vh; overflow: auto; padding: 14px 16px; }
  .kachelfang { position: fixed; inset: 0; z-index: 34; }
  .x { border: 0; background: none; font-size: 20px; color: var(--leo-leise); min-width: 36px; min-height: 32px; }
  .liste { padding: 0 14px; margin-bottom: 12px; }
  .lz { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--leo-linie-fein); text-decoration: none; color: var(--leo-tinte); }
  .lnote { font-size: 26px; font-weight: 800; }
  .kacheln { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0; }
  .kachel { border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); background: var(--leo-karte); padding: 12px; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; font-weight: 600; }
  .kachel[aria-pressed='true'] { border: 2px solid var(--leo-akzent); background: var(--leo-akzent-hell); padding: 11px; }
  .formular { display: flex; flex-direction: column; gap: 12px; margin: 12px 0; }
  .formular.zwei { display: grid; grid-template-columns: 1fr 1fr; }
  .ende { justify-content: flex-end; margin-top: 16px; }
  .anteile { margin: 8px 0 4px; }
  .vorlagen { gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .stern-i { color: var(--leo-stern); }
  .w-unter { color: var(--leo-warnung); font-weight: 600; }
  .w-kippe { color: #8a6200; font-weight: 600; }
  .w-wenig { color: var(--leo-leise); font-style: italic; }

  .mtab { width: 100%; margin-top: 12px; }
  .mtab td { text-align: left; padding: 6px 4px; border-right: 0; }
  .klein-in { width: 70px; text-align: center; }
  .dialog p { margin: 12px 0 6px; }
  @media (max-width: 720px) { .seite { padding: 12px 12px 200px; } .formular.zwei { grid-template-columns: 1fr; } .kacheln { grid-template-columns: 1fr 1fr; } }
</style>
