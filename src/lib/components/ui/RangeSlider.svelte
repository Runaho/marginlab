<script lang="ts">
  let {
    label,
    value,
    min = 0,
    max = 100,
    step = 1,
    oninput,
    format = (v: number) => String(v)
  }: {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    oninput: (v: number) => void;
    format?: (v: number) => string;
  } = $props();
</script>

<label class="slider">
  <div class="top">
    <span>{label}</span>
    <span class="val tabular">{format(value)}</span>
  </div>
  <input
    type="range"
    {min}
    {max}
    {step}
    {value}
    oninput={(e) => oninput(parseFloat((e.currentTarget as HTMLInputElement).value))}
  />
</label>

<style>
  .slider {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  label {
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }
  .val {
    font-weight: 700;
    font-size: 14px;
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--text);
    cursor: pointer;
  }
</style>
