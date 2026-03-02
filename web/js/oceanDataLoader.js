/**
 * oceanDataLoader.js — Wave spectrum / buoy-style input for ocean rendering.
 *
 * Provides wave component data for OceanMath: amplitude, wavelength, direction,
 * optional speed and phase, and Gerstner steepness. Can be extended to load
 * from JSON (e.g. spectral or buoy data); default is an in-memory spectrum.
 */

const OceanDataLoader = (function () {
  "use strict";

  // Default spectrum: multiple components for superposition (analytic + Gerstner).
  // direction: radians, 0 = +x (right), π/2 = +y (toward shore / down in screen).
  // wavelength: world units (pixels); amplitude: world units (pixels).
  // steepness: 0 = sine, 1 = sharp crests (Gerstner).
  var defaultSpectrum = [
    { amplitude: 10, wavelength: 180, direction: Math.PI / 2, steepness: 0.4, phase: 0 },
    { amplitude: 6, wavelength: 120, direction: Math.PI / 2 + 0.2, steepness: 0.35, phase: 0.5 },
    { amplitude: 4, wavelength: 80, direction: Math.PI / 2 - 0.15, steepness: 0.3, phase: 1 },
    { amplitude: 8, wavelength: 220, direction: Math.PI / 2, steepness: 0.25, phase: 0.2 },
    { amplitude: 3, wavelength: 55, direction: Math.PI / 2 + 0.4, steepness: 0.2, phase: 0 },
  ];

  /**
   * Get the current wave spectrum (array of wave components).
   * Returns a copy so callers don't mutate the shared config.
   */
  function getSpectrum() {
    return defaultSpectrum.map(function (w) {
      return {
        amplitude: w.amplitude,
        wavelength: w.wavelength,
        speed: w.speed,
        direction: w.direction,
        phase: w.phase != null ? w.phase : 0,
        steepness: w.steepness != null ? w.steepness : 0.5,
      };
    });
  }

  /**
   * Optionally load spectrum from URL (JSON array). Resolves with spectrum array.
   * If load fails or is not called, getSpectrum() still returns defaultSpectrum.
   */
  function loadSpectrum(url) {
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Spectrum load failed: " + res.status);
        return res.json();
      })
      .then(function (arr) {
        if (Array.isArray(arr)) defaultSpectrum = arr;
        return getSpectrum();
      });
  }

  /**
   * Set default spectrum programmatically (e.g. after loading).
   */
  function setSpectrum(spectrum) {
    if (Array.isArray(spectrum)) defaultSpectrum = spectrum;
  }

  return {
    getSpectrum,
    loadSpectrum,
    setSpectrum,
  };
})();
