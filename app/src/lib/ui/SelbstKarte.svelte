<script lang="ts">
  // Selbsteinschätzung per Link (FB7b, E116): Runde je Klasse und Monat, Einmal-Links per Mail, Antworten holen.
  // Der Server sieht keine Namen und kann die Antworten nicht lesen; die Zuordnung steht nur in diesem Gerät.
  import { untrack } from 'svelte';
  import { app, abgleich, speichern, zeige, dienstRufen } from '$lib/speicher.svelte';
  import { name } from '$lib/hilfen';
  import { schulAdresse, mailLink } from '$lib/nachschreiben';
  import { alleRaster, kriteriumAktiv } from '$lib/raster';
  import {
    neueRundenId, neuerToken, linkHash, linkFuer, schluesselpaar, antwortLesen, antwortSaeubern, bogenFuer, bogenKriterien,
    fristIn, fristText, monatText, rundenStand, selbstMail, selbstMailWerte, SELBST_MAIL, SELBST_ERINNERUNG, SELBST_PLATZHALTER, type GeheimeAntwort
  } from '$lib/selbst';
  import type { Kurs, Raster, Schueler } from '$lib/typen';

  let { kurs, monat, raster }: { kurs: Kurs; monat: string; raster: Raster } = $props();
  const d = app.d!;

  const runde = $derived(kurs.selbst?.[monat]);
  const stand = $derived(runde ? rundenStand(runde, kurs.schueler) : null);
  const schueler = $derived(
    kurs.schueler.map((id) => d.schueler.find((s) => s.id === id)).filter((s): s is Schueler => !!s).sort((a, b) => a.nachname.localeCompare(b.nachname, 'de'))
  );
  const kriterien = $derived(bogenKriterien(raster, (k) => kriteriumAktiv(kurs, k)));
  const basis = $derived((d.einstellungen.selbstAdresse || (typeof location === 'undefined' ? '' : location.origin)).replace(/\/+$/, ''));

  let fristTage = $state(7);
  let arbeitet = $state(false);
  let fehler = $state('');
  let listeOffen = $state(false);
  let textOffen = $state(false);
  let textArt = $state<'einladung' | 'erinnerung'>('einladung');
  let beendenFrage = $state(false);

  async function mitFehler(f: () => Promise<void>) {
    fehler = '';
    arbeitet = true;
    try { await f(); } catch (e) { fehler = (e as Error).message; } finally { arbeitet = false; }
  }

  const oeffentlich = (p: JsonWebKey): JsonWebKey => ({ kty: p.kty, crv: p.crv, x: p.x, y: p.y });

  function erstellen() {
    return mitFehler(async () => {
      if (!kriterien.length) throw new Error('Das Raster hat keine eingeschalteten Kriterien.');
      const id = neueRundenId();
      const paar = await schluesselpaar();
      const links = Object.fromEntries(kurs.schueler.map((sid) => [sid, { token: neuerToken(id) }]));
      const frist = fristIn(fristTage);
      await dienstRufen('selbst/runde', {
        id, bogen: bogenFuer(kurs, monat, kriterien, frist, paar.oeffentlich),
        links: await Promise.all(Object.values(links).map((l) => linkHash(l.token)))
      });
      kurs.selbst ??= {};
      kurs.selbst[monat] = { id, monat, rasterId: raster.id, kriterien: kriterien.map((k) => k.id), frist, basis, privat: paar.privat, links, antworten: {}, erstellt: new Date().toISOString() };
      speichern();
      zeige(`${Object.keys(links).length} Links erstellt. Jetzt die Mails öffnen.`);
    });
  }

  /** Neue Schüler der Klasse bekommen einen Link in derselben Runde. */
  function ergaenzen() {
    return mitFehler(async () => {
      const r = runde!;
      const rr = alleRaster(d).find((x) => x.id === r.rasterId) ?? raster;
      const kr = rr.bereiche.flatMap((b) => b.kriterien).filter((k) => r.kriterien.includes(k.id));
      const neu = Object.fromEntries(stand!.ohneLink.map((sid) => [sid, { token: neuerToken(r.id) }]));
      await dienstRufen('selbst/runde', {
        id: r.id, bogen: bogenFuer(kurs, r.monat, kr, r.frist, oeffentlich(r.privat)),
        links: await Promise.all(Object.values(neu).map((l) => linkHash(l.token)))
      });
      Object.assign(r.links, neu);
      speichern();
      zeige(`${Object.keys(neu).length} Links ergänzt`);
    });
  }

  function holen(still = false) {
    return mitFehler(async () => {
      const r = runde!;
      let a: { antworten: Record<string, { antwort: GeheimeAntwort; abgegeben: string }> };
      try {
        a = await dienstRufen('selbst/antworten', { id: r.id });
      } catch (e: any) {
        if (e.status === 404) { r.beendet ??= new Date().toISOString(); speichern(); throw new Error('Die Runde ist auf dem Server nicht mehr da (abgelaufen oder beendet). Die geholten Antworten bleiben hier.'); }
        throw e;
      }
      let neu = 0;
      for (const [sid, l] of Object.entries(r.links)) {
        if (r.antworten[sid]) continue;
        const h = await linkHash(l.token);
        const x = a.antworten[h];
        if (!x) continue;
        try {
          r.antworten[sid] = antwortSaeubern(await antwortLesen(r.privat, x.antwort, h), r.kriterien, x.abgegeben);
          neu++;
        } catch { /* nicht lesbar: übergehen */ }
      }
      r.geholt = new Date().toISOString();
      speichern();
      if (!still || neu) zeige(neu ? `${neu} neue Selbsteinschätzung${neu === 1 ? '' : 'en'}` : 'Keine neuen Antworten');
    });
  }

  function beenden() {
    return mitFehler(async () => {
      const r = runde!;
      await dienstRufen('selbst/beenden', { id: r.id }).catch((e: any) => { if (e.status !== 404) throw e; });
      r.beendet = new Date().toISOString();
      beendenFrage = false;
      speichern();
      zeige('Runde beendet. Auf dem Server ist nichts mehr, die Antworten bleiben hier.');
    });
  }

  // Beim Öffnen einmal still nachsehen, ob Antworten da sind
  let geholtFuer = '';
  $effect(() => {
    const r = runde;
    if (!r || r.beendet || !abgleich.verbunden || geholtFuer === r.id) return;
    geholtFuer = r.id;
    untrack(() => holen(true));
  });

  // ---------- Mails ----------
  const vorlagen = $derived({ einladung: d.einstellungen.selbstMail ?? SELBST_MAIL, erinnerung: d.einstellungen.selbstErinnerung ?? SELBST_ERINNERUNG });
  function mailFuer(s: Schueler, art: 'einladung' | 'erinnerung') {
    const m = selbstMail(vorlagen[art], selbstMailWerte(runde!, kurs, s));
    const an = schulAdresse(s, d.schueler);
    return { ...m, an, href: mailLink(an.adresse, m.betreff, m.text) };
  }
  function gesendet(s: Schueler, art: 'einladung' | 'erinnerung') {
    const l = runde?.links[s.id];
    if (!l) return;
    if (art === 'einladung') l.mail = new Date().toISOString(); else l.erinnert = new Date().toISOString();
    speichern();
  }
  async function kopieren(s: Schueler, art: 'einladung' | 'erinnerung') {
    const m = mailFuer(s, art);
    try {
      await navigator.clipboard.writeText(`An: ${m.an.adresse}\nBetreff: ${m.betreff}\n\n${m.text}`);
      gesendet(s, art);
      zeige('Mail kopiert, zum Einfügen in IServ');
    } catch { zeige('Kopieren ging nicht, bitte „Mail öffnen“ nutzen'); }
  }
  const heute = new Date().toISOString().slice(0, 10);
  // Nächste Mail: erst alle Einladungen, danach Erinnerungen an die Fehlenden (höchstens eine am Tag)
  const naechste = $derived.by(() => {
    if (!runde || runde.beendet || !stand) return null;
    const ohne = schueler.find((s) => runde.links[s.id] && !runde.links[s.id].mail);
    if (ohne) return { s: ohne, art: 'einladung' as const };
    if (stand.abgelaufen) return null;
    const fehlt = schueler.find((s) => runde.links[s.id] && !runde.antworten[s.id] && !runde.links[s.id].erinnert?.startsWith(heute));
    return fehlt ? { s: fehlt, art: 'erinnerung' as const } : null;
  });
  const naechsteMail = $derived(naechste ? mailFuer(naechste.s, naechste.art) : null);
  const erinnerungOffen = $derived(runde && stand ? schueler.filter((s) => runde.links[s.id]?.mail && !runde.antworten[s.id] && !runde.links[s.id].erinnert?.startsWith(heute)).length : 0);

  function vorlageAendern(feld: 'betreff' | 'text', wert: string) {
    if (textArt === 'einladung') d.einstellungen.selbstMail = { ...vorlagen.einladung, [feld]: wert };
    else d.einstellungen.selbstErinnerung = { ...vorlagen.erinnerung, [feld]: wert };
    speichern();
  }
  function vorlageZurueck() {
    if (textArt === 'einladung') delete d.einstellungen.selbstMail; else delete d.einstellungen.selbstErinnerung;
    speichern();
  }
  const eigeneVorlage = $derived(textArt === 'einladung' ? !!d.einstellungen.selbstMail : !!d.einstellungen.selbstErinnerung);
  function adresseSetzen(w: string) {
    const x = w.trim().replace(/\/+$/, '');
    if (x && !/^https:\/\//.test(x)) { zeige('Die Adresse muss mit https:// beginnen'); return; }
    if (x) d.einstellungen.selbstAdresse = x; else delete d.einstellungen.selbstAdresse;
    speichern();
  }
  const tag = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' }) : '');
</script>

<section class="karte selbst">
  <div class="zeile wrap kopfzeile">
    <h2 class="raum">Selbsteinschätzung · {monatText(monat)}</h2>
    {#if runde && stand}
      <span class="pille-info" class:fertig={stand.zurueck === stand.gesamt}>{stand.zurueck} von {stand.gesamt} zurück</span>
      <span class="klein leise">{runde.beendet ? `beendet am ${tag(runde.beendet)}` : stand.abgelaufen ? `Frist vorbei (${fristText(runde.frist)})` : `bis ${fristText(runde.frist)}`}</span>
    {/if}
  </div>

  {#if !runde}
    <p class="klein leise">Jeder Schüler bekommt einen eigenen Link per Mail und schätzt sich mit denselben {kriterien.length} Kriterien ein wie du. Das zählt nicht zur Note, du siehst das Selbstbild neben deinem Raster. Der Server sieht keine Namen und kann die Antworten nicht lesen.</p>
    {#if !abgleich.verbunden}
      <p class="klein warn-text">Dafür muss dieses Gerät mit deinem Server verbunden sein, denn die Schüler öffnen den Bogen dort. <a href="/mehr">Mehr › Abgleich</a></p>
    {/if}
    <div class="zeile wrap">
      <div class="feld"><span>Zeit zum Ausfüllen</span>
        <div class="zeile">{#each [[3, '3 Tage'], [7, '1 Woche'], [14, '2 Wochen']] as [n, t]}<button class="pille" aria-pressed={fristTage === n} onclick={() => (fristTage = n as number)}>{t}</button>{/each}</div>
      </div>
      <div class="raum"></div>
      <button class="knopf haupt" disabled={arbeitet || !abgleich.verbunden || !kurs.schueler.length} onclick={erstellen}>{arbeitet ? 'Erstelle …' : `Links für ${kurs.schueler.length} Schüler erstellen`}</button>
    </div>
  {:else if stand}
    <div class="balken" role="img" aria-label="{stand.zurueck} von {stand.gesamt} zurück"><span style:width="{stand.gesamt ? (stand.zurueck / stand.gesamt) * 100 : 0}%"></span></div>
    <div class="zeile wrap aktionen">
      {#if naechste && naechsteMail}
        <a class="knopf haupt" href={naechsteMail.href} onclick={() => gesendet(naechste.s, naechste.art)}>
          {naechste.art === 'einladung' ? `Nächste Mail öffnen · ${name(naechste.s)}` : `Erinnerung · ${name(naechste.s)}`}
        </a>
        <span class="klein leise">{stand.ohneMail.length ? `noch ${stand.ohneMail.length} Einladungen` : `${erinnerungOffen} Erinnerungen offen`}</span>
      {:else if !runde.beendet}
        <span class="klein leise">{stand.zurueck === stand.gesamt ? 'Alle haben abgegeben.' : stand.abgelaufen ? 'Frist vorbei, Erinnerungen ergeben keinen Sinn mehr.' : 'Alle Mails sind raus, heute schon erinnert.'}</span>
      {/if}
      <div class="raum"></div>
      {#if !runde.beendet}
        <button class="knopf leise" disabled={arbeitet || !abgleich.verbunden} onclick={() => holen()}>{arbeitet ? 'Hole …' : 'Antworten holen'}</button>
      {/if}
    </div>
    {#if runde.geholt}<p class="klein leise">Zuletzt geholt {new Date(runde.geholt).toLocaleString('de-DE', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr. Die Antworten stehen beim Schüler im Raster.</p>{/if}
    {#if stand.ohneLink.length && !runde.beendet}
      <p class="klein">{stand.ohneLink.length} Schüler sind neu in der Klasse und haben noch keinen Link. <button class="knopf leise klein" disabled={arbeitet} onclick={ergaenzen}>Links ergänzen</button></p>
    {/if}

    <button class="aufklapp" aria-expanded={listeOffen} onclick={() => (listeOffen = !listeOffen)}><b class="raum">Alle Schüler</b><span class="klein leise">{listeOffen ? '▴' : '▾'}</span></button>
    {#if listeOffen}
      <ul class="sliste">
        {#each schueler as s (s.id)}
          {@const l = runde.links[s.id]}
          {@const a = runde.antworten[s.id]}
          <li>
            <span class="raum"><b>{name(s)}</b>
              <span class="klein leise block">{a ? `abgegeben ${tag(a.zeit)}` : !l ? 'kein Link' : l.erinnert ? `erinnert ${tag(l.erinnert)}` : l.mail ? `Mail ${tag(l.mail)}` : 'noch keine Mail'}</span></span>
            {#if a}<span class="marke ok">✓</span>
            {:else if l && !runde.beendet}
              {@const art = l.mail ? 'erinnerung' : 'einladung'}
              {@const m = mailFuer(s, art)}
              <a class="knopf leise klein" href={m.href} onclick={() => gesendet(s, art)}>{art === 'einladung' ? 'Mail' : 'Erinnern'}</a>
              <button class="knopf leise klein" onclick={() => kopieren(s, art)}>kopieren</button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}

    <button class="aufklapp" aria-expanded={textOffen} onclick={() => (textOffen = !textOffen)}><b class="raum">Mailtext</b><span class="klein leise">{d.einstellungen.selbstMail || d.einstellungen.selbstErinnerung ? 'eigene Vorlage' : 'Standard'} {textOffen ? '▴' : '▾'}</span></button>
    {#if textOffen}{@render mailtext()}{/if}

    {#if !runde.beendet}
      <div class="zeile wrap fusszeile">
        {#if !beendenFrage}
          <button class="knopf leise" onclick={() => (beendenFrage = true)}>Runde beenden …</button>
        {:else}
          <span class="klein">Die Links funktionieren dann nicht mehr und auf dem Server wird alles gelöscht. Geholte Antworten bleiben hier.</span>
          <button class="knopf leise warn" disabled={arbeitet} onclick={beenden}>Ja, beenden</button>
          <button class="knopf leise" onclick={() => (beendenFrage = false)}>Abbrechen</button>
        {/if}
      </div>
    {/if}
  {/if}

  {#if !runde}
    <button class="aufklapp" aria-expanded={textOffen} onclick={() => (textOffen = !textOffen)}><b class="raum">Mailtext und Adresse</b><span class="klein leise">{d.einstellungen.selbstMail || d.einstellungen.selbstErinnerung ? 'eigene Vorlage' : 'Standard'} {textOffen ? '▴' : '▾'}</span></button>
    {#if textOffen}{@render mailtext()}{/if}
  {/if}
  {#if fehler}<p class="klein warn-text">{fehler}</p>{/if}
</section>

{#snippet mailtext()}
  <div class="mailtext">
    <div class="zeile">
      <button class="pille" aria-pressed={textArt === 'einladung'} onclick={() => (textArt = 'einladung')}>Einladung</button>
      <button class="pille" aria-pressed={textArt === 'erinnerung'} onclick={() => (textArt = 'erinnerung')}>Erinnerung</button>
    </div>
    {#key textArt}
      <label class="feld"><span>Betreff</span><input value={vorlagen[textArt].betreff} onchange={(e) => vorlageAendern('betreff', (e.currentTarget as HTMLInputElement).value)} /></label>
      <label class="feld"><span>Text</span><textarea rows="9" value={vorlagen[textArt].text} onchange={(e) => vorlageAendern('text', (e.currentTarget as HTMLTextAreaElement).value)}></textarea></label>
    {/key}
    <p class="klein leise">Platzhalter: {SELBST_PLATZHALTER.map((p) => `{${p}}`).join(' ')}. Die Vorlage gilt für alle Klassen. Jede Mail öffnet sich als Entwurf in deinem Mailprogramm, dort kannst du sie vor dem Senden noch für einzelne Schüler ändern.</p>
    {#if eigeneVorlage}<button class="knopf leise" onclick={vorlageZurueck}>Standard wiederherstellen</button>{/if}
    <label class="feld"><span>Adresse für die Schüler-Links</span><input placeholder={typeof location === 'undefined' ? '' : location.origin} value={d.einstellungen.selbstAdresse ?? ''} onchange={(e) => adresseSetzen((e.currentTarget as HTMLInputElement).value)} /></label>
    <p class="klein leise">Leer = Adresse dieser App. Für Schüler am besten eine eigene Domain, die nur den Bogen freigibt (Anleitung in PROTOTYP_UNRAID.md). Gilt für neue Runden.</p>
  </div>
{/snippet}

<style>
  .kopfzeile { align-items: center; }
  .wrap { flex-wrap: wrap; align-items: flex-end; }
  .selbst p { margin: 10px 0 0; }
  .pille-info { font-size: var(--leo-text-s); font-weight: 600; border-radius: var(--leo-r-pill); padding: 3px 10px; background: var(--leo-stern-hell); color: var(--leo-stern); }
  .pille-info.fertig { background: var(--leo-akzent-hell); color: var(--leo-akzent); }
  .balken { height: 6px; border-radius: var(--leo-r-pill); background: var(--leo-linie-fein); margin: 12px 0; overflow: hidden; }
  .balken span { display: block; height: 100%; background: var(--leo-akzent); }
  .aktionen { align-items: center; }
  .aktionen .knopf.haupt { white-space: normal; height: auto; min-height: 44px; padding-block: 8px; }
  .aufklapp { width: 100%; display: flex; align-items: center; gap: 8px; background: none; border: 0; border-top: 1px solid var(--leo-linie-fein); padding: 12px 0 4px; margin-top: 12px; font: inherit; color: inherit; cursor: pointer; text-align: left; }
  .sliste { list-style: none; margin: 4px 0; padding: 0; columns: 2 320px; column-gap: 24px; }
  .sliste li { display: flex; align-items: center; gap: 6px; padding: 6px 0; border-bottom: 1px solid var(--leo-linie-fein); break-inside: avoid; }
  .block { display: block; }
  .marke.ok { color: var(--leo-akzent); font-weight: 700; padding: 0 8px; }
  .mailtext { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
  .mailtext p { margin: 0; }
  .warn-text { color: var(--leo-warnung); }
  .fusszeile { margin-top: 12px; align-items: center; }
</style>
