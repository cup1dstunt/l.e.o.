<script lang="ts">
  // Alle eigenen Klassen nebeneinander (Modul A, A1). Nur die eigenen Klassen, nur auf diesem Gerät (E29).
  import { app } from '$lib/speicher.svelte';
  import { zahl } from '$lib/rechnen';
  import { klassenVergleich } from '$lib/auswertung';
  import Smiley from '$lib/ui/Smiley.svelte';

  const d = app.d!;
  const zeilen = $derived(klassenVergleich(d));
  const schnitt = (p: string, x: number | null) => (x === null ? '–' : p === 'FOS' ? zahl(x, 1) + ' NP' : zahl(x, 2));
</script>

<svelte:head><title>Auswertung · alle Klassen</title></svelte:head>

<div class="seite">
  <h1>Alle Klassen</h1>
  <p class="leise">Vorläufige Gesamtnoten, Fehlzeiten und mündliche Leistungen deiner Klassen auf einen Blick. Eine Zeile öffnet die Auswertung der Klasse.</p>
  {#if d.einstellungen.module?.statistik === false}
    <p class="karte">Das Modul Auswertung ist ausgeschaltet. Einschalten unter <a href="/mehr">Mehr › Module</a>.</p>
  {:else}
    <div class="karte">
      <table class="zahl">
        <thead><tr><th>Klasse</th><th>Profil</th><th class="r">Ø Gesamt</th><th class="r">unter</th><th class="r">Kippe</th><th class="r">ohne Note</th><th class="r">über 30 %</th><th>mündlich zuletzt</th><th class="r">Verspätungen</th></tr></thead>
        <tbody>
          {#each zeilen as z (z.kurs.id)}
            <tr>
              <td><a href="/auswertung/{z.kurs.id}"><b>{z.kurs.name}</b></a><div class="klein leise">{z.kurs.schueler.length} Schüler · {z.leistungen} Leistungen</div></td>
              <td>{z.kurs.profil}</td>
              <td class="r">{schnitt(z.kurs.profil, z.schnitt)}</td>
              <td class="r" class:warn={z.unter > 0}>{z.unter}</td>
              <td class="r" class:gold={z.kippe > 0}>{z.kippe}</td>
              <td class="r">{z.ohne}</td>
              <td class="r" class:warn={z.hoch > 0}>{z.hoch}</td>
              <td>{#if z.muendlich !== null}<span class="ms"><Smiley stufe={Math.round(z.muendlich)} groesse={20} /> {zahl(z.muendlich, 1)}</span>{:else}<span class="leise">–</span>{/if}</td>
              <td class="r">{z.verspaetungen}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="klein leise">FOS in Notenpunkten, OSZ in Noten; deshalb kein gemeinsamer Schnitt über alle Klassen.</p>
    </div>
  {/if}
</div>

<style>
  .seite { padding: 24px 32px 40px; max-width: 1200px; display: flex; flex-direction: column; gap: 12px; }
  .karte { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: var(--leo-text-s); color: var(--leo-leise); font-weight: 600; padding: 6px 8px; border-bottom: 1px solid var(--leo-linie); white-space: nowrap; }
  td { padding: 8px; border-bottom: 1px dashed var(--leo-linie-fein); }
  td a { color: var(--leo-tinte); text-decoration: none; }
  .r { text-align: right; white-space: nowrap; }
  .ms { display: inline-flex; align-items: center; gap: 6px; }
  .warn { color: var(--leo-warnung); font-weight: 600; }
  .gold { color: #8a6200; font-weight: 600; }
  @media (max-width: 720px) { .seite { padding: 16px; } td, th { padding: 6px 4px; } }
</style>
