<script lang="ts">
  import { app, setEduDone } from '$lib/state/appState.svelte';
  import { openConcept } from '$lib/state/conceptStore';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import GuidedNote from '$lib/components/ui/GuidedNote.svelte';
  import WarningBox from '$lib/components/ui/WarningBox.svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { t } from '$lib/i18n';

  const stepNums = [1, 2, 3, 4, 5];
  const stepConcepts = ['collateral', 'maintenance', 'initial', 'scenario', 'buffer'];
  const stepHrefs = ['/portfolio', '/portfolio', '/simulator', '/scenarios', '/finder'];

  const warnings = [
    { level: 'warning' as const, titleKey: 'eduWarn1Title', bodyKey: 'eduWarn1Body' },
    { level: 'danger' as const, titleKey: 'eduWarn2Title', bodyKey: 'eduWarn2Body' },
    { level: 'warning' as const, titleKey: 'eduWarn3Title', bodyKey: 'eduWarn3Body' },
    { level: 'warning' as const, titleKey: 'eduWarn4Title', bodyKey: 'eduWarn4Body' },
    { level: 'neutral' as const, titleKey: 'eduWarn5Title', bodyKey: 'eduWarn5Body' }
  ];
</script>

<PageHeader eyebrow={t('eduEyebrow')} title={t('eduTitle')} desc={t('eduDesc')} />

<GuidedNote title={t('eduGuidedTitle')}>
  {t('eduGuidedBody')}
</GuidedNote>

<div class="edu">
  <section class="flow">
    <h3>{t('eduFlowTitle')}</h3>
    {#each stepNums as n (n)}
      <div class="step" class:done={app.eduDone[n]}>
        <div class="step-n">{n}</div>
        <div class="step-body">
          <div class="step-title">{t(`eduStep${n}Title`)}</div>
          <p>{n === 3 ? t('eduStep3Body2') : t(`eduStep${n}Body`)}</p>
          <div class="task">
            <Icon name="target" size={14} />
            <span><strong>{t('eduTask')}</strong> {t(`eduStep${n}Task`)}</span>
          </div>
          <div class="step-actions">
            <button class="clink" onclick={() => openConcept(stepConcepts[n - 1])}><Icon name="info" size={14} /> {t('eduConceptLink')}</button>
            <a class="clink cta" href={stepHrefs[n - 1]}><Icon name="waypoints" size={14} /> {t(`eduStep${n}Cta`)}</a>
            <button class="clink" class:done-btn={app.eduDone[n]} onclick={() => setEduDone(n, !app.eduDone[n])}>
              <Icon name={app.eduDone[n] ? 'shield-check' : 'plus'} size={14} />
              {app.eduDone[n] ? t('eduDone') : t('eduComplete')}
            </button>
          </div>
        </div>
      </div>
    {/each}
  </section>

  <aside class="flow warn-flow">
    <h3>{t('eduWarnTitle')}</h3>
    {#each warnings as w (w.titleKey)}
      <WarningBox level={w.level} title={t(w.titleKey)} detail={t(w.bodyKey)} />
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
  .step.done {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 5%, var(--surface));
  }
  .step-body p {
    color: var(--muted);
    line-height: 1.55;
    margin: 0 0 var(--space-3);
  }
  .task {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 10px 12px;
    margin-bottom: var(--space-3);
    font-size: 13px;
    color: var(--text);
    line-height: 1.4;
  }
  .task :global(svg) {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--text);
  }
  .step-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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
    text-decoration: none;
  }
  .clink.cta {
    background: var(--text);
    color: var(--inverse);
    border-color: var(--text);
  }
  .clink.done-btn {
    color: var(--success);
    border-color: color-mix(in srgb, var(--success) 40%, transparent);
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
