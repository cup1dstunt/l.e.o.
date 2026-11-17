<script lang="ts">
  // Einfache Stunden- und Halbjahresplanung mit Beispiel-Ferien. Später kommen Termine aus WebUntis/IServ (Backlog).
  import { page } from '$app/state';
  import { app, speichern } from '$lib/speicher.svelte';
  import { heuteISO, datumWt } from '$lib/hilfen';
  import KursKopf from '$lib/ui/KursKopf.svelte';

  const d = app.d!;
  const kurs = $derived(d.kurse.find((k) => k.id === page.params.id)!);
  const heute = heuteISO();

  // Beispiel: 1. Halbjahr 2026/27 Berlin (Daten bitte prüfen, später aus WebUntis)
  const HALBJAHR = { von: '2026-08-31', bis: '2027-01-29' };
  const FERIEN = [
    { name: 'Herbstferien', von: '2026-10-19', bis: '2026-10-31' },
    { name: 'Weihnachtsferien', von: '2026-12-21', bis: '2027-01-02' }
  ];
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const termine = $derived.by(() => {
    const plan = d.stundenplan.filter((s) => s.kursId === kurs.id);
    const liste: { datum: string; beginn: string; ende: string }[] = [];
    for (let t = new Date(HALBJAHR.von + 'T12:00'); iso(t) <= HALBJAHR.bis; t.setDate(t.getDate() + 1)) {
      const ds = iso(t);
      if (FERIEN.some((f) => ds >= f.von && ds <= f.bis)) continue;
      for (const s of plan) if (s.tag === t.getDay()) liste.push({ datum: ds, beginn: s.beginn, ende: s.ende });
    }
    return liste;
  });
  const vergangen = $derived(termine.filter((t) => t.datum < heute));
  const kommend = $derived(termine.filter((t) => t.datum >= heute));
  let alteZeigen = $state(false);
  const leistungAm = (ds: string) => kurs.leistungen.filter((l) => l.datum === ds);
  // Einträge für alle Termine anlegen, damit die Felder gebunden werden können
  $effect.pre(() => { for (const t of termine) if (!kurs.lernstoff[t.datum]) kurs.lernstoff[t.datum] = { text: '', hausaufgabe: '' }; });
  const geplant = $derived(kommend.filter((t) => kurs.lernstoff[t.datum]?.text.trim()).length);
</script>

<svelte:head><title>{kurs?.name} · Planung</title></svelte:head>

{#if kurs}
  <KursKopf {kurs} aktiv="planung" />
  <div class="seite">
    <section class="karte kennzahlen">
      <div><b class="zahl">{termine.length}</b><span class="klein leise">Blöcke im Halbjahr</span></div>
      <div><b class="zahl">{vergangen.length}</b><span class="klein leise">gehalten</span></div>
      <div><b class="zahl">{kommend.length}</b><span class="klein leise">noch übrig</span></div>
      <div><b class="zahl">{geplant}</b><span class="klein leise">davon geplant</span></div>
      <p class="klein leise info">Beispielrechnung: 1. Halbjahr bis 29.01.2027 ohne {FERIEN.map((f) => f.name).join(' und ')}, Feiertage und Ausfälle noch nicht berücksichtigt. Später aus WebUntis.</p>
    </section>

    <section class="karte">
      <div class="zeile"><h2 class="raum">Kommende Stunden</h2><span class="klein leise">Was du hier einträgst, steht in der Live-Stunde unter „Lernstoff“.</span></div>
      <ul class="plan">
        {#each kommend.slice(0, 16) as t (t.datum + t.beginn)}
          {@const e = kurs.lernstoff[t.datum]}
          {#if e}
          <li class:heute={t.datum === heute}>
            <div class="wann"><b>{datumWt(t.datum)}</b><span class="klein leise zahl">{t.beginn}–{t.ende}</span>
              {#each leistungAm(t.datum) as l}<span class="kennz">{l.name}</span>{/each}
            </div>
            <input class="eingabe" placeholder="Thema / Stoff" bind:value={e.text} oninput={speichern} />
            <input class="eingabe" placeholder="Hausaufgabe" bind:value={e.hausaufgabe} oninput={speichern} />
          </li>
          {/if}
        {/each}
      </ul>
      {#if kommend.length > 16}<p class="klein leise">… und {kommend.length - 16} weitere bis zum Halbjahresende.</p>{/if}
    </section>

    <section class="karte">
      <div class="zeile"><h2 class="raum">Rückblick</h2><button class="pille" aria-pressed={alteZeigen} onclick={() => (alteZeigen = !alteZeigen)}>{alteZeigen ? 'ausblenden' : `${vergangen.length} vergangene zeigen`}</button></div>
      {#if alteZeigen}
        <ul class="plan alt">
          {#each [...vergangen].reverse() as t (t.datum + t.beginn)}
            {@const e = kurs.lernstoff[t.datum]}
            <li><div class="wann"><b>{datumWt(t.datum)}</b></div><span class:leise={!e?.text}>{e?.text || 'kein Stoff eingetragen'}</span><span class="leise klein">{e?.hausaufgabe}</span></li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>
{/if}

<style>
  .seite { padding: 18px 32px 40px; display: flex; flex-direction: column; gap: 16px; max-width: 1200px; }
  .kennzahlen { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .kennzahlen div { display: flex; flex-direction: column; gap: 2px; }
  .kennzahlen b { font-size: 28px; font-weight: 750; }
  .info { grid-column: 1 / -1; margin: 4px 0 0; }
  .plan { list-style: none; padding: 0; margin: 12px 0 0; }
  .plan li { display: grid; grid-template-columns: 210px 1fr 260px; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px dashed var(--leo-linie); }
  .plan li.heute { background: var(--leo-auswahl); }
  .wann { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .plan.alt li { grid-template-columns: 210px 1fr 260px; }
  @media (max-width: 800px) { .seite { padding: 12px; } .plan li, .plan.alt li { grid-template-columns: 1fr; } .kennzahlen { grid-template-columns: 1fr 1fr; } }
</style>
