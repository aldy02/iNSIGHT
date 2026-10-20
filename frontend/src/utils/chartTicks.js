const TIME_KEY = 'tanggal';
const DAY_MS = 24 * 60 * 60 * 1000;
const toMs = (r) => new Date(r[TIME_KEY]).getTime();

// Round tick 1, 2, 5, 10, etc
const niceStep = (raw) => {
  const exp = Math.floor(Math.log10(raw));
  const f = raw / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
};

// Build consistent y tick
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

const X_STEPS = [1, 2, 3, 5, 7, 10, 14, 21, 30, 60];

const pickStepDays = (spanMs, maxTicks) => {
  const days = Math.max(1, spanMs / DAY_MS);
  return X_STEPS.find((s) => days / s <= maxTicks) ?? X_STEPS[X_STEPS.length - 1];
};

export const buildXTicks = (data, maxTicks = 18) => {
  if (!data.length) return [];
  const start = toMs(data[0]);
  const end = toMs(data[data.length - 1]);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    const step = Math.max(1, Math.ceil(data.length / maxTicks));
    return data.filter((_, i) => i % step === 0).map((d) => d.label);
  }

  const stepMs = pickStepDays(end - start, maxTicks) * DAY_MS;
  const ticks = [];
  let nextBucket = 0;
  data.forEach((r) => {
    const bucket = Math.floor((toMs(r) - start) / stepMs);
    if (bucket >= nextBucket) {
      ticks.push(r.label);
      nextBucket = bucket + 1;
    }
  });
  return ticks;
};
