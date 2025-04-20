/*
 * cardiorxiv – search.js
 * Handles advanced search UI, debounced queries, and result rendering.
 * Works with \index.html and \search.html pages.
 *
 * Assumes an Edge Function exists at /api/search which accepts the following
 * query‑string params:
 *   q        – full‑text keywords
 *   subject  – UUID or slug of subject area (optional)
 *   author   – author name fragment (optional)
 *   from     – YYYY‑MM‑DD (optional)
 *   to       – YYYY‑MM‑DD (optional)
 *   page     – integer page index (1‑based)
 *   pageSize – number of results per page (default 20)
 * Returns JSON shape:
 *   {
 *     total: 123,
 *     results: [
 *       { id, title, authors, subject, posted_at, abstract }
 *     ]
 *   }
 */

;(function () {
    const searchForm = document.getElementById('search-form');
    const resultsEl = document.getElementById('search-results');
    const pagerEl = document.getElementById('pager');
    const queryInput = document.getElementById('q');
    const subjectSelect = document.getElementById('subject');
    const authorInput = document.getElementById('author');
    const fromInput = document.getElementById('from');
    const toInput = document.getElementById('to');
  
    const PAGE_SIZE = 20;
    let currentPage = 1;
    let lastQuery = new URLSearchParams(window.location.search);
  
    // ------- Utility helpers
    const debounce = (fn, delay = 300) => {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), delay);
      };
    };
  
    const buildQueryParams = (page = 1) => {
      const params = new URLSearchParams();
      const q = queryInput.value.trim();
      if (q) params.set('q', q);
      const subj = subjectSelect.value;
      if (subj) params.set('subject', subj);
      const auth = authorInput.value.trim();
      if (auth) params.set('author', auth);
      if (fromInput.value) params.set('from', fromInput.value);
      if (toInput.value) params.set('to', toInput.value);
      params.set('page', page);
      params.set('pageSize', PAGE_SIZE);
      return params;
    };
  
    const renderResults = (payload) => {
      const { total, results } = payload;
      resultsEl.innerHTML = '';
      if (!results.length) {
        resultsEl.innerHTML = '<p class="text-gray-500 mt-8">No preprints found.</p>';
        pagerEl.classList.add('hidden');
        return;
      }
  
      results.forEach((p) => {
        const card = document.createElement('article');
        card.className = 'p-4 border-b border-gray-200 dark:border-gray-700';
        card.innerHTML = `
          <h3 class="text-lg font-semibold mb-1 text-blue-700 dark:text-blue-400">
            <a href="/preprint.html?id=${p.id}" class="hover:underline">${p.title}</a>
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">${p.authors}</p>
          <p class="text-xs text-gray-500 dark:text-gray-500">${new Date(p.posted_at).toLocaleDateString()} • ${p.subject}</p>
          <p class="text-sm mt-2 line-clamp-3">${p.abstract}</p>
        `;
        resultsEl.appendChild(card);
      });
  
      // Pager
      const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
      pagerEl.classList.remove('hidden');
      pagerEl.innerHTML = '';
  
      const createBtn = (label, page, disabled = false) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.className = `px-3 py-1 rounded-md border text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`;
        if (!disabled) btn.addEventListener('click', () => performSearch(page));
        return btn;
      };
  
      pagerEl.appendChild(createBtn('Prev', currentPage - 1, currentPage === 1));
      pagerEl.appendChild(document.createTextNode(` Page ${currentPage} / ${totalPages} `));
      pagerEl.appendChild(createBtn('Next', currentPage + 1, currentPage === totalPages));
    };
  
    /**
     * Perform search via Cloudflare Function
     */
    async function performSearch(page = 1) {
      currentPage = page;
      const params = buildQueryParams(page);
  
      // Update URL for shareable searches
      if (history.replaceState) {
        history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
      }
  
      resultsEl.innerHTML = '<p class="mt-8 text-gray-500">Searching…</p>';
      pagerEl.classList.add('hidden');
  
      try {
        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const json = await res.json();
        renderResults(json);
      } catch (err) {
        console.error(err);
        resultsEl.innerHTML = `<p class="mt-8 text-red-600">Search failed. Please try again later.</p>`;
      }
    }
  
    // ------- Event listeners
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      performSearch(1);
    });
  
    const autoSearch = debounce(() => performSearch(1), 400);
    queryInput.addEventListener('input', autoSearch);
    authorInput.addEventListener('input', autoSearch);
    subjectSelect.addEventListener('change', () => performSearch(1));
    fromInput.addEventListener('change', () => performSearch(1));
    toInput.addEventListener('change', () => performSearch(1));
  
    // ------- Initialise from URL on load
    window.addEventListener('DOMContentLoaded', () => {
      // Prefill form from URL params for shareable queries
      const urlParams = new URLSearchParams(window.location.search);
      ['q', 'author', 'subject', 'from', 'to'].forEach((key) => {
        if (urlParams.has(key)) {
          const field = document.getElementById(key);
          if (field) field.value = urlParams.get(key);
        }
      });
      const startPage = parseInt(urlParams.get('page') || '1', 10);
      performSearch(startPage);
    });
  })();
  