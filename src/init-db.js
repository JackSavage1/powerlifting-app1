import 'dotenv/config';
import { db } from './db.js';

const COLLECTIONS = [
  'users',
  'relationships',
  'exercises',
  'programs',
  'program_days',
  'assignments',
  'sessions',
  'sets',
  'personal_records',
];

export async function initDb() {
  const existing = await db.listCollections();
  const existingNames = new Set(existing.map((c) => c.name));

  for (const name of COLLECTIONS) {
    if (!existingNames.has(name)) {
      await db.createCollection(name);
      console.log(`Created collection: ${name}`);
    }
  }
}

// Run directly: node src/init-db.js
if (process.argv[1].endsWith('init-db.js')) {
  await initDb();
  console.log('DB init complete.');
}
