const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://tysonsingh056_db_user:Aa327538%40@vanguard.ko1tjkw.mongodb.net/?retryWrites=true&w=majority";
let cachedClient = null;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

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

    if (doc && doc.url && doc.status === 'online') {
      const now = Date.now() / 1000;
      if (doc.last_heartbeat && (now - doc.last_heartbeat > 3600)) {
        return res.status(200).json({
          url: '',
          status: 'offline',
          message: 'Backend server heartbeat timed out (PC offline)'
        });
      }
      return res.status(200).json({
        url: doc.url,
        status: 'online',
        mode: doc.mode || 'tunnel',
        last_heartbeat: doc.last_heartbeat
      });
    }
    return res.status(200).json({
      url: '',
      status: 'offline',
      message: 'Backend server is currently offline'
    });
  } catch (err) {
    return res.status(200).json({
      url: '',
      error: err.message,
      status: 'offline'
    });
  }
};
