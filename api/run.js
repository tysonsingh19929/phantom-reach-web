const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://tysonsingh056_db_user:Aa327538%40@vanguard.ko1tjkw.mongodb.net/?retryWrites=true&w=majority";
let cachedClient = null;

// Edge in-memory rate limiting: max 6 requests per 15 minutes per IP
const ipRequests = global._vanguardIpRequests || new Map();
global._vanguardIpRequests = ipRequests;

function isRateLimited(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return false;
  const now = Date.now();
  const timestamps = (ipRequests.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  if (timestamps.length >= 6) {
    return true;
  }
  timestamps.push(now);
  ipRequests.set(ip, timestamps);
  return false;
}

async function getBackendUrl() {
  try {
    if (!cachedClient) {
      cachedClient = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 });
      await cachedClient.connect();
    }
    const doc = await cachedClient.db('vanguard').collection('system_config').findOne({ key: 'active_backend' });
    if (doc && doc.url && doc.status !== 'offline') return doc.url.replace(/\/+$/, '');
  } catch (err) {
    console.error('Mongo error in proxy:', err);
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  // Edge Abuse Protection
  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      error: "Rate limit reached. Maximum 6 intelligence extraction requests per 15 minutes per connection. Please wait a few minutes before launching additional tasks."
    });
  }

  const backendUrl = await getBackendUrl();
  if (!backendUrl) {
    return res.status(503).json({
      error: "The intelligence engine is currently provisioning resources. Please try again shortly."
    });
  }

  try {
    const targetUrl = `${backendUrl}/api/run`;
    const upstreamRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vanguard-Serverless-Proxy/1.0',
        'X-Forwarded-For': clientIp
      },
      body: JSON.stringify(req.body || {})
    });

    const data = await upstreamRes.json();
    return res.status(upstreamRes.status).json(data);
  } catch (err) {
    return res.status(502).json({
      error: "The intelligence engine encountered an upstream network delay. Please retry shortly."
    });
  }
};
