// /api/carrier.js
// Serves a dynamic "carrier" page for a given submission ID.
// This page contains a real <a href> link to the user's submitted URL.
// When Google crawls THIS page (because we notified the Indexing API
// about it), it discovers the link and may follow it to the user's URL.
//
// Rewritten from /carrier/:id -> /api/carrier (see vercel.json)

global.submittedUrls = global.submittedUrls || [];

module.exports = async (req, res) => {
  // Extract the id from the original path (Vercel passes it via query when using rewrites
  // only if we set up a dynamic route; with a simple rewrite we parse from req.url)
  const urlParts = req.url.split('/').filter(Boolean);
  const id = req.query.id || urlParts[urlParts.length - 1];

  const entry = global.submittedUrls.find((e) => e.id === id);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!entry) {
    res.statusCode = 404;
    return res.end(`<!DOCTYPE html><html><head><title>Not Found</title></head>
<body><h1>Submission not found</h1><p>This carrier page ID does not exist or has expired.</p></body></html>`);
  }

  // Basic HTML page with a genuine link to the submitted URL.
  // Includes basic metadata so the page itself looks like real content
  // (helps avoid the carrier page being treated as spam/empty).
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recently Submitted Resource #${entry.id}</title>
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}/carrier/${entry.id}">
</head>
<body>
  <main style="font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; line-height: 1.6;">
    <h1>Recently Indexed Resource</h1>
    <p>This page references a recently submitted web resource:</p>
    <p>
      <a href="${entry.url}" rel="noopener">${entry.url}</a>
    </p>
    <p><small>Submitted: ${entry.submittedAt}</small></p>
  </main>
</body>
</html>`;

  return res.end(html);
};
