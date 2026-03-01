addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// This worker proxies requests to the Facebook Graph API for page insights.
// Recommended: bind your page access token as a Worker Secret (e.g., FB_PAGE_ACCESS_TOKEN)
// If the request includes an Authorization header, the worker will use that token
// (useful for local dev where you inject the token client-side).

async function handleRequest(request) {
  const url = new URL(request.url)
  const origin = request.headers.get('Origin') || '*'

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Access-Control-Max-Age': '600'
      }
    })
  }
  if (url.pathname === '/api/facebook/insights') {
    const pageId = url.searchParams.get('pageId')
    const metrics = url.searchParams.get('metrics') || 'page_impressions,page_engaged_users'

    if (!pageId) return new Response(JSON.stringify({ error: 'pageId required' }), { status: 400, headers: { 'Access-Control-Allow-Origin': origin } })

    // Prefer Authorization header if present
    let token = null
    const auth = request.headers.get('Authorization')
    if (auth && auth.startsWith('Bearer ')) token = auth.split(' ')[1]

    // Otherwise use the bound secret (configure with Wrangler or Cloudflare dashboard)
    if (!token && typeof FB_PAGE_ACCESS_TOKEN !== 'undefined') token = FB_PAGE_ACCESS_TOKEN

    if (!token) return new Response(JSON.stringify({ error: 'Access token missing' }), { status: 401, headers: { 'Access-Control-Allow-Origin': origin } })

    const fbUrl = `https://graph.facebook.com/v17.0/${encodeURIComponent(pageId)}/insights?metric=${encodeURIComponent(metrics)}&access_token=${encodeURIComponent(token)}`

    try {
      const resp = await fetch(fbUrl)
      const json = await resp.json()
      return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin } })
    } catch (err) {
      return new Response(JSON.stringify({ error: 'failed to fetch insights' }), { status: 500, headers: { 'Access-Control-Allow-Origin': origin } })
    }
  }

  if (url.pathname === '/api/facebook/pages') {
    let token = null
    const auth = request.headers.get('Authorization')
    if (auth && auth.startsWith('Bearer ')) token = auth.split(' ')[1]
    if (!token && typeof FB_PAGE_ACCESS_TOKEN !== 'undefined') token = FB_PAGE_ACCESS_TOKEN
    if (!token) return new Response(JSON.stringify({ error: 'Access token missing' }), { status: 401, headers: { 'Access-Control-Allow-Origin': origin } })

    const fbUrl = `https://graph.facebook.com/v17.0/me/accounts?access_token=${encodeURIComponent(token)}`
    try {
      const resp = await fetch(fbUrl)
      const json = await resp.json()
      return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin } })
    } catch (err) {
      return new Response(JSON.stringify({ error: 'failed to fetch pages' }), { status: 500, headers: { 'Access-Control-Allow-Origin': origin } })
    }
  }

    // /api/facebook/me -> proxies GET /me?fields=id,name for token inspection
    if (url.pathname === '/api/facebook/me') {
      let token = null
      const auth = request.headers.get('Authorization')
      if (auth && auth.startsWith('Bearer ')) token = auth.split(' ')[1]
      if (!token && typeof FB_PAGE_ACCESS_TOKEN !== 'undefined') token = FB_PAGE_ACCESS_TOKEN
      if (!token) return new Response(JSON.stringify({ error: 'Access token missing' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin } })

      const fbUrl = `https://graph.facebook.com/v17.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`
      try {
        const resp = await fetch(fbUrl)
        const json = await resp.json()
        return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin } })
      } catch (err) {
        return new Response(JSON.stringify({ error: 'failed to fetch me' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin } })
      }

      // Simple search proxy endpoint.
      // Prefer server-side Bing Web Search when `BING_SEARCH_KEY` is bound to the worker.
      // Fallback to DuckDuckGo Instant Answer for unauthenticated usage.
      if (url.pathname === '/api/search') {
        const q = url.searchParams.get('q') || '';
        if (!q) return new Response(JSON.stringify({ error: 'q parameter required' }), { status: 400, headers: { 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' } });

        // If Bing key is configured, use Bing Web Search API
        if (typeof BING_SEARCH_KEY !== 'undefined' && BING_SEARCH_KEY) {
          try {
            const bingUrl = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(q)}`;
            const resp = await fetch(bingUrl, { headers: { 'Ocp-Apim-Subscription-Key': BING_SEARCH_KEY } });
            const json = await resp.json();
            return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin } });
          } catch (err) {
            return new Response(JSON.stringify({ error: 'bing search failed' }), { status: 500, headers: { 'Access-Control-Allow-Origin': origin } });
          }
        }

        // Otherwise use DuckDuckGo Instant Answer API as a best-effort fallback
        try {
          const ddUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&no_redirect=1`;
          const ddResp = await fetch(ddUrl);
          const ddJson = await ddResp.json();
          return new Response(JSON.stringify(ddJson), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin } });
        } catch (err) {
          return new Response(JSON.stringify({ error: 'duckduckgo search failed' }), { status: 500, headers: { 'Access-Control-Allow-Origin': origin } });
        }
      }
    }

  return new Response('Not found', { status: 404 })
}
