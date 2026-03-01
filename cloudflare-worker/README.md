Cloudflare Worker: Facebook Insights Proxy

Overview
This worker proxies requests to the Facebook Graph API (page insights and page list). It supports two token flows:

- Worker secret: bind `FB_PAGE_ACCESS_TOKEN` as a Worker secret (recommended for production).
- Authorization: the caller may send an `Authorization: Bearer <token>` header and the worker will use it (useful for local testing).

Deployment (Wrangler)
1. Install Wrangler: `npm install -g wrangler`
2. Authenticate and create a worker in your Cloudflare account.
3. Add and bind your secret:

```bash
wrangler secret put FB_PAGE_ACCESS_TOKEN
# paste your token when prompted
```

4. Publish the worker (from this folder):

```bash
wrangler publish worker.js --name trp-fb-proxy
```

Local testing
You can call the worker URL (e.g. `https://trp-fb-proxy.YOUR_ACCOUNT.workers.dev/api/facebook/insights?pageId=...&metrics=page_impressions`) or run it via Wrangler dev.

Security notes
- Do NOT commit long-lived tokens to source control.
- Prefer binding tokens as Worker secrets via Wrangler or Cloudflare dashboard.
- If you use the Authorization header flow, the token will be transmitted from your browser to the worker—use only for local/dev testing.
