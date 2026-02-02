import * as path from 'path';
import { downloadFile, DATA_DIR, ensureDir } from './mta';

// PATH GTFS feed from Transitland / community sources
// The official PATH feed is available through NJ Transit portal or community mirrors
const PATH_GTFS_URL = 'https://www.panynj.gov/path/en/schedules/google-transit.zip';

export async function downloadPATHGTFS(): Promise<string> {
  ensureDir(DATA_DIR);

  const destPath = path.join(DATA_DIR, 'path.zip');
  await downloadFile(PATH_GTFS_URL, destPath);
  return destPath;
}

// Run directly if this file is executed
if (require.main === module) {
  downloadPATHGTFS()
    .then((filePath) => console.log(`\nPATH GTFS downloaded to: ${filePath}`))
    .catch((err) => {
      console.error('Download failed:', err);
      process.exit(1);
    });
}
