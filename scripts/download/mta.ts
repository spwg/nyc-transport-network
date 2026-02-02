import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';

// Resolve paths relative to the project root (parent of scripts folder)
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data', 'raw', 'gtfs');

// MTA GTFS feed URLs
const MTA_FEEDS = {
  subway: 'http://web.mta.info/developers/data/nyct/subway/google_transit.zip',
  lirr: 'http://web.mta.info/developers/data/lirr/google_transit.zip',
  'metro-north': 'http://web.mta.info/developers/data/mnr/google_transit.zip',
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    console.log(`To: ${dest}`);

    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        let redirectUrl = response.headers.location;
        if (redirectUrl) {
          // Handle relative redirects by resolving against the original URL
          if (redirectUrl.startsWith('/')) {
            const urlObj = new URL(url);
            redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
          }
          console.log(`Redirecting to: ${redirectUrl}`);
          file.close();
          fs.unlinkSync(dest);
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode}: Failed to download ${url}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${dest}`);
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(err);
    });
  });
}

export async function downloadMTAFeed(system: keyof typeof MTA_FEEDS): Promise<string> {
  ensureDir(DATA_DIR);

  const url = MTA_FEEDS[system];
  if (!url) {
    throw new Error(`Unknown MTA feed: ${system}`);
  }

  const destPath = path.join(DATA_DIR, `${system}.zip`);
  await downloadFile(url, destPath);
  return destPath;
}

export async function downloadMTASubwayGTFS(): Promise<string> {
  return downloadMTAFeed('subway');
}

export async function downloadLIRRGTFS(): Promise<string> {
  return downloadMTAFeed('lirr');
}

export async function downloadMetroNorthGTFS(): Promise<string> {
  return downloadMTAFeed('metro-north');
}

export { DATA_DIR, ensureDir };

// Run directly if this file is executed
if (require.main === module) {
  const system = process.argv[2] as keyof typeof MTA_FEEDS || 'subway';
  downloadMTAFeed(system)
    .then((filePath) => console.log(`\n${system} GTFS downloaded to: ${filePath}`))
    .catch((err) => {
      console.error('Download failed:', err);
      process.exit(1);
    });
}
