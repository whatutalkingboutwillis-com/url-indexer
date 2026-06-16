// /api/submit.js
// Submits URLs to Sinbyte indexing API
// Sinbyte uses its own crawling network to get URLs indexed faster

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { urls } = req.body || {};
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Please provide at least one URL' });
  }

  // Validate URLs
  const validUrls = urls.filter(u => /^https?:\/\/.+/.test(u.trim()));
  if (validUrls.length === 0) {
    return res.status(400).json({ error: 'No valid URLs found (must start with http:// or https://)' });
  }

  const apiKey = process.env.SINBYTE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'SINBYTE_API_KEY not configured in environment variables' });
  }

  try {
    const payload = {
      apikey: apiKey,
      type: 'quick',
      method: 'tools',
      name: `Batch ${new Date().toISOString()}`,
      dripfeed: 1,
      urls: validUrls
    };

    const response = await fetch('https://app.sinbyte.com/api/indexing/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.message || data.error || 'Sinbyte API error',
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      submitted: validUrls.length,
      sinbyte: data
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to connect to Sinbyte API'
    });
  }
};
