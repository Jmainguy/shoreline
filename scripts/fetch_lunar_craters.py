#!/usr/bin/env python3
"""
Fetch lunar craters from USGS Planetary Names (IAU Gazetteer) and emit JSON.
Usage: python3 fetch_lunar_craters.py [--min-diameter 20] [--limit 500]
Output: web/data/lunar-craters.json (lat, lon, diameter_km, name).
USGS CSV/TSV: https://planetarynames.wr.usgs.gov/Page/Website — use Advanced Search,
Target=Moon, Feature Type=Crater, then export or use the Shapefile/KML and convert.
This script attempts to fetch the search results and parse the table; fallback: use
a static list of well-known craters if the request fails.
"""
import argparse
import json
import re
import sys
try:
    from urllib.request import urlopen
    from urllib.parse import quote
except ImportError:
    from urllib2 import urlopen
    from urllib import quote

USGS_SEARCH = "https://planetarynames.wr.usgs.gov/SearchResults?Target=16_Moon&Feature%20Type=9_Crater%2C%20craters"
MOON_RADIUS_KM = 1737.4


def parse_dms(coord_str):
    """Parse DMS string like 43° 24' 48" S to decimal degrees. Returns (deg, sign)."""
    if not coord_str or not isinstance(coord_str, str):
        return None
    deg, sign = 0.0, 1
    m = re.search(r"(\d+)\s*°\s*(\d+)\s*'\s*([\d.]+)\s*\"\s*([NSEW])?", coord_str.strip())
    if m:
        d, mn, s, dir_ = int(m.group(1)), int(m.group(2)), float(m.group(3)), m.group(4)
        deg = d + mn / 60.0 + s / 3600.0
        if dir_ in ("S", "W"):
            sign = -1
        return sign * deg
    return None


def parse_decimal(s):
    """Parse a decimal number from string."""
    if s is None:
        return None
    s = str(s).strip().replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def fallback_craters():
    """Well-known IAU lunar craters (lat °N/S, lon °E). Diameter in km."""
    return [
        {"name": "Tycho", "lat": -43.31, "lon": 348.64, "diameter_km": 86},
        {"name": "Copernicus", "lat": 9.62, "lon": 339.92, "diameter_km": 93},
        {"name": "Kepler", "lat": -8.1, "lon": 322.0, "diameter_km": 32},
        {"name": "Clavius", "lat": -58.8, "lon": 345.9, "diameter_km": 225},
        {"name": "Ptolemaeus", "lat": -9.2, "lon": 358.1, "diameter_km": 154},
        {"name": "Plato", "lat": 51.6, "lon": 350.7, "diameter_km": 109},
        {"name": "Aristoteles", "lat": 50.2, "lon": 17.4, "diameter_km": 87},
        {"name": "Langrenus", "lat": -8.9, "lon": 60.9, "diameter_km": 132},
        {"name": "Theophilus", "lat": -11.4, "lon": 26.4, "diameter_km": 110},
        {"name": "Cyrillus", "lat": -13.2, "lon": 24.1, "diameter_km": 98},
        {"name": "Catharina", "lat": -18.0, "lon": 23.4, "diameter_km": 100},
        {"name": "Albategnius", "lat": -11.2, "lon": 4.0, "diameter_km": 129},
        {"name": "Hipparchus", "lat": -5.5, "lon": 4.8, "diameter_km": 150},
        {"name": "Arzachel", "lat": -18.6, "lon": 358.1, "diameter_km": 97},
        {"name": "Alphonsus", "lat": -13.4, "lon": 357.2, "diameter_km": 119},
        {"name": "Purbach", "lat": -25.5, "lon": 358.3, "diameter_km": 118},
        {"name": "Regiomontanus", "lat": -28.4, "lon": 358.3, "diameter_km": 126},
        {"name": "Walter", "lat": -33.0, "lon": 0.9, "diameter_km": 132},
        {"name": "Stöfler", "lat": -41.1, "lon": 6.0, "diameter_km": 126},
        {"name": "Maurolycus", "lat": -41.8, "lon": 14.0, "diameter_km": 114},
        {"name": "Longomontanus", "lat": -49.5, "lon": 21.8, "diameter_km": 145},
        {"name": "Maginus", "lat": -50.5, "lon": 6.3, "diameter_km": 163},
        {"name": "Moretus", "lat": -70.6, "lon": 5.5, "diameter_km": 114},
        {"name": "Grimaldi", "lat": -5.2, "lon": 291.4, "diameter_km": 222},
        {"name": "Riccioli", "lat": -3.0, "lon": 285.0, "diameter_km": 146},
        {"name": "Humboldt", "lat": -27.2, "lon": 80.9, "diameter_km": 207},
        {"name": "Janssen", "lat": -44.9, "lon": 41.4, "diameter_km": 190},
        {"name": "Furnerius", "lat": -36.3, "lon": 60.4, "diameter_km": 135},
        {"name": "Petavius", "lat": -25.3, "lon": 60.4, "diameter_km": 177},
        {"name": "Vendelinus", "lat": -16.4, "lon": 61.6, "diameter_km": 147},
        {"name": "Bessel", "lat": 21.8, "lon": 17.9, "diameter_km": 16},
        {"name": "Manilius", "lat": 14.5, "lon": 9.1, "diameter_km": 39},
        {"name": "Eratosthenes", "lat": 14.5, "lon": 348.7, "diameter_km": 58},
        {"name": "Archimedes", "lat": 29.7, "lon": 356.0, "diameter_km": 83},
        {"name": "Aristillus", "lat": 33.9, "lon": 1.2, "diameter_km": 55},
        {"name": "Autolycus", "lat": 30.7, "lon": 1.5, "diameter_km": 39},
        {"name": "Cassini", "lat": 40.2, "lon": 4.6, "diameter_km": 57},
        {"name": "Aristoteles", "lat": 50.2, "lon": 17.4, "diameter_km": 87},
        {"name": "Eudoxus", "lat": 44.3, "lon": 16.3, "diameter_km": 67},
        {"name": "Gauss", "lat": 36.0, "lon": 79.0, "diameter_km": 177},
        {"name": "Meton", "lat": 73.6, "lon": 19.1, "diameter_km": 130},
        {"name": "Anaxagoras", "lat": 73.4, "lon": 349.9, "diameter_km": 51},
        {"name": "Philolaus", "lat": 72.2, "lon": 32.4, "diameter_km": 70},
        {"name": "Anaximenes", "lat": 72.5, "lon": 44.5, "diameter_km": 80},
        {"name": "Pythagoras", "lat": 63.5, "lon": 292.9, "diameter_km": 130},
        {"name": "Babbage", "lat": 59.7, "lon": 302.1, "diameter_km": 143},
        {"name": "Marius", "lat": 11.9, "lon": 309.2, "diameter_km": 41},
        {"name": "Reiner", "lat": 7.0, "lon": 304.9, "diameter_km": 30},
        {"name": "Hainzel", "lat": -41.3, "lon": 326.5, "diameter_km": 70},
        {"name": "Schiller", "lat": -51.8, "lon": 320.0, "diameter_km": 179},
        {"name": "Schickard", "lat": -44.4, "lon": 304.6, "diameter_km": 227},
        {"name": "Wargentin", "lat": -49.6, "lon": 299.9, "diameter_km": 84},
        {"name": "Gassendi", "lat": -17.6, "lon": 320.1, "diameter_km": 110},
        {"name": "Letronne", "lat": -10.5, "lon": 317.5, "diameter_km": 119},
        {"name": "Billy", "lat": -13.8, "lon": 309.9, "diameter_km": 46},
        {"name": "Hansteen", "lat": -11.5, "lon": 304.2, "diameter_km": 45},
        {"name": "Mersenius", "lat": -21.5, "lon": 309.2, "diameter_km": 84},
        {"name": "Gassendi", "lat": -17.6, "lon": 320.1, "diameter_km": 110},
        {"name": "Bullialdus", "lat": -20.7, "lon": 337.9, "diameter_km": 61},
        {"name": "Hainzel A", "lat": -41.3, "lon": 326.5, "diameter_km": 53},
    ]


def fetch_and_parse(min_diameter_km=0, limit=500):
    """Try to fetch from USGS; on failure return fallback list."""
    try:
        req = urlopen(USGS_SEARCH, timeout=15)
        html = req.read().decode("utf-8", errors="replace")
    except Exception as e:
        sys.stderr.write("USGS fetch failed (%s), using fallback list.\n" % e)
        return fallback_craters()

    craters = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.DOTALL)
        if len(cells) < 6:
            continue
        name_cell = re.sub(r"<[^>]+>", "", cells[1]).strip()
        lat_cell = re.sub(r"<[^>]+>", "", cells[2]).strip()
        lon_cell = re.sub(r"<[^>]+>", "", cells[3]).strip()
        diam_cell = re.sub(r"<[^>]+>", "", cells[4]).strip()
        lat = parse_decimal(lat_cell) or parse_dms(lat_cell)
        lon = parse_decimal(lon_cell) or parse_dms(lon_cell)
        if lon is not None and lon < 0:
            lon += 360
        diam = parse_decimal(diam_cell)
        if name_cell and lat is not None and lon is not None and diam is not None and diam >= min_diameter_km:
            craters.append({"name": name_cell, "lat": lat, "lon": lon, "diameter_km": diam})
        if len(craters) >= limit:
            break
    if not craters:
        return fallback_craters()
    return craters


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-diameter", type=float, default=15, help="Min diameter km")
    ap.add_argument("--limit", type=int, default=400, help="Max craters")
    ap.add_argument("-o", "--output", default="web/data/lunar-craters.json")
    args = ap.parse_args()
    craters = fetch_and_parse(args.min_diameter, args.limit)
    dedup = {c["name"]: c for c in craters}
    out = list(dedup.values())
    with open(args.output, "w") as f:
        json.dump(out, f, indent=2)
    print("Wrote %d craters to %s" % (len(out), args.output))


if __name__ == "__main__":
    main()
