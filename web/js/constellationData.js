/**
 * Beach night sky: use full Hipparcos 6.5 catalog if loaded (hipparcos_6.5_concise.js),
 * otherwise fallback to a small subset. RA/Dec in degrees for drawing.
 * hipparcos_catalog format: [hip, mag, ra, dec, bv]. If 0 < ra < 1 we treat ra as radians and convert to degrees.
 */
var HIP_STARS = [
  { hip: 54061, ra: 165.93, dec: 61.75, mag: 1.79 },
  { hip: 53910, ra: 165.46, dec: 56.38, mag: 2.37 },
  { hip: 58001, ra: 178.30, dec: 53.69, mag: 2.44 },
  { hip: 59774, ra: 183.86, dec: 57.03, mag: 3.32 },
  { hip: 62956, ra: 193.51, dec: 55.96, mag: 1.77 },
  { hip: 65378, ra: 200.98, dec: 54.93, mag: 2.23 },
  { hip: 67301, ra: 206.89, dec: 49.31, mag: 1.86 },
  { hip: 27989, ra: 88.79, dec: 7.41, mag: 0.50 },
  { hip: 25930, ra: 83.00, dec: -0.30, mag: 2.25 },
  { hip: 26311, ra: 84.05, dec: -1.20, mag: 1.69 },
  { hip: 26727, ra: 85.19, dec: -1.94, mag: 1.77 },
  { hip: 24436, ra: 78.63, dec: -8.20, mag: 0.13 },
  { hip: 27366, ra: 86.94, dec: 9.73, mag: 1.64 },
  { hip: 25336, ra: 81.28, dec: 6.35, mag: 1.70 },
  { hip: 22449, ra: 72.46, dec: 6.96, mag: 2.07 },
  { hip: 746, ra: 2.54, dec: 59.15, mag: 2.28 },
  { hip: 3179, ra: 10.13, dec: 56.54, mag: 2.24 },
  { hip: 4427, ra: 14.18, dec: 60.72, mag: 2.47 },
  { hip: 6686, ra: 21.45, dec: 60.24, mag: 2.66 },
  { hip: 11767, ra: 37.95, dec: 89.26, mag: 1.98 },
];

if (typeof hipparcos_catalog !== 'undefined' && hipparcos_catalog.length > 0) {
  HIP_STARS = hipparcos_catalog.map(function (r) {
    var ra = r[2];
    var dec = r[3];
    if (ra > 0 && ra < 1) {
      ra = ra * (180 / Math.PI);
    }
    return { hip: r[0], mag: r[1], ra: ra, dec: dec };
  });
}
