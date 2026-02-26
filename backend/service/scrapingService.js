const { exec } = require('child_process');
const path = require('path');
const repo = require('../repository/investigadorRepository');

// run python scraping logic. the real processing lives in scraping_cvlac_completo.py
exports.executeScraping = async () => {
  // ensure the scraping table exists and has necessary columns
  await repo.ensureScrapingTable();

  // mark all investigators with a link as pending so they will be processed
  await repo.markAllPending();

  return new Promise((resolve, reject) => {
    // execute the comprehensive script which already handles URL fetching,
    // table cleanup and database inserts. the previous `scraping.py` was just
    // a stub, so we call the file that contains the full scraping logic.
    // the scraping scripts live at workspace root in the `Scraping` folder, so
    // go up two levels from backend/service
    const scriptPath = path.resolve(__dirname, '..', '..', 'Scraping', 'scraping_cvlac_completo.py');
    // set environment variables so Python uses UTF-8 for I/O (prevents
    // UnicodeEncodeError when printing emojis on Windows)
    const env = Object.assign({}, process.env, {
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1'
    });
    exec(`python "${scriptPath}"`, { env, maxBuffer: 1024 * 500 }, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
};
