import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, registerUser, api, json } from './helpers.js';
import { col } from '../src/db.js';

let app;
let coach, coach2, athlete;

before(async () => {
  app = await createApp();
  coach   = await registerUser(app, 'coach');
  coach2  = await registerUser(app, 'coach');
  athlete = await registerUser(app, 'athlete');
});

after(async () => {
  await col.users().deleteMany({ _id: { $in: [coach.user.id, coach2.user.id, athlete.user.id] } });
  await col.programs().deleteMany({ coachId: { $in: [coach.user.id, coach2.user.id] } });
  await app.close();
});

// REQ-008

test('POST /programs creates a draft program', async () => {
  const res = await api(app, coach.accessToken).post('/api/v1/programs', {
    name: 'Test Block', durationWeeks: 4, daysPerWeek: 3,
  });
  assert.equal(res.statusCode, 201);
  const body = json(res);
  assert.equal(body.status, 'draft');
  assert.equal(body.coachId, coach.user.id);
  assert.equal(body.durationWeeks, 4);
});

test('POST /programs: athlete cannot create program', async () => {
  const res = await api(app, athlete.accessToken).post('/api/v1/programs', {
    name: 'Athlete Block', durationWeeks: 4, daysPerWeek: 3,
  });
  assert.equal(res.statusCode, 403);
});

test('POST /programs: missing name returns 400', async () => {
  const res = await api(app, coach.accessToken).post('/api/v1/programs', {
    durationWeeks: 4, daysPerWeek: 3,
  });
  assert.equal(res.statusCode, 400);
});

test('GET /programs lists coach programs', async () => {
  await api(app, coach.accessToken).post('/api/v1/programs', {
    name: 'Program A', durationWeeks: 8, daysPerWeek: 4,
  });
  const res = await api(app, coach.accessToken).get('/api/v1/programs');
  assert.equal(res.statusCode, 200);
  const items = json(res).items;
  assert.ok(items.length >= 1);
  assert.ok(items.every((p) => p.coachId === coach.user.id));
});

test('GET /programs: athlete cannot list programs', async () => {
  const res = await api(app, athlete.accessToken).get('/api/v1/programs');
  assert.equal(res.statusCode, 403);
});

test('GET /programs/:id returns program', async () => {
  const createRes = await api(app, coach.accessToken).post('/api/v1/programs', {
    name: 'Get Test', durationWeeks: 2, daysPerWeek: 2,
  });
  const id = json(createRes)._id;
  const res = await api(app, coach.accessToken).get(`/api/v1/programs/${id}`);
  assert.equal(res.statusCode, 200);
  assert.equal(json(res).name, 'Get Test');
});

test("GET /programs/:id: coach cannot see another coach's program", async () => {
  const createRes = await api(app, coach.accessToken).post('/api/v1/programs', {
    name: 'Private', durationWeeks: 2, daysPerWeek: 2,
  });
  const id = json(createRes)._id;
  const res = await api(app, coach2.accessToken).get(`/api/v1/programs/${id}`);
  assert.equal(res.statusCode, 403);
});

test('PATCH /programs/:id updates name', async () => {
  const createRes = await api(app, coach.accessToken).post('/api/v1/programs', {
    name: 'Original Name', durationWeeks: 4, daysPerWeek: 3,
  });
  const id = json(createRes)._id;
  const res = await api(app, coach.accessToken).patch(`/api/v1/programs/${id}`, { name: 'Updated Name' });
  assert.equal(res.statusCode, 200);
  assert.equal(json(res).name, 'Updated Name');
});

test('DELETE /programs/:id deletes draft program', async () => {
  const createRes = await api(app, coach.accessToken).post('/api/v1/programs', {
    name: 'To Delete', durationWeeks: 1, daysPerWeek: 1,
  });
  const id = json(createRes)._id;
  const delRes = await api(app, coach.accessToken).delete(`/api/v1/programs/${id}`);
  assert.equal(delRes.statusCode, 204);
  const getRes = await api(app, coach.accessToken).get(`/api/v1/programs/${id}`);
  assert.equal(getRes.statusCode, 404);
});
