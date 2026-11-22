# Vanguard Web Frontend: SEO & Content Architecture Guidelines

## Project Overview
- **Production Domain:** `https://www.socialbyvanguard.com` (Canonical uses `www.`)
- **Hosting:** Vercel Edge Hosting (`vercel.json`)
- **Live Sitemap:** `https://www.socialbyvanguard.com/sitemap.xml` (37 production routes)

---

## 1. Zero-AI Footprint & E-E-A-T Humanization Standard
- **Never use bracketed mad-libs placeholders** (e.g., `[Brand Name]`, `[Product]`, `[City]`, `[Name]`, `[Unique Angle]`) or bracketed status tokens (`[ERROR]`, `[NOTICE]`).
- All templates, pitch scripts, and case studies MUST use concrete real-world brands (e.g., Blue Bottle Coffee, Whoop, Nomad, Trattoria Rustica, Ghost, Poppi, NordVPN), real engagement metrics, and actual follower counts.
- Maintain practitioner attribution seals (e.g., *"Battle-Tested by Vanguard Talent Management Desk"*).
- Pre-flight automated check: `seo-engine.js --audit` scans and fails if synthetic AI placeholders are detected.

---

## 2. Favicon & Search Assets (Google 48px Rule)
- Assets located in root:
  - `favicon.ico` (multi-frame binary: 16x16, 32x32, 48x48)
  - `favicon-48x48.png` (Mandatory for Google Search 48px square requirement)
  - `favicon-96x96.png`, `favicon-192x192.png`, `apple-touch-icon.png`, `favicon.svg`
- All pages link these explicitly in `<head>` with HTTP 200 edge caching.

---

## 3. Programmatic SEO (pSEO) Matrix (21 Targeted Hubs)
- **Instagram Follower Tier Calculators:**
  - `/tools/influencer-score/1k-followers` (Nano)
  - `/tools/influencer-score/10k-followers`
  - `/tools/influencer-score/25k-followers`
  - `/tools/influencer-score/50k-followers`
  - `/tools/influencer-score/100k-followers`
  - `/tools/influencer-score/500k-followers`
  - `/tools/influencer-score/1m-followers` (Celebrity / Mega)
- **Flagship Tool:**
  - `/tools/engagement-rate-calculator` (Live Interactive Engine + 1-Click CSV)
- **YouTube Channel Sponsorship Hubs:**
  - `/tools/youtube/10k-subscribers`
  - `/tools/youtube/50k-subscribers`
  - `/tools/youtube/100k-subscribers`
- **Industry Local B2B Google Leads:**
  - `/tools/google-leads/restaurants-cafes`
  - `/tools/google-leads/real-estate-agents`
  - `/tools/google-leads/gyms-fitness`
  - `/tools/google-leads/law-firms-attorneys`
  - `/tools/google-leads/dentists-clinics`
  - `/tools/google-leads/roofing-contractors`
- **E-Commerce DTC Instagram Brands:**
  - `/tools/instagram-leads/fashion-apparel`
  - `/tools/instagram-leads/health-beauty`
  - `/tools/instagram-leads/fitness-supplements`
  - `/tools/instagram-leads/food-beverage`
- **High-Dwell Magnets:**
  - Interactive Follower Drag-Slider on `/tools/influencer-score/index.html`.
  - Downloadable CSVs: 2026 Instagram Sponsorship Matrix, 2026 Engagement Benchmarks, and 2026 YouTube CPM Matrix.
- **Clean Routing:** Configured via `vercel.json` rewrites.

---

## 4. Google Search Console Deployment Rules
- **Domain Property (`sc-domain:socialbyvanguard.com`):**
  - Always submit the **full absolute canonical URL** for sitemaps:
    `https://www.socialbyvanguard.com/sitemap.xml`
  - Do not enter relative paths (`sitemap.xml`), as Domain properties have no domain prefix and will throw *"Invalid sitemap address"*.
- **URL Inspection & Rate Limiting:**
  - If clicking *"Request Indexing"* triggers *"Oops! Something went wrong. We had a problem submitting your indexing request"*, this is Google's daily manual queue throttle.
  - Verify that the Live Test shows green checkmarks (**"Page can be indexed"** and **"Breadcrumbs: 1 valid item detected"**). Automated crawling will index the pages via the submitted sitemap without needing repeated manual button clicks.

---

## 5. Audit & Validation Command
Always run the zero-dependency enterprise SEO engine to verify site health before deploying:
```bash
node C:\Users\Tyson\.gemini\config\skills\enterprise-seo-blueprint\scripts\seo-engine.js --audit
```
