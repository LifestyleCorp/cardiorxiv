# cardiorxiv
opensource cardiology preprint server 


# Cardiorxiv – Product Requirements Document (HTML + CSS + JS + Supabase)

## 1 Document Control
| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 20 Apr 2025 | Core Dev Team | Re‑written for a **static web stack** (HTML/CSS/JS) using **Supabase** back‑end and **Cloudflare Pages + Functions** hosting. |

---

## 2 Vision
Provide the cardiovascular‑science community with a **fast, free and open preprint server** that mirrors the familiar user experience of [medRxiv](https://www.medrxiv.org) while embracing a modern Jamstack architecture. The site must:
* **Load instantly worldwide** (⩽ 1 s First Contentful Paint for 95% of users).
* Enable authors to **upload, version, and share** PDFs within minutes.
* Offer readers intuitive **subject filters, search, alerts & RSS** — exactly like medRxiv.
* Stay **cost‑efficient** (≤ $50 mo. infra for 10 k MAU) and easy to maintain by a small dev team.

## 3 Objectives & KPIs
| Goal | KPI | Target (Year 1) |
|------|-----|----------------|
| Rapid dissemination | Median time from submission ➜ public listing | < 60 min |
| Global performance | p95 FCP | < 1 s |
| Engagement | Avg. unique visitors/mo | 5 k |
| Reliability | Availability | ≥ 99.9 % |
| Cost | Monthly infra spend | ≤ $50 |

## 4 Personas
* **Cardio Researcher** – uploads preprints, manages versions, shares DOI‑like links.
* **Clinician‑Reader** – browses cardiovascular category, searches by keyword.
* **Moderator (internal)** – screens submissions for spam/PHI before publish.
* **Developer** – maintains schema, edge functions & CI pipeline.

## 5 Functional Requirements
### 5.1 Public‑Facing (MVP)
1. **Landing/Home** – latest preprints, COVID‑19 banner (if needed).  
2. **Subject Areas** – left nav identical to medRxiv (Cardiovascular Medicine pre‑selected).  
3. **Search & Advanced Search** – full‑text (title/abstract/author) with date filters.  
4. **Preprint Detail Page** – PDF viewer, version list, citations, Altmetric placeholder.  
5. **Alerts/RSS** – email + RSS feed per subject filter.  
6. **Metrics** – basic view/download counts.

### 5.2 Author Flow (MVP)
1. **Login / Signup** – Supabase email‑link or GitHub OAuth.  
2. **Submit Wizard** – metadata → author list → file upload → licence → confirm.  
3. **Dashboard** – view status (pending, published), upload new version, withdraw.

### 5.3 Moderator Flow (Phase 2)
* Queue view, approve/reject with comment, flag PHI.

### 5.4 Nice‑to‑Have (Phase 3)
* DOI minting via Crossref.  
* Comment & annotation layer.  
* ORCID integration.

## 6 Non‑Functional Requirements
* **Performance** – Edge‑cached static HTML; JSON data via CDN proxied functions.  
* **Security** – Supabase RLS: `select` public, `insert/update` requires authenticated & verified email; rate limiting via CF Turnstile.  
* **Compliance** – No PHI, GDPR rights supported, opt‑out cookies.  
* **Accessibility** – WCAG 2.1 AA.

## 7 Tech Stack
| Layer | Tool / Service | Reason |
|-------|----------------|--------|
| Front‑end | Pure HTML + Tailwind CSS + vanilla JS modules | No framework build; quick load, easy CDN cache. |
| Auth & DB | **Supabase** (Postgres + Auth + Storage) | Managed; free tier generous; SQL‑based like medRxiv’s legacy Postgres. |
| Hosting | **Cloudflare Pages** | Global static CDN, free TLS, automatic deploys. |
| Edge Logic | **Cloudflare Functions** (Workers) | Search API proxy, signed URL generator. |
| CI/CD | GitHub Actions | Lint → build → deploy; run `supabase db push`. |

## 8 Data Model (Postgres / Supabase)
| Table | Key Fields | Notes |
|-------|-----------|-------|
| `subjects` | id (UUID), name | Pre‑seed with full medRxiv list; `id` referenced elsewhere. |
| `preprints` | id (UUID PK), title, abstract, pdf_url, version, status (`draft/pending/live/rejected`), posted_at, subject_id (FK), views, downloads | Core record shown in UI. |
| `authors` | id, name, affiliation, orcid_id | Many‑to‑many via `preprint_authors`. |
| `preprint_authors` | preprint_id FK, author_id FK, seq | Order matters. |
| `users` | Supabase auth table | Links to optional profile table. |
| `alerts` | user_id FK, subject_id, last_sent | RSS/email. |
| `moderation_logs` | preprint_id, moderator_id, action, note, ts | Audit trail.

## 9 System Architecture
```
[Browser]
  ↓ static HTML/CSS/JS (CF Pages)
[Cloudflare CDN Edge]
  ↓ (dynamic) /api/search  →  Workers runtime (fetch to Supabase REST)
  ↓ (dynamic) /api/pdf/*   →  Workers signs Storage URL & streams file
[Supabase]
  ├─ Postgres (SQL + RLS)
  ├─ Auth (JWT)
  ├─ Storage (PDFs, images)
  └─ Edge Functions (future heavy logic)
```
*Static assets* are immutable and cached; **JSON responses** are micro‑cached 30 s to balance freshness.

## 10 Directory Layout (Monorepo)
```
cardiorxiv/
├─ public/         # index.html, robots.txt, icons
├─ src/
│  ├─ css/         # Tailwind build output
│  ├─ js/
│  │  ├─ supabaseClient.js
│  │  ├─ auth.js
│  │  ├─ search.js
│  │  └─ ui/
│  ├─ pages/
│  │  ├─ index.html
│  │  ├─ search.html
│  │  ├─ submit.html
│  │  └─ preprint.html
│  └─ workers/
│     ├─ search.js
│     └─ pdf-proxy.js
├─ supabase/       # migrations & seeds
├─ .github/workflows/ci.yml
├─ wrangler.toml   # CF Pages + Functions
└─ package.json    # dev/build scripts
```

## 11 CI/CD Pipeline
1. **Push → GitHub** triggers `ci.yml`.
2. Lint, run `tailwindcss -m -o public/assets.css`.
3. Build Workers (`wrangler deploy --dry-run`).
4. Deploy static site + functions to Cloudflare Pages.
5. Run `supabase db push` (with secrets) to apply migrations.
6. Smoke test `/api/search?q=test`.

## 12 Roadmap
| Phase | Time | Scope |
|-------|------|-------|
| Alpha | 4 weeks | Browse, search, public preprint pages (static seed data). |
| Beta  | +4 wks | Auth, submission, Supabase live data, moderator dashboard. |
| GA    | +4 wks | Alerts/RSS, basic analytics, Cloudflare Turnstile. |
| Phase 2 | Q4 2025 | DOI minting, comments, ORCID, mobile PWA. |

---
**End of Document**

