Below is a **self‑contained Markdown architecture document** for **Cardiorxiv**—a static‑first clone of medRxiv built with plain HTML, CSS, vanilla JS, Supabase, and Cloudflare Pages/Functions.  
Copy‑paste it into `/docs/architecture.md` (or your `README.md`) so new contributors instantly understand how everything fits together.

---

## Executive Overview
Cardiorxiv delivers the medRxiv experience—subject‑specific cardiovascular preprints, versioning, and rapid search—on a Jamstack stack:

* **Static front‑end** served globally by **Cloudflare Pages** (≤ 50 ms TTFB to 95 % of users). citeturn0search4  
* **Supabase** provides Postgres, Auth, Storage, and instant REST/Realtime APIs, all consumed via the UMD **`supabase‑js`** client in the browser. citeturn0search5  
* **Cloudflare Functions (Workers)** handle low‑latency tasks—edge search, signed‑URL proxy, metrics—mapped by route patterns. citeturn0search6  
* **GitHub CI/CD** pushes static assets to Pages and SQL migrations to Supabase, preventing schema drift. citeturn0search3  

This architecture keeps hosting costs tiny, scales automatically, and remains fully open‑source.

---

## High‑Level System Diagram (Mermaid)

```mermaid
graph TD
  A[Browser<br>HTML + CSS + JS] -->|GET /| B[Cloudflare Pages CDN]
  B --> C[Static HTML]
  C -->|JS fetch| D[Supabase REST API]
  C -->|/api/search| E[Cloudflare Function<br>(Edge Worker)]
  D <--> F[Postgres DB<br>+ RLS]
  D <--> G[Storage (PDF/R2)]
  E --> D
  subgraph Supabase Project
    F
    G
  end
```

*Edge execution keeps search & signed downloads under 150 ms, even at global scale.* citeturn0search2turn0search4

---

## Directory Layout

```text
cardiorxiv/
├─ public/              # Immutable assets (icons, robots.txt)
├─ src/
│  ├─ css/              # Tailwind build or vanilla CSS
│  ├─ js/
│  │  ├─ supabaseClient.js   # createClient(URL, ANON_KEY)
│  │  ├─ auth.js            # login, session
│  │  ├─ api.js             # wrapper for CRUD / RPC
│  │  └─ ui/                # navbar, modals, search
│  ├─ pages/           # index.html, submit.html, preprint.html
│  └─ workers/         # search.js, pdf-proxy.js
├─ supabase/
│  ├─ migrations/      # version‑controlled SQL
│  └─ seed/            # initial data (subject_areas.sql)
├─ .github/workflows/ci.yml
├─ wrangler.toml       # Cloudflare env + routes
└─ package.json
```

*File‑based routing in `src/workers` automatically binds `/api/*` paths to edge code.* citeturn0search6turn0search14

---

## Core Components

### 1. Front‑end (HTML/CSS/JS)
* **Pages**: Landing, Advanced Search, Preprint View, Submission Wizard.  
* **Client libraries**:  
  * `@supabase/supabase-js` via CDN script tag (UMD) for universal browser support. citeturn0search5  
  * Minimal helper scripts; no framework lock‑in—easier onboarding for contributors.

### 2. Supabase Back‑end
* **Postgres schema**

| Table | Purpose |
|-------|---------|
| `subjects` | Single category per preprint (mirrors medRxiv rule). citeturn0search0 |
| `preprints` | Canonical metadata (title, DOI stub, current_version_id, subject_id). |
| `versions` | One‑to‑many: PDF URL, posted_at, checksum. |
| `authors` | Normalized; many‑to‑many via `preprint_authors`. |
| `alerts` | Saved searches / subject subscriptions per user. |

* **Row‑Level Security** enforces user‑scoped writes; anonymous read‑only to published rows. citeturn0search7turn0search15  
* **Storage** buckets hold PDF uploads; public READ after moderation.

### 3. Cloudflare Workers
| Function | Route | Description |
|----------|-------|-------------|
| `search.js` | `/api/search` | Edge‑executed SQL/FTS query returns lightweight JSON for instant autocomplete. |
| `pdf-proxy.js` | `/api/p/:id` | Validates Supabase signed URL, streams from R2 for bandwidth savings. |

Workers deploy with Wrangler per `wrangler.toml`. citeturn0search6

---

## Non‑Functional Requirements

| Category | Target | Mechanism | Sources |
|----------|--------|-----------|---------|
| Performance | TTFB < 100 ms global | Cloudflare edge caching | citeturn0search4 |
| Security | 100 % tables behind RLS | Postgres RLS policies | citeturn0search7 |
| Uptime | ≥ 99.9 % | Pages SLA + Supabase HA | citeturn0search2 |
| Compliance | GDPR‑aligned, HIPAA‑lite | Data residency via Supabase options | citeturn0search8 |
| CI/CD | < 5 min build‑to‑prod | GitHub Actions → Pages/DB | citeturn0search3 |

---

## Development & Deployment Workflow

1. **Local dev**  
   ```bash
   npm run dev          # live‑reload static site
   wrangler dev         # test Workers
   supabase start       # local Postgres + Studio
   ```
2. **Feature branch** → PR → GitHub Actions  
   * Lint + unit tests  
   * `npm run build` → artifact to Pages  
   * `supabase db push` → branching migrations. citeturn0search3  
3. **Merge** auto‑deploys to staging; manual approval promotes to production.

---

## Future Extensions
* **DOI minting** via DataCite API worker.  
* **Realtime commenting** using Supabase Realtime channels.  
* **Semantic search** upgraded to pgvector + Worker inference.  
* **Astro migration** for partial island hydration (0 JS above‑the‑fold).

---

### References (key docs used)

1. medRxiv FAQ – subject categories & workflow. citeturn0search0  
2. Cloudflare Reference Architecture hub. citeturn0search2  
3. Cloudflare Pages performance blog. citeturn0search4  
4. Supabase JS CDN install guide. citeturn0search5  
5. Workers routes & static asset routing. citeturn0search6  
6. Supabase Local Dev & migrations. citeturn0search3  
7. Supabase Row‑Level Security docs. citeturn0search7  
8. Jamstack + Supabase architecture article. citeturn0search8  
9. JAMstack overview (general performance/security rationale). citeturn0search16  

Feel free to slot this Markdown into your repo; shout if you’d like deeper ER‑diagrams, sequence diagrams, or Terraform deploy notes!
