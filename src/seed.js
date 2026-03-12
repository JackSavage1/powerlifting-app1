import 'dotenv/config';
import { col } from './db.js';
import { initDb } from './init-db.js';

const DEFAULT_EXERCISES = [
  'Squat',
  'Bench Press',
  'Deadlift',
  'Overhead Press',
  'Romanian Deadlift',
  'Barbell Row',
  'Front Squat',
  'Close-Grip Bench Press',
  'Pause Squat',
  'Pause Bench Press',
];

export async function seed() {
  await initDb();

  const exercises = col.exercises();
  const existing = await exercises.find({ isDefault: true }).toArray();
  const existingNames = new Set(existing.map((e) => e.name));

  let inserted = 0;
  for (const name of DEFAULT_EXERCISES) {
    if (!existingNames.has(name)) {
      await exercises.insertOne({
        _id: crypto.randomUUID(),
        name,
        isDefault: true,
        createdBy: null,
        createdAt: new Date().toISOString(),
      });
      inserted++;
    }
  }
  console.log(`Seeded ${inserted} default exercise(s).`);
}

// Run directly: node src/seed.js
if (process.argv[1].endsWith('seed.js')) {
  await seed();
  console.log('Seed complete.');
}
