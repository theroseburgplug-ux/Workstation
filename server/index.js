const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());

// Read access token from env var. DO NOT hardcode tokens in client code.
const ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  console.warn('Warning: FB_PAGE_ACCESS_TOKEN not set. Server will return 401 for requests.');
}

// Simple proxy to fetch Facebook Page insights
// Example: GET /api/facebook/insights?pageId={pageId}&metrics=page_impressions,page_engaged_users
app.get('/api/facebook/insights', async (req, res) => {
  const { pageId, metrics } = req.query;
  if (!pageId) return res.status(400).json({ error: 'pageId required' });
  if (!ACCESS_TOKEN) return res.status(401).json({ error: 'Access token not configured on server' });

  const metricParam = metrics ? String(metrics) : 'page_impressions,page_engaged_users';
  const url = `https://graph.facebook.com/v17.0/${encodeURIComponent(pageId)}/insights?metric=${encodeURIComponent(metricParam)}&access_token=${encodeURIComponent(ACCESS_TOKEN)}`;

  try {
    const r = await fetch(url);
    const json = await r.json();
    return res.json(json);
  } catch (err) {
    console.error('FB proxy error', err);
    return res.status(500).json({ error: 'failed to fetch insights' });
  }
});

// Optional: endpoint to list pages (requires user access token with manage_pages)
app.get('/api/facebook/pages', async (req, res) => {
  if (!ACCESS_TOKEN) return res.status(401).json({ error: 'Access token not configured on server' });
  const url = `https://graph.facebook.com/v17.0/me/accounts?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
  try {
    const r = await fetch(url);
    const json = await r.json();
    return res.json(json);
  } catch (err) {
    console.error('FB pages error', err);
    return res.status(500).json({ error: 'failed to fetch pages' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`FB proxy listening on ${port}`));
