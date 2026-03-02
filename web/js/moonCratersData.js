/**
 * moonCratersData.js — USGS/IAU lunar crater data for the moon disc.
 *
 * Data: lat (planetocentric °N), lon (east longitude 0–360°), diameter_km, name.
 * Source: USGS Planetary Names (planetarynames.wr.usgs.gov) — Lunar Craters.
 * Load from web/data/lunar-craters.json (generated from USGS CSV/Shapefile or scripts/fetch_lunar_craters.py).
 *
 * Converts (lat, lon, diameter_km) to disc coords (nx, ny) and radius r in moon units
 * for orthographic projection: nx = cos(lat)*sin(lon), ny = -sin(lat); r = (diameter_km/2)/1737.4.
 */

const MoonCratersData = (function () {
  "use strict";

  const MOON_RADIUS_KM = 1737.4;
  const DEG = Math.PI / 180;

  /** Default: IAU/USGS named craters (lat °N, lon °E, diameter_km). Replaced by load() if available. */
  var DEFAULT_CRATERS = [
    { name: "Tycho", lat: -43.31, lon: 348.64, diameter_km: 86 },
    { name: "Copernicus", lat: 9.62, lon: 339.92, diameter_km: 93 },
    { name: "Kepler", lat: -8.1, lon: 322.0, diameter_km: 32 },
    { name: "Clavius", lat: -58.8, lon: 345.9, diameter_km: 225 },
    { name: "Ptolemaeus", lat: -9.2, lon: 358.1, diameter_km: 154 },
    { name: "Plato", lat: 51.6, lon: 350.7, diameter_km: 109 },
    { name: "Aristoteles", lat: 50.2, lon: 17.4, diameter_km: 87 },
    { name: "Langrenus", lat: -8.9, lon: 60.9, diameter_km: 132 },
    { name: "Theophilus", lat: -11.4, lon: 26.4, diameter_km: 110 },
    { name: "Cyrillus", lat: -13.2, lon: 24.1, diameter_km: 98 },
    { name: "Catharina", lat: -18.0, lon: 23.4, diameter_km: 100 },
    { name: "Albategnius", lat: -11.2, lon: 4.0, diameter_km: 129 },
    { name: "Hipparchus", lat: -5.5, lon: 4.8, diameter_km: 150 },
    { name: "Arzachel", lat: -18.6, lon: 358.1, diameter_km: 97 },
    { name: "Alphonsus", lat: -13.4, lon: 357.2, diameter_km: 119 },
    { name: "Purbach", lat: -25.5, lon: 358.3, diameter_km: 118 },
    { name: "Regiomontanus", lat: -28.4, lon: 358.3, diameter_km: 126 },
    { name: "Walter", lat: -33.0, lon: 0.9, diameter_km: 132 },
    { name: "Stöfler", lat: -41.1, lon: 6.0, diameter_km: 126 },
    { name: "Maurolycus", lat: -41.8, lon: 14.0, diameter_km: 114 },
    { name: "Longomontanus", lat: -49.5, lon: 21.8, diameter_km: 145 },
    { name: "Maginus", lat: -50.5, lon: 6.3, diameter_km: 163 },
    { name: "Moretus", lat: -70.6, lon: 5.5, diameter_km: 114 },
    { name: "Grimaldi", lat: -5.2, lon: 291.4, diameter_km: 222 },
    { name: "Riccioli", lat: -3.0, lon: 285.0, diameter_km: 146 },
    { name: "Humboldt", lat: -27.2, lon: 80.9, diameter_km: 207 },
    { name: "Janssen", lat: -44.9, lon: 41.4, diameter_km: 190 },
    { name: "Furnerius", lat: -36.3, lon: 60.4, diameter_km: 135 },
    { name: "Petavius", lat: -25.3, lon: 60.4, diameter_km: 177 },
    { name: "Vendelinus", lat: -16.4, lon: 61.6, diameter_km: 147 },
    { name: "Bessel", lat: 21.8, lon: 17.9, diameter_km: 16 },
    { name: "Manilius", lat: 14.5, lon: 9.1, diameter_km: 39 },
    { name: "Eratosthenes", lat: 14.5, lon: 348.7, diameter_km: 58 },
    { name: "Archimedes", lat: 29.7, lon: 356.0, diameter_km: 83 },
    { name: "Aristillus", lat: 33.9, lon: 1.2, diameter_km: 55 },
    { name: "Autolycus", lat: 30.7, lon: 1.5, diameter_km: 39 },
    { name: "Cassini", lat: 40.2, lon: 4.6, diameter_km: 57 },
    { name: "Eudoxus", lat: 44.3, lon: 16.3, diameter_km: 67 },
    { name: "Gauss", lat: 36.0, lon: 79.0, diameter_km: 177 },
    { name: "Meton", lat: 73.6, lon: 19.1, diameter_km: 130 },
    { name: "Anaxagoras", lat: 73.4, lon: 349.9, diameter_km: 51 },
    { name: "Philolaus", lat: 72.2, lon: 32.4, diameter_km: 70 },
    { name: "Anaximenes", lat: 72.5, lon: 44.5, diameter_km: 80 },
    { name: "Pythagoras", lat: 63.5, lon: 292.9, diameter_km: 130 },
    { name: "Babbage", lat: 59.7, lon: 302.1, diameter_km: 143 },
    { name: "Marius", lat: 11.9, lon: 309.2, diameter_km: 41 },
    { name: "Reiner", lat: 7.0, lon: 304.9, diameter_km: 30 },
    { name: "Hainzel", lat: -41.3, lon: 326.5, diameter_km: 70 },
    { name: "Schiller", lat: -51.8, lon: 320.0, diameter_km: 179 },
    { name: "Schickard", lat: -44.4, lon: 304.6, diameter_km: 227 },
    { name: "Wargentin", lat: -49.6, lon: 299.9, diameter_km: 84 },
    { name: "Gassendi", lat: -17.6, lon: 320.1, diameter_km: 110 },
    { name: "Letronne", lat: -10.5, lon: 317.5, diameter_km: 119 },
    { name: "Billy", lat: -13.8, lon: 309.9, diameter_km: 46 },
    { name: "Hansteen", lat: -11.5, lon: 304.2, diameter_km: 45 },
    { name: "Mersenius", lat: -21.5, lon: 309.2, diameter_km: 84 },
    { name: "Bullialdus", lat: -20.7, lon: 337.9, diameter_km: 61 },
  ];

  /** Craters in disc coords: { nx, ny, r, name }. Filled from DEFAULT_CRATERS or load(). */
  var cratersDisc = [];

  /**
   * Convert one crater from (lat, lon, diameter_km) to (nx, ny, r) on unit disc.
   * Orthographic projection (view from Earth): nx = cos(lat)*sin(lon), ny = -sin(lat).
   * Only include if center is on near side (nx² + ny² <= 1).
   */
  function toDisc(c) {
    const lat = c.lat * DEG;
    const lon = c.lon * DEG;
    const nx = Math.cos(lat) * Math.sin(lon);
    const ny = -Math.sin(lat);
    if (nx * nx + ny * ny > 1.01) return null;
    const r = (c.diameter_km / 2) / MOON_RADIUS_KM;
    if (r <= 0) return null;
    return { nx, ny, r, name: c.name || "" };
  }

  /**
   * Build disc coords from raw crater list. Sorts by radius (largest first) for draw order.
   */
  function buildFromRaw(raw) {
    cratersDisc = raw
      .map(toDisc)
      .filter(Boolean)
      .sort(function (a, b) {
        return b.r - a.r;
      });
  }

  /**
   * Load craters from URL (e.g. /data/lunar-craters.json). Returns Promise.
   */
  function load(url) {
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Moon craters load failed: " + res.status);
        return res.json();
      })
      .then(function (arr) {
        if (Array.isArray(arr)) buildFromRaw(arr);
        return cratersDisc;
      });
  }

  /**
   * Set craters from an array of { lat, lon, diameter_km, name } (e.g. after loading elsewhere).
   */
  function setCraters(raw) {
    if (Array.isArray(raw)) buildFromRaw(raw);
  }

  /**
   * Get craters in disc coords for drawing. Returns array of { nx, ny, r, name }.
   */
  function getCraters() {
    return cratersDisc;
  }

  buildFromRaw(DEFAULT_CRATERS);

  return {
    load,
    setCraters,
    getCraters,
    toDisc,
    MOON_RADIUS_KM,
  };
})();
