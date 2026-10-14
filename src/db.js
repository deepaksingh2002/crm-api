import { MongoClient } from 'mongodb';

export async function createDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'crm');
  return { client, db };
}

export async function initSchema(db) {
  await db.collection('employees').createIndex({ email: 1 }, { unique: true });
  await db.collection('enquiries').createIndex({ claimed_by: 1, created_at: -1 });
}
