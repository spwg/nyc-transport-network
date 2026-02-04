import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data', 'raw');
const CACHE_FILE = path.join(DATA_DIR, 'ridership.json');

export interface StationRidership {
  stationComplexId: string;
  stationName: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  totalRidership: number;
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

export async function downloadRidership(): Promise<StationRidership[]> {
  // Check cache (refresh if older than 7 days)
  if (fs.existsSync(CACHE_FILE)) {
    const stats = fs.statSync(CACHE_FILE);
    const ageMs = Date.now() - stats.mtimeMs;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (ageMs < sevenDays) {
      console.log('Using cached ridership data');
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
  }

  console.log('Downloading ridership data from data.ny.gov...');

  // MTA Subway Hourly Ridership (2022-2024 dataset: wujg-7c2s)
  // Aggregate total ridership per station complex
  const baseUrl = 'https://data.ny.gov/resource/wujg-7c2s.json';
  const query = [
    '$select=station_complex_id,station_complex,latitude,longitude,sum(ridership) as total_ridership',
    '$where=transit_mode=\'subway\'',
    '$group=station_complex_id,station_complex,latitude,longitude',
    '$order=total_ridership DESC',
    '$limit=1000',
  ].join('&');

  const url = `${baseUrl}?${query}`;
  const response = await httpsGet(url);
  const rawData = JSON.parse(response) as Array<{
    station_complex_id: string;
    station_complex: string;
    latitude: string;
    longitude: string;
    total_ridership: string;
  }>;

  const rawRows = rawData
    .filter((r) => r.latitude && r.longitude && r.total_ridership)
    .map((r) => ({
      stationComplexId: r.station_complex_id,
      stationName: r.station_complex,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      totalRidership: parseFloat(r.total_ridership),
    }));

  // Aggregate by station_complex_id — the API returns multiple rows per complex
  // (one per entrance/exit point) which need to be combined
  const complexMap = new Map<
    string,
    { stationName: string; coordinates: Array<{ latitude: number; longitude: number }>; totalRidership: number }
  >();

  for (const row of rawRows) {
    const existing = complexMap.get(row.stationComplexId);
    if (existing) {
      existing.totalRidership += row.totalRidership;
      existing.coordinates.push({ latitude: row.latitude, longitude: row.longitude });
    } else {
      complexMap.set(row.stationComplexId, {
        stationName: row.stationName,
        coordinates: [{ latitude: row.latitude, longitude: row.longitude }],
        totalRidership: row.totalRidership,
      });
    }
  }

  const stations: StationRidership[] = Array.from(complexMap.entries()).map(([complexId, data]) => ({
    stationComplexId: complexId,
    stationName: data.stationName,
    coordinates: data.coordinates,
    totalRidership: data.totalRidership,
  }));

  console.log(`Downloaded ridership for ${stations.length} station complexes (from ${rawRows.length} rows)`);

  // Cache the result
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(stations, null, 2));

  return stations;
}

// Match ridership data to GTFS stations by geographic proximity.
// Iterates GTFS stations and finds the nearest Socrata complex entrance,
// assigning the full complex ridership to each matched station.
export function matchRidershipToStations(
  ridership: StationRidership[],
  stations: Array<{ id: string; name: string; latitude: number; longitude: number }>,
): Map<string, { annualRidership: number; dailyRidership: number }> {
  const result = new Map<string, { annualRidership: number; dailyRidership: number }>();

  // The ridership data from Socrata is cumulative over the dataset's time span
  // Approximate as ~3 years of data (2022-2024), derive annual from total
  const YEARS_IN_DATASET = 3;
  const MAX_DISTANCE_DEG = 0.003; // ~300m at NYC latitude

  for (const station of stations) {
    let bestComplex: StationRidership | null = null;
    let bestDistance = Infinity;

    for (const complex of ridership) {
      for (const coord of complex.coordinates) {
        const dLat = station.latitude - coord.latitude;
        const dLon = station.longitude - coord.longitude;
        const distance = Math.sqrt(dLat * dLat + dLon * dLon);

        if (distance < MAX_DISTANCE_DEG && distance < bestDistance) {
          bestDistance = distance;
          bestComplex = complex;
        }
      }
    }

    if (bestComplex) {
      const annualRidership = Math.round(bestComplex.totalRidership / YEARS_IN_DATASET);
      const dailyRidership = Math.round(annualRidership / 365);
      result.set(station.id, { annualRidership, dailyRidership });
    }
  }

  console.log(`Matched ridership to ${result.size} / ${stations.length} GTFS stations`);
  return result;
}

if (require.main === module) {
  downloadRidership()
    .then((data) => console.log(`\nDownloaded ${data.length} stations`))
    .catch((err) => {
      console.error('Download failed:', err);
      process.exit(1);
    });
}
