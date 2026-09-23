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
    if (doc && doc.url && doc.status === 'online') {
      const now = Date.now() / 1000;
      if (!doc.last_heartbeat || (now - doc.last_heartbeat < 180)) {
        return doc.url.replace(/\/+$/, '');
      }
    }
  } catch (err) {
    console.error('Mongo error in proxy:', err);
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const backendUrl = await getBackendUrl();
  if (!backendUrl) {
    return res.status(503).json({
      error: "Backend server is currently offline. Please launch 'start_vanguard.bat' on your computer."
    });
  }

  let subpath = '';
  if (Array.isArray(req.query.path)) {
    subpath = req.query.path.join('/');
  } else if (req.query.path) {
    subpath = req.query.path;
  } else {
    const m = req.url.match(/^\/api\/(.*?)(?:\?|$)/);
    subpath = m ? m[1] : '';
  }

  // Preserve query string from original URL if any
  const queryIdx = req.url.indexOf('?');
  let queryString = '';
  if (queryIdx !== -1) {
    const params = new URLSearchParams(req.url.slice(queryIdx));
    params.delete('path'); // Remove vercel rewrite param
    const qs = params.toString();
    if (qs) queryString = '?' + qs;
  }

  const targetUrl = `${backendUrl}/api/${subpath}${queryString}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'User-Agent': 'Vanguard-Serverless-Proxy/1.0',
        ...(req.headers['authorization'] ? { 'Authorization': req.headers['authorization'] } : {}),
        ...(req.headers['content-type'] ? { 'Content-Type': req.headers['content-type'] } : {})
      }
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const upstreamRes = await fetch(targetUrl, fetchOptions);

    const contentType = upstreamRes.headers.get('content-type') || '';
    res.status(upstreamRes.status);
    
    if (contentType) res.setHeader('Content-Type', contentType);
    const contentDisp = upstreamRes.headers.get('content-disposition');
    if (contentDisp) res.setHeader('Content-Disposition', contentDisp);

    if (contentType.includes('application/json')) {
      const data = await upstreamRes.json();
      return res.json(data);
    } else {
      const buffer = await upstreamRes.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }
  } catch (err) {
    return res.status(502).json({
      error: `Proxy communication error (${subpath}): ${err.message}`
    });
  }
};
