import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, registerUser, api, json } from './helpers.js';
import { col } from '../src/db.js';

let app;
let athlete, athlete2, coach;

const today = () => new Date().toISOString().slice(0, 10);
const futureDate = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

before(async () => {
  app = await createApp();
  athlete  = await registerUser(app, 'athlete');
  athlete2 = await registerUser(app, 'athlete');
  coach    = await registerUser(app, 'coach');
});

after(async () => {
  await col.users().deleteMany({ _id: { $in: [athlete.user.id, athlete2.user.id, coach.user.id] } });
  await col.sessions().deleteMany({ athleteId: { $in: [athlete.user.id, athlete2.user.id] } });
  await col.sets().deleteMany({ athleteId: { $in: [athlete.user.id, athlete2.user.id] } });
  await app.close();
});

// REQ-012

test('POST /sessions creates an open session', async () => {
  const date = futureDate(100); // far future to avoid conflicts
  const res = await api(app, athlete.accessToken).post('/api/v1/sessions', { date });
  assert.equal(res.statusCode, 201);
  const body = json(res);
  assert.equal(body.status, 'open');
  assert.equal(body.athleteId, athlete.user.id);
  assert.equal(body.date, date);
});

test('POST /sessions: duplicate date returns 409', async () => {
  const date = futureDate(101);
  await api(app, athlete.accessToken).post('/api/v1/sessions', { date });
  const res = await api(app, athlete.accessToken).post('/api/v1/sessions', { date });
  assert.equal(res.statusCode, 409);
});

test('POST /sessions: coach cannot create session', async () => {
  const res = await api(app, coach.accessToken).post('/api/v1/sessions', { date: futureDate(200) });
  assert.equal(res.statusCode, 403);
});

test('POST /sessions: missing date returns 400', async () => {
  const res = await api(app, athlete.accessToken).post('/api/v1/sessions', {});
  assert.equal(res.statusCode, 400);
});

// REQ-013 — bodyweight

test('PATCH /sessions/:id updates bodyweight', async () => {
  const date = futureDate(102);
  const createRes = await api(app, athlete.accessToken).post('/api/v1/sessions', { date });
  const id = json(createRes)._id;
  const res = await api(app, athlete.accessToken).patch(`/api/v1/sessions/${id}`, { bodyweightLbs: 183.5 });
  assert.equal(res.statusCode, 200);
  assert.equal(json(res).bodyweightLbs, 183.5);
});

// REQ-016 — close session

test('PATCH /sessions/:id closes session', async () => {
  const date = futureDate(103);
  const createRes = await api(app, athlete.accessToken).post('/api/v1/sessions', { date });
  const id = json(createRes)._id;
  const res = await api(app, athlete.accessToken).patch(`/api/v1/sessions/${id}`, {
    status: 'closed', notes: 'Great session',
  });
  assert.equal(res.statusCode, 200);
  const body = json(res);
  assert.equal(body.status, 'closed');
  assert.ok(body.closedAt);
  assert.equal(body.notes, 'Great session');
});

test('PATCH /sessions/:id: closing already-closed session returns 422', async () => {
  const date = futureDate(104);
  const createRes = await api(app, athlete.accessToken).post('/api/v1/sessions', { date });
  const id = json(createRes)._id;
  await api(app, athlete.accessToken).patch(`/api/v1/sessions/${id}`, { status: 'closed' });
  const res = await api(app, athlete.accessToken).patch(`/api/v1/sessions/${id}`, { status: 'closed' });
  assert.equal(res.statusCode, 422);
});

// REQ-017

test('GET /users/:id/sessions returns session list', async () => {
  const res = await api(app, athlete.accessToken).get(`/api/v1/users/${athlete.user.id}/sessions`);
  assert.equal(res.statusCode, 200);
  const body = json(res);
  assert.ok(Array.isArray(body.items));
  assert.ok(body.items.length >= 1);
});

test('GET /users/:id/sessions: sorted by date descending', async () => {
  const res = await api(app, athlete.accessToken).get(`/api/v1/users/${athlete.user.id}/sessions`);
  const items = json(res).items;
  for (let i = 1; i < items.length; i++) {
    assert.ok(items[i - 1].date >= items[i].date);
  }
});

test('GET /users/:id/sessions: other athlete returns 403', async () => {
  const res = await api(app, athlete2.accessToken).get(`/api/v1/users/${athlete.user.id}/sessions`);
  assert.equal(res.statusCode, 403);
});

test('GET /sessions/:id returns session with sets array', async () => {
  const date = futureDate(105);
  const createRes = await api(app, athlete.accessToken).post('/api/v1/sessions', { date });
  const id = json(createRes)._id;
  const res = await api(app, athlete.accessToken).get(`/api/v1/sessions/${id}`);
  assert.equal(res.statusCode, 200);
  assert.ok(Array.isArray(json(res).sets));
});

test('GET /sessions/:id: other athlete returns 403', async () => {
  const date = futureDate(106);
  const createRes = await api(app, athlete.accessToken).post('/api/v1/sessions', { date });
  const id = json(createRes)._id;
  const res = await api(app, athlete2.accessToken).get(`/api/v1/sessions/${id}`);
  assert.equal(res.statusCode, 403);
});

// DELETE — REQ-012

test('DELETE /sessions/:id deletes open session', async () => {
  const date = futureDate(107);
  const createRes = await api(app, athlete.accessToken).post('/api/v1/sessions', { date });
  const id = json(createRes)._id;
  const delRes = await api(app, athlete.accessToken).delete(`/api/v1/sessions/${id}`);
  assert.equal(delRes.statusCode, 204);
});

test('DELETE /sessions/:id: cannot delete closed session', async () => {
  const date = futureDate(108);
  const createRes = await api(app, athlete.accessToken).post('/api/v1/sessions', { date });
  const id = json(createRes)._id;
  await api(app, athlete.accessToken).patch(`/api/v1/sessions/${id}`, { status: 'closed' });
  const res = await api(app, athlete.accessToken).delete(`/api/v1/sessions/${id}`);
  assert.equal(res.statusCode, 422);
});
