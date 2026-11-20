<script lang="ts">
  // Abgleich zwischen Geräten (F4, E103): verschlüsselte Datensätze über den Dienst auf dem eigenen Server.
  import { app, abgleich, verbinden, trennen, abgleichen, ausstehend, dienstStatus, zeige } from '$lib/speicher.svelte';

  let benutzer = $state('');
  let pw = $state('');
  let einladung = $state('');
  let neu = $state(false);
  let arbeitet = $state(false);
  let fehler = $state('');
  let trennenFrage = $state(false);
  let offen = $state(0);
  let dienst = $state<{ ok: boolean; kontoAnlegen: boolean } | null>(null);
  dienstStatus().then((s) => (dienst = s));

  $effect(() => {
    abgleich.laeuft; abgleich.zuletzt; // nach jedem Abgleich neu zählen
    if (abgleich.verbunden) ausstehend().then((n) => (offen = n)).catch(() => {});
  });

  const uhr = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  async function los(e: Event) {
    e.preventDefault();
    fehler = '';
    if (!benutzer.trim() || !pw) { fehler = 'Benutzername und Passwort eingeben.'; return; }
    if (neu && !einladung.trim()) { fehler = 'Einladungscode eingeben (bekommst du vom Betreiber des Servers).'; return; }
    arbeitet = true;
    try {
      const r = await verbinden(benutzer, pw, neu ? einladung.trim() : undefined);
      if (!r.ok) { if (r.neu) neu = true; else fehler = r.fehler; return; }
      pw = einladung = '';
      neu = false;
      if (r.neuLaden) { zeige('Verbunden. Der Stand vom Server ist jetzt auf diesem Gerät.'); location.href = '/'; return; }
      zeige('Verbunden. Deine Daten werden jetzt abgeglichen.');
    } finally { arbeitet = false; }
  }
</script>

<section class="karte">
  <h2>Abgleich zwischen Geräten</h2>
  {#if !app.verschluesselt}
    <p>Damit PC, iPad und Handy denselben Stand haben, gleicht L.E.O. über deinen Server ab. Das geht nur über die HTTPS-Adresse, weil die Daten vorher im Gerät verschlüsselt werden.</p>
  {:else if abgleich.verbunden}
    <p>Verbunden als <b>{abgleich.benutzer}</b>. Änderungen gehen verschlüsselt an den Server und kommen auf deinen anderen Geräten an. Der Server kann sie nicht lesen.</p>
    <p class="klein" class:warn={!!abgleich.fehler}>
      {#if abgleich.laeuft}Gleicht ab …
      {:else if abgleich.fehler}{abgleich.fehler}{offen ? ` Noch ${offen} Änderungen nicht gesendet, sie bleiben im Gerät und gehen beim nächsten Mal mit.` : ''}
      {:else if abgleich.zuletzt}Zuletzt abgeglichen um {uhr(abgleich.zuletzt)} Uhr{offen ? `, ${offen} Änderungen warten` : ', alles gesendet'}.
      {:else}Noch nicht abgeglichen{offen ? `, ${offen} Änderungen warten` : ''}.{/if}
    </p>
    <div class="zeile wrap">
      <button class="knopf" onclick={() => abgleichen()} disabled={abgleich.laeuft}>Jetzt abgleichen</button>
      {#if !trennenFrage}
        <button class="knopf leise" onclick={() => (trennenFrage = true)}>Trennen …</button>
      {:else}
        <span class="klein">Die Daten bleiben auf diesem Gerät, es gleicht nur nicht mehr ab.</span>
        <button class="knopf leise warn" onclick={async () => { await trennen(); trennenFrage = false; zeige('Abgleich auf diesem Gerät beendet'); }}>Ja, trennen</button>
        <button class="knopf leise" onclick={() => (trennenFrage = false)}>Abbrechen</button>
      {/if}
    </div>
  {:else}
    <p>Damit PC, iPad und Handy denselben Stand haben: einmal pro Gerät verbinden. Die Daten werden im Gerät verschlüsselt, bevor sie es verlassen. Der Server sieht keine Namen und keine Noten.</p>
    {#if dienst && !dienst.ok}<p class="klein warn">Der Abgleich-Dienst ist auf diesem Server gerade nicht erreichbar.</p>{/if}
    <form class="form" onsubmit={los}>
      <label class="feld"><span>Benutzername (z. B. dein IServ-Name)</span><input bind:value={benutzer} autocomplete="username" autocapitalize="none" spellcheck="false" /></label>
      <label class="feld"><span>Dein L.E.O.-Passwort</span><input type="password" bind:value={pw} autocomplete="current-password" /></label>
      {#if neu}
        <p class="klein">Dieses Konto gibt es noch nicht. Mit dem Einladungscode legst du es an, dieses Gerät bringt seine Daten mit.</p>
        <label class="feld"><span>Einladungscode</span><input bind:value={einladung} autocomplete="off" spellcheck="false" /></label>
      {/if}
      {#if fehler}<p class="klein warn">{fehler}</p>{/if}
      <div class="zeile wrap">
        <button class="knopf haupt" type="submit" disabled={arbeitet}>{arbeitet ? 'Einen Moment …' : neu ? 'Konto anlegen und verbinden' : 'Verbinden'}</button>
        {#if neu}<button type="button" class="knopf leise" onclick={() => { neu = false; fehler = ''; }}>Abbrechen</button>{/if}
      </div>
    </form>
    <p class="klein leise">Gibt es das Konto schon (von einem anderen Gerät), ersetzt der Stand vom Server die Daten auf diesem Gerät. Der bisherige Stand bleibt oben unter „Automatisch gesichert“ erhalten. Ab dann gilt hier das Passwort des Kontos.</p>
  {/if}
</section>

<style>
  section p { line-height: 1.55; }
  .zeile { flex-wrap: wrap; gap: 8px; }
  .wrap { margin: 10px 0; }
  .form { display: flex; flex-direction: column; gap: 10px; max-width: 420px; margin-top: 8px; }
  .warn { color: var(--leo-warnung); }
</style>
