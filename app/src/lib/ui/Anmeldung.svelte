<script lang="ts">
  // Anmeldung auch lokal (E81): ohne Passwort keine Daten sichtbar.
  // Ab F2 entschlüsselt das Passwort die Daten (über HTTPS bzw. localhost).
  import { app, festlegen, entsperren, zeige, kannVerschluesseln, mitKontoAnmelden } from '$lib/speicher.svelte';
  let { entsperrt = $bindable() }: { entsperrt: boolean } = $props();
  const neu = $derived(!app.verschluesselt && !app.d?.einstellungen.passwort);
  let arbeitet = $state(false);
  const kann = kannVerschluesseln();
  let pw = $state('');
  let pw2 = $state('');
  let konto = $state(false); // neues Gerät: mit dem Abgleich-Konto anmelden (F4)
  let benutzer = $state('');
  let fehler = $state('');
  let feld = $state<HTMLInputElement>();
  $effect(() => feld?.focus());

  async function los(e: Event) {
    e.preventDefault();
    if (arbeitet) return;
    fehler = '';
    if (neu && konto) {
      if (!benutzer.trim() || !pw) return (fehler = 'Benutzername und Passwort eingeben.');
      arbeitet = true;
      try {
        const r = await mitKontoAnmelden(benutzer, pw);
        if (!r.ok) { fehler = r.fehler ?? 'Anmelden fehlgeschlagen.'; return; }
        zeige('Angemeldet. Deine Daten kommen vom Server und werden abgeglichen.');
        entsperrt = true;
      } finally { arbeitet = false; }
      return;
    }
    if (neu) {
      if (pw.length < 4) return (fehler = 'Mindestens 4 Zeichen.');
      if (pw !== pw2) return (fehler = 'Die beiden Eingaben sind verschieden.');
    }
    arbeitet = true;
    try {
      if (neu) { await festlegen(pw); entsperrt = true; return; }
      const r = await entsperren(pw);
      if (!r.ok) { fehler = 'Passwort stimmt nicht.'; pw = ''; feld?.focus(); return; }
      if (r.neuVerschluesselt) zeige('Deine Daten auf diesem Gerät sind jetzt verschlüsselt.');
      entsperrt = true;
    } catch (err) {
      fehler = 'Entsperren fehlgeschlagen: ' + (err as Error).message;
    } finally {
      arbeitet = false;
    }
  }
</script>

<div class="flaeche">
  <form class="karte box" onsubmit={los}>
    <img src="/wortmarke.svg" alt="L.E.O." width="150" class="hell" />
    <img src="/wortmarke-dunkel.svg" alt="L.E.O." width="150" class="dunkel" />
    {#if neu && konto}
      <h1>Mit Konto anmelden</h1>
      <p class="leise klein">Für ein weiteres Gerät: Benutzername und L.E.O.-Passwort wie auf deinem ersten Gerät. Deine Daten kommen verschlüsselt vom Server und bleiben ab jetzt abgeglichen.</p>
      <label class="feld"><span>Benutzername</span><input bind:value={benutzer} bind:this={feld} autocomplete="username" autocapitalize="none" spellcheck="false" /></label>
      <label class="feld"><span>L.E.O.-Passwort</span><input type="password" bind:value={pw} autocomplete="current-password" /></label>
    {:else if neu}
      <h1>Passwort festlegen</h1>
      <p class="leise klein">Schützt deine Daten auf diesem Gerät vor fremdem Zugriff, z. B. durch Schüler. Es gilt nur für dieses Gerät und diesen Browser.{kann ? ' Mit dem Passwort werden die Daten verschlüsselt, ohne Passwort sind sie nicht lesbar.' : ''}</p>
      <label class="feld"><span>Neues Passwort</span><input type="password" bind:value={pw} bind:this={feld} autocomplete="new-password" /></label>
      <label class="feld"><span>Wiederholen</span><input type="password" bind:value={pw2} autocomplete="new-password" /></label>
    {:else}
      <h1>Anmelden</h1>
      <label class="feld"><span>Passwort</span><input type="password" bind:value={pw} bind:this={feld} autocomplete="current-password" /></label>
    {/if}
    {#if fehler}<p class="warn klein">{fehler}</p>{/if}
    <button class="knopf haupt" type="submit" disabled={arbeitet}>{arbeitet ? 'Einen Moment …' : neu && konto ? 'Anmelden' : neu ? 'Festlegen und starten' : 'Entsperren'}</button>
    {#if neu && kann}
      <button type="button" class="knopf leise" onclick={() => { konto = !konto; fehler = ''; pw = pw2 = ''; }}>{konto ? 'Neu anfangen: Passwort festlegen' : 'Ich nutze L.E.O. schon auf einem anderen Gerät'}</button>
    {/if}
    {#if !neu}<p class="leise klein">Passwort vergessen? {app.verschluesselt ? 'Die Daten sind verschlüsselt und lassen sich ohne Passwort nicht öffnen. Dann hilft nur: Browserdaten dieser Seite löschen und eine Sicherung einspielen.' : 'Im Prototyp hilft nur, die Browserdaten dieser Seite zu löschen (dabei gehen die Daten verloren).'}</p>{/if}
  </form>
</div>

<style>
  .flaeche { min-height: 100dvh; display: grid; place-items: center; padding: 16px; }
  .box { width: min(400px, 100%); display: flex; flex-direction: column; gap: 14px; padding: 28px; }
  .box h1 { font-size: 20px; }
  .box p { margin: 0; line-height: 1.5; }
  .warn { color: var(--leo-warnung); }
  .knopf { justify-content: center; min-height: 46px; }
  .dunkel { display: none; }
  :global(:root[data-theme='dunkel']) .dunkel { display: block; }
  :global(:root[data-theme='dunkel']) .hell { display: none; }
</style>
