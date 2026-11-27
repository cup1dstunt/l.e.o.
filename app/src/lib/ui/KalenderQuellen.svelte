<script lang="ts">
  // Abgleich des Kalenders (K3, K10, V17, E120): zwei klickbare Kacheln, WebUntis und IServ, die ihren Stand aufklappen.
  // IServ: feste Kalender des Schulprofils (OSZ-Info, persönlicher Kalender, Ferien, Aufgaben) per Anmeldung oder Link,
  // dazu ein weiterer Kalender per Link. Kein Dialog; danach gleicht L.E.O. von selbst ab (alle 30 Minuten).
  import { app, speichern, zeige, geheimSetzen } from '$lib/speicher.svelte';
  import { iserv, iservAbgleichen, iservGemerkt, anmeldungSetzen, anmeldungEntfernen, kalenderAn, geheimFeed } from '$lib/iserv.svelte';
  import { linkPruefen } from '$lib/iserv';
  import { schulprofil, caldavPfad, type IservKalender } from '$lib/schule';
  import { onMount } from 'svelte';

  const d = app.d!;
  let offen = $state<'' | 'untis' | 'iserv'>('');
  let link = $state('');
  let linkFehler = $state('');
  let benutzer = $state(d.einstellungen.kalender?.iservBenutzer ?? '');
  let passwort = $state('');
  let merkenPw = $state(true);
  let feedOffen = $state('');
  let feedLink = $state('');
  let feedFehler = $state('');

  onMount(() => { iservGemerkt(); });

  const ka = $derived(d.einstellungen.kalender ?? {});
  const profil = $derived(schulprofil(ka.schule));
  const stand = (iso?: string) => (iso ? new Date(iso).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
  const untis = $derived(d.einstellungen.untis);
  const anzahl = (q: 'untis' | 'iserv', fremd?: boolean) => (d.termine ?? []).filter((t) => t.quelle === q && (fremd === undefined || !!t.fremd === fremd)).length;
  const ausfaelle = $derived(untis?.ausfaelle?.length ?? 0);
  const ferien = $derived(d.einstellungen.ferien?.length ?? 0);
  const angemeldet = $derived(iserv.passwort && !!ka.iservBenutzer);
  // Wie kommt ein Kalender herein? CalDAV mit Anmeldung, sonst Feed-Link, sonst (noch) gar nicht
  const weg = (k: IservKalender) =>
    !kalenderAn(d, k) ? 'aus' : angemeldet && caldavPfad(k, ka.iservBenutzer ?? '') ? 'caldav' : k.feed && iserv.feeds[k.id] ? 'feed' : '';
  const eingerichtet = $derived(iserv.gemerkt || angemeldet || Object.values(iserv.feeds).some(Boolean));

  function setzen(k: 'iservAuto' | 'untisPruefungen' | 'fremdePruefungen', an: boolean) {
    d.einstellungen.kalender = { ...(d.einstellungen.kalender ?? {}), [k]: an };
    speichern();
  }
  async function kalenderSchalten(k: IservKalender, an: boolean) {
    d.einstellungen.kalender = { ...(d.einstellungen.kalender ?? {}), iservAn: { ...(d.einstellungen.kalender?.iservAn ?? {}), [k.id]: an } };
    speichern();
    await jetzt();
  }

  async function anmelden() {
    if (!benutzer.trim() || !passwort) { zeige('Bitte IServ-Benutzername und Passwort eingeben'); return; }
    const gemerkt = await anmeldungSetzen(benutzer, passwort, merkenPw);
    passwort = '';
    const m = await iservAbgleichen(true);
    zeige(m || (iserv.fehler ? 'Angemeldet, aber der Abgleich klappt noch nicht (siehe unten)' : gemerkt ? 'IServ-Anmeldung gemerkt' : 'IServ-Anmeldung bis zum Neuladen'));
  }
  async function abmelden() {
    await anmeldungEntfernen();
    zeige('IServ-Anmeldung entfernt. Geholte Termine bleiben, bis du den Kalender ausschaltest.');
  }
  async function feedMerken(k: IservKalender) {
    const p = linkPruefen(feedLink);
    if (!p.ok) { feedFehler = p.fehler!; return; }
    feedFehler = '';
    await geheimSetzen(geheimFeed(k.id), feedLink.trim());
    feedLink = '';
    feedOffen = '';
    await iservGemerkt();
    const m = await iservAbgleichen(true);
    zeige(m || `Link für „${k.name}“ gemerkt`);
  }
  async function feedEntfernen(k: IservKalender) {
    await geheimSetzen(geheimFeed(k.id), null);
    await iservGemerkt();
    zeige(`Link für „${k.name}“ entfernt`);
  }

  async function merken() {
    const p = linkPruefen(link);
    if (!p.ok) { linkFehler = p.fehler!; return; }
    linkFehler = '';
    await geheimSetzen('iserv', link.trim());
    link = '';
    await iservGemerkt();
    const m = await iservAbgleichen(true);
    zeige(m || (iserv.fehler ? 'Link gemerkt, der Abgleich klappt noch nicht (siehe unten)' : 'Link gemerkt'));
  }
  async function jetzt() {
    const m = await iservAbgleichen(true);
    if (m) zeige(m);
  }
  async function entfernen() {
    await geheimSetzen('iserv', null);
    d.termine = (d.termine ?? []).filter((t) => !(t.quelle === 'iserv' && !t.kalender));
    speichern();
    await iservGemerkt();
    zeige('Weiterer Kalender entfernt, seine Termine sind aus dem Kalender');
  }
  const kStand = (id: string) => ka.iservStand?.[id];
</script>

<section class="quellen" aria-label="Kalender abgleichen">
  <button class="kachel" aria-expanded={offen === 'untis'} onclick={() => (offen = offen === 'untis' ? '' : 'untis')}>
    <span class="kopf"><b>WebUntis</b><span class="punkt" class:an={!!untis}></span></span>
    {#if untis}
      <span class="klein">{anzahl('untis', false)} Prüfungen · {ferien} Ferien/Feiertage · {ausfaelle} Ausfälle</span>
      <span class="klein leise">Stand {stand(untis.abgerufen)}</span>
    {:else}
      <span class="klein leise">Noch nicht verbunden.</span>
    {/if}
  </button>

  <button class="kachel" aria-expanded={offen === 'iserv'} onclick={() => (offen = offen === 'iserv' ? '' : 'iserv')}>
    <span class="kopf"><b>IServ</b><span class="punkt" class:an={eingerichtet && !iserv.fehler} class:warn={!!iserv.fehler}></span></span>
    {#if iserv.fehler}
      <span class="klein warn">Abgleich klappt gerade nicht</span>
    {:else if eingerichtet}
      <span class="klein">{anzahl('iserv')} Termine{ka.iservFerien?.length ? ` · ${ka.iservFerien.length} Ferien/Feiertage` : ''}</span>
      <span class="klein leise">{iserv.laeuft ? 'gleicht ab …' : ka.iservAbgerufen ? `Stand ${stand(ka.iservAbgerufen)}` : 'noch nicht abgerufen'}</span>
    {:else}
      <span class="klein leise">Mit IServ anmelden, dann kommen OSZ-Info und deine Termine von selbst.</span>
    {/if}
  </button>
</section>

{#if offen === 'untis'}
  <section class="karte detail">
    <p>Aus WebUntis kommen beim Abgleich unter <a href="/mehr/webuntis">Mehr › WebUntis</a> (und danach alle 30 Minuten von selbst):</p>
    <ul>
      <li><b>Ferien und Feiertage</b>: ganze Tage, zählen in der Semesterplanung nicht als Block.</li>
      <li><b>Ausfälle</b> deiner Stunden: erscheinen als „Fällt aus“ und fehlen in der Blockzählung.</li>
      <li><b>Prüfungen deiner Klassen</b>: belegen in der Planung den ersten Block des Tages, wie eine Klausur. Steht dieselbe Klausur schon mit Datum im Notenbuch, zeigt L.E.O. sie nur einmal (mit „auch in WebUntis“).</li>
    </ul>
    <label class="zeile schalter"><input type="checkbox" checked={ka.untisPruefungen !== false} onchange={(e) => setzen('untisPruefungen', e.currentTarget.checked)} /> Prüfungen aus WebUntis im Kalender zeigen</label>
    <label class="zeile schalter"><input type="checkbox" checked={ka.fremdePruefungen !== false} disabled={ka.untisPruefungen === false} onchange={(e) => setzen('fremdePruefungen', e.currentTarget.checked)} /> Auch Klausuren anderer Lehrkräfte in meinen Klassen ({anzahl('untis', true)}), damit sich nichts häuft</label>
    <p class="klein leise">Nur lesen. Schülerlisten der Prüfungen werden nicht übernommen. Prüfungen aus WebUntis sind noch nicht mit echten Daten getestet.</p>
  </section>
{:else if offen === 'iserv'}
  <section class="karte detail">
    {#if iserv.fehler}<p class="warn">{iserv.fehler}</p>{/if}

    <h3>Anmeldung bei IServ</h3>
    {#if angemeldet}
      <div class="zeile wrap">
        <span>Angemeldet als <b>{ka.iservBenutzer}</b></span>
        <span class="raum"></span>
        <button class="knopf haupt" onclick={jetzt} disabled={iserv.laeuft}>{iserv.laeuft ? 'Gleicht ab …' : 'Jetzt abgleichen'}</button>
        <button class="knopf leise" onclick={abmelden}>Abmelden</button>
      </div>
    {:else}
      <p class="klein">Mit deinem IServ-Konto (nicht dem WebUntis-Namen) holt L.E.O. die Kalender der {profil.name} direkt aus IServ, auch OSZ-Info, für den es keinen Link gibt.</p>
      <form class="anmeldung" onsubmit={(e) => { e.preventDefault(); anmelden(); }}>
        <label class="feld"><span>IServ-Benutzername</span><input bind:value={benutzer} autocomplete="username" autocapitalize="none" spellcheck="false" /></label>
        <label class="feld"><span>IServ-Passwort</span><input type="password" bind:value={passwort} autocomplete="current-password" /></label>
        <button class="knopf haupt" type="submit" disabled={iserv.laeuft}>Anmelden und abgleichen</button>
      </form>
      <label class="zeile schalter"><input type="checkbox" bind:checked={merkenPw} disabled={!app.verschluesselt} />
        {app.verschluesselt ? 'Passwort verschlüsselt auf diesem Gerät merken (sonst nur bis zum Neuladen)' : 'Passwort wird nicht gemerkt: L.E.O. läuft ohne HTTPS und damit ohne Verschlüsselung'}</label>
    {/if}

    <h3>Kalender</h3>
    <ul class="kalender">
      {#each profil.kalender as k (k.id)}
        {@const w = weg(k)}
        {@const st = kStand(k.id)}
        <li>
          <input class="haken" type="checkbox" checked={kalenderAn(d, k)} onchange={(e) => kalenderSchalten(k, e.currentTarget.checked)} aria-label="{k.name} abgleichen" />
          <span>
            <b>{k.name}</b> <span class="klein leise">{k.text}</span><br />
            <span class="klein" class:warn={!!st?.fehler && (w === 'caldav' || w === 'feed')}>
              {#if w === 'aus'}aus
              {:else if w === ''}{k.caldav && !k.feed ? 'kommt nach der Anmeldung' : k.caldav ? 'nach der Anmeldung oder per Link' : 'braucht einen Link aus IServ'}
              {:else if st?.fehler}{st.fehler}
              {:else}{w === 'caldav' ? 'über deine Anmeldung' : 'über Link'}{st?.anzahl !== undefined ? ` · ${st.anzahl} ${k.rolle === 'ferien' ? 'Ferien/Feiertage' : 'Termine'}` : ''}{st?.abgerufen ? ` · ${stand(st.abgerufen)}` : ''}{/if}
            </span>
          </span>
          {#if k.feed && w !== 'aus' && w !== 'caldav'}
            {#if iserv.feeds[k.id]}<button class="knopf leise" onclick={() => feedEntfernen(k)}>Link entfernen</button>
            {:else}<button class="knopf leise" onclick={() => { feedOffen = feedOffen === k.id ? '' : k.id; feedLink = ''; feedFehler = ''; }}>Link einfügen</button>{/if}
          {:else}<span></span>{/if}
        </li>
        {#if feedOffen === k.id}
          <li class="feedform">
            <span></span>
            <form class="zeile wrap" onsubmit={(e) => { e.preventDefault(); feedMerken(k); }}>
              <span class="klein leise wo">{k.feed?.wo}</span>
              <input class="eingabe link" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://{profil.iserv}/iserv/calendar/public/ics/feed/…/calendar.ics" bind:value={feedLink} />
              <button class="knopf haupt" type="submit">Merken</button>
              {#if feedFehler}<span class="warn klein">{feedFehler}</span>{/if}
            </form>
            <span></span>
          </li>
        {/if}
      {/each}
    </ul>

    <details class="weitere">
      <summary class="klein">Weiterer Kalender per Link{iserv.gemerkt ? ' (eingerichtet)' : ''}</summary>
      {#if iserv.gemerkt}
        <div class="zeile wrap"><span class="klein">{kStand('link')?.fehler ?? `${kStand('link')?.anzahl ?? 0} Termine`}</span><span class="raum"></span><button class="knopf leise" onclick={entfernen}>Entfernen</button></div>
      {:else}
        <form class="zeile wrap" onsubmit={(e) => { e.preventDefault(); merken(); }}>
          <input class="eingabe link" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://…/calendar.ics oder webcal://…" bind:value={link} />
          <button class="knopf" type="submit">Merken und abgleichen</button>
        </form>
        {#if linkFehler}<p class="warn klein">{linkFehler}</p>{/if}
      {/if}
    </details>

    <label class="zeile schalter"><input type="checkbox" checked={ka.iservAuto !== false} onchange={(e) => setzen('iservAuto', e.currentTarget.checked)} /> Automatisch abgleichen (beim Öffnen und alle 30 Minuten)</label>
    <ul class="klein leise">
      <li>Passwort und Links liegen verschlüsselt nur auf diesem Gerät und wandern nicht in den Abgleich zwischen Geräten. Die Anmeldung geht nur über deinen Container an IServ, nur lesend.</li>
      <li>Was IServ ändert oder löscht, ändert L.E.O. mit. Was du an einem IServ-Termin festlegst (Art, Klassen, „Unterricht fällt aus“, ausblenden), bleibt.</li>
      <li>Ferien aus IServ zählen in der Semesterplanung, solange WebUntis keine liefert.</li>
    </ul>
  </section>
{/if}

<style>
  .quellen { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .kachel { font: inherit; text-align: left; display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: var(--leo-r-m);
    border: 1px solid var(--leo-linie); background: var(--leo-karte); color: var(--leo-tinte); cursor: pointer; min-height: var(--leo-ziel-touch); }
  .kachel[aria-expanded='true'] { outline: 2px solid var(--leo-akzent); outline-offset: -1px; }
  .kopf { display: flex; align-items: center; gap: 8px; }
  .punkt { width: 8px; height: 8px; border-radius: 99px; background: var(--leo-linie); }
  .punkt.an { background: var(--leo-akzent); }
  .punkt.warn { background: var(--leo-warnung); }
  .warn { color: var(--leo-warnung); }
  .detail { display: grid; gap: 8px; }
  .detail ul { margin: 0; padding-left: 18px; display: grid; gap: 4px; line-height: 1.5; }
  .schalter input, .haken { width: 20px; height: 20px; accent-color: var(--leo-akzent); }
  .link { flex: 1 1 320px; min-width: 0; }
  h3 { margin: 8px 0 0; font-size: 15px; }
  .anmeldung { display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: end; }
  .detail ul.kalender { list-style: none; padding: 0; gap: 0; }
  .kalender li { display: grid; grid-template-columns: 28px 1fr auto; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px dashed var(--leo-linie-fein); }
  .kalender li.feedform { border-top: 0; padding-top: 0; }
  .wo { flex-basis: 100%; }
  .weitere summary { cursor: pointer; padding: 4px 0; }
  @media (max-width: 720px) { .quellen, .anmeldung { grid-template-columns: 1fr; } }
</style>
