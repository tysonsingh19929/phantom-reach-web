const campaignsHandler = require('./api/campaigns');
const trackHandler = require('./api/track');
const creatorsHandler = require('./api/creators');

function createMockReqRes({ method = 'GET', url = '/', query = {}, body = {}, headers = {} }) {
  const req = {
    method,
    url,
    query,
    body,
    headers: {
      host: 'localhost:3000',
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
    end() {
      this.ended = true;
      return this;
    }
  };

  return { req, res };
}

async function runTests() {
  console.log('[TEST] Starting Backend APIs Verification Suite...');
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

  // TEST 1: GET /api/campaigns
  try {
    const { req, res } = createMockReqRes({ method: 'GET', url: '/api/campaigns', query: {} });
    await campaignsHandler(req, res);

    assert(res.statusCode === 200, 'GET /api/campaigns returns 200 status code');
    assert(res.headers['cache-control'] === 'public, s-maxage=30, stale-while-revalidate=180', 'GET /api/campaigns sets correct Cache-Control header');
    assert(res.body && Array.isArray(res.body.campaigns), 'GET /api/campaigns returns campaigns array');
    assert(res.body && res.body.stats && typeof res.body.stats === 'object', 'GET /api/campaigns returns stats object');
    assert(res.body.campaigns.length >= 4, `GET /api/campaigns returns at least 4 seeded campaigns (got ${res.body?.campaigns?.length})`);
    assert(res.body.stats.total_escrow_pool >= 40500, `GET /api/campaigns calculates total_escrow_pool correctly ($${res.body?.stats?.total_escrow_pool})`);
    assert(res.body.stats.active_campaigns >= 4, `GET /api/campaigns active_campaigns count >= 4 (got ${res.body?.stats?.active_campaigns})`);
  } catch (err) {
    console.error('[FAIL] GET /api/campaigns test exception:', err);
    failed++;
  }

  // TEST 2: Category Filter on /api/campaigns
  try {
    const { req, res } = createMockReqRes({ method: 'GET', url: '/api/campaigns?category=Fitness', query: { category: 'Fitness' } });
    await campaignsHandler(req, res);

    assert(res.statusCode === 200, 'GET /api/campaigns?category=Fitness returns 200 status code');
    assert(res.body.campaigns.every(c => c.category.toLowerCase().includes('fitness')), 'Category filter returns only matching campaigns');
  } catch (err) {
    console.error('[FAIL] Category filter test exception:', err);
    failed++;
  }

  // TEST 3: POST /api/campaigns (Create Campaign)
  let createdCampaignId = null;
  try {
    const newCampData = {
      brand_name: 'Vanguard Cybernetics',
      title: 'Vanguard Cybernetics Enterprise AI Campaign',
      category: 'SaaS',
      description: 'Institutional campaign testing escrow recording and verification.',
      escrow_pool: 25000,
      rev_share_percentage: 25,
      rev_share_type: 'Sales Rev-Share',
      deliverables: '1x Architectural Breakdown Reel, 1x Technical Case Study',
      destination_url: 'https://vanguard.ai/enterprise'
    };
    const { req, res } = createMockReqRes({ method: 'POST', url: '/api/campaigns', body: newCampData });
    await campaignsHandler(req, res);

    assert(res.statusCode === 201, 'POST /api/campaigns returns 201 Created');
    assert(res.body && res.body.success === true, 'POST /api/campaigns returns success: true');
    assert(res.body && typeof res.body.campaign_id === 'string' && res.body.campaign_id.startsWith('cmp_'), 'POST /api/campaigns returns formatted campaign_id');
    createdCampaignId = res.body ? res.body.campaign_id : null;
  } catch (err) {
    console.error('[FAIL] POST /api/campaigns test exception:', err);
    failed++;
  }

  // TEST 4: POST /api/campaigns/join (Join Campaign)
  try {
    const joinData = {
      campaign_id: createdCampaignId || 'cmp_apex_gear',
      creator_id: 'usr_test_creator_001'
    };
    const { req, res } = createMockReqRes({ method: 'POST', url: '/api/campaigns/join', query: { action: 'join' }, body: joinData });
    await campaignsHandler(req, res);

    assert(res.statusCode === 200, 'POST /api/campaigns/join returns 200 OK');
    assert(res.body && res.body.success === true, 'POST /api/campaigns/join returns success: true');
    assert(res.body && typeof res.body.tracking_url === 'string' && res.body.tracking_url.includes('/api/track?cid='), 'POST /api/campaigns/join returns valid tracking_url');
    assert(res.body && res.body.campaign_id === (createdCampaignId || 'cmp_apex_gear'), 'POST /api/campaigns/join returns matching campaign_id');
  } catch (err) {
    console.error('[FAIL] POST /api/campaigns/join test exception:', err);
    failed++;
  }

  // TEST 5: GET /api/track (302 Redirect with Cookie)
  try {
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/track?cid=cmp_apex_gear&uid=usr_test_creator_001&dest=https%3A%2F%2Fapexperformancegear.com%2Fvanguard',
      query: {
        cid: 'cmp_apex_gear',
        uid: 'usr_test_creator_001',
        dest: 'https://apexperformancegear.com/vanguard'
      }
    });
    await trackHandler(req, res);

    assert(res.statusCode === 302, 'GET /api/track returns 302 Redirect');
    assert(res.headers['location'] === 'https://apexperformancegear.com/vanguard', 'GET /api/track redirects to correct destination');
    assert(res.headers['set-cookie'] && res.headers['set-cookie'].includes('vanguard_attr=usr_test_creator_001'), 'GET /api/track sets vanguard_attr cookie');
    assert(res.headers['set-cookie'] && res.headers['set-cookie'].includes('Max-Age=2592000'), 'GET /api/track sets 30-day cookie expiry');
    assert(res.headers['set-cookie'] && res.headers['set-cookie'].includes('HttpOnly'), 'GET /api/track sets HttpOnly attribute');
  } catch (err) {
    console.error('[FAIL] GET /api/track test exception:', err);
    failed++;
  }

  // TEST 6: GET /api/creators
  try {
    const { req, res } = createMockReqRes({ method: 'GET', url: '/api/creators', query: {} });
    await creatorsHandler(req, res);

    assert(res.statusCode === 200, 'GET /api/creators returns 200 status code');
    assert(res.headers['cache-control'] === 'public, s-maxage=60, stale-while-revalidate=300', 'GET /api/creators sets Edge CDN Cache-Control header');
    assert(res.body && Array.isArray(res.body.creators), 'GET /api/creators returns creators array');
    assert(res.body.creators.length >= 8, `GET /api/creators returns at least 8 curated creators (got ${res.body?.creators?.length})`);
  } catch (err) {
    console.error('[FAIL] GET /api/creators test exception:', err);
    failed++;
  }

  // TEST 7: Filter /api/creators by City and Niche
  try {
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/creators?city=London&niche=Beauty',
      query: { city: 'London', niche: 'Beauty' }
    });
    await creatorsHandler(req, res);

    assert(res.statusCode === 200, 'GET /api/creators with filters returns 200 OK');
    assert(res.body.creators.length > 0, 'GET /api/creators finds creators matching London + Beauty');
    assert(res.body.creators.every(c => c.city.toLowerCase().includes('london')), 'Creators match city filter');
  } catch (err) {
    console.error('[FAIL] GET /api/creators filtering test exception:', err);
    failed++;
  }

  // TEST 8: Zero-Emoji Compliance Check
  try {
    const fs = require('fs');
    const filesToCheck = [
      'api/campaigns.js',
      'api/track.js',
      'api/creators.js',
      'vercel.json'
    ];
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    let hasEmoji = false;
    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, 'utf8');
      if (emojiRegex.test(content)) {
        hasEmoji = true;
        console.error(`[FAIL] Emoji detected in ${file}`);
      }
    }
    assert(!hasEmoji, 'Strict zero-emoji compliance verified across all created and modified files');
  } catch (err) {
    console.error('[FAIL] Zero-emoji audit exception:', err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('[FATAL] Unhandled test error:', err);
  process.exit(1);
});
