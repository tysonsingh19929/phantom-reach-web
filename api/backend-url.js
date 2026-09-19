const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://tysonsingh056_db_user:Aa327538%40@vanguard.ko1tjkw.mongodb.net/?retryWrites=true&w=majority";
let cachedClient = null;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!cachedClient) {
      cachedClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await cachedClient.connect();
    }
    const db = cachedClient.db('vanguard');
    const col = db.collection('system_config');
    const doc = await col.findOne({ key: 'active_backend' });

    if (doc && doc.url) {
      return res.status(200).json({ url: doc.url, status: 'online', mode: doc.mode || 'tunnel' });
    }
    return res.status(200).json({ url: '', status: 'offline' });
  } catch (err) {
    return res.status(200).json({ url: '', error: err.message, status: 'offline' });
  }
};
