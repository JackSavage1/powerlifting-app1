import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, registerUser, api, json } from './helpers.js';
import { col } from '../src/db.js';

let app;
let coach, athlete;
let programId, exerciseId;

before(async () => {
  app = await createApp();
  coach   = await registerUser(app, 'coach');
  athlete = await registerUser(app, 'athlete');

  // Create a program for testing
  const pRes = await api(app, coach.accessToken).post('/api/v1/programs', {
    name: 'Days Test Program', durationWeeks: 4, daysPerWeek: 3,
  });
  programId = json(pRes)._id;

  // Get a default exercise ID
  const eRes = await api(app, coach.accessToken).get('/api/v1/exercises?isDefault=true');
  exerciseId = json(eRes).items[0]._id;
});

after(async () => {
  await col.users().deleteMany({ _id: { $in: [coach.user.id, athlete.user.id] } });
  await col.programs().deleteMany({ _id: programId });
  await col.programDays().deleteMany({ programId });
  await app.close();
});

// REQ-009

test('POST /programs/:id/days creates a day', async () => {
  const res = await api(app, coach.accessToken).post(`/api/v1/programs/${programId}/days`, {
    weekNumber: 1,
    dayNumber: 1,
    label: 'Squat Day',
    slots: [{ exerciseId, order: 0, targetSets: 3, targetReps: 5 }],
  });
  assert.equal(res.statusCode, 201);
  const body = json(res);
  assert.equal(body.weekNumber, 1);
  assert.equal(body.dayNumber, 1);
  assert.equal(body.label, 'Squat Day');
  assert.equal(body.slots.length, 1);
  assert.equal(body.slots[0].targetSets, 3);
});

test('POST /programs/:id/days: duplicate week/day returns 409', async () => {
  const res = await api(app, coach.accessToken).post(`/api/v1/programs/${programId}/days`, {
    weekNumber: 1, dayNumber: 1,
  });
  assert.equal(res.statusCode, 409);
});

test('POST /programs/:id/days: day out of range returns 400', async () => {
  const res = await api(app, coach.accessToken).post(`/api/v1/programs/${programId}/days`, {
    weekNumber: 1, dayNumber: 5, // daysPerWeek = 3
  });
  assert.equal(res.statusCode, 400);
});

test('GET /programs/:id/days returns all days sorted', async () => {
  // Create a few more days
  await api(app, coach.accessToken).post(`/api/v1/programs/${programId}/days`, { weekNumber: 1, dayNumber: 2 });
  await api(app, coach.accessToken).post(`/api/v1/programs/${programId}/days`, { weekNumber: 2, dayNumber: 1 });

  const res = await api(app, coach.accessToken).get(`/api/v1/programs/${programId}/days`);
  assert.equal(res.statusCode, 200);
  const items = json(res).items;
  assert.ok(items.length >= 3);
  // Verify sorted order
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const curr = items[i];
    assert.ok(
      prev.weekNumber < curr.weekNumber ||
      (prev.weekNumber === curr.weekNumber && prev.dayNumber <= curr.dayNumber),
    );
  }
});

test('GET /programs/:id/days/:dayId returns day detail', async () => {
  const listRes = await api(app, coach.accessToken).get(`/api/v1/programs/${programId}/days`);
  const dayId = json(listRes).items[0]._id;
  const res = await api(app, coach.accessToken).get(`/api/v1/programs/${programId}/days/${dayId}`);
  assert.equal(res.statusCode, 200);
  assert.ok(json(res).slots !== undefined);
});

test('PATCH /programs/:id/days/:dayId updates slots', async () => {
  const listRes = await api(app, coach.accessToken).get(`/api/v1/programs/${programId}/days`);
  const dayId = json(listRes).items[0]._id;

  const res = await api(app, coach.accessToken).patch(
    `/api/v1/programs/${programId}/days/${dayId}`,
    {
      slots: [
        { exerciseId, order: 0, targetSets: 5, targetReps: 3, targetRPE: 8 },
        { exerciseId, order: 1, targetSets: 4, targetReps: 4 },
      ],
    },
  );
  assert.equal(res.statusCode, 200);
  const body = json(res);
  assert.equal(body.slots.length, 2);
  assert.equal(body.slots[0].targetSets, 5);
  assert.equal(body.slots[0].targetRPE, 8);
});

test('PATCH /programs/:id/days/:dayId: athlete cannot update', async () => {
  const listRes = await api(app, coach.accessToken).get(`/api/v1/programs/${programId}/days`);
  const dayId = json(listRes).items[0]._id;
  const res = await api(app, athlete.accessToken).patch(
    `/api/v1/programs/${programId}/days/${dayId}`,
    { label: 'Hack' },
  );
  assert.equal(res.statusCode, 403);
});
