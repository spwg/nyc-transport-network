import * as path from 'path';
import { downloadFile, DATA_DIR, ensureDir } from './mta';

// Ferry GTFS feed URLs
const FERRY_FEEDS = {
  'nyc-ferry': 'http://nycferry.connexionz.net/rtt/public/utility/gtfs.aspx',
  'staten-island-ferry': 'https://data.cityofnewyork.us/api/views/tq99-7esp/files/6e1bfa16-2b9d-41d0-99ac-cee0a2c0bf4d?download=true&filename=Staten_Island_Ferry_GTFS.zip',
};

export async function downloadNYCFerryGTFS(): Promise<string> {
  ensureDir(DATA_DIR);

  const destPath = path.join(DATA_DIR, 'nyc-ferry.zip');
  await downloadFile(FERRY_FEEDS['nyc-ferry'], destPath);
  return destPath;
}

export async function downloadStatenIslandFerryGTFS(): Promise<string> {
  ensureDir(DATA_DIR);

  const destPath = path.join(DATA_DIR, 'staten-island-ferry.zip');
  await downloadFile(FERRY_FEEDS['staten-island-ferry'], destPath);
  return destPath;
}

export async function downloadAllFerryGTFS(): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  try {
    const nycFerryPath = await downloadNYCFerryGTFS();
    results.set('nyc-ferry', nycFerryPath);
  } catch (err) {
    console.error('Failed to download NYC Ferry GTFS:', err);
  }

  try {
    const siFerryPath = await downloadStatenIslandFerryGTFS();
    results.set('staten-island-ferry', siFerryPath);
  } catch (err) {
    console.error('Failed to download Staten Island Ferry GTFS:', err);
  }

  return results;
}

// Run directly if this file is executed
if (require.main === module) {
  downloadAllFerryGTFS()
    .then((paths) => {
      console.log('\nFerry GTFS downloads:');
      paths.forEach((filePath, system) => {
        console.log(`  ${system}: ${filePath}`);
      });
    })
    .catch((err) => {
      console.error('Download failed:', err);
      process.exit(1);
    });
}
