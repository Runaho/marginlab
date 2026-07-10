<script lang="ts">
  import { app, addHolding, removeHolding, setCash, setAccount, loadPortfolio } from '$lib/state/appState.svelte';
  import { portfolioStats } from '$lib/engine/portfolio';
  import { readPortfolioFile, downloadPortfolio } from '$lib/engine/portfolioIO';
  import { openConcept } from '$lib/state/conceptStore';
  import { SECTORS } from '$lib/engine/presets';
  import { MARKET, getMarket } from '$lib/engine/market';
  import type { Holding, Sector } from '$lib/engine/types';
  import { fmtMoney, fmtPct, fmtShares, fmtNum } from '$lib/utils/format';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import WarningBox from '$lib/components/ui/WarningBox.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';

  const stats = $derived(portfolioStats(app.portfolio));

  let newH = $state<Holding>({
    ticker: '',
    name: '',
    shares: 1,
    price: 0,
    cost: 0,
    beta: 1,
    collateral: 0.75,
    sector: 'Teknoloji'
  });

  let fileError = $state('');
  let fileInput: HTMLInputElement;

  function riskLevel(weight: number): 'safe' | 'warning' | 'danger' {
    if (weight > 0.4) return 'danger';
    if (weight > 0.3) return 'warning';
    return 'safe';
  }

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    fileError = '';
    try {
      const data = await readPortfolioFile(file);
      loadPortfolio(data);
    } catch (err) {
      fileError = err instanceof Error ? err.message : 'Dosya yüklenemedi.';
    }
    input.value = '';
  }

  function addPos() {
    if (!newH.ticker || newH.price <= 0 || newH.shares <= 0) return;
    addHolding({ ...newH, name: newH.name || newH.ticker });
    newH = { ticker: '', name: '', shares: 1, price: 0, cost: 0, beta: 1, collateral: 0.75, sector: 'Teknoloji' };
  }

  function pickMarketTicker(t: string) {
    const m = getMarket(t);
    if (!m) return;
    newH.ticker = t;
    newH.name = m.company;
    newH.price = m.price;
    newH.cost = m.price;
  }

  const concepts = [
    { key: 'collateral', label: 'Teminat Değeri' },
    { key: 'concentration', label: 'Yoğunlaşma Riski' },
    { key: 'initial', label: 'Başlangıç Teminatı' },
    { key: 'maintenance', label: 'Sürdürme Teminatı' }
  ];
</script>

<PageHeader eyebrow="Çalışma Alanı" title="Portföy" desc="Pozisyonların teminat motorudur. Her hisse, yeni trade için kullanılabilir alım gücü üretir." />

<GuidedNote title="Teminatı anla">
  Her satırdaki <strong>Teminat %</strong> o hissenin değerinin ne kadarının margin kapasitene sayıldığını belirler.
  Brokerlar daha az likit/hamil hisseleri indirimler (haircut). Varsayılan güvenli değer %75′tir.
</GuidedNote>

<div class="toolbar">
  <Button icon="upload" variant="secondary" onclick={() => fileInput.click()}>JSON′dan yükle</Button>
  <input bind:this={fileInput} type="file" accept="application/json,.json" onchange={onFile} hidden />
  <Button icon="download" variant="secondary" onclick={() => downloadPortfolio(app.portfolio)}>JSON olarak dışa aktar</Button>
  <a class="reset" href="/portfolio" onclick={() => loadPortfolio(structuredClone({ cash: 45.16, account: app.portfolio.account, holdings: [] }))}>Temizle</a>
</div>
{#if fileError}<div class="err">{fileError}</div>{/if}

<div class="grid">
  <section class="card table-card">
    <div class="card-head">
      <h3>Pozisyonlar ({stats.holdings.length})</h3>
      <span class="hint">Toplam teminat: <strong>{fmtMoney(stats.collateralValue)}</strong></span>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Varlık</th>
            <th>Adet</th>
            <th>Fiyat</th>
            <th>Değer</th>
            <th>Ağırlık</th>
            <th>P/L</th>
            <th>Teminat %</th>
            <th>Risk</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each stats.holdings as h, i (h.ticker + i)}
            <tr>
              <td data-label="Varlık">
                {#each [getMarket(h.ticker)] as m}
                  <div class="tk">{h.ticker}</div>
                  <div class="tk-name">{h.name}</div>
                  {#if m}
                    <span class="chg" class:up={m.changePercent1D >= 0} class:down={m.changePercent1D < 0}>
                      {m.changePercent1D >= 0 ? '▲' : '▼'} {Math.abs(m.changePercent1D).toFixed(2)}%
                    </span>
                  {/if}
                {/each}
              </td>
              <td data-label="Adet"><input class="cell" type="number" min="0" bind:value={app.portfolio.holdings[i].shares} /></td>
              <td data-label="Fiyat"><input class="cell" type="number" min="0" step="0.01" bind:value={app.portfolio.holdings[i].price} /></td>
              <td data-label="Değer" class="tabular">{fmtMoney(h.value)}</td>
              <td data-label="Ağırlık" class="tabular">{fmtPct(h.weight * 100, 0)}</td>
              <td data-label="P/L" class="tabular" class:neg={h.pl < 0} class:pos={h.pl > 0}>{fmtMoney(h.pl, { sign: true })}</td>
              <td data-label="Teminat %">
                <input class="cell narrow" type="number" min="0" max="1" step="0.05" bind:value={app.portfolio.holdings[i].collateral} />
              </td>
              <td data-label="Risk"><Badge level={riskLevel(h.weight)} label={riskLevel(h.weight) === 'danger' ? 'Yoğun' : riskLevel(h.weight) === 'warning' ? 'Dikkat' : 'Dengeli'} /></td>
              <td><button class="rm" onclick={() => removeHolding(i)} aria-label="Sil"><Icon name="x" size={16} /></button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if stats.concentration > 0.4}
      <div class="warn-row">
        <WarningBox level="danger" title="Aşırı yoğunlaşma" detail={`${stats.largest?.ticker} portföyün %${(stats.concentration * 100).toFixed(0)}′ını oluşturuyor. Bu, broker teminat indirimini artırabilir.`} />
      </div>
    {:else if stats.cashRatio < 0.1}
      <div class="warn-row">
        <WarningBox level="warning" title="Nakit tamponu ince" detail="Nakit oranın %10′ın altında; küçük düşüşlerde ek teminat zorunluluğu doğabilir." />
      </div>
    {/if}

    <details class="add">
      <summary><Icon name="plus" size={16} /> Pozisyon ekle</summary>
      <div class="form">
        <label>Ticker
          <select value={newH.ticker} onchange={(e) => pickMarketTicker((e.currentTarget as HTMLSelectElement).value)}>
            <option value="">Seç…</option>
            {#each MARKET as m}<option value={m.ticker}>{m.ticker} — {m.company}</option>{/each}
          </select>
        </label>
        <label>Ad<input bind:value={newH.name} placeholder="Şirket adı (ops.)" /></label>
        <label>Adet<input type="number" min="1" bind:value={newH.shares} /></label>
        <label>Fiyat<input type="number" min="0" step="0.01" bind:value={newH.price} /></label>
        <label>Maliyet<input type="number" min="0" step="0.01" bind:value={newH.cost} /></label>
        <label>Beta<input type="number" step="0.1" bind:value={newH.beta} /></label>
        <label>Teminat %<input type="number" min="0" max="1" step="0.05" bind:value={newH.collateral} /></label>
        <label>Sektör
          <select bind:value={newH.sector}>
            {#each SECTORS as s}<option value={s}>{s}</option>{/each}
          </select>
        </label>
        <div class="form-actions">
          <Button icon="plus" onclick={addPos}>Ekle</Button>
        </div>
      </div>
    </details>
  </section>

  <aside class="card guide">
    <div class="card-head"><h3>Hesap ayarları</h3></div>
    <label class="acct">Nakit (USD)
      <input type="number" step="0.01" value={app.portfolio.cash} oninput={(e) => setCash(parseFloat((e.currentTarget as HTMLInputElement).value) || 0)} />
    </label>
    <label class="acct">Başlangıç teminatı %
      <input type="number" min="0" max="1" step="0.05" value={app.portfolio.account.initialMargin} oninput={(e) => setAccount({ initialMargin: parseFloat((e.currentTarget as HTMLInputElement).value) || 0.5 })} />
    </label>
    <label class="acct">Sürdürme teminatı %
      <input type="number" min="0" max="1" step="0.05" value={app.portfolio.account.maintenanceMargin} oninput={(e) => setAccount({ maintenanceMargin: parseFloat((e.currentTarget as HTMLInputElement).value) || 0.25 })} />
    </label>
    <label class="acct">Yıllık faiz %
      <input type="number" min="0" step="0.1" value={app.portfolio.account.rate} oninput={(e) => setAccount({ rate: (parseFloat((e.currentTarget as HTMLInputElement).value) || 0) / 100 })} />
    </label>

    <div class="card-head" style="margin-top:var(--space-6)"><h3>Kavram kılavuzu</h3></div>
    <ul class="concepts">
      {#each concepts as c (c.key)}
        <li><button onclick={() => openConcept(c.key)}><Icon name="info" size={16} /> {c.label}</button></li>
      {/each}
    </ul>
  </aside>
</div>

<style>
  .toolbar {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: var(--space-4);
  }
  .reset {
    font-size: 13px;
    color: var(--muted);
    text-decoration: underline;
    cursor: pointer;
    margin-left: auto;
  }
  .err {
    color: var(--danger);
    font-size: 14px;
    margin-bottom: var(--space-3);
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: var(--space-6);
    align-items: start;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: var(--space-4);
    gap: var(--space-3);
  }
  .card-head h3 {
    font-size: 20px;
  }
  .hint {
    font-size: 13px;
    color: var(--muted);
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  thead th {
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--faint);
    padding: 0 12px 10px;
    font-weight: 600;
  }
  tbody td {
    padding: 12px;
    border-top: 1px solid var(--border);
    font-size: 14px;
    vertical-align: middle;
  }
  .tk {
    font-weight: 700;
  }
  .tk-name {
    font-size: 12px;
    color: var(--muted);
  }
  .chg {
    display: inline-block;
    margin-top: 3px;
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .chg.up {
    color: var(--success);
  }
  .chg.down {
    color: var(--danger);
  }
  .cell {
    width: 78px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 8px;
    font-size: 13px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .cell.narrow {
    width: 58px;
  }
  .pos {
    color: var(--success);
  }
  .neg {
    color: var(--danger);
  }
  .rm {
    background: transparent;
    border: none;
    color: var(--faint);
    cursor: pointer;
  }
  .rm:hover {
    color: var(--danger);
  }
  .warn-row {
    margin-top: var(--space-4);
  }
  .add {
    margin-top: var(--space-6);
    border-top: 1px solid var(--border);
    padding-top: var(--space-4);
  }
  .add summary {
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    list-style: none;
  }
  .add summary::-webkit-details-marker {
    display: none;
  }
  .form {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
    margin-top: var(--space-4);
  }
  .form label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
  }
  .form input,
  .form select {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px;
    font-size: 14px;
    color: var(--text);
  }
  .form-actions {
    grid-column: 1 / -1;
  }
  .guide {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .acct {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }
  .acct input {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px;
    font-size: 14px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .concepts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .concepts button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    cursor: pointer;
    color: var(--text);
    font-weight: 600;
    font-size: 14px;
    text-align: left;
  }
  .concepts button:hover {
    border-color: var(--text);
  }
  @media (max-width: 960px) {
    .grid {
      grid-template-columns: 1fr;
    }
    .form {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 640px) {
    thead {
      display: none;
    }
    tbody td {
      display: flex;
      justify-content: space-between;
      border: none;
      padding: 6px 0;
    }
    tbody td::before {
      content: attr(data-label);
      font-size: 11px;
      text-transform: uppercase;
      color: var(--faint);
      font-weight: 600;
    }
    tbody tr {
      display: block;
      border-top: 1px solid var(--border);
      padding: 10px 0;
    }
    .form {
      grid-template-columns: 1fr;
    }
  }
</style>
