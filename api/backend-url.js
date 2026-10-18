const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://tysonsingh056_db_user:Aa327538%40@vanguard.ko1tjkw.mongodb.net/?retryWrites=true&w=majority";
let cachedClient = null;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!cachedClient) {
      cachedClient = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 });
      await cachedClient.connect();
    }
    const db = cachedClient.db('vanguard');
    const doc = await db.collection('system_config').findOne({ key: 'active_backend' });

    if (doc && doc.url && doc.status === 'online') {
      return res.status(200).json({
        status: 'online',
        ready: true
      });
    }
    return res.status(200).json({
      status: 'provisioning',
      ready: false
    });
  } catch (err) {
    return res.status(200).json({
      status: 'ready',
      ready: true
    });
  }
};
