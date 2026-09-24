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

module.exports = async (req, res) => {
  const cid = (req.query.cid || req.query.campaign_id || '').trim();
  const uid = (req.query.uid || req.query.creator_id || 'anonymous').trim();
  let dest = (req.query.dest || req.query.target || '').trim();

  // Validate or fallback destination URL
  if (!dest) {
    dest = 'https://socialbyvanguard.com/exchange';
  } else {
    try {
      dest = decodeURIComponent(dest);
    } catch (_) {}
  }

  // Ensure absolute protocol
  if (!dest.startsWith('http://') && !dest.startsWith('https://') && !dest.startsWith('/')) {
    dest = `https://${dest}`;
  }

  // Client IP hashing for privacy-compliant analytics
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 16);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const now = Math.floor(Date.now() / 1000);

  // Set 30-day attribution cookie (Max-Age=2592000 corresponds to 30 days)
  const cookieHeader = `vanguard_attr=${encodeURIComponent(uid)}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly`;
  res.setHeader('Set-Cookie', cookieHeader);

  // Asynchronously record attribution and increment clicks
  try {
    const db = await getDb();
    const attributionsCol = db.collection('campaign_attributions');
    const participationsCol = db.collection('campaign_participations');

    const attributionRecord = {
      campaign_id: cid,
      creator_id: uid,
      destination: dest,
      ip_hash: ipHash,
      user_agent: userAgent,
      timestamp: now
    };

    const tasks = [attributionsCol.insertOne(attributionRecord)];

    if (cid && uid && uid !== 'anonymous') {
      tasks.push(
        participationsCol.updateOne(
          { campaign_id: cid, user_id: uid },
          { $inc: { clicks: 1 } }
        )
      );
    }

    await Promise.allSettled(tasks);
  } catch (err) {
    console.error('[TRACK] Attribution logging warning:', err.message);
  }

  // Fast 302 Redirection
  res.writeHead(302, {
    'Location': dest,
    'Set-Cookie': cookieHeader
  });
  return res.end();
};
