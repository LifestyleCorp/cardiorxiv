/*
 * cardiorxiv – Authentication helpers
 * Requires: supabaseClient.js to set window.sb (an instance of SupabaseClient)
 * Works with Supabase JS v2 UMD build.
 */

;(function (global) {
    // Ensure Supabase is initialised
    const sb = global.sb || global.supabase;
    if (!sb) {
      console.error('[auth.js] Supabase client not found – make sure supabaseClient.js is loaded first.');
      return;
    }
  
    /* -------------------------------------------------------------------------- */
    /*                                API METHODS                                 */
    /* -------------------------------------------------------------------------- */
  
    /**
     * Sign in with email + password.
     * @param {string} email
     * @param {string} password
     * @returns {Promise<import('@supabase/supabase-js').Session|null>}
     */
    async function signInWithEmail(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data.session;
    }
  
    /**
     * Register new user via email + password.
     * NOTE: Supabase will send a confirmation email if configured.
     */
    async function signUpWithEmail(email, password) {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      return data.session;
    }
  
    /**
     * Sign‑in with a third‑party provider (e.g. github, google).
     * Redirects the user to provider – ensure redirect URL is set in Supabase.
     */
    async function signInWithProvider(provider) {
      const { error } = await sb.auth.signInWithOAuth({ provider });
      if (error) throw error;
    }
  
    /** Sign out current user. */
    async function signOut() {
      const { error } = await sb.auth.signOut();
      if (error) throw error;
    }
  
    /** Get the currently authenticated user – auto‑refreshes the token. */
    async function getUser() {
      const { data, error } = await sb.auth.getUser();
      if (error) throw error;
      return data.user;
    }
  
    /* -------------------------------------------------------------------------- */
    /*                               UI BINDING HELPERS                            */
    /* -------------------------------------------------------------------------- */
  
    /**
     * Hook forms & buttons if they exist on the page. Call once at DOMContentLoaded.
     */
    function initAuthUI() {
      const loginForm = document.querySelector('[data-login-form]');
      if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = loginForm.querySelector('input[type="email"]').value.trim();
          const password = loginForm.querySelector('input[type="password"]').value;
          try {
            await signInWithEmail(email, password);
            window.location.reload();
          } catch (err) {
            alert(err.message);
          }
        });
      }
  
      // Logout buttons
      document.querySelectorAll('[data-logout]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await signOut();
          window.location.href = '/';
        });
      });
    }
  
    /**
     * Show/hide nav items based on auth state. Pass selectors to hideForAnon/hideForAuth arrays.
     */
    function toggleNavUI({ hideForAnon = [], hideForAuth = [] } = {}) {
      sb.auth.onAuthStateChange((_evt, session) => {
        const isLoggedIn = !!session?.user;
        hideForAnon.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => (el.style.display = isLoggedIn ? '' : 'none'));
        });
        hideForAuth.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => (el.style.display = isLoggedIn ? 'none' : ''));
        });
      });
    }
  
    /**
     * Protect a page – redirect to login if not authenticated.
     */
    async function requireAuth(redirect = '/login.html') {
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        window.location.href = redirect + '?next=' + encodeURIComponent(window.location.pathname);
      }
    }
  
    /* -------------------------------------------------------------------------- */
    /*                        Expose helpers on global namespace                   */
    /* -------------------------------------------------------------------------- */
  
    global.auth = {
      signInWithEmail,
      signUpWithEmail,
      signInWithProvider,
      signOut,
      getUser,
      initAuthUI,
      toggleNavUI,
      requireAuth,
    };
  
    // Auto‑initialise UI hooks when DOM ready.
    document.addEventListener('DOMContentLoaded', initAuthUI);
  })(window);
  