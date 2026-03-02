/**
 * oceanMath.js — Wave calculations for the beach screensaver.
 *
 * Implements:
 * 1) Analytic waves: superposition of multiple sine waves (height field).
 * 2) Gerstner waves: elliptical particle motion for realistic rolling water.
 *
 * All math is time-dependent (parameter t in seconds) for smooth animation.
 * Coordinate system: x = horizontal (screen), y = vertical (horizon at top, shore below).
 * Wave height is positive upward (reduces y in screen coords).
 *
 * Projection / camera: 2D orthographic; world coords = screen coords (no transform).
 */

const OceanMath = (function () {
  "use strict";

  // —— Wave equations (deep-water approximation) ——
  // Dispersion: ω² = g·k  =>  ω = sqrt(g·k),  k = 2π/λ.
  // Phase velocity: c = ω/k = sqrt(g/k). So given wavelength λ, k = 2π/λ, ω = sqrt(9.81 * k).
  const G = 9.81;

  /**
   * Angular frequency from wavelength (rad/s).
   * ω = sqrt(g·k),  k = 2π/λ.
   */
  function angularFreqFromWavelength(wavelength) {
    const k = (2 * Math.PI) / Math.max(wavelength, 1);
    return Math.sqrt(G * k);
  }

  /**
   * Wave number from wavelength. k = 2π/λ.
   */
  function waveNumber(wavelength) {
    return (2 * Math.PI) / Math.max(wavelength, 1);
  }

  // —— Analytic waves: superposition of sine waves ——
  //
  // Height at (x, y) and time t:
  //   H(x,y,t) = Σ_i  A_i · sin( k_i · (dir_i · (x,y)) - ω_i·t + φ_i )
  //
  // With direction vector D_i = (dx, dy), phase at a point is:
  //   phase_i = k_i * (dx_i*x + dy_i*y) - ω_i*t + φ_i
  //
  // So we sum: H = Σ A_i * sin(phase_i).

  /**
   * Analytic height: sum of N sine components at world (x, y) and time t.
   * spectrum: array of { amplitude, wavelength, speed (optional), direction (radians, 0=right), phase (optional) }.
   * direction in radians: 0 = +x, π/2 = +y (toward shore in our coords).
   */
  function analyticHeight(x, y, t, spectrum) {
    let h = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const w = spectrum[i];
      const k = waveNumber(w.wavelength);
      const omega = w.speed != null ? (2 * Math.PI * w.speed) / w.wavelength : angularFreqFromWavelength(w.wavelength);
      const dx = Math.cos(w.direction);
      const dy = Math.sin(w.direction);
      const phase = k * (dx * x + dy * y) - omega * t + (w.phase || 0);
      h += w.amplitude * Math.sin(phase);
    }
    return h;
  }

  /**
   * Analytic slope (dH/dx, dH/dy) for normal / Fresnel.
   * d/dx sin(phase) = cos(phase) * k * dx,  d/dy sin(phase) = cos(phase) * k * dy.
   */
  function analyticSlope(x, y, t, spectrum) {
    let dHdx = 0;
    let dHdy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const w = spectrum[i];
      const k = waveNumber(w.wavelength);
      const omega = w.speed != null ? (2 * Math.PI * w.speed) / w.wavelength : angularFreqFromWavelength(w.wavelength);
      const dx = Math.cos(w.direction);
      const dy = Math.sin(w.direction);
      const phase = k * (dx * x + dy * y) - omega * t + (w.phase || 0);
      const cosP = Math.cos(phase);
      dHdx += w.amplitude * cosP * k * dx;
      dHdy += w.amplitude * cosP * k * dy;
    }
    return { dHdx, dHdy };
  }

  // —— Gerstner waves: elliptical particle motion ——
  //
  // A particle that at rest is at (x0, y0) moves to:
  //   x = x0 - Σ Q_i·A_i·Dx_i·sin( k_i·(D_i·(x0,y0)) - ω_i·t + φ_i )
  //   y = y0 - Σ Q_i·A_i·Dy_i·sin( ... )
  //   z = Σ A_i·cos( ... )   (height)
  //
  // Q_i = steepness (0 = pure sine, 1 = sharp crests). We use Q in [0,1].
  // To get surface height at screen position (x, y), we need to invert: find (x0,y0) such that
  // the displaced position is (x,y), then z is the height. Inversion is iterative for multiple
  // waves. Simpler approach: use the same phase as at (x,y) for height (first-order):
  //   height(x,y,t) ≈ Σ A_i·cos(phase_i(x,y,t))  (same as analytic for height)
  // and for normal we use the analytic slope from the same superposition, which gives
  // a consistent look. Full Gerstner displacement is used for sampling points along
  // the surface (e.g. shore line) so the water edge rolls correctly.
  //
  // Displacement of a point that was at (x0, y0):
  //   disp_x = - Σ Q_i·A_i·Dx_i·sin(phase_i(x0,y0,t))
  //   disp_y = - Σ Q_i·A_i·Dy_i·sin(phase_i(x0,y0,t))
  // So current position: (x0 + disp_x, y0 + disp_y), height = Σ A_i·cos(phase_i(x0,y0,t)).
  // To get surface at screen (x,y): we approximate by using (x,y) as (x0,y0) for phase
  // (first-order), so height = analyticHeight(x,y,t). For the wavy shore we compute
  // displaced y for each x by iterating or by using analytic height + slope for drawing.

  /**
   * Gerstner displacement at rest position (x0, y0), time t.
  * Returns { x, y, height } in world coords (height = vertical offset, + up).
   */
  function gerstnerDisplacement(x0, y0, t, spectrum) {
    let dispX = 0;
    let dispY = 0;
    let height = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const w = spectrum[i];
      const Q = Math.min(1, Math.max(0, w.steepness != null ? w.steepness : 0.5));
      const k = waveNumber(w.wavelength);
      const omega = w.speed != null ? (2 * Math.PI * w.speed) / w.wavelength : angularFreqFromWavelength(w.wavelength);
      const dx = Math.cos(w.direction);
      const dy = Math.sin(w.direction);
      const phase = k * (dx * x0 + dy * y0) - omega * t + (w.phase || 0);
      const sinP = Math.sin(phase);
      const cosP = Math.cos(phase);
      dispX -= Q * w.amplitude * dx * sinP;
      dispY -= Q * w.amplitude * dy * sinP;
      height += w.amplitude * cosP;
    }
    return {
      x: x0 + dispX,
      y: y0 + dispY,
      height: height,
    };
  }

  /**
   * Surface height at world (x, y), time t, using analytic superposition.
   * (Same as analyticHeight; alias for clarity in renderer.)
   */
  function surfaceHeight(x, y, t, spectrum) {
    return analyticHeight(x, y, t, spectrum);
  }

  /**
   * Normal vector (unnormalized) from slope: N = (-dH/dx, -dH/dy, 1).
   * Returns { nx, ny, nz } with nz = 1 for flat water.
   */
  function surfaceNormal(x, y, t, spectrum) {
    const { dHdx, dHdy } = analyticSlope(x, y, t, spectrum);
    return { nx: -dHdx, ny: -dHdy, nz: 1 };
  }

  /**
   * Shore line in screen space: for each x, find y where baseY + height = surface.
   * We use Gerstner height at (x, y) with y varying; baseY is the calm water line.
   * Approximate: y_shore(x) = baseY + surfInOut + analyticHeight(x, baseY, t, spectrum)
   * plus optional extra shore noise. So we don't need to invert Gerstner.
   */
  function shoreYAt(x, t, baseY, surfOffset, spectrum, shoreNoise) {
    const h = analyticHeight(x, baseY, t, spectrum);
    const noise = typeof shoreNoise === "function" ? shoreNoise(x, t) : 0;
    return baseY + surfOffset + h + noise;
  }

  return {
    angularFreqFromWavelength,
    waveNumber,
    analyticHeight,
    analyticSlope,
    gerstnerDisplacement,
    surfaceHeight,
    surfaceNormal,
    shoreYAt,
  };
})();
