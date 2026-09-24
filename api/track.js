const crypto = require('crypto');
const { getDb } = require('./_db');

const TRUSTED_DOMAINS = [
  'socialbyvanguard.com',
  'vanguard.ai',
  'apexperformancegear.com',
  'luminaskinlabs.com',
  'flowmetrics.io',
  'artisanroastcoffee.com',
  'localhost'
];

function sanitizeDestination(dest) {
  if (!dest || typeof dest !== 'string') {
    return '/exchange';
  }

  let cleaned = dest.trim();
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch (_) {}

  // Allow safe relative paths, blocking protocol-relative URLs (e.g., //evil.com)
  if (cleaned.startsWith('/') && !cleaned.startsWith('//')) {
    return cleaned;
  }

  try {
    // Add protocol if missing for URL parsing
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = `https://${cleaned}`;
    }

    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '/exchange';
    }

    const hostname = parsed.hostname.toLowerCase();
    const isTrusted = TRUSTED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (isTrusted) {
      return parsed.toString();
    }
  } catch (_) {
    // URL parsing failed
  }

  return '/exchange';
}

module.exports = async (req, res) => {
  const cid = (req.query.cid || req.query.campaign_id || '').trim();
  const uid = (req.query.uid || req.query.creator_id || 'anonymous').trim();
  const rawDest = (req.query.dest || req.query.target || '').trim();

  // Validate and sanitize destination to prevent open redirection
  const targetUrl = sanitizeDestination(rawDest);

  // Client IP hashing for privacy-compliant analytics
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 16);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const now = Math.floor(Date.now() / 1000);

  // Set 30-day attribution cookie (single declaration)
  const cookieHeader = `vanguard_attr=${encodeURIComponent(uid)}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly`;
  res.setHeader('Set-Cookie', cookieHeader);

  // Immediate 302 Redirection (<25ms latency guarantee without blocking on remote DB I/O)
  res.writeHead(302, { Location: targetUrl });
  res.end();

  // Background asynchronous attribution recording
  setImmediate(async () => {
    try {
      const db = await getDb();
      const attributionsCol = db.collection('campaign_attributions');
      const participationsCol = db.collection('campaign_participations');

      const attributionRecord = {
        campaign_id: cid,
        creator_id: uid,
        destination: targetUrl,
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
      console.error('[TRACK] Background attribution warning:', err.message);
    }
  });
};
