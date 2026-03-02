// Beach strip + subtle procedural sand texture.
const Sand = (function () {
  const shoreRatio = 0.88;
  const sandStartOffset = 38;

  function parseHex(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function lerpColor(c1, c2, t) {
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function hash(n) {
    n = (n >>> 0) * 1103515245 + 12345;
    return ((n >>> 16) & 0x7fff) / 32767;
  }

  function draw(ctx, time, width, height, options) {
    options = options || {};
    const hourOfDay = options.hourOfDay != null ? options.hourOfDay : 12;
    const shoreY = height * shoreRatio;
    const sandTop = shoreY - sandStartOffset;
    const sandHeight = height - sandTop;
    if (sandHeight <= 0) return;

    const d = typeof Utils !== "undefined" && Utils.dayStrength ? Utils.dayStrength(hourOfDay) : 1;
    const nightStops = [
      [0, "#4a4035"],
      [0.3, "#5a5040"],
      [0.7, "#52483a"],
      [1, "#453c30"],
    ];
    const dayStops = [
      [0, "#D4A574"],
      [0.3, "#E0C090"],
      [0.7, "#E8D0A8"],
      [1, "#C9A86C"],
    ];
    const grad = ctx.createLinearGradient(0, sandTop, 0, height);
    for (let i = 0; i < nightStops.length; i++) {
      const pos = nightStops[i][0];
      const c = lerpColor(parseHex(nightStops[i][1]), parseHex(dayStops[i][1]), d);
      grad.addColorStop(pos, c);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, sandTop, width, sandHeight);

    const cell = 12;
    const grainAlpha = 0.008 * (0.4 + 0.6 * d);
    for (let gy = 0; gy < sandHeight; gy += cell) {
      for (let gx = 0; gx < width; gx += cell) {
        const v = hash(991 * Math.floor(gx / cell) + 997 * Math.floor(gy / cell));
        const delta = (v - 0.5) * 6;
        ctx.fillStyle = "rgba(180, 150, 100, " + Math.abs(delta) * grainAlpha + ")";
        ctx.fillRect(gx, sandTop + gy, cell + 1, cell + 1);
      }
    }
  }

  return { draw };
})();
