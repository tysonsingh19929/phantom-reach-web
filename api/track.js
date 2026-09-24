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

  // Prevent header injection / CRLF splitting
  if (/[\r\n\x00-\x1F\x7F]/.test(cleaned)) {
    return '/exchange';
  }

  // Allow safe relative paths, blocking protocol-relative URLs (e.g., //evil.com, /\evil.com, / evil.com)
  if (cleaned.startsWith('/') && !cleaned.startsWith('//') && !cleaned.startsWith('/\\') && !cleaned.startsWith('/ ')) {
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
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) || req.socket.remoteAddress || '127.0.0.1';
  const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex').substring(0, 16);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const now = Math.floor(Date.now() / 1000);
  const trkToken = crypto.randomBytes(8).toString('hex');

  // Append deterministic attribution token to destination URL
  let redirectLocation = targetUrl;
  try {
    if (redirectLocation.startsWith('http://') || redirectLocation.startsWith('https://')) {
      const parsedUrl = new URL(redirectLocation);
      parsedUrl.searchParams.set('vng_trk', trkToken);
      redirectLocation = parsedUrl.toString();
    } else {
      const delimiter = redirectLocation.includes('?') ? '&' : '?';
      redirectLocation = `${redirectLocation}${delimiter}vng_trk=${trkToken}`;
    }
  } catch (_) {
    const delimiter = redirectLocation.includes('?') ? '&' : '?';
    redirectLocation = `${redirectLocation}${delimiter}vng_trk=${trkToken}`;
  }

  // Set 30-day attribution cookie (single declaration)
  const isHttps = req.headers['x-forwarded-proto'] === 'https' || (req.headers.host && !req.headers.host.includes('localhost'));
  const secureFlag = isHttps ? '; Secure' : '';
  const cookieHeader = `vanguard_attr=${encodeURIComponent(uid)}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly${secureFlag}`;
  res.setHeader('Set-Cookie', cookieHeader);

  // Await attribution recording in serverless environment to prevent premature runtime termination
  try {
    const db = await getDb();
    const attributionsCol = db.collection('campaign_attributions');
    const participationsCol = db.collection('campaign_participations');

    const attributionRecord = {
      campaign_id: cid,
      creator_id: uid,
      token: trkToken,
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
    console.error('[TRACK] Attribution recording error:', err.message);
  }

  // Redirection after attribution tasks settle (<25ms with pooled Mongo connection)
  res.writeHead(302, { Location: redirectLocation });
  res.end();
};
