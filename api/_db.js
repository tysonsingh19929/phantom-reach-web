const { MongoClient } = require('mongodb');

let clientPromise = null;

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not configured');
  }

  const dbName = process.env.MONGODB_DB || 'vanguard';

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;

  const client = await clientPromise;
  return client.db(dbName);
}

module.exports = {
  getDb
};
