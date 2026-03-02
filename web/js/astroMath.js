/**
 * Minimal astro math for beach screensaver: JD, GMST, LST, RA/Dec → Alt/Az.
 * All angles in degrees. RA 0–360, Dec -90–90. Observer lat/lon, time in UTC.
 */
const AstroMath = (function () {
  "use strict";

  function dateToJulianDate(year, month, day, hour, minute, second) {
    if (month <= 2) {
      year -= 1;
      month += 12;
    }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return (
      Math.floor(365.25 * (year + 4716)) +
      Math.floor(30.6001 * (month + 1)) +
      day +
      B -
      1524.5 +
      (hour + minute / 60 + second / 3600) / 24
    );
  }

  function dateToJD(date) {
    const sec = date.getUTCSeconds() + date.getUTCMilliseconds() / 1000;
    return dateToJulianDate(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      sec
    );
  }

  function gmstDegrees(JD) {
    const T = (JD - 2451545.0) / 36525;
    const gmst =
      280.46061837 +
      360.98564736629 * (JD - 2451545.0) +
      0.000387933 * T * T -
      (T * T * T) / 38710000;
    return ((gmst % 360) + 360) % 360;
  }

  function lstDegrees(JD, longitudeDeg) {
    const lst = gmstDegrees(JD) + longitudeDeg;
    return ((lst % 360) + 360) % 360;
  }

  function raDecToAltAz(raDeg, decDeg, latitudeDeg, lstDeg) {
    const DEG = Math.PI / 180;
    const lat = latitudeDeg * DEG;
    const dec = decDeg * DEG;
    const H = (lstDeg - raDeg) * DEG;
    const sinDec = Math.sin(dec);
    const cosDec = Math.cos(dec);
    const sinLat = Math.sin(lat);
    const cosLat = Math.cos(lat);
    const sinH = Math.sin(H);
    const cosH = Math.cos(H);
    const sinAlt = sinDec * sinLat + cosDec * cosLat * cosH;
    const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    const cosAlt = Math.cos(altRad);
    let azRad = 0;
    if (cosAlt >= 1e-8) {
      const sinAz = (-cosDec * sinH) / cosAlt;
      const cosAz = (sinDec * cosLat - cosDec * sinLat * cosH) / cosAlt;
      azRad = Math.atan2(sinAz, cosAz);
    }
    return {
      alt: altRad / DEG,
      az: ((azRad / DEG) + 360) % 360,
    };
  }

  return { dateToJD, gmstDegrees, lstDegrees, raDecToAltAz };
})();
