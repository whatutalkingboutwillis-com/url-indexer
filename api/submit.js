// /api/submit.js
// This endpoint:
// 1. Receives a user-submitted URL
// 2. Stores it so it can be linked from a "carrier" page on this same domain
// 3. Calls the Google Indexing API to notify Google about the carrier page
//
// IMPORTANT: The Google Indexing API can only directly notify Google about
// URLs on a domain YOU have verified in Search Console (this Vercel domain).
// For the USER's submitted URL to get discovered, it must be linked from a
// page on this verified domain (the "carrier" page) — Googlebot follows that
// link when it (re)crawls the carrier page.
//
// This does NOT guarantee instant indexing of the user's URL. It maximizes
// the chance of a faster crawl by:
//   (a) directly pinging Google about OUR carrier page update (fast, ~minutes-hours)
//   (b) the carrier page contains a real <a href> link to the user's URL
//   (c) also firing an IndexNow ping for Bing/Yandex

const { JWT } = require('google-auth-library');

// In-memory store for demo purposes. Replace with a real database
// (e.g. Vercel KV, Supabase, MongoDB) for production / persistence
// across serverless cold starts.
global.submittedUrls = global.submittedUrls || [];

const SCOPES = ['https://www.googleapis.com/auth/indexing'];

async function notifyGoogle(carrierUrl) {
  // Load service account credentials from environment variable.
  // Set GOOGLE_SERVICE_ACCOUNT_JSON in Vercel project settings
  // (paste the entire JSON key file content as a single-line string).
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES,
  });

  const url = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
  const res = await client.request({
    url,
    method: 'POST',
    data: {
      url: carrierUrl,
      type: 'URL_UPDATED',
    },
  });

  return res.data;
}

async function pingIndexNow(url, key) {
  try {
    const host = new URL(url).host;
    const indexNowUrl = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${key}`;
    await fetch(indexNowUrl);
  } catch (e) {
    // non-fatal
  }
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body || {};
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'Valid URL required (must start with http:// or https://)' });
  }

  // Generate a simple ID for the carrier page entry
  const id = Math.random().toString(36).substring(2, 10);
  const submittedAt = new Date().toISOString();

  global.submittedUrls.unshift({ id, url, submittedAt });
  // Keep only last 200 entries (in-memory limit)
  global.submittedUrls = global.submittedUrls.slice(0, 200);

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const carrierUrl = `${protocol}://${host}/carrier/${id}`;

  let googleResult = null;
  let googleError = null;

  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      googleResult = await notifyGoogle(carrierUrl);
    } else {
      googleError = 'GOOGLE_SERVICE_ACCOUNT_JSON not configured';
    }
  } catch (err) {
    googleError = err.message || String(err);
  }

  // Also ping IndexNow for the carrier URL (Bing/Yandex)
  if (process.env.INDEXNOW_KEY) {
    await pingIndexNow(carrierUrl, process.env.INDEXNOW_KEY);
  }

  return res.status(200).json({
    success: !googleError,
    submittedUrl: url,
    carrierUrl,
    carrierId: id,
    google: googleResult ? { status: 'notified', result: googleResult } : { status: 'error', error: googleError },
    note: 'This requests Google to crawl the carrier page (on this verified domain), which links to your URL. It does not guarantee instant indexing of your URL.'
  });
};
