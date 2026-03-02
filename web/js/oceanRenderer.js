/**
 * oceanRenderer.js — Renders the ocean using OceanMath and OceanDataLoader.
 *
 * Implements:
 * - Water surface with analytic + Gerstner-driven shore line
 * - Fresnel effect: reflectivity increases at grazing angles (realistic water look)
 * - Sun reflection / specular highlight where surface faces the sun
 * - Crystalline / foam highlights along wave crests
 *
 * Projection: 2D canvas, world coords = screen coords (x right, y down).
 * Horizon and shore line in pixels; time t in seconds for smooth animation.
 */

const OceanRenderer = (function () {
  "use strict";

  const shoreRatio = 0.88;
  const surfAmplitude = 18;
  const surfFreq = 0.32;
  const FOAM_CREST_THRESHOLD = 0.35;   // slope-based crest detection (lower = more foam on crests)
  const FOAM_OFFSHORE_THRESHOLD = 0.42; // crest threshold for whitecaps (slightly higher = fewer, sharper crests)
  const F0 = 0.02;                     // Fresnel reflectivity at normal incidence
  const SUN_SHININESS = 32;

  function hash(n) {
    let k = Math.floor(Number(n) * 1e6 + 0.5) >>> 0;
    k = (k * 1103515245 + 12345) >>> 0;
    return ((k >>> 16) & 0x7fff) / 32767;
  }

  /**
   * Sun position in screen coords (from same logic as Sky).
   * hourOfDay 0–24; returns { x, y } in pixels.
   */
  function getSunPosition(width, horizonY, hourOfDay) {
    if (hourOfDay < 4.2 || hourOfDay > 19.8) return null;
    const sunAngle = ((hourOfDay - 6) / 12) * Math.PI;
    const centerX = width / 2;
    const radiusX = width * 0.42;
    const radiusY = horizonY * 0.6;
    return {
      x: centerX - radiusX * Math.cos(sunAngle),
      y: horizonY - radiusY * Math.sin(sunAngle),
    };
  }

  /**
   * Fresnel factor: F = F0 + (1−F0)*(1 − N·V)^5.
   * N = surface normal (from slope), V = view direction (toward camera).
   * In 2D: N = (-dHdx, 1) normalized, V = (0, -1). So N·V = -1/|N| = -1/sqrt(1+dHdx²).
   * We use 1 − max(0, N·V) so grazing (small N·V) => high F.
   */
  function fresnelFactor(dHdx, dHdy) {
    const len = Math.sqrt(dHdx * dHdx + dHdy * dHdy + 1);
    const nDotV = 1 / len; // V = (0, -1) in (x,y,up), N·V = 1/len
    const oneMinus = Math.max(0, 1 - nDotV);
    return F0 + (1 - F0) * Math.pow(oneMinus, 5);
  }

  /**
   * Specular (sun) reflection: highlight where reflection of view aligns with sun.
   * Simplified: brighten where normal points toward sun. L = sun dir, N = normal.
   * factor = (N·L)^shininess when N·L > 0.
   */
  function sunReflectFactor(dHdx, dHdy, px, py, sunX, sunY) {
    const len = Math.sqrt(dHdx * dHdx + dHdy * dHdy + 1);
    const nx = -dHdx / len;
    const ny = -dHdy / len;
    const nz = 1 / len;
    let lx = sunX - px;
    let ly = sunY - py;
    const d = Math.sqrt(lx * lx + ly * ly) || 1;
    lx /= d;
    ly /= d;
    const nDotL = nx * lx + ny * ly + nz * 0; // sun in same plane, so nz part 0 for L in xy
    if (nDotL <= 0) return 0;
    return Math.pow(nDotL, SUN_SHININESS);
  }

  /**
   * Shore noise for organic surf line (optional, uses Utils.noise1D if present).
   */
  function shoreNoise(x, t, lowMotion) {
    if (typeof Utils === "undefined" || !Utils.noise1D) return 0;
    const slow = Utils.noise1D(6789, x * 0.012 + t * 0.15) * 9;
    const fast = Utils.noise1D(11111, x * 0.035 + t * 0.25) * 5;
    const scale = lowMotion ? 0.5 : 1;
    return slow * scale + fast * scale;
  }

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

  function draw(ctx, time, width, height, options) {
    options = options || {};
    const lowMotion = options.reducedMotion;
    const hourOfDay = options.hourOfDay != null ? options.hourOfDay : 12;
    const d = typeof Utils !== "undefined" && Utils.dayStrength ? Utils.dayStrength(hourOfDay) : 1;

    const horizonY =
      typeof Sky !== "undefined" && Sky.getHorizonY
        ? Sky.getHorizonY(height)
        : height * 0.55;
    const shoreYBase = height * shoreRatio;
    const oceanDepth = shoreYBase - horizonY;

    const surfOffset = surfAmplitude * Math.sin(time * surfFreq);

    let spectrum =
      typeof OceanDataLoader !== "undefined" && OceanDataLoader.getSpectrum
        ? OceanDataLoader.getSpectrum()
        : [];
    if (spectrum.length === 0) return;
    if (lowMotion) {
      spectrum = spectrum.map(function (w) {
        return {
          amplitude: w.amplitude * 0.4,
          wavelength: w.wavelength,
          speed: w.speed,
          direction: w.direction,
          phase: w.phase,
          steepness: w.steepness,
        };
      });
    }

    const sun = getSunPosition(width, horizonY, hourOfDay);

    // Shore line points: use analytic height + shore noise for natural surf
    function shoreYAt(x) {
      return OceanMath.shoreYAt(
        x,
        time,
        shoreYBase,
        surfOffset,
        spectrum,
        function (x, t) {
          return shoreNoise(x, t, lowMotion);
        }
      );
    }

    const step = lowMotion ? 5 : 1.8;
    const points = [];
    for (let x = 0; x <= width + step; x += step) {
      points.push({ x, y: shoreYAt(x) });
    }

    // —— Base water fill (gradient horizon → shore), blended by day strength ——
    const nightWater = ["#1a2835", "#243548", "#2d4560", "#354d65"];
    const dayWater = ["#2E5E7C", "#3D7A99", "#5BA3C0", "#7BB8CE"];
    const stops = [0, 0.35, 0.75, 1];
    const oceanGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    for (let i = 0; i < stops.length; i++) {
      const c = lerpColor(parseHex(nightWater[i]), parseHex(dayWater[i]), d);
      oceanGrad.addColorStop(stops[i], c);
    }
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(width, horizonY);
    for (let i = points.length - 1; i >= 0; i--) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fillStyle = oceanGrad;
    ctx.fill();

    // —— Sun reflection (Fresnel-style), fades in at dawn and out at dusk ——
    if (d > 0.02 && sun) {
      const refY = horizonY + oceanDepth * 0.4;
      const refX = sun.x;
      const r2 = oceanDepth * 0.9;
      const sunGrad = ctx.createRadialGradient(refX, refY, 0, refX, refY, r2);
      sunGrad.addColorStop(0, "rgba(255, 255, 240, " + 0.22 * d + ")");
      sunGrad.addColorStop(0.4, "rgba(255, 250, 220, " + 0.1 * d + ")");
      sunGrad.addColorStop(0.7, "rgba(255, 245, 200, " + 0.03 * d + ")");
      sunGrad.addColorStop(1, "rgba(255, 240, 200, 0)");
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, horizonY, width, oceanDepth);
    }

    // —— Rolling wave bands (lighter bands for depth variation), fade with day ——
    const numBands = lowMotion ? 3 : 5;
    if (d > 0.02) {
      ctx.globalAlpha = d;
      for (let b = 0; b < numBands; b++) {
        const yNorm = (b + 0.5) / numBands;
        const yCenter = horizonY + oceanDepth * yNorm;
        ctx.beginPath();
        let first = true;
        for (let x = 0; x <= width + 10; x += 6) {
          const h = OceanMath.analyticHeight(x, yCenter, time, spectrum);
          const y = yCenter + h;
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // —— Whitecaps / foam on crests across the ocean: soft blobs, fade with day ——
    if (!lowMotion && d > 0.02) {
      ctx.globalAlpha = d;
      const offshoreBands = 12;
      const offshoreStepX = 18;
      const seed = 40007;
      for (let b = 0; b < offshoreBands; b++) {
        const yNorm = 0.06 + (0.88 * (b + 0.5)) / offshoreBands;
        const yCenter = horizonY + oceanDepth * yNorm;
        for (let x = 4; x <= width + offshoreStepX; x += offshoreStepX) {
          const slope = OceanMath.analyticSlope(x, yCenter, time, spectrum);
          const slopeMag = Math.sqrt(slope.dHdx * slope.dHdx + slope.dHdy * slope.dHdy);
          if (slopeMag <= FOAM_OFFSHORE_THRESHOLD) continue;
          const h = OceanMath.analyticHeight(x, yCenter, time, spectrum);
          const y = yCenter + h;
          const u = seed + x * 0.073 + yCenter * 0.041 + b * 97;
          const jitterX = (hash(u) - 0.5) * 22;
          const jitterY = (hash(u + 1000) - 0.5) * 14;
          const px = x + jitterX;
          const py = y + jitterY;
          const crest = Math.min(0.65, (slopeMag - FOAM_OFFSHORE_THRESHOLD) / 1.8);
          const sizeVar = 0.55 + hash(u + 2000) * 0.9;
          const alphaVar = 0.7 + hash(u + 3000) * 0.5;
          const r = (2 + crest * 2.2) * sizeVar;
          const alpha = (0.12 + crest * 0.4) * alphaVar;
          const g = ctx.createRadialGradient(px, py, 0, px, py, r);
          g.addColorStop(0, "rgba(255, 255, 255, " + Math.min(0.5, alpha) + ")");
          g.addColorStop(0.5, "rgba(255, 255, 255, " + Math.min(0.25, alpha * 0.5) + ")");
          g.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    // —— Foam / crystalline highlights along crests (shore) ——
    // Crests: where slope magnitude is high (wave peak). We draw a bright stroke along the shore and add foam on top.
    function drawShorePath(pts, yOff) {
      if (pts.length < 2) return;
      const o = yOff || 0;
      ctx.moveTo(pts[0].x, pts[0].y + o);
      for (let i = 0; i < pts.length - 1; i++) {
        const cpx = (pts[i].x + pts[i + 1].x) / 2;
        const cpy = (pts[i].y + pts[i + 1].y) / 2 + o;
        ctx.quadraticCurveTo(cpx, cpy, pts[i + 1].x, pts[i + 1].y + o);
      }
    }

    ctx.beginPath();
    drawShorePath(points);
    ctx.lineWidth = 7;
    const sr = Math.round(180 + (255 - 180) * d);
    const sg = Math.round(195 + (255 - 195) * d);
    const sb = Math.round(220 + (255 - 220) * d);
    ctx.strokeStyle = "rgba(" + sr + "," + sg + "," + sb + "," + (0.35 + 0.33 * d) + ")";
    ctx.stroke();

    // Crystalline / foam highlights at wave crests (high slope => bright spots), fade with day
    if (!lowMotion && d > 0.02) {
      ctx.globalAlpha = d;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const slope = OceanMath.analyticSlope(p.x, p.y, time, spectrum);
        const slopeMag = Math.sqrt(slope.dHdx * slope.dHdx + slope.dHdy * slope.dHdy);
        if (slopeMag <= FOAM_CREST_THRESHOLD) continue;
        const crest = Math.min(0.7, (slopeMag - FOAM_CREST_THRESHOLD) / 1.5);
        const alpha = (0.35 + crest * 0.5) * d;
        const r = 2.2 + crest * 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + Math.min(0.92, alpha) + ")";
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    drawShorePath(points);
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y + 12);
    for (let i = points.length - 1; i >= 0; i--) {
      ctx.lineTo(points[i].x, points[i].y + 10);
    }
    ctx.closePath();
    const fr = Math.round(160 + (255 - 160) * d);
    const fg = Math.round(175 + (255 - 175) * d);
    const fb = Math.round(200 + (255 - 200) * d);
    ctx.fillStyle = "rgba(" + fr + "," + fg + "," + fb + "," + (0.12 + 0.16 * d) + ")";
    ctx.fill();
  }

  return { draw };
})();
