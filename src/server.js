import 'dotenv/config';
import { createDatabase, initSchema } from './db.js';
import { createApp } from './app.js';

async function main() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be set');

  const { client, db } = await createDatabase();
  await initSchema(db);
  const port = process.env.PORT || 3000;
  const server = createApp(db).listen(port, () =>
    console.log(`CRM API running on http://localhost:${port}`),
  );
  const shutdown = async () => {
    server.close();
    await client.close();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
