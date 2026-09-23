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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const db = await getDb();
    const usersCol = db.collection('users');
    const auditCol = db.collection('audit_logs');
    const action = (req.query.action || '').toLowerCase();
    const userId = req.query.id || req.query.user_id || '';

    // AUDIT LOGS
    if (action === 'logs' || req.url.includes('/audit-logs')) {
      const logs = await auditCol.find({}).sort({ timestamp: -1 }).limit(100).toArray();
      return res.status(200).json(logs.map(l => ({
        timestamp: l.timestamp || 0,
        action: l.action || 'INFO',
        user: l.user || 'system',
        details: l.details || '',
        ip: l.ip || ''
      })));
    }

    // GET /api/admin/users
    if (req.method === 'GET') {
      const users = await usersCol.find({}).sort({ created_at: -1 }).toArray();
      const cleaned = users.map(u => ({
        user_id: u.user_id,
        username: u.username || u.email,
        email: u.email,
        name: u.name || '',
        role: u.role || 'business',
        plan: u.plan || 'standard',
        status: u.status || 'active',
        daily_quota: u.daily_quota || 50,
        used_quota_today: u.used_quota_today || 0,
        created_at: u.created_at || Math.floor(Date.now() / 1000)
      }));
      return res.status(200).json(cleaned);
    }

    // POST: UPDATE STATUS
    if (req.method === 'POST' && (action === 'status' || req.url.includes('/status'))) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const targetId = userId || body.user_id;
      const newStatus = body.status || 'active';
      if (!targetId) return res.status(400).json({ success: false, error: 'User ID required' });

      await usersCol.updateOne({ user_id: targetId }, { $set: { status: newStatus } });
      await auditCol.insertOne({
        timestamp: Math.floor(Date.now() / 1000),
        action: 'USER_STATUS_UPDATE',
        user: 'admin',
        details: `Updated user ${targetId} status to ${newStatus}`
      });
      return res.status(200).json({ success: true, message: `Status updated to ${newStatus}` });
    }

    // POST: CREATE USER FROM ADMIN
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const username = (body.username || body.email || '').trim().toLowerCase();
      const email = (body.email || body.username || '').trim().toLowerCase();
      const password = (body.password || '').trim();
      const role = (body.role || 'business').toLowerCase();
      const plan = body.plan || 'standard';

      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username/email and password required.' });
      }

      const existing = await usersCol.findOne({
        $or: [{ username: username }, { email: email }]
      });
      if (existing) {
        return res.status(409).json({ success: false, error: 'A user with this username or email already exists.' });
      }

      const newUserId = `usr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
      const now = Math.floor(Date.now() / 1000);

      const newUser = {
        user_id: newUserId,
        name: body.name || username,
        username,
        email,
        password_hash: hashPassword(password),
        role,
        plan,
        status: 'active',
        daily_quota: plan === 'enterprise' ? 500 : (plan === 'pro' ? 200 : 50),
        used_quota_today: 0,
        created_at: now
      };

      await usersCol.insertOne(newUser);
      await auditCol.insertOne({
        timestamp: now,
        action: 'ADMIN_CREATE_USER',
        user: 'admin',
        details: `Admin created ${role} user: ${username} (${plan})`
      });

      return res.status(201).json({ success: true, user: newUser });
    }

    // DELETE /api/admin/users/:id
    if (req.method === 'DELETE') {
      const targetId = userId || (req.query.path ? req.query.path[req.query.path.length - 1] : '');
      if (!targetId) return res.status(400).json({ success: false, error: 'User ID required' });

      await usersCol.deleteOne({ user_id: targetId });
      await auditCol.insertOne({
        timestamp: Math.floor(Date.now() / 1000),
        action: 'ADMIN_DELETE_USER',
        user: 'admin',
        details: `Admin deleted user ${targetId}`
      });

      return res.status(200).json({ success: true, message: 'User deleted' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('[ADMIN-USERS] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
