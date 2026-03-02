// Sky: day/night cycle. Sun arc, sunrise/sunset pinks, moon + stars at night.
const Sky = (function () {
  const horizonRatio = 0.55;
  // Twilight: extended windows so sun/moon/stars crossfade smoothly (no hard cutoffs)
  const DAWN_START = 4.2;   // night → dawn
  const DAWN_END = 7.2;     // dawn → full day
  const DUSK_START = 16.5;  // day → dusk
  const DUSK_END = 19.8;    // dusk → night
  const SUN_VISIBLE_START = 5.4;
  const SUN_VISIBLE_END = 18.6;

  /**
   * Smoothstep: smooth S-curve between 0 and 1 for x in [a,b]. Avoids jarring linear cuts.
   * s(x) = 0 for x<=a, 1 for x>=b, else 3t² - 2t³ with t = (x-a)/(b-a).
   */
  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Day strength: 1 at midday, 0 in deep night, smooth during twilight (dawn/dusk).
   */
  function dayStrength(hour) {
    if (hour >= DAWN_END && hour <= DUSK_START) return 1;
    if (hour >= DUSK_END || hour < DAWN_START) return 0;
    if (hour < DAWN_END) return smoothstep(DAWN_START, DAWN_END, hour);
    return 1 - smoothstep(DUSK_START, DUSK_END, hour);
  }

  /**
   * Night strength: 1 in deep night, 0 at full day, smooth during twilight (stars/moon fade).
   */
  function nightStrength(hour) {
    return 1 - dayStrength(hour);
  }

  /**
   * Sun visibility: smooth fade in at sunrise, smooth fade out at sunset (no pop).
   */
  function sunStrength(hour) {
    if (hour >= SUN_VISIBLE_END || hour < SUN_VISIBLE_START) return 0;
    const rise = smoothstep(SUN_VISIBLE_START, SUN_VISIBLE_START + 0.5, hour);
    const set = 1 - smoothstep(SUN_VISIBLE_END - 0.5, SUN_VISIBLE_END, hour);
    return Math.min(rise, set);
  }

  /**
   * Moon visibility: present during night, smooth fade during twilight (no pop).
   */
  function moonStrength(hour) {
    return nightStrength(hour);
  }

  /**
   * Sun altitude factor: 0 at horizon, 1 at zenith. For atmospheric extinction and size.
   * sunAngle: 0 = rise, π/2 = noon, π = set. Altitude ∝ sin(sunAngle).
   */
  function sunAltitudeFactor(sunAngle) {
    return Math.sin(sunAngle);
  }

  function hash(n) {
    n = (n >>> 0) * 1103515245 + 12345;
    return ((n >>> 16) & 0x7fff) / 32767;
  }

  /**
   * Draw craters on the moon using USGS/IAU lunar crater data (MoonCratersData).
   * Lit by sun direction (phaseAngle). Use smooth blend at terminator (no hard dot > 0)
   * so craters don't pop as phase changes.
   */
  function drawMoonCraters(ctx, moonX, moonY, moonR, phaseAngle, lowMotion) {
    const craters = typeof MoonCratersData !== 'undefined' && MoonCratersData.getCraters ? MoonCratersData.getCraters() : [];
    if (lowMotion || craters.length === 0) return;
    const sunX = Math.cos(phaseAngle);
    const sunY = Math.sin(phaseAngle);
    ctx.save();
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.clip();
    const terminatorWidth = 0.25;
    for (let i = 0; i < craters.length; i++) {
      const c = craters[i];
      const cx = moonX + c.nx * moonR;
      const cy = moonY + c.ny * moonR;
      const cr = c.r * moonR;
      if (cr < 0.8) continue;
      const dot = c.nx * sunX + c.ny * sunY;
      const lit = smoothstep(-terminatorWidth, terminatorWidth, dot);
      const alpha = 0.18 + (0.85 - 0.18) * lit;
      const floorR = Math.round(60 + 20 * lit);
      const floorG = Math.round(65 + 20 * lit);
      const floorB = Math.round(90 + 20 * lit);
      const rimR = Math.round(140 + 80 * lit);
      const rimG = Math.round(150 + 75 * lit);
      const rimB = Math.round(180 + 65 * lit);
      const rimBright = 0.08 + 0.32 * (0.6 + 0.4 * Math.max(-1, Math.min(1, dot))) * lit;
      const floor = 'rgba(' + floorR + ',' + floorG + ',' + floorB + ',' + alpha + ')';
      const rim = 'rgba(' + rimR + ',' + rimG + ',' + rimB + ',' + rimBright + ')';
      const g = ctx.createRadialGradient(cx, cy, cr * 0.3, cx, cy, cr);
      g.addColorStop(0, floor);
      g.addColorStop(0.6, floor);
      g.addColorStop(0.92, rim);
      g.addColorStop(1, rim);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
      if (cr >= 2 && lit > 0.02) {
        const sunAngle = Math.atan2(sunY, sunX);
        const rimAlpha = 0.35 * lit;
        ctx.strokeStyle = 'rgba(255, 252, 255, ' + rimAlpha + ')';
        ctx.lineWidth = Math.max(0.6, cr * 0.08);
        ctx.beginPath();
        ctx.arc(cx, cy, cr, sunAngle - Math.PI * 0.35, sunAngle + Math.PI * 0.35);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Fallback: fixed positions if real data/astro math not available
  const FALLBACK_STARS = [
    [0.18, 0.10], [0.24, 0.18], [0.32, 0.16], [0.28, 0.08], [0.24, 0.22], [0.16, 0.30], [0.10, 0.38],
    [0.44, 0.30], [0.56, 0.30], [0.44, 0.42], [0.50, 0.40], [0.56, 0.42], [0.46, 0.52], [0.54, 0.52],
    [0.72, 0.16], [0.78, 0.28], [0.84, 0.18], [0.90, 0.28], [0.96, 0.14],
    [0.08, 0.06], [0.06, 0.14], [0.04, 0.22], [0.06, 0.30], [0.14, 0.28], [0.20, 0.30], [0.24, 0.24],
  ];

  function magnitudeToRadius(mag) {
    const r = 1.4 * Math.pow(10, -mag / 5);
    return Math.max(0.5, Math.min(4, r));
  }

  /**
   * Real star positions: observer lat/lon, date from hourOfDay (15-min cycle = 24h).
   * RA/Dec → Alt/Az via sidereal time; project to sky rect (az→x, alt→y).
   * JD uses fractional seconds so LST advances smoothly (no jump).
   */
  function drawRealStars(ctx, time, width, horizonY, hourOfDay, lowMotion) {
    if (typeof AstroMath === 'undefined' || typeof HIP_STARS === 'undefined' || !HIP_STARS.length) return false;
    const OBS_LAT = 35;
    const OBS_LON = -79;
    const msFromMidnight = hourOfDay * 3600 * 1000;
    const date = new Date(Date.UTC(2025, 0, 15, 0, 0, 0, 0) + msFromMidnight);
    const JD = AstroMath.dateToJD(date);
    const lstDeg = AstroMath.lstDegrees(JD, OBS_LON);

    const twinkle = (i) => (lowMotion ? 0.9 : 0.55 + 0.45 * (Math.sin(time * 1.2 + i * 1.7) * 0.5 + 0.5));
    HIP_STARS.forEach(function (star, i) {
      const aa = AstroMath.raDecToAltAz(star.ra, star.dec, OBS_LAT, lstDeg);
      if (aa.alt <= 0) return;
      const x = (aa.az / 360) * width;
      const y = horizonY * (1 - aa.alt / 90);
      const size = magnitudeToRadius(star.mag);
      const alpha = twinkle(i);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (alpha * 0.95) + ')';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    });
    return true;
  }

  function drawFallbackStars(ctx, time, width, horizonY, lowMotion) {
    const twinkle = (i) => (lowMotion ? 0.9 : 0.55 + 0.45 * (Math.sin(time * 1.2 + i * 1.7) * 0.5 + 0.5));
    FALLBACK_STARS.forEach(function (s, i) {
      const px = s[0] * width;
      const py = s[1] * horizonY;
      const size = 1.2 + hash(i * 11) * 0.6;
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (twinkle(i) * 0.95) + ')';
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function draw(ctx, time, width, height, options) {
    options = options || {};
    const hourOfDay = options.hourOfDay != null ? options.hourOfDay : 12;
    const horizonY = height * horizonRatio;
    const lowMotion = options.reducedMotion;

    const dayStr = dayStrength(hourOfDay);
    const nightStr = nightStrength(hourOfDay);

    // ---- Sky gradient: smooth blend night → dawn → day → dusk → night (no hard cuts) ----
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    const nightZenith = '#0a0e1a', nightMid = '#1a1f35', nightHorizon = '#252d45';
    const dayZenith = '#87CEEB', dayMid = '#B0E0E6', dayHorizon = '#F4D4A0';
    const dawnZenith = '#1a1525', dawnMid = '#3d2840', dawnHorizon = '#8b5a6b';
    const duskZenith = '#2a1a30', duskMid = '#4a3040', duskHorizon = '#c96878';
    function skyZenith(h) {
      if (h <= 0.5) return blend(nightZenith, dawnZenith, h * 2);
      return blend(dawnZenith, dayZenith, (h - 0.5) * 2);
    }
    function skyMid(h) {
      if (h <= 0.5) return blend(nightMid, dawnMid, h * 2);
      return blend(dawnMid, dayMid, (h - 0.5) * 2);
    }
    function skyHorizon(h) {
      if (h <= 0.5) return blend(nightHorizon, dawnHorizon, h * 2);
      return blend(dawnHorizon, dayHorizon, (h - 0.5) * 2);
    }
    const isDusk = hourOfDay >= DUSK_START && hourOfDay <= DUSK_END;
    const duskT = isDusk ? (hourOfDay - DUSK_START) / (DUSK_END - DUSK_START) : 0;
    function duskBlend(dayC, duskC, nightC) {
      if (duskT <= 0.5) return blend(dayC, duskC, duskT * 2);
      return blend(duskC, nightC, (duskT - 0.5) * 2);
    }
    let c0 = isDusk ? duskBlend(dayZenith, duskZenith, nightZenith) : skyZenith(dayStr);
    let c1 = isDusk ? duskBlend(dayMid, duskMid, nightMid) : skyMid(dayStr);
    let c2 = isDusk ? duskBlend(dayHorizon, duskHorizon, nightHorizon) : skyHorizon(dayStr);
    const sunAngleForScatter = ((hourOfDay - 6) / 12) * Math.PI;
    const sunAlt = Math.sin(sunAngleForScatter);
    const rayleighBlue = 0.12 * Math.max(0, sunAlt) * dayStr;
    if (rayleighBlue > 0.005) {
      c0 = blend(c0, '#5a7aa0', rayleighBlue);
      c1 = blend(c1, '#6a8ab0', rayleighBlue * 0.7);
    }
    skyGrad.addColorStop(0, c0);
    skyGrad.addColorStop(0.4, c1);
    skyGrad.addColorStop(0.85, c2);
    skyGrad.addColorStop(1, c2);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizonY);

    const mieHaze = 0.06 + 0.04 * (1 - sunAlt) * dayStr;
    const hazeGrad = ctx.createLinearGradient(0, horizonY, 0, 0);
    hazeGrad.addColorStop(0, 'rgba(240, 245, 255, ' + mieHaze + ')');
    hazeGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, 0, width, horizonY);

    const starAlpha = nightStrength(hourOfDay);
    if (starAlpha > 0.002) {
      ctx.globalAlpha = starAlpha;
      if (!drawRealStars(ctx, time, width, horizonY, hourOfDay, lowMotion)) {
        drawFallbackStars(ctx, time, width, horizonY, lowMotion);
      }
      ctx.globalAlpha = 1;
    }

    // ---- Moon: phase (terminator), earthshine, smooth visibility during twilight ----
    const moonVis = moonStrength(hourOfDay);
    if (moonVis > 0.002) {
      const moonHour = (hourOfDay + 6) % 24;
      const moonAngle = (moonHour / 12) * Math.PI;
      const centerX = width / 2;
      const radiusX = width * 0.42;
      const radiusY = horizonY * 0.55;
      const moonX = centerX - radiusX * Math.cos(moonAngle);
      const moonY = horizonY - radiusY * Math.sin(moonAngle);
      const moonR = Math.min(width, height) * 0.06;

      ctx.globalAlpha = moonVis;
      // Phase: 0 = new, 0.5 = full. Tied to hourOfDay so phase advances smoothly through the 24h cycle.
      const phase = (hourOfDay / 24) % 1;
      const phaseAngle = phase * Math.PI * 2;

      const moonGlow = ctx.createRadialGradient(
        moonX, moonY, 0,
        moonX, moonY, moonR * 2.5
      );
      moonGlow.addColorStop(0, 'rgba(240, 245, 255, 0.5)');
      moonGlow.addColorStop(0.4, 'rgba(220, 228, 255, 0.15)');
      moonGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Earthshine: subtle glow on dark side (dark side lit by Earth)
      ctx.fillStyle = 'rgba(200, 210, 230, 0.12)';
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();

      // Lit disc: clip by terminator (ellipse at phase angle)
      ctx.save();
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.clip();
      const cosP = Math.cos(phaseAngle);
      const terminatorX = moonX + moonR * 1.2 * cosP;
      const terminatorGrad = ctx.createLinearGradient(
        terminatorX - moonR * 2, moonY,
        terminatorX + moonR * 2, moonY
      );
      const lit = 0.5 + 0.5 * cosP;
      terminatorGrad.addColorStop(0, 'rgba(245, 248, 255, 0.95)');
      terminatorGrad.addColorStop(Math.max(0, 0.5 - lit * 0.5), 'rgba(245, 248, 255, 0.95)');
      terminatorGrad.addColorStop(0.5 + (1 - lit) * 0.5, 'rgba(220, 225, 240, 0.25)');
      terminatorGrad.addColorStop(1, 'rgba(180, 190, 220, 0.08)');
      ctx.fillStyle = terminatorGrad;
      ctx.fillRect(moonX - moonR * 2, moonY - moonR, moonR * 4, moonR * 2);
      drawMoonCraters(ctx, moonX, moonY, moonR, phaseAngle, lowMotion);
      ctx.restore();

      ctx.strokeStyle = 'rgba(200, 210, 230, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ---- Sun: limb darkening, atmospheric extinction near horizon, smooth fade at rise/set ----
    const sunVis = sunStrength(hourOfDay);
    if (sunVis > 0.002) {
      const sunAngle = ((hourOfDay - 6) / 12) * Math.PI;
      const centerX = width / 2;
      const radiusX = width * 0.42;
      const radiusY = horizonY * 0.6;
      const sunCenterX = centerX - radiusX * Math.cos(sunAngle);
      const sunCenterY = horizonY - radiusY * Math.sin(sunAngle);
      const baseRadius = Math.min(width, height) * 0.18;

      const alt = sunAltitudeFactor(sunAngle);
      const extinction = 0.35 + 0.65 * alt;
      const warmth = 0.7 + 0.3 * alt;
      const sunRadius = baseRadius * (0.92 + 0.08 * alt);

      ctx.globalAlpha = sunVis * extinction;

      const sunGrad = ctx.createRadialGradient(
        sunCenterX, sunCenterY, 0,
        sunCenterX, sunCenterY, sunRadius
      );
      const r = Math.round(255);
      const g = Math.round(252 * warmth);
      const b = Math.round(200 * warmth);
      sunGrad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ', 0.98)');
      sunGrad.addColorStop(0.3, 'rgba(255, ' + Math.round(240 * warmth) + ', ' + Math.round(180 * warmth) + ', 0.9)');
      sunGrad.addColorStop(0.6, 'rgba(255, ' + Math.round(220 * warmth) + ', ' + Math.round(140 * warmth) + ', 0.5)');
      sunGrad.addColorStop(0.85, 'rgba(255, ' + Math.round(180 * warmth) + ', ' + Math.round(100 * warmth) + ', 0.12)');
      sunGrad.addColorStop(1, 'rgba(255, 160, 80, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunCenterX, sunCenterY, sunRadius, 0, Math.PI * 2);
      ctx.fill();

      if (!lowMotion) {
        const flareAlpha = (1 - alt) * 0.12 + 0.04;
        const flareGrad = ctx.createRadialGradient(
          sunCenterX - sunRadius * 0.8, sunCenterY - sunRadius * 0.3, 0,
          sunCenterX + sunRadius * 1.2, sunCenterY, sunRadius * 1.5
        );
        flareGrad.addColorStop(0, 'rgba(255, 200, 180, 0)');
        flareGrad.addColorStop(0.4, 'rgba(255, 180, 150, ' + flareAlpha + ')');
        flareGrad.addColorStop(0.7, 'rgba(255, 160, 130, 0.02)');
        flareGrad.addColorStop(1, 'rgba(255, 140, 100, 0)');
        ctx.fillStyle = flareGrad;
        ctx.fillRect(sunCenterX - sunRadius * 2, 0, sunRadius * 4, horizonY);
      }
      ctx.globalAlpha = 1;
    }
  }

  function parseColor(c) {
    if (typeof c !== 'string') return { r: 0, g: 0, b: 0 };
    if (c.startsWith('rgb')) {
      const m = c.match(/\d+/g);
      return m && m.length >= 3 ? { r: +m[0], g: +m[1], b: +m[2] } : { r: 0, g: 0, b: 0 };
    }
    return {
      r: parseInt(c.slice(1, 3), 16) || 0,
      g: parseInt(c.slice(3, 5), 16) || 0,
      b: parseInt(c.slice(5, 7), 16) || 0,
    };
  }
  function blend(hex1, hex2, t) {
    const a = parseColor(hex1);
    const b = parseColor(hex2);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return 'rgb(' + Math.max(0, Math.min(255, r)) + ',' + Math.max(0, Math.min(255, g)) + ',' + Math.max(0, Math.min(255, bl)) + ')';
  }

  function getHorizonY(height) {
    return height * horizonRatio;
  }

  return { draw, getHorizonY };
})();
