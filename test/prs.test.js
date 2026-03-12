import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, registerUser, api, json } from './helpers.js';
import { col } from '../src/db.js';

let app;
let athlete, coach;
let exerciseId, setId, sessionId;

const futureDate = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n + 500);
  return d.toISOString().slice(0, 10);
};

before(async () => {
  app = await createApp();
  athlete = await registerUser(app, 'athlete');
  coach   = await registerUser(app, 'coach');

  // Link coach to athlete
  const invRes = await api(app, coach.accessToken).post(
    `/api/v1/coaches/${coach.user.id}/athletes`,
    { athleteEmail: athlete.email },
  );
  const invId = json(invRes)._id;
  await api(app, athlete.accessToken).patch(`/api/v1/invitations/${invId}`, { action: 'accept' });

  // Create a closed session with a set
  const eRes = await api(app, athlete.accessToken).get('/api/v1/exercises?isDefault=true');
  exerciseId = json(eRes).items[0]._id;

  const sRes = await api(app, athlete.accessToken).post('/api/v1/sessions', { date: futureDate(0) });
  sessionId = json(sRes)._id;

  const setRes = await api(app, athlete.accessToken).post(
    `/api/v1/sessions/${sessionId}/sets`,
    { exerciseId, weightLbs: 315, reps: 1 },
  );
  setId = json(setRes)._id;

  // Close the session
  await api(app, athlete.accessToken).patch(`/api/v1/sessions/${sessionId}`, { status: 'closed' });
});

after(async () => {
  await col.users().deleteMany({ _id: { $in: [athlete.user.id, coach.user.id] } });
  await col.relationships().deleteMany({ coachId: coach.user.id });
  await col.sessions().deleteMany({ athleteId: athlete.user.id });
  await col.sets().deleteMany({ athleteId: athlete.user.id });
  await col.prs().deleteMany({ athleteId: athlete.user.id });
  await app.close();
});

// REQ-018

test('POST /users/:id/prs marks a PR from closed session', async () => {
  const res = await api(app, athlete.accessToken).post(
    `/api/v1/users/${athlete.user.id}/prs`,
    { setId },
  );
  assert.equal(res.statusCode, 200);
  const body = json(res);
  assert.equal(body.setId, setId);
  assert.equal(body.exerciseId, exerciseId);
  assert.equal(body.weightLbs, 315);
  assert.equal(body.reps, 1);
});

test('POST /users/:id/prs: set in open session returns 422', async () => {
  const date2 = futureDate(1);
  const s2Res = await api(app, athlete.accessToken).post('/api/v1/sessions', { date: date2 });
  const sid2 = json(s2Res)._id;
  const set2Res = await api(app, athlete.accessToken).post(
    `/api/v1/sessions/${sid2}/sets`,
    { exerciseId, weightLbs: 300, reps: 2 },
  );
  const setId2 = json(set2Res)._id;

  const res = await api(app, athlete.accessToken).post(
    `/api/v1/users/${athlete.user.id}/prs`,
    { setId: setId2 },
  );
  assert.equal(res.statusCode, 422);
});

test('POST /users/:id/prs: marking new PR replaces old one', async () => {
  // Create another closed session with a heavier set for same exercise
  const date3 = futureDate(2);
  const s3Res = await api(app, athlete.accessToken).post('/api/v1/sessions', { date: date3 });
  const sid3 = json(s3Res)._id;
  const set3Res = await api(app, athlete.accessToken).post(
    `/api/v1/sessions/${sid3}/sets`,
    { exerciseId, weightLbs: 335, reps: 1 },
  );
  const setId3 = json(set3Res)._id;
  await api(app, athlete.accessToken).patch(`/api/v1/sessions/${sid3}`, { status: 'closed' });

  const res = await api(app, athlete.accessToken).post(
    `/api/v1/users/${athlete.user.id}/prs`,
    { setId: setId3 },
  );
  assert.equal(res.statusCode, 200);
  assert.equal(json(res).weightLbs, 335);

  // Verify old set has isPR = false
  const oldSet = await col.sets().findOne({ _id: setId });
  assert.equal(oldSet.isPR, false);
});

// REQ-019

test('GET /users/:id/prs returns PR list', async () => {
  const res = await api(app, athlete.accessToken).get(`/api/v1/users/${athlete.user.id}/prs`);
  assert.equal(res.statusCode, 200);
  const items = json(res).items;
  assert.ok(items.length >= 1);
  const exItem = items.find((i) => i.exerciseId === exerciseId);
  assert.ok(exItem);
  assert.ok(exItem.exercise);
});

test('GET /users/:id/prs/:exerciseId returns single PR', async () => {
  const res = await api(app, athlete.accessToken).get(
    `/api/v1/users/${athlete.user.id}/prs/${exerciseId}`,
  );
  assert.equal(res.statusCode, 200);
  const body = json(res);
  assert.equal(body.exerciseId, exerciseId);
  assert.equal(body.weightLbs, 335);
});

// REQ-020

test('GET /users/:id/prs: coach can read linked athlete PRs', async () => {
  const res = await api(app, coach.accessToken).get(`/api/v1/users/${athlete.user.id}/prs`);
  assert.equal(res.statusCode, 200);
  assert.ok(json(res).items.length >= 1);
});

test('GET /users/:id/prs: coach cannot read unlinked athlete PRs', async () => {
  const other = await registerUser(app, 'athlete');
  const res = await api(app, coach.accessToken).get(`/api/v1/users/${other.user.id}/prs`);
  assert.equal(res.statusCode, 403);
  await col.users().deleteMany({ _id: other.user.id });
});

// REQ-018 — unmark PR

test('DELETE /users/:id/prs/:exerciseId removes PR', async () => {
  const delRes = await api(app, athlete.accessToken).delete(
    `/api/v1/users/${athlete.user.id}/prs/${exerciseId}`,
  );
  assert.equal(delRes.statusCode, 204);
  const getRes = await api(app, athlete.accessToken).get(
    `/api/v1/users/${athlete.user.id}/prs/${exerciseId}`,
  );
  assert.equal(getRes.statusCode, 404);
});
