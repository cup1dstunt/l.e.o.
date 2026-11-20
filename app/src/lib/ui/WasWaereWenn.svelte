<script lang="ts">
  // Was-wäre-wenn (I36, Feedback 9 und 10): Werte für offene Leistungen annehmen, auch zusätzliche Leistungen. Speichert nichts.
  import { rechne, rechneAngenommen, noetigeNote, zellSchluessel, zahl, SKALA, bestanden } from '$lib/rechnen';
  import type { Gruppe, Kurs } from '$lib/typen';
  let { kurs, sid, gruppe }: { kurs: Kurs; sid: string; gruppe?: Gruppe } = $props();

  const skala = $derived(SKALA[kurs.profil]);
  const fos = $derived(kurs.profil === 'FOS');
  const GRUPPEN: { g: Gruppe; text: string }[] = [
    { g: 'klausuren', text: 'Klausuren' },
    { g: 'mitarbeit', text: 'Mündliche Leistungen' },
    { g: 'sl', text: 'Tests und Sonstiges' }
  ];
  // Standard: nur offene Leistungen. Umschalter: auch eingetragene Noten probeweise ändern (Feedback 18.11.)
  let alle = $state(false);
  const eingetragen = (lid: string) => { const z = kurs.zellen[zellSchluessel(lid, sid)]; return z?.status === 'UE' ? 'UE' : z?.wert !== undefined ? String(z.wert) : ''; };
  const offen = $derived(
    kurs.leistungen.filter((l) => (!gruppe || l.gruppe === gruppe) && (alle || (() => {
      const z = kurs.zellen[zellSchluessel(l.id, sid)];
      return !z || z.status === 'E' || z.status === 'offen' || (z.wert === undefined && z.status !== 'UE');
    })()))
  );
  let annahmen = $state<Record<string, string>>({});
  let extra = $state<{ gruppe: Gruppe; wert: string; gewicht: string }[]>([]);
  let ziel = $state<number | undefined>(undefined);
  const zielWert = $derived(ziel ?? (fos ? 5 : 4));

  const vorher = $derived(rechne(kurs, sid));
  const nachher = $derived(
    rechneAngenommen(
      kurs, sid,
      Object.fromEntries(Object.entries(annahmen).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)])),
      extra.filter((x) => x.wert !== '').map((x) => ({ gruppe: x.gruppe, wert: Number(x.wert), gewicht: Number(x.gewicht) || 1 }))
    )
  );
  const geaendert = $derived(Object.values(annahmen).some((v) => v !== '') || extra.some((x) => x.wert !== ''));
  const gw = (e: ReturnType<typeof rechne>, g?: Gruppe) => (g === 'klausuren' ? e.klausuren : g === 'mitarbeit' ? e.mitarbeit : g === 'sl' ? e.sl : null);
  const ges = (e: ReturnType<typeof rechne>) => (fos ? (e.gesamt === null ? '–' : String(e.gesamt)) : zahl(e.gesamt));
  const ost = (x: number | null) => (x !== null && !bestanden(kurs.profil, x) ? 'warn' : '');
</script>

<div class="www">
  <div class="zeile kopfz">
    <b class="raum">Was wäre, wenn …</b>
    <label class="klein leise">Ziel Gesamt mind.
      <select class="eingabe kl" bind:value={ziel}>{#each skala.werte as w}<option value={w} selected={w === zielWert}>{w}</option>{/each}</select>
    </label>
  </div>
  {#each offen as l}
    {@const ist = eingetragen(l.id)}
    {@const n = ist ? null : noetigeNote(kurs, sid, l.id, zielWert)}
    <div class="zeile zl">
      <span class="raum">{l.name}{#if !gruppe}<span class="leise klein">&nbsp;· {GRUPPEN.find((x) => x.g === l.gruppe)?.text}</span>{/if}</span>
      <span class="klein leise">{ist ? `eingetragen: ${ist}` : n === 'schon' ? 'Ziel schon erreicht' : n === 'unmoeglich' ? 'allein nicht erreichbar' : `nötig: ${n}`}</span>
      <select class="eingabe kl" bind:value={annahmen[l.id]} aria-label="Annahme {l.name}">
        <option value="">–</option>{#each skala.werte as w}<option value={String(w)}>{w}</option>{/each}
      </select>
    </div>
  {/each}
  {#each extra as x, i}
    <div class="zeile zl">
      <span class="raum">angenommene Leistung
        {#if !gruppe}<select class="eingabe kl" bind:value={x.gruppe}>{#each GRUPPEN as g}<option value={g.g}>{g.text}</option>{/each}</select>{/if}
      </span>
      <label class="klein leise">Gewicht <input class="eingabe kl gew" bind:value={x.gewicht} inputmode="decimal" /></label>
      <select class="eingabe kl" bind:value={x.wert}><option value="">–</option>{#each skala.werte as w}<option value={String(w)}>{w}</option>{/each}</select>
      <button class="x" onclick={() => extra.splice(i, 1)} aria-label="entfernen">×</button>
    </div>
  {/each}
  <div class="zeile zl">
    <button class="link klein" onclick={() => extra.push({ gruppe: gruppe ?? 'sl', wert: '', gewicht: '1' })}>+ weitere Leistung annehmen</button>
    <span class="raum"></span>
    <label class="klein leise"><input type="checkbox" bind:checked={alle} onchange={() => { if (!alle) for (const l of kurs.leistungen) if (eingetragen(l.id)) delete annahmen[l.id]; }} /> auch eingetragene Noten ändern</label>
  </div>
  {#if offen.length === 0 && extra.length === 0}<p class="klein leise">Keine offene Leistung. Nimm eine weitere an.</p>{/if}
  <div class="ergebnis zahl">
    {#if gruppe}<span>Ø {zahl(gw(vorher, gruppe))} → <b class={ost(gw(nachher, gruppe))}>{zahl(gw(nachher, gruppe))}</b></span>{/if}
    <span>Gesamt {ges(vorher)} → <b class={ost(nachher.gesamt)}>{geaendert ? ges(nachher) : '…'}</b></span>
  </div>
</div>

<style>
  .www { border: 1px solid var(--leo-linie); border-radius: var(--leo-r-m); padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; background: var(--leo-flaeche-leise); }
  .kopfz { gap: 8px; flex-wrap: wrap; }
  .zl { gap: 8px; flex-wrap: wrap; }
  .kl { min-height: 32px; padding: 2px 6px; }
  .gew { width: 52px; }
  .link { background: none; border: 0; color: var(--leo-akzent); font-weight: 600; text-align: left; padding: 4px 0; }
  .x { border: 0; background: none; font-size: 18px; color: var(--leo-leise); min-width: 32px; }
  .ergebnis { display: flex; gap: 18px; flex-wrap: wrap; border-top: 1px dashed var(--leo-linie); padding-top: 8px; }
  .ergebnis b { font-size: 16px; }
  .warn { color: var(--leo-warnung); }
</style>
