# Lunar crater data (USGS / IAU)

The moon uses **USGS Planetary Names** (IAU Gazetteer) data for crater positions and sizes.

- **Schema:** `{ "name": string, "lat": number, "lon": number, "diameter_km": number }`
  - `lat`: planetocentric latitude °N (negative = south)
  - `lon`: east longitude 0–360°
  - `diameter_km`: diameter in km

## Sources

- **USGS Planetary Names:** https://planetarynames.wr.usgs.gov  
  - Target: Moon → Feature type: Crater, craters  
  - GIS downloads (Shapefile/KML): https://planetarynames.wr.usgs.gov/GIS_Downloads → Moon (LOLA 2011)
- **CSV/TSV:** Use Advanced Search (Moon, Craters), then export or use the table.

## Files

- **lunar-craters.json** — ~280 IAU-style named craters (lat, lon, diameter_km, name). Built by `scripts/build_lunar_craters_json.py`. Re-run the script or replace with a full USGS export to change the set.

## Build script

From the repo root:

```bash
python3 scripts/fetch_lunar_craters.py -o web/data/lunar-craters.json
```

Options: `--min-diameter 20` (km), `--limit 400`. If the USGS search request fails, the script writes a fallback list of well-known craters.
