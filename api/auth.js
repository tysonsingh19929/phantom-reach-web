const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const uri = "mongodb+srv://tysonsingh056_db_user:Aa327538%40@vanguard.ko1tjkw.mongodb.net/?retryWrites=true&w=majority";
let cachedClient = null;

async function getDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await cachedClient.connect();
  }
  return cachedClient.db('vanguard');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('sha256').update(`${password}:${salt}`).digest('hex');
  return `${salt}$${hash}`;
}

function verifyPassword(stored, password) {
  try {
    const parts = stored.split('$');
    if (parts.length !== 2) return false;
    const [salt, originalHash] = parts;
    const hash = crypto.createHash('sha256').update(`${password}:${salt}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch (_) {
    return false;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let action = (req.query.action || '').toLowerCase();
  if (!action && req.query.path) {
    const p = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    action = p.replace(/^auth\/?/, '').toLowerCase();
  }
  if (!action) {
    const m = req.url.match(/^\/api\/auth\/?([^?]*)/);
    action = m ? m[1].toLowerCase() : '';
  }
  action = action.replace(/\/+$/, '');

  try {
    const db = await getDb();
    const usersCol = db.collection('users');
    const auditCol = db.collection('audit_logs');
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    // 1. REGISTER ENDPOINT
    if (action === 'register' || action === 'signup') {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
      }

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const name = (body.name || '').trim();
      const email = (body.email || '').trim().toLowerCase();
      const password = (body.password || '').trim();
      const role = (body.role || 'business').toLowerCase() === 'creator' ? 'creator' : 'business';

      if (!name) {
        return res.status(400).json({ success: false, error: 'Full name is required.' });
      }
      if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'A valid email address is required.' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
      }

      const existing = await usersCol.findOne({
        $or: [{ email: email }, { username: email }]
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email address already exists. Please sign in.'
        });
      }

      const userId = `usr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
      const now = Math.floor(Date.now() / 1000);

      const newUser = {
        user_id: userId,
        name,
        email,
        username: email,
        password_hash: hashPassword(password),
        role,
        plan: 'standard',
        status: 'active',
        daily_quota: 50,
        used_quota_today: 0,
        created_at: now,
        created_ip: clientIp
      };

      await usersCol.insertOne(newUser);

      await auditCol.insertOne({
        timestamp: now,
        action: 'USER_REGISTRATION',
        user: email,
        details: `Registered new ${role} account (${name})`,
        ip: clientIp
      });

      console.log(`[AUTH] Registered new user: ${email} (${role}, ID: ${userId})`);

      const sessionToken = `tok_${crypto.randomBytes(24).toString('hex')}`;

      return res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        token: sessionToken,
        user: {
          user_id: userId,
          name,
          email,
          role,
          plan: 'standard'
        }
      });
    }

    // 2. LOGIN ENDPOINT
    if (action === 'login' || action === 'signin') {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
      }

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const email = (body.email || body.username || '').trim().toLowerCase();
      const password = (body.password || '').trim();

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }

      const user = await usersCol.findOne({
        $or: [{ email: email }, { username: email }]
      });

      if (!user || !verifyPassword(user.password_hash || '', password)) {
        return res.status(401).json({ success: false, error: 'Invalid email address or password.' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({
          success: false,
          error: 'Your account has been suspended. Please contact Vanguard support.'
        });
      }

      const now = Math.floor(Date.now() / 1000);
      await auditCol.insertOne({
        timestamp: now,
        action: 'USER_LOGIN',
        user: user.email,
        details: `Successful sign-in to ${user.role || 'business'} workspace`,
        ip: clientIp
      });

      console.log(`[AUTH] User signed in: ${user.email} (${user.role})`);

      const sessionToken = `tok_${crypto.randomBytes(24).toString('hex')}`;

      return res.status(200).json({
        success: true,
        message: 'Sign-in successful.',
        token: sessionToken,
        user: {
          user_id: user.user_id,
          name: user.name || user.username || 'User',
          email: user.email,
          role: user.role || 'business',
          plan: user.plan || 'standard'
        }
      });
    }

    return res.status(404).json({ success: false, error: `Unknown auth action: ${action}` });

  } catch (err) {
    console.error('[AUTH] Internal error:', err);
    return res.status(500).json({ success: false, error: `Authentication error: ${err.message}` });
  }
};
