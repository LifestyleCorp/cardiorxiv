/*
 * cardiorxiv – supabaseClient.js
 * Initialise a global Supabase client (UMD build) so every page can import the same instance.
 *
 * HOW TO CONFIGURE
 * 1. Create a <script> tag **before this file** that sets global CONSTANTS:
 *      window.SUPABASE_URL = 'https://xxxxx.supabase.co';
 *      window.SUPABASE_ANON_KEY = 'public-anon-key';
 *    — OR —
 *    add two <meta> tags in <head>:
 *      <meta name="supabase-url" content="https://xxxxx.supabase.co" />
 *      <meta name="supabase-key" content="public-anon-key" />
 * 2. Include the Supabase JS UMD bundle (v2) before this file:
 *      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
 * 3. Then include this script:
 *      <script src="/src/js/supabaseClient.js"></script>
 *
 * After that, every other script can access the client via `window.sb`
 */
;(function (global) {
    // Collect credentials from globals or <meta> tags
    let url = global.SUPABASE_URL || ''
    let key = global.SUPABASE_ANON_KEY || ''
  
    if (!url || !key) {
      const urlMeta = document.querySelector('meta[name="supabase-url"]')
      const keyMeta = document.querySelector('meta[name="supabase-key"]')
      url = urlMeta ? urlMeta.content : url
      key = keyMeta ? keyMeta.content : key
    }
  
    if (!url || !key) {
      console.error('[supabaseClient] Missing SUPABASE_URL or SUPABASE_ANON_KEY')
      return
    }
  
    if (!global.supabase) {
      console.error('[supabaseClient] Supabase UMD bundle not found. Ensure it is loaded before this file.')
      return
    }
  
    // Create singleton client and expose globally
    const sb = global.supabase.createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  
    // Attach to window for universal access
    global.sb = sb
  
    // Log helper
    console.log('[supabaseClient] Initialised Supabase client:', url)
  })(window)
  