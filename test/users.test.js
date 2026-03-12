import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, registerUser, api, json } from './helpers.js';
import { col } from '../src/db.js';

let app;
let athlete, coach;

before(async () => {
  app = await createApp();
  athlete = await registerUser(app, 'athlete');
  coach   = await registerUser(app, 'coach');
});

after(async () => {
  await col.users().deleteMany({ _id: { $in: [athlete.user.id, coach.user.id] } });
  await app.close();
});

// --- REQ-003 athlete profile ---

test('GET /users/:id returns athlete profile', async () => {
  const res = await api(app, athlete.accessToken).get(`/api/v1/users/${athlete.user.id}`);
  assert.equal(res.statusCode, 200);
  const body = json(res);
  assert.equal(body.id, athlete.user.id);
  assert.equal(body.role, 'athlete');
  assert.ok('displayName' in body.profile);
});

test('GET /users/:id returns 404 for unknown user', async () => {
  const res = await api(app, athlete.accessToken).get('/api/v1/users/00000000-0000-0000-0000-000000000000');
  assert.equal(res.statusCode, 404);
});

test('GET /users/:id returns 401 without token', async () => {
  const res = await app.inject({ method: 'GET', url: `/api/v1/users/${athlete.user.id}` });
  assert.equal(res.statusCode, 401);
});

test('PATCH /users/:id updates athlete displayName', async () => {
  const res = await api(app, athlete.accessToken).patch(
    `/api/v1/users/${athlete.user.id}`,
    { displayName: 'Jane Lifter' },
  );
  assert.equal(res.statusCode, 200);
  assert.equal(json(res).profile.displayName, 'Jane Lifter');
});

test('PATCH /users/:id updates athlete weightClass', async () => {
  const res = await api(app, athlete.accessToken).patch(
    `/api/v1/users/${athlete.user.id}`,
    { weightClass: '83kg' },
  );
  assert.equal(res.statusCode, 200);
  assert.equal(json(res).profile.weightClass, '83kg');
});

test('PATCH /users/:id returns 403 if caller is not the user', async () => {
  const res = await api(app, coach.accessToken).patch(
    `/api/v1/users/${athlete.user.id}`,
    { displayName: 'Sneaky' },
  );
  assert.equal(res.statusCode, 403);
});

// --- REQ-004 coach profile ---

test('GET /users/:id returns coach profile', async () => {
  const res = await api(app, coach.accessToken).get(`/api/v1/users/${coach.user.id}`);
  assert.equal(res.statusCode, 200);
  assert.equal(json(res).role, 'coach');
  assert.ok('displayName' in json(res).profile);
});

test('PATCH /users/:id updates coach bio', async () => {
  const res = await api(app, coach.accessToken).patch(
    `/api/v1/users/${coach.user.id}`,
    { bio: 'USAPL certified, 10 years' },
  );
  assert.equal(res.statusCode, 200);
  assert.equal(json(res).profile.bio, 'USAPL certified, 10 years');
});
