/**
 * Cloudflare Worker – /api/p/<preprintId>/<filename?>
 * ---------------------------------------------------
 * Creates a **temporary signed‑URL** to the requested PDF stored in the
 * Supabase Storage bucket `preprints` and **redirects** the user there.
 *
 *   1. Validates UUID path param.
 *   2. Calls Supabase Storage "sign" REST endpoint using a **service‑role key**.
 *   3. Returns `302 Location: <signed-url>` with short browser cache.
 *
 * Env Vars (wrangler.toml):
 *   SUPABASE_URL           – e.g. https://xyz.supabase.co
 *   SUPABASE_SERVICE_ROLE  – service role key (secret)
 *   SIGN_EXPIRY_SECONDS    – optional (default 3600)
 *
 * SECURITY
 *   We DO NOT expose the service‑role key. We use it server‑side only.
 *   Only authenticated users can hit this endpoint if desired; integrate
 *   auth checks here (e.g., JWT in cookie or header) before generating URL.
 */

export default {
    async fetch(request, env) {
      try {
        const { pathname } = new URL(request.url);
        // Expected pattern: /api/p/<uuid>/<file?>  (file defaults to latest.pdf)
        const match = pathname.match(/\/api\/p\/([0-9a-fA-F-]{36})(?:\/(.*))?$/);
        if (!match) {
          return new Response(JSON.stringify({ error: 'Bad path' }), {
            status: 400,
            headers: corsHeaders(),
          });
        }
  
        const id = match[1];
        const filename = match[2] || 'latest.pdf';
        const bucket = 'preprints';
  
        // Build storage sign URL
        const signEndpoint = `${env.SUPABASE_URL}/storage/v1/object/sign/${bucket}/${id}/${filename}`;
        const expiry = env.SIGN_EXPIRY_SECONDS || 3600;
  
        const signUrl = new URL(signEndpoint);
        signUrl.searchParams.set('download', '');
        signUrl.searchParams.set('expiresIn', expiry);
  
        const res = await fetch(signUrl.toString(), {
          method: 'POST',
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
          },
        });
  
        if (!res.ok) {
          const text = await res.text();
          return new Response(text || 'Failed to sign URL', {
            status: 502,
            headers: corsHeaders(),
          });
        }
  
        const { signedURL } = await res.json();
        if (!signedURL) {
          return new Response('No signed URL returned', {
            status: 500,
            headers: corsHeaders(),
          });
        }
  
        return Response.redirect(signedURL, 302);
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders(),
        });
      }
    },
  };
  
  // Simple helper for permissive CORS (adjust as needed)
  function corsHeaders() {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    };
  }
  