#!/usr/bin/env npx ts-node

import * as path from 'path';
import * as fs from 'fs';
import { downloadMTAFeed, downloadFile, DATA_DIR, ensureDir } from './download/mta';
import { parseGTFS, writeSystemData, SystemData } from './parse/gtfs-parser';

// Resolve paths relative to the project root (parent of scripts folder)
const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'data', 'systems');

// System definitions with download URLs
interface SystemDefinition {
  id: string;
  downloadFn: () => Promise<string>;
  optional?: boolean; // If true, failures won't stop the build
}

const SYSTEMS: SystemDefinition[] = [
  {
    id: 'subway',
    downloadFn: () => downloadMTAFeed('subway'),
  },
  {
    id: 'lirr',
    downloadFn: () => downloadMTAFeed('lirr'),
  },
  {
    id: 'metro-north',
    downloadFn: () => downloadMTAFeed('metro-north'),
  },
  {
    id: 'path',
    downloadFn: async () => {
      ensureDir(DATA_DIR);
      const destPath = path.join(DATA_DIR, 'path.zip');
      // PATH GTFS from Transitland archive
      await downloadFile('https://github.com/transitland/gtfs-archives-not-hosted-elsewhere/raw/master/path-nj-us.zip', destPath);
      return destPath;
    },
  },
  {
    id: 'nyc-ferry',
    downloadFn: async () => {
      ensureDir(DATA_DIR);
      const destPath = path.join(DATA_DIR, 'nyc-ferry.zip');
      await downloadFile('http://nycferry.connexionz.net/rtt/public/utility/gtfs.aspx', destPath);
      return destPath;
    },
    optional: true, // NYC Ferry GTFS can be unreliable
  },
  {
    id: 'nj-transit-rail',
    downloadFn: async () => {
      ensureDir(DATA_DIR);
      const destPath = path.join(DATA_DIR, 'nj-transit-rail.zip');
      // NJ Transit Rail GTFS from official NJ Transit site
      await downloadFile(
        'https://www.njtransit.com/rail_data.zip',
        destPath
      );
      return destPath;
    },
    optional: false,
  },
  {
    id: 'staten-island-ferry',
    downloadFn: async () => {
      ensureDir(DATA_DIR);
      const destPath = path.join(DATA_DIR, 'staten-island-ferry.zip');
      // Staten Island Ferry GTFS from NYC Open Data (dataset b57i-ri22)
      await downloadFile(
        'https://data.cityofnewyork.us/api/views/b57i-ri22/files/data?accessType=DOWNLOAD&filename=Staten_Island_Ferry_GTFS.zip',
        destPath
      );
      return destPath;
    },
    optional: true,
  },
];

async function processSystem(system: SystemDefinition): Promise<SystemData | null> {
  const zipPath = path.join(DATA_DIR, `${system.id}.zip`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${system.id.toUpperCase()}`);
  console.log('='.repeat(60));

  try {
    // Download if not exists
    if (!fs.existsSync(zipPath)) {
      console.log(`Downloading ${system.id} GTFS...`);
      await system.downloadFn();
    } else {
      console.log(`Using cached: ${zipPath}`);
    }

    // Parse GTFS
    console.log(`Parsing ${system.id} GTFS...`);
    const data = await parseGTFS(zipPath, system.id);

    // Write output
    console.log(`Writing ${system.id} data...`);
    await writeSystemData(data, OUTPUT_DIR);

    return data;
  } catch (error) {
    console.error(`Error processing ${system.id}:`, error);
    if (!system.optional) {
      throw error;
    }
    console.log(`Skipping ${system.id} (optional system)`);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('NYC Transit Network - Data Build Pipeline');
  console.log('='.repeat(60));
  console.log(`Output directory: ${OUTPUT_DIR}`);

  const results: Map<string, SystemData> = new Map();
  const errors: string[] = [];

  // Process each system
  for (const system of SYSTEMS) {
    try {
      const data = await processSystem(system);
      if (data) {
        results.set(system.id, data);
      }
    } catch (error) {
      errors.push(`${system.id}: ${error}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('BUILD COMPLETE');
  console.log('='.repeat(60));
  console.log('\nSystems processed:');

  let totalRoutes = 0;
  let totalStations = 0;
  let totalGeometries = 0;

  results.forEach((data, systemId) => {
    console.log(`  ${systemId}:`);
    console.log(`    Routes: ${data.routes.length}`);
    console.log(`    Stations: ${data.stations.length}`);
    console.log(`    Geometries: ${data.routeGeometries.length}`);
    totalRoutes += data.routes.length;
    totalStations += data.stations.length;
    totalGeometries += data.routeGeometries.length;
  });

  console.log('\nTotals:');
  console.log(`  Routes: ${totalRoutes}`);
  console.log(`  Stations: ${totalStations}`);
  console.log(`  Route geometries: ${totalGeometries}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach((err) => console.log(`  - ${err}`));
  }

  console.log('\n' + '='.repeat(60));
}

// Allow running individual systems via command line
const args = process.argv.slice(2);
if (args.length > 0 && args[0] !== '--all') {
  // Process specific system(s)
  const systemIds = args;
  const filteredSystems = SYSTEMS.filter((s) => systemIds.includes(s.id));

  if (filteredSystems.length === 0) {
    console.error(`Unknown system(s): ${systemIds.join(', ')}`);
    console.log(`Available: ${SYSTEMS.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }

  Promise.all(filteredSystems.map(processSystem))
    .then(() => console.log('\nDone!'))
    .catch((err) => {
      console.error('Build failed:', err);
      process.exit(1);
    });
} else {
  main().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}
