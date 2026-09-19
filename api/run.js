const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://tysonsingh056_db_user:Aa327538%40@vanguard.ko1tjkw.mongodb.net/?retryWrites=true&w=majority";
let cachedClient = null;

async function getBackendUrl() {
  try {
    if (!cachedClient) {
      cachedClient = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 });
      await cachedClient.connect();
    }
    const doc = await cachedClient.db('vanguard').collection('system_config').findOne({ key: 'active_backend' });
    if (doc && doc.url) return doc.url.replace(/\/+$/, '');
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

  const backendUrl = await getBackendUrl();
  if (!backendUrl) {
    return res.status(503).json({
      error: "Backend server is currently offline. Please launch 'python run_vanguard.py' on your computer."
    });
  }

  try {
    const targetUrl = `${backendUrl}/api/run`;
    const upstreamRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vanguard-Serverless-Proxy/1.0'
      },
      body: JSON.stringify(req.body || {})
    });

    const data = await upstreamRes.json();
    return res.status(upstreamRes.status).json(data);
  } catch (err) {
    return res.status(502).json({
      error: `Failed to communicate with backend server: ${err.message}`
    });
  }
};
