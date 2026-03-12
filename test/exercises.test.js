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
  await col.exercises().deleteMany({ createdBy: { $in: [athlete.user.id, coach.user.id] } });
  await app.close();
});

// REQ-006: default exercises

test('GET /exercises returns default exercises', async () => {
  const res = await api(app, athlete.accessToken).get('/api/v1/exercises');
  assert.equal(res.statusCode, 200);
  const body = json(res);
  assert.ok(body.items.length >= 10);
  const names = body.items.map((e) => e.name);
  assert.ok(names.includes('Squat'));
  assert.ok(names.includes('Bench Press'));
  assert.ok(names.includes('Deadlift'));
});

test('GET /exercises?isDefault=true returns only defaults', async () => {
  const res = await api(app, athlete.accessToken).get('/api/v1/exercises?isDefault=true');
  assert.equal(res.statusCode, 200);
  const items = json(res).items;
  assert.ok(items.every((e) => e.isDefault === true));
});

// REQ-007: custom exercises

test('POST /exercises creates custom exercise for athlete', async () => {
  const res = await api(app, athlete.accessToken).post('/api/v1/exercises', { name: 'Slingshot Bench' });
  assert.equal(res.statusCode, 201);
  const body = json(res);
  assert.equal(body.name, 'Slingshot Bench');
  assert.equal(body.isDefault, false);
  assert.equal(body.createdBy, athlete.user.id);
});

test('POST /exercises creates custom exercise for coach', async () => {
  const res = await api(app, coach.accessToken).post('/api/v1/exercises', { name: 'Coach Special Squat' });
  assert.equal(res.statusCode, 201);
  assert.equal(json(res).createdBy, coach.user.id);
});

test('POST /exercises: missing name returns 400', async () => {
  const res = await api(app, athlete.accessToken).post('/api/v1/exercises', {});
  assert.equal(res.statusCode, 400);
});

test('GET /exercises/:id returns exercise', async () => {
  const createRes = await api(app, athlete.accessToken).post('/api/v1/exercises', { name: 'Test Exercise Get' });
  const id = json(createRes)._id;
  const res = await api(app, athlete.accessToken).get(`/api/v1/exercises/${id}`);
  assert.equal(res.statusCode, 200);
  assert.equal(json(res).name, 'Test Exercise Get');
});

test('GET /exercises/:id returns 404 for unknown', async () => {
  const res = await api(app, athlete.accessToken).get('/api/v1/exercises/00000000-0000-0000-0000-000000000000');
  assert.equal(res.statusCode, 404);
});

test('PATCH /exercises/:id renames custom exercise', async () => {
  const createRes = await api(app, athlete.accessToken).post('/api/v1/exercises', { name: 'Old Name' });
  const id = json(createRes)._id;
  const res = await api(app, athlete.accessToken).patch(`/api/v1/exercises/${id}`, { name: 'New Name' });
  assert.equal(res.statusCode, 200);
  assert.equal(json(res).name, 'New Name');
});

test('PATCH /exercises/:id on default exercise returns 403', async () => {
  const listRes = await api(app, athlete.accessToken).get('/api/v1/exercises?isDefault=true');
  const defaultId = json(listRes).items[0]._id;
  const res = await api(app, athlete.accessToken).patch(`/api/v1/exercises/${defaultId}`, { name: 'Hack' });
  assert.equal(res.statusCode, 403);
});

test("PATCH /exercises/:id on another user's exercise returns 403", async () => {
  const createRes = await api(app, coach.accessToken).post('/api/v1/exercises', { name: 'Coaches Exercise' });
  const id = json(createRes)._id;
  const res = await api(app, athlete.accessToken).patch(`/api/v1/exercises/${id}`, { name: 'Stolen' });
  assert.equal(res.statusCode, 403);
});

test('DELETE /exercises/:id removes custom exercise', async () => {
  const createRes = await api(app, athlete.accessToken).post('/api/v1/exercises', { name: 'To Delete' });
  const id = json(createRes)._id;
  const delRes = await api(app, athlete.accessToken).delete(`/api/v1/exercises/${id}`);
  assert.equal(delRes.statusCode, 204);
  const getRes = await api(app, athlete.accessToken).get(`/api/v1/exercises/${id}`);
  assert.equal(getRes.statusCode, 404);
});

test('DELETE /exercises/:id on default returns 403', async () => {
  const listRes = await api(app, athlete.accessToken).get('/api/v1/exercises?isDefault=true');
  const defaultId = json(listRes).items[0]._id;
  const res = await api(app, athlete.accessToken).delete(`/api/v1/exercises/${defaultId}`);
  assert.equal(res.statusCode, 403);
});
