const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const uri = process.env.MONGODB_URI || "mongodb+srv://tysonsingh056_db_user:Aa327538%40@vanguard.ko1tjkw.mongodb.net/?retryWrites=true&w=majority";
const dbName = process.env.MONGODB_DB || "vanguard";

let clientPromise;
if (!global._mongoClientPromise) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10
  });
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}

const SEED_CAMPAIGNS = [
  {
    campaign_id: 'cmp_apex_gear',
    brand_name: 'Apex Performance Gear',
    title: 'Apex Performance Gear - High-Performance Athletic & Fitness Wear',
    category: 'Fitness',
    description: 'Performance apparel engineered for elite conditioning, running, and functional training. Seeking fitness creators, trainers, and athletes.',
    escrow_pool: 12500,
    rev_share_percentage: 18,
    rev_share_type: 'Sales Rev-Share',
    deliverables: '1x Dedicated Reel / TikTok, 2x Story Sequences, Link in Bio',
    participant_cap: 50,
    participating_creators: 14,
    creator_ids: [],
    target_audience: 'Fitness Enthusiasts, Athletes, Gym Goers (20-40)',
    destination_url: 'https://apexperformancegear.com/vanguard',
    status: 'active',
    verified: true,
    created_at: 1727136000
  },
  {
    campaign_id: 'cmp_lumina_labs',
    brand_name: 'Lumina Skin Labs',
    title: 'Lumina Skin Labs - Dermatological Skincare & Barrier Restoration',
    category: 'Beauty & Skincare',
    description: 'Clinical dermatological formulations focused on peptide barrier repair and gentle active recovery. Seeking skincare and aesthetic creators.',
    escrow_pool: 8000,
    rev_share_percentage: 22,
    rev_share_type: 'Sales Rev-Share',
    deliverables: '1x Ingredient Deep-Dive Reel / YouTube Short, Routine Showcase',
    participant_cap: 40,
    participating_creators: 9,
    creator_ids: [],
    target_audience: 'Skincare Aficionados, Dermatological Care, Clean Beauty (22-45)',
    destination_url: 'https://luminaskinlabs.com/vanguard',
    status: 'active',
    verified: true,
    created_at: 1727136000
  },
  {
    campaign_id: 'cmp_flowmetrics',
    brand_name: 'SaaS FlowMetrics',
    title: 'SaaS FlowMetrics - Productivity & AI Workflow Analytics',
    category: 'SaaS',
    description: 'Automated workflow telemetry and task optimization platform for modern distributed engineering and product teams.',
    escrow_pool: 15000,
    rev_share_percentage: 30,
    rev_share_type: 'Recurring Rev-Share',
    deliverables: '1x Workflow Demonstration Video / Reel, X/Twitter Product Thread',
    participant_cap: 30,
    participating_creators: 18,
    creator_ids: [],
    target_audience: 'Tech Founders, Developers, Product Managers, Solopreneurs',
    destination_url: 'https://flowmetrics.io/vanguard',
    status: 'active',
    verified: true,
    created_at: 1727136000
  },
  {
    campaign_id: 'cmp_artisan_coffee',
    brand_name: 'Artisan Roast Coffee Co.',
    title: 'Artisan Roast Coffee Co. - Single-Origin Specialty Coffee & Cafes',
    category: 'Food & Beverage',
    description: 'Direct-trade micro-lot specialty coffees sourced sustainably from high-altitude estates worldwide. Seeking lifestyle, culinary, and cafe creators.',
    escrow_pool: 5000,
    rev_share_percentage: 15,
    rev_share_type: 'Sales Rev-Share',
    deliverables: '1x Aesthetic Morning Brew Reel / TikTok, Product Tasting Review',
    participant_cap: 35,
    participating_creators: 11,
    creator_ids: [],
    target_audience: 'Specialty Coffee Enthusiasts, Foodies, Aesthetic Lifestyle (21-45)',
    destination_url: 'https://artisanroastcoffee.com/vanguard',
    status: 'active',
    verified: true,
    created_at: 1727136000
  }
];

async function ensureSeedData(campaignsCol, escrowLedgerCol) {
  try {
    const count = await campaignsCol.countDocuments({});
    if (count === 0) {
      await campaignsCol.insertMany(SEED_CAMPAIGNS);
      const ledgerEntries = SEED_CAMPAIGNS.map(c => ({
        ledger_id: `led_${c.campaign_id}_init`,
        campaign_id: c.campaign_id,
        brand_name: c.brand_name,
        amount: c.escrow_pool,
        currency: 'USD',
        type: 'ESCROW_FUNDING',
        status: 'verified',
        tx_hash: `0x${crypto.createHash('sha256').update(c.campaign_id).digest('hex')}`,
        timestamp: c.created_at
      }));
      await escrowLedgerCol.insertMany(ledgerEntries);
    }
  } catch (err) {
    console.error('[CAMPAIGNS] Seed initialization warning:', err.message);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let action = (req.query.action || '').toLowerCase();
  if (!action && req.query.path) {
    const p = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    action = p.replace(/^campaigns\/?/, '').toLowerCase();
  }
  if (!action) {
    const m = (req.url || '').match(/^\/api\/campaigns\/?([^?]*)/);
    action = m ? m[1].toLowerCase() : '';
  }
  action = action.replace(/\/+$/, '');

  let db;
  let campaignsCol;
  let escrowLedgerCol;
  let participationsCol;

  try {
    db = await getDb();
    campaignsCol = db.collection('campaigns');
    escrowLedgerCol = db.collection('campaign_escrow_ledger');
    participationsCol = db.collection('campaign_participations');
    await ensureSeedData(campaignsCol, escrowLedgerCol);
  } catch (dbErr) {
    console.error('[CAMPAIGNS] Database connection warning:', dbErr.message);
  }

  // 1. JOIN CAMPAIGN: POST /api/campaigns/join or POST with action=join
  if (req.method === 'POST' && (action === 'join' || (req.body && (typeof req.body === 'object' ? req.body.action : '') === 'join'))) {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const campaignId = (body.campaign_id || req.query.campaign_id || req.query.cid || '').trim();
      const creatorId = (body.creator_id || body.user_id || body.uid || req.query.uid || `usr_anon_${crypto.randomBytes(4).toString('hex')}`).trim();

      if (!campaignId) {
        return res.status(400).json({ success: false, error: 'Campaign ID is required' });
      }

      let campaign = null;
      if (campaignsCol) {
        campaign = await campaignsCol.findOne({ campaign_id: campaignId });
      } else {
        campaign = SEED_CAMPAIGNS.find(c => c.campaign_id === campaignId) || null;
      }

      if (!campaign) {
        return res.status(404).json({ success: false, error: 'Campaign not found' });
      }

      const trackingToken = `trk_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
      const host = req.headers.host || 'socialbyvanguard.com';
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const destination = campaign.destination_url || 'https://socialbyvanguard.com';
      const trackingUrl = `${proto}://${host}/api/track?cid=${encodeURIComponent(campaignId)}&uid=${encodeURIComponent(creatorId)}&dest=${encodeURIComponent(destination)}`;

      if (participationsCol && campaignsCol) {
        const now = Math.floor(Date.now() / 1000);
        await participationsCol.updateOne(
          { campaign_id: campaignId, user_id: creatorId },
          {
            $setOnInsert: {
              campaign_id: campaignId,
              user_id: creatorId,
              creator_id: creatorId,
              tracking_token: trackingToken,
              tracking_url: trackingUrl,
              joined_at: now,
              status: 'active',
              clicks: 0,
              conversions: 0,
              revenue_generated: 0
            }
          },
          { upsert: true }
        );

        await campaignsCol.updateOne(
          { campaign_id: campaignId },
          {
            $addToSet: { creator_ids: creatorId },
            $inc: { participating_creators: 1 }
          }
        );
      }

      return res.status(200).json({
        success: true,
        tracking_url: trackingUrl,
        campaign_id: campaignId
      });
    } catch (err) {
      console.error('[CAMPAIGNS] Join error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 2. CREATE CAMPAIGN: POST /api/campaigns
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const brandName = (body.brand_name || body.brand || '').trim();
      const title = (body.title || brandName || '').trim();

      if (!brandName && !title) {
        return res.status(400).json({ success: false, error: 'Brand name or title is required' });
      }

      const campaignId = `cmp_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
      const escrowAmount = Number(body.escrow_pool || body.bounty || 0);
      const revSharePct = Number(body.rev_share_percentage || body.rev_share || 0);
      const now = Math.floor(Date.now() / 1000);

      const newCampaign = {
        campaign_id: campaignId,
        brand_name: brandName || title,
        title: title || brandName,
        category: body.category || 'General',
        description: body.description || '',
        escrow_pool: escrowAmount,
        rev_share_percentage: revSharePct,
        rev_share_type: body.rev_share_type || 'Sales Rev-Share',
        deliverables: body.deliverables || 'Social Deliverables, Link in Bio',
        participant_cap: Number(body.participant_cap || 50),
        participating_creators: 0,
        creator_ids: [],
        target_audience: body.target_audience || 'General Audience',
        destination_url: body.destination_url || 'https://socialbyvanguard.com',
        status: 'active',
        verified: true,
        created_by: body.user_id || body.created_by || 'institutional_partner',
        created_at: now
      };

      if (campaignsCol) {
        await campaignsCol.insertOne(newCampaign);
      }

      if (escrowLedgerCol) {
        const ledgerEntry = {
          ledger_id: `led_${campaignId}_funding`,
          campaign_id: campaignId,
          brand_name: newCampaign.brand_name,
          amount: escrowAmount,
          currency: 'USD',
          type: 'ESCROW_FUNDING',
          status: 'verified',
          tx_hash: `0x${crypto.randomBytes(32).toString('hex')}`,
          timestamp: now
        };
        await escrowLedgerCol.insertOne(ledgerEntry);
      }

      return res.status(201).json({
        success: true,
        campaign_id: campaignId
      });
    } catch (err) {
      console.error('[CAMPAIGNS] Create error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 3. GET CAMPAIGN DETAILS OR LISTING
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=180');

    // Single campaign lookup if action matches campaign_id
    if (action && action.startsWith('cmp_')) {
      try {
        let single = null;
        if (campaignsCol) {
          single = await campaignsCol.findOne({ campaign_id: action });
        } else {
          single = SEED_CAMPAIGNS.find(c => c.campaign_id === action) || null;
        }
        if (!single) {
          return res.status(404).json({ success: false, error: 'Campaign not found' });
        }
        return res.status(200).json({ success: true, campaign: single });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    try {
      const queryFilter = {};

      if (req.query.status && req.query.status !== 'all') {
        queryFilter.status = req.query.status;
      } else {
        queryFilter.status = { $ne: 'archived' };
      }

      if (req.query.category && req.query.category !== 'all') {
        queryFilter.category = new RegExp(`^${req.query.category.trim()}$`, 'i');
      }

      if (req.query.search) {
        const term = req.query.search.trim();
        queryFilter.$or = [
          { brand_name: new RegExp(term, 'i') },
          { title: new RegExp(term, 'i') },
          { description: new RegExp(term, 'i') }
        ];
      }

      let campaigns = [];
      let allActive = [];

      if (campaignsCol) {
        campaigns = await campaignsCol.find(queryFilter).sort({ created_at: -1 }).toArray();
        allActive = await campaignsCol.find({ status: 'active' }).toArray();
      } else {
        campaigns = SEED_CAMPAIGNS.filter(c => {
          if (queryFilter.status && typeof queryFilter.status === 'string' && c.status !== queryFilter.status) return false;
          if (req.query.category && req.query.category !== 'all' && c.category.toLowerCase() !== req.query.category.toLowerCase()) return false;
          return true;
        });
        allActive = SEED_CAMPAIGNS.filter(c => c.status === 'active');
      }

      const totalEscrowPool = allActive.reduce((sum, c) => sum + (Number(c.escrow_pool) || 0), 0);
      const participatingCreators = allActive.reduce((sum, c) => sum + (Number(c.participating_creators) || 0), 0);

      const stats = {
        total_escrow_pool: totalEscrowPool,
        active_campaigns: allActive.length,
        participating_creators: participatingCreators
      };

      return res.status(200).json({
        campaigns,
        stats
      });
    } catch (err) {
      console.error('[CAMPAIGNS] List error:', err);
      const fallbackTotalEscrow = SEED_CAMPAIGNS.reduce((sum, c) => sum + c.escrow_pool, 0);
      const fallbackCreators = SEED_CAMPAIGNS.reduce((sum, c) => sum + c.participating_creators, 0);
      return res.status(200).json({
        campaigns: SEED_CAMPAIGNS,
        stats: {
          total_escrow_pool: fallbackTotalEscrow,
          active_campaigns: SEED_CAMPAIGNS.length,
          participating_creators: fallbackCreators
        }
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
