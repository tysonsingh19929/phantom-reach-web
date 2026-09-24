const { getDb } = require('./_db');

function escapeRegex(str) {
  return typeof str === 'string' ? str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') : '';
}

const SEED_CREATORS = [
  {
    creator_id: 'cr_marcus_vance',
    handle: '@marcusvance',
    name: 'Marcus Vance',
    niche: 'Fitness',
    city: 'New York',
    follower_tier: 'Macro',
    followers: 480000,
    followers_formatted: '480K',
    platform: 'Instagram',
    engagement_rate: 4.8,
    omniscore: 92,
    base_rate_usd: 1850,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Elite conditioning coach and endurance athlete based in Manhattan.',
    verified: true,
    created_at: 1727136000
  },
  {
    creator_id: 'cr_elena_rostova',
    handle: '@elenarostova',
    name: 'Elena Rostova',
    niche: 'Beauty & Skincare',
    city: 'London',
    follower_tier: 'Mid-Tier',
    followers: 185000,
    followers_formatted: '185K',
    platform: 'TikTok',
    engagement_rate: 6.2,
    omniscore: 89,
    base_rate_usd: 950,
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    bio: 'Biochemist turned cosmetic formulator reviewing clinical skincare formulations.',
    verified: true,
    created_at: 1727136000
  },
  {
    creator_id: 'cr_david_chen',
    handle: '@davidchen_ai',
    name: 'David Chen',
    niche: 'SaaS & Tech',
    city: 'San Francisco',
    follower_tier: 'Macro',
    followers: 310000,
    followers_formatted: '310K',
    platform: 'YouTube',
    engagement_rate: 5.4,
    omniscore: 95,
    base_rate_usd: 2400,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'AI tools educator and software systems architect based in the Bay Area.',
    verified: true,
    created_at: 1727136000
  },
  {
    creator_id: 'cr_maya_lin',
    handle: '@mayalincrafts',
    name: 'Maya Lin',
    niche: 'Food & Beverage',
    city: 'Los Angeles',
    follower_tier: 'Mid-Tier',
    followers: 140000,
    followers_formatted: '140K',
    platform: 'Instagram',
    engagement_rate: 7.1,
    omniscore: 91,
    base_rate_usd: 800,
    avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    bio: 'Specialty coffee roaster and culinary visual storyteller in Venice Beach.',
    verified: true,
    created_at: 1727136000
  },
  {
    creator_id: 'cr_arjun_mehta',
    handle: '@arjunmehtafit',
    name: 'Arjun Mehta',
    niche: 'Fitness',
    city: 'Mumbai',
    follower_tier: 'Micro',
    followers: 45000,
    followers_formatted: '45K',
    platform: 'Instagram',
    engagement_rate: 8.5,
    omniscore: 88,
    base_rate_usd: 400,
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    bio: 'Functional movement specialist and calisthenics instructor.',
    verified: true,
    created_at: 1727136000
  },
  {
    creator_id: 'cr_sophie_laurent',
    handle: '@sophielaurent_ai',
    name: 'Sophie Laurent',
    niche: 'SaaS & Tech',
    city: 'Paris',
    follower_tier: 'Mid-Tier',
    followers: 95000,
    followers_formatted: '95K',
    platform: 'LinkedIn',
    engagement_rate: 6.8,
    omniscore: 93,
    base_rate_usd: 1100,
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    bio: 'B2B growth strategist and product marketing consultant.',
    verified: true,
    created_at: 1727136000
  },
  {
    creator_id: 'cr_liam_oconnor',
    handle: '@liamcreates',
    name: 'Liam O\'Connor',
    niche: 'Art & Design',
    city: 'Berlin',
    follower_tier: 'Micro',
    followers: 62000,
    followers_formatted: '62K',
    platform: 'Instagram',
    engagement_rate: 9.1,
    omniscore: 90,
    base_rate_usd: 550,
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    bio: 'Visual artist and 3D motion designer creating commercial branding.',
    verified: true,
    created_at: 1727136000
  },
  {
    creator_id: 'cr_sarah_jenkins',
    handle: '@sarahj_style',
    name: 'Sarah Jenkins',
    niche: 'Fashion & Lifestyle',
    city: 'Chicago',
    follower_tier: 'Macro',
    followers: 520000,
    followers_formatted: '520K',
    platform: 'Instagram',
    engagement_rate: 4.1,
    omniscore: 90,
    base_rate_usd: 2100,
    avatar_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
    bio: 'Minimalist fashion editor and sustainable wardrobe stylist.',
    verified: true,
    created_at: 1727136000
  }
];

let isCreatorsSeeded = false;

async function ensureSeedCreators(creatorsCol) {
  if (isCreatorsSeeded) return;
  try {
    const count = await creatorsCol.countDocuments({});
    if (count === 0) {
      await creatorsCol.insertMany(SEED_CREATORS);
    }
    isCreatorsSeeded = true;
  } catch (err) {
    console.error('[CREATORS] Seed warning:', err.message);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Edge CDN Cache headers
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  const niche = (req.query.niche || '').trim();
  const city = (req.query.city || '').trim();
  const tier = (req.query.follower_tier || req.query.tier || '').trim();
  const search = (req.query.search || '').trim();

  let db = null;
  let creatorsCol = null;

  try {
    db = await getDb();
    creatorsCol = db.collection('creator_profiles');
    await ensureSeedCreators(creatorsCol);
  } catch (dbErr) {
    console.error('[CREATORS] Database connection warning:', dbErr.message);
  }

  try {
    const queryFilter = {};

    if (niche && niche.toLowerCase() !== 'all') {
      queryFilter.niche = new RegExp(escapeRegex(niche), 'i');
    }

    if (city && city.toLowerCase() !== 'all') {
      queryFilter.city = new RegExp(escapeRegex(city), 'i');
    }

    if (tier && tier.toLowerCase() !== 'all') {
      queryFilter.follower_tier = new RegExp(escapeRegex(tier), 'i');
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      queryFilter.$or = [
        { name: new RegExp(safeSearch, 'i') },
        { handle: new RegExp(safeSearch, 'i') },
        { niche: new RegExp(safeSearch, 'i') },
        { bio: new RegExp(safeSearch, 'i') }
      ];
    }

    let creators = [];
    if (creatorsCol) {
      creators = await creatorsCol.find(queryFilter).sort({ omniscore: -1, followers: -1 }).toArray();
    } else {
      creators = SEED_CREATORS.filter(c => {
        if (niche && niche.toLowerCase() !== 'all' && !c.niche.toLowerCase().includes(niche.toLowerCase())) return false;
        if (city && city.toLowerCase() !== 'all' && !c.city.toLowerCase().includes(city.toLowerCase())) return false;
        if (tier && tier.toLowerCase() !== 'all' && !c.follower_tier.toLowerCase().includes(tier.toLowerCase())) return false;
        if (search) {
          const s = search.toLowerCase();
          const match = c.name.toLowerCase().includes(s) || c.handle.toLowerCase().includes(s) || c.niche.toLowerCase().includes(s);
          if (!match) return false;
        }
        return true;
      });
    }

    return res.status(200).json({
      creators
    });
  } catch (err) {
    console.error('[CREATORS] Query error:', err);
    return res.status(200).json({
      creators: SEED_CREATORS
    });
  }
};
