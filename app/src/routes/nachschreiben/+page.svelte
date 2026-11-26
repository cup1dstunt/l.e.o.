<script lang="ts">
  // Modul 1 Nachschreiben (E104–E106, F8–F10): offene Fälle antippen, Termin festlegen, danach Mail-Entwurf und Checkliste.
  // Nichts geht automatisch raus: Die Mail öffnet erst auf Klick im eigenen Mailprogramm.
  import { page } from '$app/state';
  import { app, speichern, zeige, neueId } from '$lib/speicher.svelte';
  import { name, datumWt, heuteISO } from '$lib/hilfen';
  import { nachschreibLage, terminSicht, schulAdresse, mailWerte, fuellen, mailLink, mailFuer, terminStand, vorlagenVon, vorlageFuerStatus, PLATZHALTER_INFO, type Fall, type MailVorlage, type TerminSicht } from '$lib/nachschreiben';
  import type { NachTermin, MailEntwurf } from '$lib/typen';

  const d = app.d!;
  const heute = heuteISO();
  const nurKurs = $derived(page.url.searchParams.get('kurs') ?? '');
  const lage = $derived(nachschreibLage(d));
  const imKurs = (kid: string) => !nurKurs || kid === nurKurs;

  // ---------- Offene Fälle, nach Klausur gruppiert ----------
  const gruppen = $derived.by(() => {
    const m = new Map<string, Fall[]>();
    for (const f of lage.ohneTermin.filter((f) => imKurs(f.kurs.id))) {
      const k = `${f.kurs.id}|${f.leistung.id}`;
      m.set(k, [...(m.get(k) ?? []), f]);
    }
    return [...m.values()];
  });
  const hinweise = $derived(lage.hinweise.filter((h) => imKurs(h.kurs.id)));

  let auswahl = $state<string[]>((() => { const f = page.url.searchParams.get('fall'); return f ? [f] : []; })());
  const umschalten = (key: string) => (auswahl = auswahl.includes(key) ? auswahl.filter((k) => k !== key) : [...auswahl, key]);
  const alleWaehlen = (g: Fall[]) => {
    const keys = g.map((f) => f.key);
    auswahl = keys.every((k) => auswahl.includes(k)) ? auswahl.filter((k) => !keys.includes(k)) : [...new Set([...auswahl, ...keys])];
  };
  const gewaehlt = $derived(lage.ohneTermin.filter((f) => auswahl.includes(f.key)));

  // ---------- Termin festlegen ----------
  const naechsterWerktag = () => { const t = new Date(); t.setDate(t.getDate() + 7); return t.toISOString().slice(0, 10); };
  let neu = $state({ datum: naechsterWerktag(), beginn: '14:00', raum: '', zu: '' });
  const offeneTermine = $derived((d.nachschreiben ?? []).map((t) => terminSicht(d, t)).filter((t) => !t.erledigt || t.eintraege.length === 0).sort((a, b) => (a.termin.datum + a.termin.beginn).localeCompare(b.termin.datum + b.termin.beginn)));
  const erledigteTermine = $derived((d.nachschreiben ?? []).map((t) => terminSicht(d, t)).filter((t) => t.erledigt).sort((a, b) => b.termin.datum.localeCompare(a.termin.datum)));
  let offenerTermin = $state<string | null>(null);

  function festlegen() {
    if (!gewaehlt.length) return;
    if (neu.zu) {
      const t = d.nachschreiben.find((x) => x.id === neu.zu)!;
      t.faelle.push(...gewaehlt.map((f) => f.key).filter((k) => !t.faelle.includes(k)));
      offenerTermin = t.id;
      zeige(`${gewaehlt.length} zum Termin am ${datumWt(t.datum)} hinzugefügt`);
    } else {
      if (!neu.datum || !neu.beginn) { zeige('Bitte Datum und Uhrzeit wählen'); return; }
      const t: NachTermin = { id: neueId(), datum: neu.datum, beginn: neu.beginn, raum: neu.raum.trim() || gewaehlt[0].kurs.raum, faelle: gewaehlt.map((f) => f.key), vorbereitet: false, gedruckt: false, mails: {} };
      d.nachschreiben.push(t);
      offenerTermin = t.id;
      zeige(`Termin am ${datumWt(t.datum)} festgelegt, die Mails stehen bereit`);
    }
    auswahl = [];
    speichern();
  }

  function entfernen(t: NachTermin, key: string) {
    const i = t.faelle.indexOf(key);
    if (i < 0) return;
    t.faelle.splice(i, 1);
    delete t.mails[key];
    delete t.entwuerfe?.[key];
    speichern();
    zeige('Aus dem Termin genommen, wieder bei den offenen Fällen', () => { t.faelle.splice(i, 0, key); speichern(); });
  }
  function loeschen(t: NachTermin) {
    const i = d.nachschreiben.indexOf(t);
    const kopie = JSON.parse(JSON.stringify(t));
    d.nachschreiben.splice(i, 1);
    speichern();
    zeige('Termin gelöscht, die Fälle sind wieder offen', () => { d.nachschreiben.splice(i, 0, kopie); speichern(); });
  }
  function statusSetzen(kursId: string, leistungId: string, sid: string, status: 'E' | 'UE') {
    const kurs = d.kurse.find((k) => k.id === kursId)!;
    const key = `${leistungId}:${sid}`;
    const alt = kurs.zellen[key] ? { ...kurs.zellen[key] } : undefined;
    kurs.zellen[key] = { ...(alt ?? {}), status };
    delete kurs.zellen[key].wert;
    speichern();
    zeige(`${status} ins Notenbuch übernommen`, () => { if (alt) kurs.zellen[key] = alt; else delete kurs.zellen[key]; speichern(); });
  }

  // ---------- Mailvorlagen (E105, E116) ----------
  const vorlagen = $derived(vorlagenVon(d.einstellungen));
  let vorlageOffen = $state(false);
  let aktivId = $state('std-e');
  const aktiv = $derived(vorlagen.find((v) => v.id === aktivId) ?? vorlagen[0]);
  let feldText = $state<HTMLTextAreaElement | null>(null);
  let feldBetreff = $state<HTMLInputElement | null>(null);
  let letztesFeld: 'betreff' | 'text' = 'text';

  function vorlageSpeichern(v: MailVorlage) {
    const liste = (d.einstellungen.nachschreibVorlagen ??= []);
    const i = liste.findIndex((x) => x.id === v.id);
    const sauber = { id: v.id, name: v.name, betreff: v.betreff, text: v.text };
    if (i >= 0) liste[i] = sauber; else liste.push(sauber);
    if (v.id === 'std-e') delete d.einstellungen.nachschreibMail; // alte Einzelvorlage ist jetzt hier aufgegangen
    speichern();
  }
  const vorlageAendern = (feld: 'name' | 'betreff' | 'text', wert: string) => vorlageSpeichern({ ...aktiv, [feld]: wert });
  function vorlageNeu() {
    const v = { id: neueId(), name: 'Eigene Vorlage', betreff: aktiv.betreff, text: aktiv.text };
    vorlageSpeichern(v);
    aktivId = v.id;
    zeige('Neue Vorlage als Kopie angelegt');
  }
  function vorlageZurueck() {
    const liste = d.einstellungen.nachschreibVorlagen ?? [];
    const vorher = { liste: JSON.parse(JSON.stringify(liste)), alt: d.einstellungen.nachschreibMail };
    d.einstellungen.nachschreibVorlagen = liste.filter((x) => x.id !== aktiv.id);
    if (aktiv.id === 'std-e') delete d.einstellungen.nachschreibMail;
    const eingebaut = aktiv.eingebaut;
    if (!eingebaut) aktivId = 'std-e';
    speichern();
    zeige(eingebaut ? 'Standardtext wiederhergestellt' : 'Vorlage gelöscht', () => {
      d.einstellungen.nachschreibVorlagen = vorher.liste;
      if (vorher.alt) d.einstellungen.nachschreibMail = vorher.alt;
      speichern();
    });
  }
  /** Platzhalter antippen statt eintippen: an der Cursorposition im zuletzt benutzten Feld einsetzen. */
  function platzhalterEinsetzen(name: string) {
    const el = letztesFeld === 'betreff' ? feldBetreff : feldText;
    if (!el) return;
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd ?? s;
    const neuWert = el.value.slice(0, s) + `{${name}}` + el.value.slice(e);
    vorlageAendern(letztesFeld, neuWert);
    requestAnimationFrame(() => { el.focus(); const p = s + name.length + 2; el.setSelectionRange(p, p); });
  }
  // Vorschau mit einem echten Fall, sonst mit einem erfundenen Beispiel
  const vorschau = $derived.by(() => {
    const ts = offeneTermine.find((x) => x.eintraege.length);
    const e = ts?.eintraege[0];
    const w = ts && e
      ? mailWerte(ts.termin, e.kurs, e.leistung, e.schueler, aktivId === 'std-offen' ? 'offen' : e.status)
      : { vorname: 'Alex', nachname: 'Beispiel', klausur: 'Klausur 1', fach: 'Englisch', klasse: '2FOS', klausurdatum: 'Donnerstag, 8. Oktober', datum: 'Dienstag, 24. November', uhrzeit: '14:00', raum: '2.14', status: 'entschuldigt', frist: 'Sonntag, 11. Oktober', nta: '', hinweis: '' };
    return { fuer: e ? name(e.schueler) : 'Beispiel', betreff: fuellen(aktiv.betreff, w), text: fuellen(aktiv.text, w) };
  });

  // ---------- Mail je Schüler (E105, E116) ----------
  type Eintrag = TerminSicht['eintraege'][number];
  const mail = (t: NachTermin, e: Eintrag) => ({ ...mailFuer(t, e.kurs, e.leistung, e.schueler, e.status, vorlagen, e.key), an: schulAdresse(e.schueler, d.schueler) });
  let offenerEntwurf = $state<string | null>(null);

  function entwurf(t: NachTermin, key: string): MailEntwurf { return ((t.entwuerfe ??= {})[key] ??= {}); }
  function entwurfAendern(t: NachTermin, e: Eintrag, feld: 'betreff' | 'text', wert: string) {
    const m = mail(t, e);
    const ent = entwurf(t, e.key);
    // Beim ersten Anpassen beide Felder festhalten, damit eine spätere Vorlagenänderung den Entwurf nicht halb verändert
    ent.betreff ??= m.betreff;
    ent.text ??= m.text;
    ent[feld] = wert;
    ent.stand = terminStand(t);
    speichern();
  }
  function vorlageWaehlen(t: NachTermin, e: Eintrag, id: string) {
    const ent = entwurf(t, e.key);
    const vorher = { ...ent };
    if (id === vorlageFuerStatus(e.status)) delete ent.vorlage; else ent.vorlage = id;
    const hatteText = ent.text !== undefined;
    delete ent.text; delete ent.betreff; delete ent.stand;
    speichern();
    if (hatteText) zeige('Vorlage gewechselt, deine Anpassung ist ersetzt', () => { t.entwuerfe![e.key] = vorher; speichern(); });
  }
  function entwurfZurueck(t: NachTermin, e: Eintrag) {
    const ent = entwurf(t, e.key);
    const vorher = { ...ent };
    delete ent.text; delete ent.betreff; delete ent.stand;
    speichern();
    zeige('Wieder der Text aus der Vorlage', () => { t.entwuerfe![e.key] = vorher; speichern(); });
  }
  function hinweisSetzen(t: NachTermin, wert: string) {
    if (wert.trim()) t.hinweis = wert; else delete t.hinweis;
    speichern();
  }
  function mailOeffnen(t: NachTermin, key: string) {
    t.mails[key] = heute;
    speichern();
  }
  async function kopieren(t: NachTermin, e: Eintrag) {
    const m = mail(t, e);
    try {
      await navigator.clipboard.writeText(`An: ${m.an.adresse}\nBetreff: ${m.betreff}\n\n${m.text}`);
      t.mails[e.key] = heute;
      speichern();
      zeige('Mail kopiert, zum Einfügen in IServ');
    } catch { zeige('Kopieren geht in diesem Browser nicht'); }
  }
  function mailZurueck(t: NachTermin, key: string) { delete t.mails[key]; speichern(); }

  const STAND = { offen: 'Note fehlt', erledigt: 'nachgeschrieben', entfaellt: 'UE, entfällt' };
</script>

<svelte:head><title>Nachschreiben</title></svelte:head>

<header class="kopf">
  <h1>Nachschreiben</h1>
  <span class="leise">{lage.ohneTermin.length} ohne Termin · {offeneTermine.length} {offeneTermine.length === 1 ? 'Termin' : 'Termine'} geplant</span>
  <span class="raum"></span>
  {#if nurKurs}<a class="pille" href="/nachschreiben">alle Klassen zeigen</a>{/if}
</header>

<div class="seite">
  <div class="spalte">
    <section class="karte">
      <div class="zeile"><h2 class="raum">Ohne Termin</h2><span class="klein leise">E und offen dürfen nachschreiben, UE nicht (E104)</span></div>
      {#if gruppen.length === 0}<p class="leise">Niemand wartet auf einen Termin.</p>{/if}
      {#each gruppen as g (g[0].kurs.id + g[0].leistung.id)}
        <div class="gruppe">
          <div class="zeile">
            <b class="raum">{g[0].kurs.name} · {g[0].leistung.name}{#if g[0].leistung.datum}<span class="leise klein">&nbsp;am {datumWt(g[0].leistung.datum)}</span>{/if}</b>
            <button class="pille" onclick={() => alleWaehlen(g)}>alle</button>
          </div>
          <div class="chips">
            {#each g as f (f.key)}
              <button class="chip" aria-pressed={auswahl.includes(f.key)} onclick={() => umschalten(f.key)}>
                {name(f.schueler)}
                <span class="kennz" title={f.quelle === 'fehlzeit' ? 'aus den Fehlzeiten, im Notenbuch noch leer' : 'aus dem Notenbuch'}>{f.status === 'offen' ? '?' : 'E'}</span>
                {#if f.schueler.nta}<span class="nta" title={f.schueler.nta}>N</span>{/if}
                {#if f.quelle === 'fehlzeit'}<span class="klein leise">Fehlzeit</span>{/if}
              </button>
            {/each}
          </div>
        </div>
      {/each}

      {#if gewaehlt.length}
        <div class="festlegen">
          <p><b>{gewaehlt.length} ausgewählt:</b> {gewaehlt.map((f) => name(f.schueler)).join(', ')}</p>
          {#if offeneTermine.length}
            <label class="feld"><span>Termin</span>
              <select bind:value={neu.zu}>
                <option value="">neuer Termin</option>
                {#each offeneTermine as t}<option value={t.termin.id}>{datumWt(t.termin.datum)} {t.termin.beginn} · Raum {t.termin.raum} · {t.eintraege.length} Schüler</option>{/each}
              </select>
            </label>
          {/if}
          {#if !neu.zu}
            <div class="felder">
              <label class="feld"><span>Datum</span><input type="date" bind:value={neu.datum} min={heute} /></label>
              <label class="feld"><span>Uhrzeit</span><input type="time" bind:value={neu.beginn} /></label>
              <label class="feld"><span>Raum</span><input bind:value={neu.raum} placeholder={gewaehlt[0].kurs.raum} /></label>
            </div>
          {/if}
          <button class="knopf haupt" onclick={festlegen}>{neu.zu ? 'Zum Termin hinzufügen' : 'Termin festlegen'}</button>
          <p class="klein leise">Erst danach entsteht die Mail, als Entwurf zum Prüfen (E105).</p>
        </div>
      {:else if gruppen.length}
        <p class="klein leise">Schüler antippen, dann Termin festlegen. Ein Termin kann Schüler aus mehreren Klassen haben.</p>
      {/if}
    </section>

    {#if hinweise.length}
      <section class="karte">
        <h2>Status geändert</h2>
        <p class="klein leise">Neue Angaben aus den Fehlzeiten. L.E.O. ändert das Notenbuch nur, wenn du es antippst.</p>
        <ul class="liste">
          {#each hinweise as h (h.key)}
            <li>
              <span class="raum"><a href="/schueler/{h.schueler.id}?kurs={h.kurs.id}">{name(h.schueler)}</a> · {h.kurs.name} · {h.leistung.name}<br /><span class="klein leise">{h.text}</span></span>
              {#if h.setzen}<button class="knopf" onclick={() => statusSetzen(h.kurs.id, h.leistung.id, h.schueler.id, h.setzen!)}>{h.setzen} übernehmen</button>{/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <section class="karte">
      <button class="aufklapp" aria-expanded={vorlageOffen} onclick={() => (vorlageOffen = !vorlageOffen)}><h2 class="raum">Mailvorlagen</h2><span class="klein leise">{vorlagen.length} Vorlagen {vorlageOffen ? '▴' : '▾'}</span></button>
      {#if vorlageOffen}
        <div class="chips vorlagen">
          {#each vorlagen as v (v.id)}
            <button class="chip" aria-pressed={v.id === aktiv.id} onclick={() => (aktivId = v.id)}>{v.name}{#if v.geaendert}<span class="klein leise">angepasst</span>{/if}</button>
          {/each}
          <button class="pille" onclick={vorlageNeu}>+ neue Vorlage</button>
        </div>
        <p class="klein leise">{aktiv.id === 'std-e' ? 'Wird automatisch genommen, wenn der Status E ist.' : aktiv.id === 'std-offen' ? 'Wird automatisch genommen, solange die Entschuldigung offen ist.' : 'Eigene Vorlage, je Schüler im Termin auswählbar.'}</p>
        {#if !aktiv.eingebaut}<label class="feld"><span>Name</span><input value={aktiv.name} onchange={(e) => vorlageAendern('name', e.currentTarget.value)} /></label>{/if}
        <label class="feld"><span>Betreff</span><input bind:this={feldBetreff} value={aktiv.betreff} onfocus={() => (letztesFeld = 'betreff')} onchange={(e) => vorlageAendern('betreff', e.currentTarget.value)} /></label>
        <label class="feld"><span>Text</span><textarea bind:this={feldText} rows="11" value={aktiv.text} onfocus={() => (letztesFeld = 'text')} onchange={(e) => vorlageAendern('text', e.currentTarget.value)}></textarea></label>
        <div class="platzhalter">
          <span class="klein leise">Antippen setzt ein:</span>
          {#each PLATZHALTER_INFO as p (p.name)}
            <button class="pille klein" title={p.info} onmousedown={(e) => e.preventDefault()} onclick={() => platzhalterEinsetzen(p.name)}>{p.name}</button>
          {/each}
        </div>
        <div class="vorschau">
          <span class="klein leise">Vorschau für {vorschau.fuer}</span>
          <b>{vorschau.betreff}</b>
          <pre>{vorschau.text}</pre>
        </div>
        <div class="zeile">
          <span class="klein leise raum">Die Mail geht nur an die schulische Adresse (E105). Leere Platzhalter wie {'{nta}'} verschwinden mit ihrer Zeile.</span>
          {#if aktiv.geaendert}<button class="knopf leise" onclick={vorlageZurueck}>Standardtext wiederherstellen</button>{/if}
          {#if !aktiv.eingebaut}<button class="knopf leise" onclick={vorlageZurueck}>Vorlage löschen</button>{/if}
        </div>
      {/if}
    </section>
  </div>

  <div class="spalte">
    <section class="karte">
      <h2>Termine</h2>
      {#if offeneTermine.length === 0}<p class="leise">Noch kein Termin geplant.</p>{/if}
      {#each offeneTermine as ts (ts.termin.id)}
        {@const t = ts.termin}
        {@const sichtbar = ts.eintraege.filter((e) => imKurs(e.kurs.id))}
        {@const aktiv = ts.eintraege.filter((e) => e.stand !== 'entfaellt').length}
        <article class="termin" class:heute={t.datum === heute} class:vorbei={t.datum < heute}>
          <button class="aufklapp" aria-expanded={offenerTermin === t.id} onclick={() => (offenerTermin = offenerTermin === t.id ? null : t.id)}>
            <span class="raum"><b>{datumWt(t.datum)} · {t.beginn} Uhr · Raum {t.raum}</b>{#if t.datum === heute}<span class="marke">heute</span>{/if}{#if t.datum < heute}<span class="marke warn">Noten fehlen</span>{/if}<br />
              <span class="klein leise">{ts.eintraege.length} Schüler · Mails {ts.mailsFertig}/{aktiv} · Noten {ts.notenFertig}/{aktiv}</span></span>
            <span class="leise">{offenerTermin === t.id ? '▴' : '▾'}</span>
          </button>
          {#if offenerTermin === t.id}
            <div class="check">
              <label><input type="checkbox" bind:checked={t.vorbereitet} onchange={speichern} /> Nachschreibeklausur erstellt</label>
              <label><input type="checkbox" bind:checked={t.gedruckt} onchange={speichern} /> gedruckt</label>
              <span class:fertig={ts.mailsFertig === aktiv && aktiv > 0}>{ts.mailsFertig === aktiv && aktiv > 0 ? '✓' : '○'} Mails verschickt ({ts.mailsFertig}/{aktiv})</span>
              <span class:fertig={ts.notenFertig === aktiv && aktiv > 0}>{ts.notenFertig === aktiv && aktiv > 0 ? '✓' : '○'} Noten eingetragen ({ts.notenFertig}/{aktiv})</span>
            </div>
            <label class="feld hinweis"><span>Hinweis für alle in diesem Termin <span class="leise">(optional, steht in der Mail bei {'{hinweis}'})</span></span>
              <textarea rows="2" value={t.hinweis ?? ''} placeholder="z. B. Bitte Taschenrechner und Wörterbuch mitbringen." onchange={(ev) => hinweisSetzen(t, ev.currentTarget.value)}></textarea>
            </label>
            <ul class="liste">
              {#each sichtbar as e (e.key)}
                {@const m = mail(t, e)}
                <li class="eintrag">
                  <div class="raum">
                    <a href="/schueler/{e.schueler.id}?kurs={e.kurs.id}">{name(e.schueler)}</a>{#if e.schueler.nta}&nbsp;<span class="nta" title={e.schueler.nta}>N</span>{/if}
                    <span class="klein leise">· {e.kurs.klasse} · {e.leistung.name}</span><br />
                    {#if e.schueler.nta}<span class="klein akzent">{e.schueler.nta}</span><br />{/if}
                    {#if e.stand !== 'entfaellt'}
                      <span class="klein" class:leise={!m.an.pruefen.length} class:gold={m.an.pruefen.length > 0}>{m.an.adresse}{m.an.vorschlag ? ' (Vorschlag)' : ''}{m.an.pruefen.length ? ` · bitte prüfen: ${m.an.pruefen.join(', ')}` : ''}</span><br />
                      <span class="klein leise">{e.status === 'E' ? 'entschuldigt' : 'Entschuldigung offen'}{#if m.vorlage.id !== vorlageFuerStatus(e.status)}&nbsp;· Vorlage „{m.vorlage.name}“{/if}{#if m.angepasst}&nbsp;· <b class="akzent">angepasst</b>{/if}</span>
                      {#if m.veraltet}<br /><span class="klein gold">Termin nach deiner Anpassung geändert, bitte Text prüfen</span>{/if}
                    {/if}
                  </div>
                  <span class="kennz" class:ok={e.stand === 'erledigt'} class:ue={e.stand === 'entfaellt'}>{e.stand === 'erledigt' ? e.wert : e.stand === 'entfaellt' ? 'UE' : '–'}</span>
                  <div class="aktionen">
                    {#if e.stand === 'offen'}<a class="knopf leise" href="/kurs/{e.kurs.id}">Note eintragen</a>{/if}
                    {#if e.stand !== 'entfaellt'}
                      {#if e.mail}
                        <button class="pille" onclick={() => mailZurueck(t, e.key)} title="Markierung zurücknehmen">Mail ✓ {datumWt(e.mail)}</button>
                      {:else}
                        <button class="knopf leise" aria-expanded={offenerEntwurf === e.key} onclick={() => (offenerEntwurf = offenerEntwurf === e.key ? null : e.key)}>{offenerEntwurf === e.key ? 'Entwurf zu' : 'Entwurf ansehen'}</button>
                        <a class="knopf" href={mailLink(m.an.adresse, m.betreff, m.text)} onclick={() => mailOeffnen(t, e.key)}>Mail öffnen</a>
                        <button class="knopf leise" onclick={() => kopieren(t, e)}>kopieren</button>
                      {/if}
                    {/if}
                    <button class="pille" onclick={() => entfernen(t, e.key)} aria-label="{name(e.schueler)} aus dem Termin nehmen">×</button>
                  </div>
                  {#if offenerEntwurf === e.key && e.stand !== 'entfaellt' && !e.mail}
                    <div class="entwurf">
                      <div class="chips">
                        {#each vorlagen as v (v.id)}
                          <button class="chip klein" aria-pressed={v.id === m.vorlage.id} onclick={() => vorlageWaehlen(t, e, v.id)}>{v.name}{#if v.id === vorlageFuerStatus(e.status)}<span class="klein leise">passt zum Status</span>{/if}</button>
                        {/each}
                      </div>
                      <label class="feld"><span>An</span><input value={m.an.adresse} readonly /></label>
                      <label class="feld"><span>Betreff</span><input value={m.betreff} onchange={(ev) => entwurfAendern(t, e, 'betreff', ev.currentTarget.value)} /></label>
                      <label class="feld"><span>Text <span class="leise">(nur für {e.schueler.vorname}, die Vorlage bleibt unverändert)</span></span><textarea rows="10" value={m.text} onchange={(ev) => entwurfAendern(t, e, 'text', ev.currentTarget.value)}></textarea></label>
                      <div class="zeile">
                        {#if m.angepasst}<button class="knopf leise" onclick={() => entwurfZurueck(t, e)}>Text aus der Vorlage nehmen</button>{/if}
                        <span class="raum"></span>
                        <button class="knopf leise" onclick={() => kopieren(t, e)}>kopieren</button>
                        <a class="knopf haupt" href={mailLink(m.an.adresse, m.betreff, m.text)} onclick={() => { mailOeffnen(t, e.key); offenerEntwurf = null; }}>Mail öffnen</a>
                      </div>
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
            {#if sichtbar.length < ts.eintraege.length}<p class="klein leise">{ts.eintraege.length - sichtbar.length} weitere aus anderen Klassen (alle Klassen zeigen).</p>{/if}
            <details class="aendern">
              <summary class="klein">Termin ändern oder löschen</summary>
              <div class="felder">
                <label class="feld"><span>Datum</span><input type="date" bind:value={t.datum} onchange={speichern} /></label>
                <label class="feld"><span>Uhrzeit</span><input type="time" bind:value={t.beginn} onchange={speichern} /></label>
                <label class="feld"><span>Raum</span><input bind:value={t.raum} onchange={speichern} /></label>
              </div>
              <p class="klein leise">Nach einer Änderung die Mails neu schicken: Markierung „Mail ✓“ antippen nimmt sie zurück.</p>
              <button class="knopf leise" onclick={() => loeschen(t)}>Termin löschen</button>
            </details>
          {/if}
        </article>
      {/each}
    </section>

    {#if erledigteTermine.length}
      <section class="karte">
        <h2>Erledigt</h2>
        <ul class="liste">
          {#each erledigteTermine as ts (ts.termin.id)}
            <li><span class="raum">{datumWt(ts.termin.datum)} · {ts.termin.beginn} · Raum {ts.termin.raum}</span><span class="klein leise">{ts.eintraege.map((e) => `${name(e.schueler)} ${e.stand === 'erledigt' ? e.wert : 'UE'}`).join(', ')}</span></li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</div>

<style>
  .kopf { display: flex; align-items: baseline; gap: 12px; padding: 18px 32px 6px; flex-wrap: wrap; }
  .seite { padding: 10px 32px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; max-width: 1500px; }
  .spalte { display: grid; gap: 16px; }
  .karte h2 { margin-bottom: 6px; }
  .gruppe { border-top: 1px dashed var(--leo-linie); padding: 10px 0; }
  .gruppe:first-of-type { border-top: 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .chip { gap: 6px; }
  .chip[aria-pressed='true'] { background: var(--leo-akzent-hell); border-color: var(--leo-akzent); }
  .festlegen { border: 2px solid var(--leo-akzent); border-radius: var(--leo-r-m); padding: 12px 14px; margin-top: 10px; display: grid; gap: 10px; background: var(--leo-auswahl); }
  .festlegen p { margin: 0; }
  .felder { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 8px; }
  .liste { list-style: none; padding: 0; margin: 6px 0 0; }
  .liste li { display: flex; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px dashed var(--leo-linie-fein); flex-wrap: wrap; }
  .liste li:first-child { border-top: 0; }
  .liste a:not(.knopf) { color: var(--leo-tinte); font-weight: 600; text-decoration: none; }
  .aufklapp { display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: 0; padding: 0; text-align: left; }
  .termin { border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); padding: 10px 12px; margin-top: 10px; }
  .termin.heute { border: 2px solid var(--leo-akzent); padding: 9px 11px; }
  .marke { margin-left: 8px; font-size: 12px; font-weight: 700; color: var(--leo-akzent); }
  .marke.warn { color: var(--leo-warnung); }
  .check { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 12px 0 4px; padding: 10px 12px; background: var(--leo-flaeche-leise); border-radius: var(--leo-r-m); }
  .check label { display: inline-flex; gap: 6px; align-items: center; min-height: 32px; }
  .check span { display: inline-flex; align-items: center; min-height: 32px; color: var(--leo-leise); }
  .check .fertig { color: var(--leo-akzent); font-weight: 600; }
  .eintrag .aktionen { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .kennz.ok { background: var(--leo-akzent-hell); color: var(--leo-akzent); }
  .gold { color: #8a6200; font-weight: 600; }
  .akzent { color: var(--leo-akzent); }
  .aendern { margin-top: 10px; }
  .aendern summary { cursor: pointer; color: var(--leo-leise); min-height: 32px; }
  .aendern .felder { margin: 8px 0; }
  textarea { font-family: inherit; }
  .vorlagen { margin: 4px 0 8px; }
  .platzhalter { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 4px 0 10px; }
  .platzhalter .pille { font-family: var(--leo-mono, ui-monospace, monospace); }
  .vorschau { display: grid; gap: 4px; background: var(--leo-flaeche-leise); border-radius: var(--leo-r-m); padding: 10px 12px; margin-bottom: 10px; }
  .vorschau pre { margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.5; }
  .hinweis { margin: 8px 0 2px; }
  .entwurf { flex-basis: 100%; display: grid; gap: 8px; border: 2px solid var(--leo-akzent); border-radius: var(--leo-r-m); padding: 10px 12px; background: var(--leo-auswahl); }
  .entwurf .chips { margin-top: 0; }
  @media (max-width: 900px) {
    .kopf { padding: 14px 16px 4px; }
    .seite { grid-template-columns: 1fr; padding: 8px 16px 90px; }
    .felder { grid-template-columns: 1fr 1fr; }
  }
</style>
