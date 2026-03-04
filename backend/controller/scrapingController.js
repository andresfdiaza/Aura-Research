const scrapingService = require('../service/scrapingService');

exports.ejecutar = async (req, res) => {
  try {
    const result = await scrapingService.executeScraping();
    // optionally log stdout/stderr
    console.log('Scraping output:', result.stdout);
    if (result.stderr) console.error('Scraping stderr:', result.stderr);

    res.json({ success: true, message: 'Scraping ejecutado correctamente' });
  } catch (err) {
    console.error('Error en scraping:', err);
    res.status(500).json({ success: false, message: 'Error ejecutando scraping', error: err.message });
  }
};

exports.ejecutarGroupLab = async (req, res) => {
  try {
    const result = await scrapingService.executeScrapingGroupLab();
    // optionally log stdout/stderr
    console.log('GroupLab Scraping output:', result.stdout);
    if (result.stderr) console.error('GroupLab Scraping stderr:', result.stderr);

    res.json({ success: true, message: 'Scraping GroupLab ejecutado correctamente' });
  } catch (err) {
    console.error('Error en scraping GroupLab:', err);
    res.status(500).json({ success: false, message: 'Error ejecutando scraping GroupLab', error: err.message });
  }
};
