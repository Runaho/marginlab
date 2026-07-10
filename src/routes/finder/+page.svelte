<script lang="ts">
  import { goto } from '$app/navigation';
  import { app, setFinder, setPendingTrade } from '$lib/state/appState.svelte';
  import { portfolioStats } from '$lib/engine/portfolio';
  import { runFinder } from '$lib/engine/finder';
  import { SCENARIOS } from '$lib/engine/presets';
  import { marketUniverse } from '$lib/engine/market';
  import type { FinderCandidate, FinderConfig, FinderMode, ScenarioScope } from '$lib/engine/types';
  import { fmtMoney, fmtPct, fmtShares } from '$lib/utils/format';
  import { levelLabel } from '$lib/utils/format';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';

  const stats = $derived(portfolioStats(app.portfolio));

  let applied = $state<FinderConfig>({ ...app.finder });

  function run() {
    applied = { ...app.finder };
  }

  const ctx = $derived({
    availableCollateral: stats.availableCollateral,
    account: app.portfolio.account,
    budget: applied.budget,
    sectorWeights: stats.sectorWeights
  });

  const result = $derived(runFinder(applied, SCENARIOS, app.activeScenario, ctx));
  const universeNames = $derived(
    Object.fromEntries(marketUniverse().map((u) => [u.ticker, u.name]))
  );

  let expanded = $state<string | null>(null);
  function toggle(t: string) {
    expanded = expanded === t ? null : t;
  }

  function loadInto(c: FinderCandidate) {
    setPendingTrade({ ticker: c.ticker, shares: c.shares });
    goto('/simulator');
  }

  const levelOf = (s: string): 'success' | 'warning' | 'danger' =>
    s === 'danger' ? 'danger' : s === 'warning' ? 'warning' : 'success';
</script>

<PageHeader eyebrow="Karar desteği" title="Trade Bulucu" desc="Bu bütçe ve portföyle en iyi sonucu veren trade′i bul. Her kart neden öne çıktığını açıklar." />

<GuidedNote title="Seçili mod = bugünün bahsi">
  <strong>Worst-case</strong> modunda #1, kötü senaryolarda bile ayakta kalan trade′dir. <strong>Selected-only</strong> modunda #1 ise
  sadece şu anki senaryo için en iyisidir. İkisi farklıdır.
</GuidedNote>

<div class="finder">
  <aside class="card filters">
    <h3>Filtreler</h3>
    <label>Bütçe (USD)
      <input type="number" min="1" step="10" value={app.finder.budget} oninput={(e) => setFinder({ budget: parseFloat((e.currentTarget as HTMLInputElement).value) || 0 })} />
    </label>
    <label>Risk toleransı
      <select value={app.finder.riskTolerance} onchange={(e) => setFinder({ riskTolerance: (e.currentTarget as HTMLSelectElement).value as FinderConfig['riskTolerance'] })}>
        <option value="low">Düşük</option>
        <option value="medium">Orta</option>
        <option value="high">Yüksek</option>
      </select>
    </label>
    <label>Karar hedefi
      <select value={app.finder.goal} onchange={(e) => setFinder({ goal: (e.currentTarget as HTMLSelectElement).value as FinderConfig['goal'] })}>
        <option value="fit">Portföy uyumu</option>
        <option value="safest">En güvenli</option>
        <option value="return">Getiri odaklı</option>
      </select>
    </label>
    <label>Skor modu
      <select value={app.finder.mode} onchange={(e) => setFinder({ mode: (e.currentTarget as HTMLSelectElement).value as FinderMode })}>
        <option value="balanced">Dengeli</option>
        <option value="safety">Güvenli</option>
        <option value="upside">Getiri</option>
      </select>
    </label>
    <label>Senaryo kapsamı
      <select value={app.finder.scope} onchange={(e) => setFinder({ scope: (e.currentTarget as HTMLSelectElement).value as ScenarioScope })}>
        <option value="selected">Seçili senaryo</option>
        <option value="average">Tüm senaryolar (ortalama)</option>
        <option value="worst">Tüm senaryolar (en kötü)</option>
      </select>
    </label>
    <label>Maksimum lot
      <input type="number" min="1" max="20" value={app.finder.maxLot} oninput={(e) => setFinder({ maxLot: Math.max(1, parseInt((e.currentTarget as HTMLInputElement).value) || 1) })} />
    </label>
    <Button icon="scan-search" onclick={run}>Bulucu çalıştır</Button>
    <p class="avail">Kullanılabilir teminat: <strong>{fmtMoney(stats.availableCollateral)}</strong></p>
  </aside>

  <div class="results">
    <section>
      <h3 class="sec-title">Global Top 3</h3>
      <div class="cards">
        {#each result.global as c, i (c.ticker + c.shares)}
          <article class="fcard">
            <div class="fc-top">
              <span class="rank">#{i + 1}</span>
              <div class="fc-head">
                <div class="fc-title">{c.ticker} × {fmtShares(c.shares)}</div>
                <div class="fc-name">{universeNames[c.ticker]}</div>
              </div>
              <Badge level={levelOf(c.status)} label={levelLabel(c.status)} />
            </div>
            <div class="badges">
              <Badge level="neutral" label={`En iyi: ${c.bestInScenario}`} />
            </div>
            <div class="kpis">
              <div><span>Skor</span><strong class="tabular">{c.score.toFixed(1)}</strong></div>
              <div><span>Değer</span><strong class="tabular">{fmtMoney(c.tradeValue)}</strong></div>
              <div><span>Net P/L</span><strong class="tabular" class:pos={c.netPL >= 0} class:neg={c.netPL < 0}>{fmtMoney(c.netPL, { sign: true })}</strong></div>
              <div><span>Buffer</span><strong class="tabular">{fmtPct(c.bufferPct, 1)}</strong></div>
            </div>
            <p class="rationale">{c.rationale}</p>
            <details>
              <summary>Detay</summary>
              <ul class="detail-list">
                <li><span>Margin borcu</span><span class="tabular">{fmtMoney(c.borrow)}</span></li>
                <li><span>MC günü</span><span class="tabular">{c.mcDay < 0 ? 'uzun' : c.mcDay}</span></li>
                <li><span>Beta</span><span class="tabular">{c.beta.toFixed(2)}</span></li>
                <li><span>Sektör</span><span>{c.sector}</span></li>
              </ul>
            </details>
            <Button variant="secondary" icon="calculator" onclick={() => loadInto(c)}>Trade′e yükle</Button>
          </article>
        {/each}
      </div>
    </section>

    <section>
      <h3 class="sec-title">Hisse bazlı Top 3</h3>
      <div class="acc">
        {#each Object.entries(result.perStock) as [tk, list] (tk)}
          <div class="acc-block">
            <button class="acc-head" onclick={() => toggle(tk)}>
              <span>{tk} — {universeNames[tk]}</span>
              <span class="acc-meta">{list.length} sonuç <Icon name="chevron" size={16} class={expanded === tk ? 'rot' : ''} /></span>
            </button>
            {#if expanded === tk}
              <div class="acc-body">
                {#each list as c (c.shares)}
                  <div class="acc-row">
                    <span class="tabular">{fmtShares(c.shares)} lot</span>
                    <Badge level={levelOf(c.status)} label={levelLabel(c.status)} />
                    <span class="tabular">Skor {c.score.toFixed(1)}</span>
                    <span class="tabular">Buf {fmtPct(c.bufferPct, 0)}</span>
                    <button class="mini" onclick={() => loadInto(c)}>Yükle</button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  </div>
</div>

<style>
  .finder {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: var(--space-6);
    align-items: start;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
  .filters {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    position: sticky;
    top: calc(var(--top-h) + var(--space-4));
  }
  .filters h3 {
    font-size: 20px;
    margin-bottom: var(--space-2);
  }
  .filters label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }
  .filters input,
  .filters select {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px;
    font-size: 14px;
    color: var(--text);
  }
  .avail {
    font-size: 13px;
    color: var(--muted);
    margin: 0;
  }
  .sec-title {
    font-size: 20px;
    margin-bottom: var(--space-4);
  }
  .cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-8);
  }
  .fcard {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
  .fc-top {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .rank {
    font-family: var(--font-display);
    font-size: 26px;
    color: var(--faint);
  }
  .fc-head {
    flex: 1;
  }
  .fc-title {
    font-weight: 700;
    font-size: 18px;
  }
  .fc-name {
    font-size: 13px;
    color: var(--muted);
  }
  .badges {
    margin: var(--space-3) 0;
  }
  .kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }
  .kpis div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .kpis span {
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .kpis strong {
    font-size: 16px;
  }
  .pos {
    color: var(--success);
  }
  .neg {
    color: var(--danger);
  }
  .rationale {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.5;
    margin: 0 0 var(--space-3);
  }
  .detail-list {
    list-style: none;
    margin: 0 0 var(--space-3);
    padding: 0;
  }
  .detail-list li {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-top: 1px solid var(--border);
    font-size: 14px;
  }
  .acc {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .acc-block {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .acc-head {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text);
    font-weight: 700;
    font-size: 15px;
  }
  .acc-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--muted);
    font-weight: 600;
  }
  .acc-body {
    padding: 0 var(--space-4) var(--space-4);
  }
  .acc-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: 10px 0;
    border-top: 1px solid var(--border);
    font-size: 14px;
  }
  .acc-row .mini {
    margin-left: auto;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 12px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    color: var(--text);
  }
  :global(.rot) {
    transform: rotate(180deg);
    transition: transform 180ms ease;
  }
  @media (max-width: 960px) {
    .finder {
      grid-template-columns: 1fr;
    }
    .filters {
      position: static;
    }
    .kpis {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
