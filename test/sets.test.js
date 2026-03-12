import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, registerUser, api, json } from './helpers.js';
import { col } from '../src/db.js';

let app;
let athlete;
let openSessionId, closedSessionId, exerciseId;

const futureDate = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n + 300); // offset to avoid conflict with sessions tests
  return d.toISOString().slice(0, 10);
};

before(async () => {
  app = await createApp();
  athlete = await registerUser(app, 'athlete');

  // Create an open session
  const openRes = await api(app, athlete.accessToken).post('/api/v1/sessions', { date: futureDate(0) });
  openSessionId = json(openRes)._id;

  // Create and close a session
  const closeRes = await api(app, athlete.accessToken).post('/api/v1/sessions', { date: futureDate(1) });
  closedSessionId = json(closeRes)._id;
  await api(app, athlete.accessToken).patch(`/api/v1/sessions/${closedSessionId}`, { status: 'closed' });

  // Get a default exercise
  const eRes = await api(app, athlete.accessToken).get('/api/v1/exercises?isDefault=true');
  exerciseId = json(eRes).items[0]._id;
});

after(async () => {
  await col.users().deleteMany({ _id: athlete.user.id });
  await col.sessions().deleteMany({ athleteId: athlete.user.id });
  await col.sets().deleteMany({ athleteId: athlete.user.id });
  await app.close();
});

// REQ-014

test('POST /sessions/:id/sets logs a set', async () => {
  const res = await api(app, athlete.accessToken).post(
    `/api/v1/sessions/${openSessionId}/sets`,
    { exerciseId, weightLbs: 225, reps: 5 },
  );
  assert.equal(res.statusCode, 201);
  const body = json(res);
  assert.equal(body.weightLbs, 225);
  assert.equal(body.reps, 5);
  assert.equal(body.isPR, false);
  assert.equal(body.order, 0);
});

test('POST /sessions/:id/sets: second set gets order 1', async () => {
  const res = await api(app, athlete.accessToken).post(
    `/api/v1/sessions/${openSessionId}/sets`,
    { exerciseId, weightLbs: 230, reps: 3 },
  );
  assert.equal(res.statusCode, 201);
  assert.equal(json(res).order, 1);
});

test('POST /sessions/:id/sets: optional fields persist', async () => {
  const res = await api(app, athlete.accessToken).post(
    `/api/v1/sessions/${openSessionId}/sets`,
    { exerciseId, weightLbs: 200, reps: 8, rpe: 7.5, rir: 2, notes: 'Easy', videoUrl: 'https://example.com/v' },
  );
  assert.equal(res.statusCode, 201);
  const body = json(res);
  assert.equal(body.rpe, 7.5);
  assert.equal(body.rir, 2);
  assert.equal(body.notes, 'Easy');
  assert.equal(body.videoUrl, 'https://example.com/v');
});

test('POST /sessions/:id/sets: cannot add to closed session', async () => {
  const res = await api(app, athlete.accessToken).post(
    `/api/v1/sessions/${closedSessionId}/sets`,
    { exerciseId, weightLbs: 100, reps: 5 },
  );
  assert.equal(res.statusCode, 422);
});

test('POST /sessions/:id/sets: missing exerciseId returns 400', async () => {
  const res = await api(app, athlete.accessToken).post(
    `/api/v1/sessions/${openSessionId}/sets`,
    { weightLbs: 100, reps: 5 },
  );
  assert.equal(res.statusCode, 400);
});

// REQ-015

test('PATCH /sessions/:id/sets/:setId updates weight', async () => {
  const createRes = await api(app, athlete.accessToken).post(
    `/api/v1/sessions/${openSessionId}/sets`,
    { exerciseId, weightLbs: 200, reps: 5 },
  );
  const setId = json(createRes)._id;

  const res = await api(app, athlete.accessToken).patch(
    `/api/v1/sessions/${openSessionId}/sets/${setId}`,
    { weightLbs: 210, reps: 4 },
  );
  assert.equal(res.statusCode, 200);
  const body = json(res);
  assert.equal(body.weightLbs, 210);
  assert.equal(body.reps, 4);
});

test('PATCH /sessions/:id/sets/:setId: cannot edit in closed session', async () => {
  // Add set to open session, then close it, then try to edit
  const s2Res = await api(app, athlete.accessToken).post(
    `/api/v1/sessions/${openSessionId}/sets`,
    { exerciseId, weightLbs: 150, reps: 10 },
  );
  const setId = json(s2Res)._id;

  // Close the session
  await api(app, athlete.accessToken).patch(`/api/v1/sessions/${openSessionId}`, { status: 'closed' });

  const res = await api(app, athlete.accessToken).patch(
    `/api/v1/sessions/${openSessionId}/sets/${setId}`,
    { weightLbs: 999 },
  );
  assert.equal(res.statusCode, 422);
});

test('DELETE /sessions/:id/sets/:setId deletes set', async () => {
  // Need a fresh open session for this
  const d = new Date(); d.setDate(d.getDate() + 400);
  const newSessionRes = await api(app, athlete.accessToken).post('/api/v1/sessions', {
    date: d.toISOString().slice(0, 10),
  });
  const sid = json(newSessionRes)._id;

  const setRes = await api(app, athlete.accessToken).post(
    `/api/v1/sessions/${sid}/sets`,
    { exerciseId, weightLbs: 100, reps: 5 },
  );
  const setId = json(setRes)._id;

  const delRes = await api(app, athlete.accessToken).delete(
    `/api/v1/sessions/${sid}/sets/${setId}`,
  );
  assert.equal(delRes.statusCode, 204);
});
