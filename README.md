# 🚀 Phantom Reach Scout — Web Dashboard

Modern, light and vibrant glassmorphism intelligence dashboard and reach calculation engine.

Designed for instant deployment on **Vercel** with seamless connection to your local Python scraping engine via HTTPS tunnels.

---

## ✨ Tools & Features

- **📍 Location Leads Tools**:
  - **Who Can Make Me Viral Here?**: Verified local creators, collaborator and business handles directly into excel sheet with complete score and roi.
  - **Google Leads From Location**: Extract all leads data from your target location directly into excel sheet.
  - **Maps to Contact Data**: Extract complete conacts,emails,links,linkedin data from the location into automated excelsheet.

- **👤 Account Tools**:
  - **Account Deep Audit & Comments**: Extract complete profile metrics, all posts/reels, engagement data, and 30-day comment audits.
  - **Post / Reel Deep Inspection**: Detailed breakdown of any specific Instagram post/reel link with all comments.

- **⚡ Score Me Engine**:
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
