import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, registerUser, api, json } from './helpers.js';
import { col } from '../src/db.js';

let app;
let coach, athlete, athlete2;

before(async () => {
  app = await createApp();
  coach    = await registerUser(app, 'coach');
  athlete  = await registerUser(app, 'athlete');
  athlete2 = await registerUser(app, 'athlete');
});

after(async () => {
  await col.users().deleteMany({ _id: { $in: [coach.user.id, athlete.user.id, athlete2.user.id] } });
  await col.relationships().deleteMany({
    $or: [
      { coachId: coach.user.id },
      { athleteId: athlete.user.id },
      { athleteId: athlete2.user.id },
    ],
  });
  await app.close();
});

// Full REQ-005 flow

test('invite athlete: coach invites athlete', async () => {
  const res = await api(app, coach.accessToken).post(
    `/api/v1/coaches/${coach.user.id}/athletes`,
    { athleteEmail: athlete.email },
  );
  assert.equal(res.statusCode, 201);
  const body = json(res);
  assert.equal(body.status, 'pending');
  assert.equal(body.coachId, coach.user.id);
  assert.equal(body.athleteId, athlete.user.id);
});

test('invite: duplicate invite returns 409', async () => {
  const res = await api(app, coach.accessToken).post(
    `/api/v1/coaches/${coach.user.id}/athletes`,
    { athleteEmail: athlete.email },
  );
  assert.equal(res.statusCode, 409);
});

test('invite: unknown email returns 404', async () => {
  const res = await api(app, coach.accessToken).post(
    `/api/v1/coaches/${coach.user.id}/athletes`,
    { athleteEmail: 'nobody_xyz@nowhere.com' },
  );
  assert.equal(res.statusCode, 404);
});

test('invite: non-coach cannot invite', async () => {
  const res = await api(app, athlete.accessToken).post(
    `/api/v1/coaches/${athlete.user.id}/athletes`,
    { athleteEmail: athlete2.email },
  );
  assert.equal(res.statusCode, 403);
});

test('athlete sees pending invitation', async () => {
  const res = await api(app, athlete.accessToken).get(
    `/api/v1/users/${athlete.user.id}/invitations`,
  );
  assert.equal(res.statusCode, 200);
  const invites = json(res).items;
  assert.ok(invites.length >= 1);
  assert.equal(invites[0].status, 'pending');
});

test('athlete accepts invitation', async () => {
  const listRes = await api(app, athlete.accessToken).get(
    `/api/v1/users/${athlete.user.id}/invitations`,
  );
  const invId = json(listRes).items[0]._id;

  const res = await api(app, athlete.accessToken).patch(
    `/api/v1/invitations/${invId}`,
    { action: 'accept' },
  );
  assert.equal(res.statusCode, 200);
  assert.equal(json(res).status, 'active');
});

test('coach sees athlete on roster after acceptance', async () => {
  const res = await api(app, coach.accessToken).get(
    `/api/v1/coaches/${coach.user.id}/athletes`,
  );
  assert.equal(res.statusCode, 200);
  const ids = json(res).items.map((i) => i.athlete.id);
  assert.ok(ids.includes(athlete.user.id));
});

test('athlete sees their coach', async () => {
  const res = await api(app, athlete.accessToken).get(
    `/api/v1/users/${athlete.user.id}/coaches`,
  );
  assert.equal(res.statusCode, 200);
  const coachIds = json(res).items.map((r) => r.coachId);
  assert.ok(coachIds.includes(coach.user.id));
});

test('invite second athlete and decline', async () => {
  const invRes = await api(app, coach.accessToken).post(
    `/api/v1/coaches/${coach.user.id}/athletes`,
    { athleteEmail: athlete2.email },
  );
  assert.equal(invRes.statusCode, 201);
  const invId = json(invRes)._id;

  const res = await api(app, athlete2.accessToken).patch(
    `/api/v1/invitations/${invId}`,
    { action: 'decline' },
  );
  assert.equal(res.statusCode, 200);
  assert.equal(json(res).status, 'declined');
});

test('respond to already-resolved invitation returns 422', async () => {
  const listRes = await api(app, athlete.accessToken).get(
    `/api/v1/users/${athlete.user.id}/invitations`,
  );
  // All invitations for athlete are now resolved (active)
  // Try to find active rel and re-respond via raw id
  const relRes = await api(app, athlete.accessToken).get(
    `/api/v1/users/${athlete.user.id}/coaches`,
  );
  const relId = json(relRes).items[0]?._id;
  if (!relId) return; // skip if no rel found
  const res = await api(app, athlete.accessToken).patch(
    `/api/v1/invitations/${relId}`,
    { action: 'accept' },
  );
  assert.equal(res.statusCode, 422);
});

test('coach removes athlete', async () => {
  const res = await api(app, coach.accessToken).delete(
    `/api/v1/coaches/${coach.user.id}/athletes/${athlete.user.id}`,
  );
  assert.equal(res.statusCode, 204);
});

test('athlete no longer on roster after removal', async () => {
  const res = await api(app, coach.accessToken).get(
    `/api/v1/coaches/${coach.user.id}/athletes`,
  );
  const ids = json(res).items.map((i) => i.athlete.id);
  assert.ok(!ids.includes(athlete.user.id));
});
