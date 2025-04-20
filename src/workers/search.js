/**
 * Cloudflare Worker – /api/search
 * Thin proxy that executes a full‑text search RPC on Supabase/Postgres and
 * returns a JSON array of preprints with minimal CORS headers.
 *
 * Environment Variables (set in wrangler.toml or CF dashboard):
 *   SUPABASE_URL             – e.g. https://xyzcompany.supabase.co
 *   SUPABASE_SERVICE_ROLE    – service‑role key (NOT public anon)
 *   DEFAULT_PAGE_SIZE        – fallback page size (optional, default 20)
 */
export default {
    async fetch (request, env, ctx) {
      const url = new URL(request.url)
      if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 })
      }
  
      // ------ Parse query params ------
      const {
        q = '',
        subject = '',
        author = '',
        from = '',
        to = '',
        page = '1',
        pageSize = env.DEFAULT_PAGE_SIZE || '20'
      } = Object.fromEntries(url.searchParams.entries())
  
      // Simple guard against insane sizes
      const safePageSize = Math.min(Number(pageSize) || 20, 100)
      const offset = (Number(page) - 1) * safePageSize
  
      // ------ Build RPC payload ------
      const rpcPayload = {
        keyword: q.trim(),
        subject_slug: subject || null,
        author_fragment: author || null,
        from_date: from || null,
        to_date: to || null,
        limit_rows: safePageSize,
        offset_rows: offset
      }
  
      // ------ Call Supabase RPC (recommended) ------
      const endpoint = `${env.SUPABASE_URL}/rest/v1/rpc/search_preprints`
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE}`
        },
        body: JSON.stringify(rpcPayload)
      })
  
      if (!resp.ok) {
        const err = await resp.text()
        return json({ error: 'supabase_error', details: err }, resp.status, true)
      }
  
      const data = await resp.json()
      return json({ data, page: Number(page), pageSize: safePageSize }, 200)
    }
  }
  
  /****************** helpers *******************/
  function json (obj, status = 200, cors = true) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...(cors ? { 'Access-Control-Allow-Origin': '*' } : {})
      }
    })
  }
  