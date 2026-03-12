import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, registerUser, api, json } from './helpers.js';
import { col } from '../src/db.js';

let app;
let coach, athlete;
let programId;

before(async () => {
  app = await createApp();
  coach   = await registerUser(app, 'coach');
  athlete = await registerUser(app, 'athlete');

  // Create active relationship
  const invRes = await api(app, coach.accessToken).post(
    `/api/v1/coaches/${coach.user.id}/athletes`,
    { athleteEmail: athlete.email },
  );
  const invId = json(invRes)._id;
  await api(app, athlete.accessToken).patch(`/api/v1/invitations/${invId}`, { action: 'accept' });

  // Create a program with days
  const pRes = await api(app, coach.accessToken).post('/api/v1/programs', {
    name: 'Assignment Test Program', durationWeeks: 2, daysPerWeek: 3,
  });
  programId = json(pRes)._id;

  const eRes = await api(app, coach.accessToken).get('/api/v1/exercises?isDefault=true');
  const exerciseId = json(eRes).items[0]._id;

  await api(app, coach.accessToken).post(`/api/v1/programs/${programId}/days`, {
    weekNumber: 1, dayNumber: 1, slots: [{ exerciseId, order: 0, targetSets: 3, targetReps: 5 }],
  });
  await api(app, coach.accessToken).post(`/api/v1/programs/${programId}/days`, {
    weekNumber: 1, dayNumber: 2,
  });
});

after(async () => {
  await col.users().deleteMany({ _id: { $in: [coach.user.id, athlete.user.id] } });
  await col.relationships().deleteMany({ coachId: coach.user.id });
  await col.programs().deleteMany({ _id: programId });
  await col.programDays().deleteMany({ programId });
  await col.assignments().deleteMany({ programId });
  await app.close();
});

// REQ-010

test('POST /programs/:id/assignments assigns program to athlete', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const res = await api(app, coach.accessToken).post(`/api/v1/programs/${programId}/assignments`, {
    athleteIds: [athlete.user.id],
    startDate: today,
  });
  assert.equal(res.statusCode, 201);
  const items = json(res).items;
  assert.equal(items.length, 1);
  assert.equal(items[0].athleteId, athlete.user.id);
  assert.equal(items[0].status, 'active');
});

test('POST /programs/:id/assignments: athlete not on roster returns 404', async () => {
  const other = await registerUser(app, 'athlete');
  const today = new Date().toISOString().slice(0, 10);
  const res = await api(app, coach.accessToken).post(`/api/v1/programs/${programId}/assignments`, {
    athleteIds: [other.user.id],
    startDate: today,
  });
  assert.equal(res.statusCode, 404);
  await col.users().deleteMany({ _id: other.user.id });
});

test('POST /programs/:id/assignments: athlete cannot assign', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const res = await api(app, athlete.accessToken).post(`/api/v1/programs/${programId}/assignments`, {
    athleteIds: [athlete.user.id],
    startDate: today,
  });
  assert.equal(res.statusCode, 403);
});

// REQ-011

test('GET /users/:id/assignments lists assignments', async () => {
  const res = await api(app, athlete.accessToken).get(`/api/v1/users/${athlete.user.id}/assignments`);
  assert.equal(res.statusCode, 200);
  const items = json(res).items;
  assert.ok(items.length >= 1);
  assert.ok(items.every((a) => a.athleteId === athlete.user.id));
});

test('GET /users/:id/assignments?status=active filters correctly', async () => {
  const res = await api(app, athlete.accessToken).get(
    `/api/v1/users/${athlete.user.id}/assignments?status=active`,
  );
  assert.equal(res.statusCode, 200);
  assert.ok(json(res).items.every((a) => a.status === 'active'));
});

test('GET /users/:id/assignments/active returns active assignment with program', async () => {
  const res = await api(app, athlete.accessToken).get(
    `/api/v1/users/${athlete.user.id}/assignments/active`,
  );
  assert.equal(res.statusCode, 200);
  const body = json(res);
  assert.ok(body.assignment);
  assert.ok(body.program);
  assert.ok(Array.isArray(body.days));
  assert.equal(body.assignment.status, 'active');
});

test('GET .../assignments/active returns 404 for athlete with no assignment', async () => {
  const noAssign = await registerUser(app, 'athlete');
  const res = await api(app, noAssign.accessToken).get(
    `/api/v1/users/${noAssign.user.id}/assignments/active`,
  );
  assert.equal(res.statusCode, 404);
  await col.users().deleteMany({ _id: noAssign.user.id });
});
