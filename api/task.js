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
  } catch (err) {}
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const taskId = req.query.id || req.query.task_id;
  if (!taskId) return res.status(400).json({ error: "Missing task ID" });

  const backendUrl = await getBackendUrl();
  if (!backendUrl) return res.status(503).json({ error: "Backend offline" });

  try {
    const targetUrl = `${backendUrl}/api/tasks/${taskId}`;
    const upstreamRes = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Vanguard-Serverless-Proxy/1.0' }
    });
    const data = await upstreamRes.json();
    return res.status(upstreamRes.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
