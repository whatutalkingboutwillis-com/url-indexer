// /api/submit.js
// Independent indexing tool - no third party credits needed
// Uses multiple free methods to trigger fast crawling

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

  const validUrls = urls.filter(u => /^https?:\/\/.+/.test(u.trim())).slice(0, 50);
  if (validUrls.length === 0) {
    return res.status(400).json({ error: 'No valid URLs found' });
  }

  const results = [];

  for (const url of validUrls) {
    const urlResults = await processUrl(url);
    results.push({ url, ...urlResults });
  }

  return res.status(200).json({
    success: true,
    submitted: validUrls.length,
    results
  });
};

async function processUrl(url) {
  const methods = await Promise.allSettled([
    pingIndexNow(url),
    pingBingSitemap(url),
    pingGoogleSitemap(url),
    pingWeblogUpdates(url),
    pingRPC(url),
    fetchTrigger(url),
  ]);

  const passed = methods.filter(m => m.status === 'fulfilled' && m.value?.ok).length;

  return {
    success: true,
    signals_sent: passed,
    total_methods: methods.length
  };
}

// 1. IndexNow - Bing, Yandex, Seznam instantly crawl
async function pingIndexNow(url) {
  const key = process.env.INDEXNOW_KEY || 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
  const host = new URL(url).host;
  const r = await fetch(
    `https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${key}&host=${host}`,
    { signal: AbortSignal.timeout(8000) }
  );
  return { ok: r.status < 400, method: 'IndexNow', status: r.status };
}

// 2. Bing sitemap ping
async function pingBingSitemap(url) {
  const host = new URL(url).origin;
  const sitemap = `${host}/sitemap.xml`;
  const r = await fetch(
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
    { signal: AbortSignal.timeout(8000) }
  );
  return { ok: r.status < 400, method: 'Bing Sitemap Ping', status: r.status };
}

// 3. Google sitemap ping
async function pingGoogleSitemap(url) {
  const host = new URL(url).origin;
  const sitemap = `${host}/sitemap.xml`;
  const r = await fetch(
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
    { signal: AbortSignal.timeout(8000) }
  );
  return { ok: r.status < 400, method: 'Google Sitemap Ping', status: r.status };
}

// 4. Ping-o-matic / weblog updates (classic blog ping)
async function pingWeblogUpdates(url) {
  const host = new URL(url).host;
  const xml = `<?xml version="1.0"?><methodCall><methodName>weblogUpdates.extendedPing</methodName><params>
    <param><value>${host}</value></param>
    <param><value>${url}</value></param>
    <param><value>${url}</value></param>
    <param><value>${new URL(url).origin}/sitemap.xml</value></param>
  </params></methodCall>`;
  const r = await fetch('https://rpc.pingomatic.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: xml,
    signal: AbortSignal.timeout(8000)
  });
  return { ok: r.status < 400, method: 'Ping-o-matic', status: r.status };
}

// 5. XML-RPC blog ping (Weblogs.com style)
async function pingRPC(url) {
  const host = new URL(url).host;
  const xml = `<?xml version="1.0"?><methodCall><methodName>weblogUpdates.ping</methodName><params>
    <param><value><string>${host}</string></value></param>
    <param><value><string>${url}</string></value></param>
  </params></methodCall>`;
  const r = await fetch('https://rpc.weblogs.com/RPC2', {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: xml,
    signal: AbortSignal.timeout(8000)
  });
  return { ok: r.status < 400, method: 'Weblogs RPC', status: r.status };
}

// 6. Fetch trigger - requests the URL itself (simulates a crawl hit)
async function fetchTrigger(url) {
  const r = await fetch(url, {
    method: 'HEAD',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    signal: AbortSignal.timeout(8000)
  });
  return { ok: r.status < 400, method: 'Crawl Trigger', status: r.status };
}
