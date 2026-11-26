<script lang="ts">
  import { app, abgleich, speichern, zeige, passwortAendern, kannVerschluesseln } from '$lib/speicher.svelte';
  import { sitzung } from '$lib/sitzung.svelte';
  import SicherungKarte from '$lib/ui/SicherungKarte.svelte';
  import AbgleichKarte from '$lib/ui/AbgleichKarte.svelte';
  const d = app.d!;
  let altPw = $state('');
  let neuPw = $state('');
  let neuPw2 = $state('');
  async function pwAendern(e: Event) {
    e.preventDefault();
    if (neuPw.length < 4) { zeige('Mindestens 4 Zeichen'); return; }
    if (neuPw !== neuPw2) { zeige('Die beiden neuen Passwörter sind verschieden'); return; }
    const f = await passwortAendern(altPw, neuPw);
    if (f) { zeige(f); return; }
    altPw = neuPw = neuPw2 = '';
    zeige('Passwort geändert');
  }
  // Module abschaltbar (Projektregel): fehlt = an
  type Modul = 'planung' | 'kalender' | 'ablage' | 'statistik' | 'ewh';
  // EWH ist ausdrücklich zuzuschalten, weil nur wenige Lehrkräfte EWH Korrektur haben
  const modulAn = (m: Modul) => (m === 'ewh' ? d.einstellungen.module?.ewh === true : d.einstellungen.module?.[m] !== false);
  function modul(m: Modul, an: boolean) {
    d.einstellungen.module = { ...(d.einstellungen.module ?? {}), [m]: an };
    speichern();
  }
  const grenzeStandard = $derived(`${Number((d.einstellungen.untis?.halbjahrVon || '2026-08-31').slice(0, 4)) + 1}-02-01`);
</script>

<div class="seite">
  <h1>Mehr</h1>

  <section class="karte">
    <h2>Darstellung</h2>
    <p class="klein leise">Navigation (am Handy immer unten)</p>
    <div class="zeile">
      {#each [['links', 'Seitenleiste links'], ['rechts', 'Seitenleiste rechts'], ['unten', 'Leiste unten']] as [w, t]}
        <button class="pille" aria-pressed={d.einstellungen.navigation === w} onclick={() => { d.einstellungen.navigation = w as 'links'; speichern(); }}>{t}</button>
      {/each}
    </div>
    <p class="klein leise">Farbschema</p>
    <div class="zeile">
      {#each [['system', 'wie Gerät'], ['hell', 'hell'], ['dunkel', 'dunkel']] as [w, t]}
        <button class="pille" aria-pressed={d.einstellungen.theme === w} onclick={() => { d.einstellungen.theme = w as 'system'; speichern(); }}>{t}</button>
      {/each}
    </div>
    <label class="zeile schalter"><input type="checkbox" bind:checked={d.einstellungen.stundenendeHinweis} onchange={speichern} /> Hinweis „n Schüler ohne Mitarbeitseintrag“ (E55)</label>
  </section>

  <section class="karte">
    <h2>Anmeldung</h2>
    <p>Das Passwort schützt L.E.O. auf diesem Gerät, etwa wenn Schülerinnen und Schüler das iPad oder den Beamer sehen. Es verlässt das Gerät nie. Vergessen heißt: Daten nur über eine Sicherung zurückholen.{abgleich.verbunden ? ' Mit Abgleich gilt es auf allen deinen Geräten, ändern geht dann nur mit Verbindung zum Server.' : ''}</p>
    {#if app.verschluesselt}
      <p class="klein"><b>Verschlüsselt:</b> Die Daten auf diesem Gerät sind mit deinem Passwort verschlüsselt (AES-256). Ohne Passwort sind sie nicht lesbar.</p>
    {:else}
      <p class="klein warn"><b>Nicht verschlüsselt:</b> {kannVerschluesseln() ? 'Beim nächsten Anmelden werden die Daten verschlüsselt.' : 'L.E.O. ist ohne HTTPS geöffnet, dann erlaubt der Browser keine Verschlüsselung. Über die HTTPS-Adresse geht es.'}</p>
    {/if}
    <p class="klein leise">Automatisch sperren nach</p>
    <div class="zeile">
      {#each [[5, '5 Min.'], [15, '15 Min.'], [30, '30 Min.'], [60, '1 Std.'], [0, 'nie']] as [w, t]}
        <button class="pille" aria-pressed={d.einstellungen.sperreMinuten === w} onclick={() => { d.einstellungen.sperreMinuten = w as number; speichern(); }}>{t}</button>
      {/each}
    </div>
    <div class="zeile wrap"><button class="knopf" onclick={() => (sitzung.entsperrt = false)}>Jetzt sperren</button></div>
    <form class="pw" onsubmit={pwAendern}>
      <p class="klein leise">Passwort ändern</p>
      <input class="eingabe" type="password" autocomplete="current-password" placeholder="Bisheriges Passwort" bind:value={altPw} />
      <input class="eingabe" type="password" autocomplete="new-password" placeholder="Neues Passwort" bind:value={neuPw} />
      <input class="eingabe" type="password" autocomplete="new-password" placeholder="Neues Passwort wiederholen" bind:value={neuPw2} />
      <button class="knopf" type="submit">Ändern</button>
    </form>
  </section>

  <section class="karte">
    <h2>Module</h2>
    <p>Was du nicht brauchst, blendest du aus. Die Daten bleiben erhalten.</p>
    <label class="zeile schalter"><input type="checkbox" checked={modulAn('planung')} onchange={(e) => modul('planung', e.currentTarget.checked)} /> Semesterplanung und Stundenstand (Reiter „Planung“, „Heute geplant“ in der Stunde)</label>
    <label class="zeile schalter"><input type="checkbox" checked={modulAn('kalender')} onchange={(e) => modul('kalender', e.currentTarget.checked)} /> Kalender (Monat im Stundenplan, „Demnächst“ auf Heute, Termine in der Woche)</label>
    <label class="zeile schalter"><input type="checkbox" checked={modulAn('statistik')} onchange={(e) => modul('statistik', e.currentTarget.checked)} /> Auswertung (Reiter „Auswertung“ je Klasse, Vergleich aller Klassen unter Klassen)</label>
    <label class="zeile schalter"><input type="checkbox" checked={modulAn('ewh')} onchange={(e) => modul('ewh', e.currentTarget.checked)} /> Noten aus EWH Korrektur übernehmen (nur wenn du EWH nutzt; Knopf im Notenbuch und in der Auswertung)</label>
    <label class="zeile schalter"><input type="checkbox" checked={modulAn('ablage')} onchange={(e) => modul('ablage', e.currentTarget.checked)} /> Dateiablage (Material je Reihe, Stunde und Klasse in der Planung und in der Live-Stunde; Reihen-Material braucht die Planung)</label>
    <label class="feld grenze"><span>Erster Tag des 2. Halbjahres (für die Blockzählung)</span>
      <input type="date" value={d.einstellungen.halbjahrGrenze || grenzeStandard} onchange={(e) => { d.einstellungen.halbjahrGrenze = e.currentTarget.value || undefined; speichern(); }} /></label>
  </section>

  <section class="karte">
    <h2>Mündliche Leistungen</h2>
    <p>Eigene Textbausteine (mit Kriterium) und Kriterienraster je Fach. Das Raster springt ein, wenn in einem Monat zu wenige Smileys da sind.</p>
    <div class="zeile wrap"><a class="knopf" href="/mehr/muendlich">Bausteine und Raster bearbeiten</a></div>
  </section>

  <SicherungKarte />

  <AbgleichKarte />

  <section class="karte">
    <h2>WebUntis</h2>
    <p>Prüfe mit deinem WebUntis-Konto, welche Daten L.E.O. bekommen könnte (Stundenplan, Klassen, Schüler, Fehlzeiten). Nur lesen, nichts wird gespeichert (V11).</p>
    <div class="zeile wrap"><a class="knopf" href="/mehr/webuntis">Verbindungstest öffnen</a></div>
  </section>

  <section class="karte">
    <h2>Über diesen Prototyp</h2>
    <p class="leise">L.E.O. Prototyp 0.5: Tagesübersicht, Notenbuch, Schülerkarte, Live-Stunde, Sitzplan, Planung. Beispieldaten oder Übernahme aus WebUntis, kein IServ. Anmeldung lokal mit dem L.E.O.-Passwort, auf Wunsch Abgleich zwischen deinen Geräten über den eigenen Server.</p>
    <p class="leise">Als App installieren: im Browser „Zum Startbildschirm“ (iPad/iPhone) bzw. „Installieren“ (Chrome/Edge). Das geht nur über HTTPS oder auf localhost.</p>
  </section>
</div>

<style>
  .seite { padding: 24px 32px; max-width: 820px; display: flex; flex-direction: column; gap: 16px; }
  section p { line-height: 1.55; }
  .grenze { max-width: 320px; margin-top: 10px; }
  .zeile { flex-wrap: wrap; gap: 8px; }
  .wrap { margin: 10px 0; }
  .schalter { margin-top: 16px; }
  .schalter input { width: 20px; height: 20px; accent-color: var(--leo-akzent); }
  .pw { display: flex; flex-direction: column; gap: 8px; max-width: 360px; }
  .warn { color: var(--leo-warnung); }
  .klein.leise { margin: 14px 0 6px; }
  @media (max-width: 720px) { .seite { padding: 16px; } }
</style>
