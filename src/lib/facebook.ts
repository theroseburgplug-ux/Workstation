export async function fetchFacebookInsights(proxyUrl: string, pageId: string, metrics = 'page_impressions,page_engaged_users', accessToken?: string) {
  const url = new URL('/api/facebook/insights', proxyUrl);
  url.searchParams.set('pageId', pageId);
  url.searchParams.set('metrics', metrics);

  const headers: Record<string,string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook proxy error: ${res.status} ${body}`);
  }
  return res.json();
}

export async function fetchFacebookPages(proxyUrl: string, userToken: string) {
  const url = new URL('/api/facebook/pages', proxyUrl);
  const headers: Record<string,string> = {};
  if (userToken) headers['Authorization'] = `Bearer ${userToken}`;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook pages proxy error: ${res.status} ${body}`);
  }
  return res.json();
}

export async function fetchFacebookMe(proxyUrl: string, token: string) {
  const url = new URL('/api/facebook/me', proxyUrl);
  const headers: Record<string,string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook me proxy error: ${res.status} ${body}`);
  }
  return res.json();
}
