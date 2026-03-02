// Seedable RNG, noise, and shared day/night brightness (smooth dawn/dusk).
const Utils = (function () {
  const DAWN_START = 4.2;
  const DAWN_END = 7.2;
  const DUSK_START = 16.5;
  const DUSK_END = 19.8;

  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function dayStrength(hour) {
    if (hour >= DAWN_END && hour <= DUSK_START) return 1;
    if (hour >= DUSK_END || hour < DAWN_START) return 0;
    if (hour < DAWN_END) return smoothstep(DAWN_START, DAWN_END, hour);
    return 1 - smoothstep(DUSK_START, DUSK_END, hour);
  }

  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(n) {
    n = (n >>> 0) * 1103515245 + 12345;
    return ((n >>> 16) & 0x7fff) / 32767;
  }
  // Simple 1D value noise: deterministic smooth -1..1 from seed and x
  function noise1D(seed, x) {
    const i = Math.floor(x);
    const t = x - i;
    const s = t * t * (3 - 2 * t);
    const a = (hash(seed + i * 7919) * 2 - 1);
    const b = (hash(seed + (i + 1) * 7919) * 2 - 1);
    return a + (b - a) * s;
  }
  // 2D value noise (Perlin-style interpolation), returns 0..1
  function noise2D(seed, x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const tx = x - ix;
    const ty = y - iy;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const n00 = hash(seed + ix * 7919 + iy * 3313);
    const n10 = hash(seed + (ix + 1) * 7919 + iy * 3313);
    const n01 = hash(seed + ix * 7919 + (iy + 1) * 3313);
    const n11 = hash(seed + (ix + 1) * 7919 + (iy + 1) * 3313);
    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    return nx0 + (nx1 - nx0) * sy;
  }
  // Worley-like: min distance to cell points (normalized 0..1). Seed offsets cell positions.
  function worley2D(seed, x, y) {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    let d = 2;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const gx = cx + ox;
        const gy = cy + oy;
        const px = gx + hash(seed + gx * 7919 + gy * 3313);
        const py = gy + hash(seed + gx * 4001 + gy * 7001);
        const nd = Math.hypot(x - px, y - py);
        if (nd < d) d = nd;
      }
    }
    return Math.min(1, d * 0.8);
  }
  return { mulberry32, noise1D, noise2D, worley2D, dayStrength, smoothstep };
})();
