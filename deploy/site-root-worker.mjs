import site from './site-root.json' with { type: 'json' };

// Optional edge mapping for a gateway that does not resolve a directory's index.html.
// Publish/pin the files first, then bind the compiled worker to the site's root route.
export async function handleRequest(request, fetchFile = fetch) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  const path = new URL(request.url).pathname;
  if (path === '/public/index.html') return Response.redirect(new URL('/', request.url), 308);
  const image = path === '/assets/share.png';
  if (path !== '/' && path !== '/index.html' && !image) return new Response('Not found', { status: 404 });
  const cid = image ? site.shareImage.fileCid : site.fileCid;
  let upstream;
  try { upstream = await fetchFile(`https://ipfs.io/ipfs/${cid}`, { method: request.method }); }
  catch { return new Response('Pinned file unavailable. Try again shortly.', { status: 502 }); }
  if (!upstream.ok) return new Response('Pinned file unavailable. Try again shortly.', { status: 502 });
  const headers = new Headers(upstream.headers);
  headers.set('Content-Type', image ? 'image/png' : 'text/html; charset=utf-8');
  headers.set('Content-Disposition', 'inline');
  headers.set('Cache-Control', 'public, max-age=60');
  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: 200, headers });
}

export default { fetch: (request) => handleRequest(request) };
