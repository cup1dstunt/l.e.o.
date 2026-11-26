<script lang="ts">
  // Abgleich des Kalenders (K3, K10, V15): zwei klickbare Kacheln, WebUntis und IServ, die ihren Stand und Rechenweg aufklappen.
  // Kein Dialog: Link einfügen, Merken, fertig. Danach gleicht L.E.O. von selbst ab (wie WebUntis alle 30 Minuten).
  import { app, speichern, zeige, geheimSetzen } from '$lib/speicher.svelte';
  import { iserv, iservAbgleichen, iservGemerkt } from '$lib/iserv.svelte';
  import { linkPruefen } from '$lib/iserv';
  import { onMount } from 'svelte';

  const d = app.d!;
  let offen = $state<'' | 'untis' | 'iserv'>('');
  let link = $state('');
  let linkFehler = $state('');

  onMount(() => { iservGemerkt(); });

  const ka = $derived(d.einstellungen.kalender ?? {});
  const stand = (iso?: string) => (iso ? new Date(iso).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
  const untis = $derived(d.einstellungen.untis);
  const anzahl = (q: 'untis' | 'iserv', fremd?: boolean) => (d.termine ?? []).filter((t) => t.quelle === q && (fremd === undefined || !!t.fremd === fremd)).length;
  const ausfaelle = $derived(untis?.ausfaelle?.length ?? 0);
  const ferien = $derived(d.einstellungen.ferien?.length ?? 0);

  function setzen(k: 'iservAuto' | 'untisPruefungen' | 'fremdePruefungen', an: boolean) {
    d.einstellungen.kalender = { ...(d.einstellungen.kalender ?? {}), [k]: an };
    speichern();
  }

  async function merken() {
    const p = linkPruefen(link);
    if (!p.ok) { linkFehler = p.fehler!; return; }
    linkFehler = '';
    await geheimSetzen('iserv', link.trim());
    link = '';
    await iservGemerkt();
    const m = await iservAbgleichen(true);
    zeige(m || (iserv.fehler ? 'IServ-Link gemerkt, der Abgleich klappt noch nicht (siehe unten)' : 'IServ-Link gemerkt'));
  }
  async function jetzt() {
    const m = await iservAbgleichen(true);
    if (m) zeige(m);
  }
  async function entfernen() {
    await geheimSetzen('iserv', null);
    d.termine = (d.termine ?? []).filter((t) => t.quelle !== 'iserv');
    d.einstellungen.kalender = { ...(d.einstellungen.kalender ?? {}), iservAbgerufen: undefined, iservAnzahl: undefined };
    speichern();
    await iservGemerkt();
    iserv.fehler = '';
    zeige('IServ-Abo entfernt, seine Termine sind aus dem Kalender');
  }
</script>

<section class="quellen" aria-label="Kalender abgleichen">
  <button class="kachel" aria-expanded={offen === 'untis'} onclick={() => (offen = offen === 'untis' ? '' : 'untis')}>
    <span class="kopf"><b>WebUntis</b><span class="punkt" class:an={!!untis}></span></span>
    {#if untis}
      <span class="klein">{anzahl('untis', false)} Prüfungen · {ferien} Ferien/Feiertage · {ausfaelle} Ausfälle</span>
      <span class="klein leise">Stand {stand(untis.abgerufen)}</span>
    {:else}
      <span class="klein leise">Noch nicht verbunden. Ferien sind Beispielwerte.</span>
    {/if}
  </button>

  <button class="kachel" aria-expanded={offen === 'iserv'} onclick={() => (offen = offen === 'iserv' ? '' : 'iserv')}>
    <span class="kopf"><b>IServ</b><span class="punkt" class:an={iserv.gemerkt && !iserv.fehler} class:warn={!!iserv.fehler}></span></span>
    {#if iserv.fehler}
      <span class="klein warn">Abgleich klappt gerade nicht</span>
    {:else if iserv.gemerkt}
      <span class="klein">{ka.iservAnzahl ?? anzahl('iserv')} Termine aus dem Abo</span>
      <span class="klein leise">{iserv.laeuft ? 'gleicht ab …' : ka.iservAbgerufen ? `Stand ${stand(ka.iservAbgerufen)}` : 'noch nicht abgerufen'}</span>
    {:else}
      <span class="klein leise">Kalender-Link einfügen, dann kommen Konferenzen und Schultermine von selbst.</span>
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
    {#if iserv.gemerkt}
      <div class="zeile wrap">
        <button class="knopf haupt" onclick={jetzt} disabled={iserv.laeuft}>{iserv.laeuft ? 'Gleicht ab …' : 'Jetzt abgleichen'}</button>
        <span class="raum"></span>
        <button class="knopf leise" onclick={entfernen}>Abo entfernen</button>
      </div>
      <label class="zeile schalter"><input type="checkbox" checked={ka.iservAuto !== false} onchange={(e) => setzen('iservAuto', e.currentTarget.checked)} /> Automatisch abgleichen (beim Öffnen und alle 30 Minuten)</label>
    {:else}
      <p>In IServ unter <b>Kalender</b> den Link zum <b>Abonnieren bzw. Exportieren</b> (iCal/ICS) kopieren und hier einfügen.</p>
      <form class="zeile wrap" onsubmit={(e) => { e.preventDefault(); merken(); }}>
        <input class="eingabe link" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://…/kalender….ics oder webcal://…" bind:value={link} />
        <button class="knopf haupt" type="submit">Merken und abgleichen</button>
      </form>
      {#if linkFehler}<p class="warn klein">{linkFehler}</p>{/if}
    {/if}
    <ul class="klein leise">
      <li>Der Link wirkt wie ein Schlüssel zu deinem Kalender. L.E.O. merkt ihn verschlüsselt nur auf diesem Gerät, er wandert nicht in den Abgleich zwischen Geräten.</li>
      <li>Was IServ ändert oder löscht, ändert L.E.O. mit. Was du an einem IServ-Termin festlegst (Art, Klassen, „Unterricht fällt aus“, ausblenden), bleibt.</li>
      <li>Wiederholte Termine (z. B. jede Woche) werden für das Schuljahr aufgelöst. Ohne Abo geht weiter der Import einer .ics-Datei.</li>
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
  .schalter input { width: 20px; height: 20px; accent-color: var(--leo-akzent); }
  .link { flex: 1 1 320px; min-width: 0; }
  @media (max-width: 720px) { .quellen { grid-template-columns: 1fr; } }
</style>
