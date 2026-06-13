# Instant URL Indexer — Deployment Guide

## What this project does
- Frontend (`/public/index.html`) lets users submit a URL.
- Backend (`/api/submit.js`) creates a "carrier page" on YOUR Vercel domain
  that links to the submitted URL, then notifies Google's Indexing API
  about that carrier page (so Googlebot re-crawls it quickly).
- Also pings IndexNow (Bing/Yandex) for the carrier page.

**This does NOT guarantee instant Google indexing of the submitted URL.**
It speeds up *discovery* by giving Google a fresh, linked page to crawl on a
domain you control. Final indexing decisions are entirely up to Google.

---

## Step 1 — Push this folder to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/url-indexer.git
git push -u origin main
```

## Step 2 — Deploy to Vercel

1. Go to vercel.com → "Add New Project" → Import the GitHub repo
2. Framework preset: "Other" (no build step needed)
3. Click Deploy

You'll get a URL like `https://url-indexer-xyz.vercel.app`

## Step 3 — Verify domain in Google Search Console

1. Go to search.google.com/search-console
2. Add property: `https://url-indexer-xyz.vercel.app` (URL prefix method)
3. Verify using the HTML tag method:
   - Google gives you a meta tag like:
     `<meta name="google-site-verification" content="XXXXX" />`
   - Add this to `/public/index.html` inside `<head>`
   - Redeploy, then click "Verify" in Search Console

## Step 4 — Set up Google Cloud + Indexing API

1. console.cloud.google.com → New Project
2. APIs & Services → Library → Enable "Web Search Indexing API"
3. APIs & Services → Credentials → Create Credentials → Service Account
4. Open the service account → Keys → Add Key → Create new key → JSON
   (downloads a `.json` file — keep it secret)
5. Copy the `client_email` from that JSON file
6. Back in Search Console → Settings → Users and permissions → Add User
   → paste the service account email → Owner

## Step 5 — Add environment variable to Vercel

1. Vercel project → Settings → Environment Variables
2. Add a variable:
   - Name: `GOOGLE_SERVICE_ACCOUNT_JSON`
   - Value: paste the ENTIRE content of the downloaded JSON file
     (as a single line — most editors/Vercel UI handle this fine)
3. (Optional) Add `INDEXNOW_KEY` with any random 32-char hex string,
   and create a file `/public/<that-key>.txt` containing the same key
   (required for IndexNow to accept pings)
4. Redeploy the project (Settings → Deployments → Redeploy)

## Step 6 — Test

1. Open your deployed site
2. Submit a test URL
3. Check the response — it should show "Notified" for Google Indexing API
4. Visit `/api/status` to see recent submissions
5. Visit `/carrier/<id>` to see the generated carrier page

---

## Notes & Limitations

- **In-memory storage**: submissions are stored in memory and will reset
  on cold starts / redeploys. For production, replace `global.submittedUrls`
  with a real database (Vercel KV, Supabase, MongoDB Atlas free tier, etc.)
- **Free tier limits**: Google Indexing API free quota is 200 requests/day
  per project. IndexNow has no published hard limit but don't spam it.
- **Carrier page quality**: Google may deprioritize crawling carrier pages
  if they look like pure link-farms. Consider adding real content/context
  to `/api/carrier.js` output over time.
- **No guarantees**: This setup improves crawl discovery speed. It does not
  and cannot guarantee that any URL will be indexed, or indexed within any
  specific timeframe.
