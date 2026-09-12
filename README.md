# 🚀 Phantom Reach Scout — Web Dashboard

Modern, mobile-first intelligence dashboard and reach calculation engine for Instagram & Google Maps.

Designed for instant deployment on **Vercel** with seamless connection to your local Python scraping engine via HTTPS tunnels.

---

## ✨ Features

- **📍 1. Location Tools**:
  - **1a) Instagram Tag & Creator Discovery**: Explore local hashtags, creators, collaborators, and custom niches with follower reach filters.
  - **1b) Google Maps Search Export**: Harvest local business directories and place details into single-sheet workbooks.
  - **1c) Google Maps to Contact Data**: Crawl business websites for verified **Emails, Phone numbers, WhatsApp, Instagram, Facebook, LinkedIn, and Twitter** channels.

- **👤 2. Account Tools**:
  - **2a) Account Deep Audit & Comments**: Extract complete profile metrics, all posts/reels, engagement data, and 30-day comment audits.
  - **2b) Post / Reel URL Deep Inspection**: Detailed breakdown of any specific Instagram post/reel URL with all comments.

- **⚡ 3. Score Me (Hermes Reach & Influence Engine)**:
  - **Reach Score**: Cumulative views of last 10 reels/posts $\le$ 30 days old.
  - **Engagement Score**: Total likes, comments, shares, and saves.
  - **Overall Engagement Rate %**: Active engagement efficiency vs follower base.
  - **Bot Comment Penalty %**: Real-time deduction for emoji-only spam, generic filler, and promo bots.
  - **Niche Consistency Score %**: Captions & tags alignment with target niche.
  - **10-Day Growth Momentum %**: Recent velocity trajectory.
  - **Composite Score (0–100) & Letter Grade ($A+$, $A$, $B$, $C$, $D$)**.

---

## 🌐 Deploying on Vercel

1. Fork or push this repository to your GitHub.
2. Log into [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Select this repository (`phantom-reach-web`).
4. Click **Deploy** (zero build commands or configurations needed; Vercel serves `index.html` as a static site).

---

## 🔗 Connecting Vercel to Your Local PC Engine

Since heavy scraping, Playwright automation, and Instagram sessions run on your local PC:

1. **Start the local dashboard server**:
   ```bash
   python dashboard_app.py --port 8000
   ```

2. **Start a free HTTPS tunnel on your PC**:
   - **Using Cloudflare Tunnel** (Recommended — 100% Free, Unlimited):
     ```bash
     cloudflared tunnel --url http://localhost:8000
     ```
     Copy the generated `https://xxx.trycloudflare.com` URL.
   
   - **Or using Ngrok**:
     ```bash
     ngrok http 8000
     ```
     Copy the generated `https://xxx.ngrok-free.app` URL.

3. **Connect in the Web Dashboard**:
   - Open your Vercel URL on your phone or computer.
   - Click the **⚙️ Backend API** button in the top navigation bar.
   - Paste your tunnel URL and click **Save & Connect**.
   - Your Vercel frontend is now connected to your local PC engine from anywhere in the world!
