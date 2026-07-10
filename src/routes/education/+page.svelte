<script lang="ts">
  import { openConcept } from '$lib/state/conceptStore';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import WarningBox from '$lib/components/ui/WarningBox.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';

  const steps = [
    {
      n: 1,
      title: 'Portföy fotoğrafı',
      body: 'Eldeki hisselerin her biri aynı zamanda bir teminat kalemidir. CSCO, CSWC, TRIN ve GFS′in değeri, yeni trade için alım gücü üretir. Nakit ise en saf teminattır.',
      concept: 'collateral'
    },
    {
      n: 2,
      title: 'Risk açıklaması',
      body: 'Margin, broker′dan aldığın kredidir. Borcun faizi her gün işler. Sürdürme teminatı altına düşersen aşağı çağrılırsın: ya nakit ekle ya sat.',
      concept: 'maintenance'
    },
    {
      n: 3,
      title: 'Margin kurulumu',
      body: 'Başlangıç teminatı (Reg T %50) açılışta koyman gereken özkaynaktır. Simülatörde bu oranı ve sürdürme oranını kendin ayarlayabilirsin.',
      concept: 'initial'
    },
    {
      n: 4,
      title: 'Senaryo baskısı',
      body: 'Tek bir fiyat yerine sekiz senaryoyu birden test et. "Credit Stress" senaryosunda eldeki portföy düşer, trade yerinde kalır — sessiz katil.',
      concept: 'scenario'
    },
    {
      n: 5,
      title: 'Alternatif arama',
      body: 'Bulucu, bütçen ve portföyünle en dayanıklı trade′i sıralar. "En kötü senaryo" modu, kötü piyasada bile ayakta kalanı öne çıkarır.',
      concept: 'buffer'
    }
  ];

  const warnings = [
    { level: 'warning' as const, title: 'Dar buffer', body: 'Buffer %10′ın altındaysa küçük bir düşüş seni margin call sınırına iter. Lot düşür veya teminat oranını artır.' },
    { level: 'danger' as const, title: 'Yoğun pozisyon', body: 'Bir hisse portföyün %40′ından fazlaysa broker ek haircut uygular; çeşitlendirme kaybolur.' },
    { level: 'warning' as const, title: 'Faiz baskısı', body: 'Taşıma maliyeti sessizdir: fiyat yerinde kalsa bile borç faizi pozisyonu eritir. Flat senaryoda bunu gör.' },
    { level: 'warning' as const, title: 'Mobil okunabilirlik', body: 'Aksiyonlar üstte, sayılar tabular hizalı. Önemli karar önce gelir, detay bir dokunuş uzağında.' },
    { level: 'neutral' as const, title: 'İkon + metin', body: 'Hiçbir ikon yalnız kullanılmaz; her görselin yanında anlamı vardır. Erişilebilirlik önceliktir.' }
  ];
</script>

<PageHeader eyebrow="Öğrenme" title="Eğitim Akışı" desc="Margin mantığı neden böyle çalışır? Karar destek araçlarını kullanmadan önce bu beş adımı izle." />

<GuidedNote title="Açıkla — sonra hesapla">
  Bu sayfa kavramları sırayla öğretir. Her adımdaki <strong>kavram bağlantısı</strong> ilgili terimin üründeki karşılığını gösterir.
</GuidedNote>

<div class="edu">
  <section class="flow">
    <h3>5 adımlı öğrenme akışı</h3>
    {#each steps as s (s.n)}
      <div class="step">
        <div class="step-n">{s.n}</div>
        <div class="step-body">
          <div class="step-title">{s.title}</div>
          <p>{s.body}</p>
          <button class="clink" onclick={() => openConcept(s.concept)}><Icon name="info" size={14} /> İlgili kavram</button>
        </div>
      </div>
    {/each}
  </section>

  <aside class="flow warn-flow">
    <h3>5 uyarı akışı</h3>
    {#each warnings as w (w.title)}
      <WarningBox level={w.level} title={w.title} detail={w.body} />
    {/each}
  </aside>
</div>

<style>
  .edu {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: var(--space-6);
    align-items: start;
  }
  .flow {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .flow h3 {
    font-size: 22px;
    margin-bottom: var(--space-2);
  }
  .step {
    display: flex;
    gap: var(--space-4);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
  .step-n {
    font-family: var(--font-display);
    font-size: 34px;
    color: var(--faint);
    line-height: 1;
    flex-shrink: 0;
  }
  .step-title {
    font-weight: 700;
    font-size: 17px;
    margin-bottom: 6px;
  }
  .step-body p {
    color: var(--muted);
    line-height: 1.55;
    margin: 0 0 var(--space-3);
  }
  .clink {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 6px 12px;
    cursor: pointer;
  }
  .warn-flow {
    gap: var(--space-3);
  }
  @media (max-width: 960px) {
    .edu {
      grid-template-columns: 1fr;
    }
  }
</style>
