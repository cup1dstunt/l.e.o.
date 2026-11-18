<script lang="ts">
  // Ø-Kachel (Feedback 9, E89): zeigt, welche Noten in den Durchschnitt eingehen, mit Was-wäre-wenn.
  import { zellSchluessel, zellWert, zahl, bestanden } from '$lib/rechnen';
  import type { Gruppe, Kurs } from '$lib/typen';
  import WasWaereWenn from './WasWaereWenn.svelte';
  let { kurs, sid, gruppe, mitWenn = true }: { kurs: Kurs; sid: string; gruppe: Gruppe; mitWenn?: boolean } = $props();
  const zeilen = $derived(
    kurs.leistungen.filter((l) => l.gruppe === gruppe).map((l) => {
      const z = kurs.zellen[zellSchluessel(l.id, sid)];
      const w = zellWert(kurs.profil, z);
      const gew = z?.gewicht ?? l.gewicht;
      return { l, z, w, gew, zaehlt: w !== null && gew > 0 };
    })
  );
  const summeG = $derived(zeilen.filter((r) => r.zaehlt).reduce((a, r) => a + r.gew, 0));
</script>

<table class="zahl">
  <thead><tr><th>Leistung</th><th>Wert</th><th>Gewicht</th><th>Anteil</th></tr></thead>
  <tbody>
    {#each zeilen as r}
      <tr class:aus={!r.zaehlt}>
        <td>{r.l.name}{#if r.z?.stern}<span class="stern" title={r.z.stern}> ★</span>{/if}</td>
        <td class:warn={r.w !== null && !bestanden(kurs.profil, r.w)}>{r.z?.status ? r.z.status : (r.z?.wert ?? '·')}{r.z?.status === 'UE' ? ` (= ${r.w})` : ''}</td>
        <td>{r.gew.toLocaleString('de-DE')}{r.z?.gewicht !== undefined ? ' (einzeln)' : ''}</td>
        <td>{r.zaehlt ? Math.round((r.gew / summeG) * 100) + ' %' : r.z?.status === 'E' ? 'Nachschreiben' : 'zählt nicht'}</td>
      </tr>
    {/each}
  </tbody>
</table>
{#if mitWenn}<WasWaereWenn {kurs} {sid} {gruppe} />{/if}

<style>
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 10px; }
  th { text-align: left; font-weight: 600; color: var(--leo-leise); font-size: 12px; padding: 4px 6px; border-bottom: 1px solid var(--leo-linie); }
  td { padding: 6px; border-bottom: 1px dashed var(--leo-linie-fein); }
  tr.aus td { color: var(--leo-leise); }
  .warn { color: var(--leo-warnung); font-weight: 700; }
  .stern { color: var(--leo-stern); }
</style>
