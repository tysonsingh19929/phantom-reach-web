const fs = require('fs');
const path = require('path');
const campaignsHandler = require('./api/campaigns');
const creatorsHandler = require('./api/creators');
const trackHandler = require('./api/track');

function createMockReqRes({ method = 'GET', url = '/', query = {}, body = {}, headers = {} }) {
  const req = {
    method,
    url,
    query,
    body,
    headers: {
      host: 'socialbyvanguard.com',
      'x-forwarded-proto': 'https',
      ...headers
    },
    socket: { remoteAddress: '127.0.0.1' }
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      this.ended = true;
      return this;
    },
    writeHead(code, headers = {}) {
      this.statusCode = code;
      for (const [k, v] of Object.entries(headers)) {
        this.headers[k.toLowerCase()] = v;
      }
      return this;
    },
    end(data) {
      if (data) this.body = data;
      this.ended = true;
      return this;
    }
  };

  return { req, res };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

async function runVerification() {
  console.log('=== Vanguard Task 3 Verification Suite ===\n');

  // 1. Zero Emoji Verification across all created and modified HTML/JS files
  const filesToCheck = [
    'exchange/index.html',
    'collabs/index.html',
    'index.html',
    'tool.html',
    'tools/index.html',
    'tools/influencer-score/index.html',
    'tools/google-leads/index.html',
    'tools/instagram-leads/index.html',
    'tools/youtube/index.html',
    'tools/linkedin/index.html',
    'tools/x-twitter/index.html',
    'tools/automate-ai/index.html'
  ];

  const emojiRegex = /\p{Extended_Pictographic}/u;

  for (const f of filesToCheck) {
    const fullPath = path.join(__dirname, f);
    assert(fs.existsSync(fullPath), `File exists: ${f}`);
    const content = fs.readFileSync(fullPath, 'utf8');

    // Test for emojis
    const hasEmoji = emojiRegex.test(content);
    assert(!hasEmoji, `Zero emojis strictly verified in: ${f}`);

    // Verify navigation links for /exchange and /collabs in #toolsMenu
    assert(content.includes('href="/exchange"'), `${f} includes link to /exchange`);
    assert(content.includes('href="/collabs"'), `${f} includes link to /collabs`);
    assert(content.includes('Campaign Exchange'), `${f} displays 'Campaign Exchange'`);
    assert(content.includes('Creator Collabs'), `${f} displays 'Creator Collabs'`);
  }

  // 2. Specific Feature Checks for exchange/index.html
  console.log('\n--- Checking exchange/index.html features ---');
  const exchangeHtml = fs.readFileSync(path.join(__dirname, 'exchange/index.html'), 'utf8');
  assert(exchangeHtml.includes('Total Verified Escrow Pool') || exchangeHtml.includes('Verified Escrow Pool'), 'Exchange has Verified Escrow Pool');
  assert(exchangeHtml.includes('Active Campaign Pools'), 'Exchange has Active Campaign Pools');
  assert(exchangeHtml.includes('Participating Creators'), 'Exchange has Participating Creators');
  assert(exchangeHtml.includes('Avg Yield / 1K Views') || exchangeHtml.includes('Average Yield'), 'Exchange has Average Yield');
  assert(exchangeHtml.includes('vanguard_campaigns_cache'), 'Exchange implements SWR sessionStorage caching');
  assert(exchangeHtml.includes('participateModal'), 'Exchange includes participation modal');
  assert(exchangeHtml.includes('/api/track?cid='), 'Exchange generates /api/track links');
  assert(exchangeHtml.includes('launchModal'), 'Exchange includes launch campaign modal');
  assert(exchangeHtml.includes('faqSection') || exchangeHtml.includes('Vanguard Escrow Floor Operates'), 'Exchange includes institutional FAQ');
  assert(exchangeHtml.includes('Link Copied'), 'Exchange has Link Copied feedback state');

  // 3. Specific Feature Checks for collabs/index.html
  console.log('\n--- Checking collabs/index.html features ---');
  const collabsHtml = fs.readFileSync(path.join(__dirname, 'collabs/index.html'), 'utf8');
  assert(collabsHtml.includes('Creator Collaboration Hub — Discover & Syndicate with Verified Peers') || collabsHtml.includes('Creator Collaboration Hub'), 'Collabs has correct Hero');
  assert(collabsHtml.includes('cityFilterSelect') || collabsHtml.includes('All Cities'), 'Collabs includes city filter');
  assert(collabsHtml.includes('tierFilterSelect') || collabsHtml.includes('Micro'), 'Collabs includes tier filter');
  assert(collabsHtml.includes('nichePillContainer') || collabsHtml.includes('All Niches'), 'Collabs includes niche filter');
  assert(collabsHtml.includes('vanguard_creators_cache'), 'Collabs implements SWR sessionStorage caching');
  assert(collabsHtml.includes('collabModal'), 'Collabs includes collaboration invite modal');
  assert(collabsHtml.includes('pitchTextArea'), 'Collabs includes pre-generated pitch text area');
  assert(collabsHtml.includes('Pitch Copied'), 'Collabs includes Pitch Copied feedback');
  assert(collabsHtml.includes('Vanguard Syndication Blueprint'), 'Collabs includes syndication blueprint');
  assert(collabsHtml.includes('${authenticity}'), 'Collabs displays calculated authenticity in creator card UI');
  assert(collabsHtml.includes('collabTypeSelect') && collabsHtml.includes('collabType === \'Joint Escrow Co-Pitch\''), 'Collabs dynamically updates pitch based on collaboration objective');

  // 4. API Endpoints functional tests
  console.log('\n--- Checking Backend API Endpoints ---');

  // Test GET /api/campaigns
  {
    const { req, res } = createMockReqRes({ method: 'GET', url: '/api/campaigns' });
    await campaignsHandler(req, res);
    assert(res.statusCode === 200, 'GET /api/campaigns returns 200');
    assert(res.body && Array.isArray(res.body.campaigns) && res.body.campaigns.length >= 4, 'GET /api/campaigns returns 4+ campaigns');
    assert(res.body.stats && res.body.stats.total_escrow_pool >= 40500, 'Stats verify escrow pool $40,500+');
  }

  // Test POST /api/campaigns/join
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/campaigns/join',
      body: {
        action: 'join',
        campaign_id: 'cmp_apex_gear',
        creator_id: 'test_creator_123',
        user_id: 'test_creator_123'
      }
    });
    await campaignsHandler(req, res);
    assert(res.statusCode === 200, 'POST /api/campaigns/join returns 200');
    assert(res.body && res.body.success === true, 'Join returns success: true');
    assert(res.body.tracking_url && res.body.tracking_url.includes('/api/track?cid=cmp_apex_gear'), 'Join returns tracked link with cid and uid');
  }

  // Test POST /api/campaigns (create campaign)
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/campaigns',
      body: {
        brand_name: 'Test Horizon Gear',
        title: 'Test Horizon Conditioning Campaign',
        category: 'Fitness',
        escrow_pool: 6000,
        rev_share_percentage: 20,
        deliverables: '1x Reel, 2x Stories',
        destination_url: 'https://testbrand.com'
      }
    });
    await campaignsHandler(req, res);
    assert(res.statusCode === 201 || (res.statusCode === 200 && res.body.success), 'POST /api/campaigns creates campaign');
    assert(res.body && res.body.campaign_id, 'Campaign creation returns campaign_id');
  }

  // Test GET /api/creators
  {
    const { req, res } = createMockReqRes({ method: 'GET', url: '/api/creators' });
    await creatorsHandler(req, res);
    assert(res.statusCode === 200, 'GET /api/creators returns 200');
    assert(res.body && Array.isArray(res.body.creators) && res.body.creators.length >= 8, 'GET /api/creators returns 8+ seed creators');
    const first = res.body.creators[0];
    assert(first.handle && first.name && first.omniscore && first.city, 'Creator record has handle, name, omniscore, and city');
  }

  // Test GET /api/track redirection
  {
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/track?cid=cmp_apex_gear&uid=creator123&dest=https%3A%2F%2Fapexperformancegear.com%2Fvanguard',
      query: {
        cid: 'cmp_apex_gear',
        uid: 'creator123',
        dest: 'https://apexperformancegear.com/vanguard'
      }
    });
    await trackHandler(req, res);
    assert(res.statusCode === 302 || res.statusCode === 200, 'GET /api/track handles redirect');
    assert(res.headers.location && res.headers.location.includes('vng_trk='), 'Track redirect includes vng_trk token');
  }

  console.log(`\n========================================`);
  console.log(`Verification Summary: Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('[ERROR] Verification crashed:', err);
  process.exit(1);
});
