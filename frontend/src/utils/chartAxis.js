// Helper chart
export const ZOOM_STEP = 0.8; // Everytime scroll, y zoom in 80% or zoom out 125%
export const MIN_SPAN_RATIO = 0.02; // Max zoom in 2% from default range
export const MAX_ZOOM_OUT = 3; // Zoom out max 3x from default range
export const PLOT_TOP = 10;
export const PLOT_BOTTOM = 30;
export const PLOT_RIGHT = 10;
export const MIN_TICK_PX = 42; // Minimum distance per X label (tick) for spacing

const TIME_KEY = 'tanggal';
export const toMs = (r) => new Date(r[TIME_KEY]).getTime();

const DAY_MS = 24 * 60 * 60 * 1000;

// Round tick 1, 2, 5, 10, etc
const niceStep = (raw) => {
  const exp = Math.floor(Math.log10(raw));
  const f = raw / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
};

// Makesure y tick consistant
export const buildYTicks = (min, max, target = 5) => {
  const span = max - min;
  if (!(span > 0)) return { ticks: [min], decimals: 0 };
  const step = niceStep(span / target);
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const ticks = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return { ticks, decimals };
};

// Option for x (day) tick range (sama dengan ParameterCard)
const X_STEPS = [1, 2, 3, 4, 5, 7, 10, 14, 30, 60];

// Pick the smallest step whose tick count fits maxTicks
export const pickStepDays = (spanMs, maxTicks) => {
  const days = Math.max(1, spanMs / DAY_MS);
  return X_STEPS.find((s) => days / s <= maxTicks) ?? X_STEPS[X_STEPS.length - 1];
};

// Build x tick
export const buildXTicks = (data, stepDays = 3, minIndexGap = 1) => {
  if (!data.length) return [];
  const start = toMs(data[0]);
  const ticks = [];
  let nextBucket = 0;
  let lastIdx = -Infinity;
  data.forEach((r, i) => {
    const bucket = Math.floor((toMs(r) - start) / (stepDays * DAY_MS));
    if (bucket >= nextBucket && i - lastIdx >= minIndexGap) {
      ticks.push(r.label);
      nextBucket = bucket + 1;
      lastIdx = i;
    }
  });
  return ticks;
};