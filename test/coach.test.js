import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, registerUser, api, json } from './helpers.js';
import { col } from '../src/db.js';

let app;
let coach, athlete, otherCoach;
let programId, assignmentId, exerciseId;

const futureDate = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n + 700);
  return d.toISOString().slice(0, 10);
};

before(async () => {
  app = await createApp();
  coach      = await registerUser(app, 'coach');
  athlete    = await registerUser(app, 'athlete');
  otherCoach = await registerUser(app, 'coach');

  // Link coach → athlete
  const invRes = await api(app, coach.accessToken).post(
    `/api/v1/coaches/${coach.user.id}/athletes`,
    { athleteEmail: athlete.email },
  );
  await api(app, athlete.accessToken).patch(
    `/api/v1/invitations/${json(invRes)._id}`,
    { action: 'accept' },
  );

  // Get exercise
  const eRes = await api(app, coach.accessToken).get('/api/v1/exercises?isDefault=true');
  exerciseId = json(eRes).items[0]._id;

  // Create program with 2 days
  const pRes = await api(app, coach.accessToken).post('/api/v1/programs', {
    name: 'Coach Dashboard Program', durationWeeks: 2, daysPerWeek: 2,
  });
  programId = json(pRes)._id;

  // Add program days
  let d1Res = await api(app, coach.accessToken).post(`/api/v1/programs/${programId}/days`, {
    weekNumber: 1, dayNumber: 1, slots: [{ exerciseId, order: 0, targetSets: 3, targetReps: 5 }],
  });
  let d2Res = await api(app, coach.accessToken).post(`/api/v1/programs/${programId}/days`, {
    weekNumber: 1, dayNumber: 2,
  });
  const dayId1 = json(d1Res)._id;

  // Assign program to athlete with a past start date so day 1 is in the past
  const pastStart = (() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  })();
  const assignRes = await api(app, coach.accessToken).post(
    `/api/v1/programs/${programId}/assignments`,
    { athleteIds: [athlete.user.id], startDate: pastStart },
  );
  assignmentId = json(assignRes).items[0]._id;

  // Create and close a session for the athlete, linked to the assignment + day
  const sRes = await api(app, athlete.accessToken).post('/api/v1/sessions', {
    date: futureDate(0),
    assignmentId,
    programDayId: dayId1,
  });
  const sessionId = json(sRes)._id;
  await api(app, athlete.accessToken).post(`/api/v1/sessions/${sessionId}/sets`, {
    exerciseId, weightLbs: 275, reps: 5,
  });
  await api(app, athlete.accessToken).patch(`/api/v1/sessions/${sessionId}`, { status: 'closed' });
});

after(async () => {
  await col.users().deleteMany({ _id: { $in: [coach.user.id, athlete.user.id, otherCoach.user.id] } });
  await col.relationships().deleteMany({ coachId: { $in: [coach.user.id, otherCoach.user.id] } });
  await col.programs().deleteMany({ _id: programId });
  await col.programDays().deleteMany({ programId });
  await col.assignments().deleteMany({ _id: assignmentId });
  await col.sessions().deleteMany({ athleteId: athlete.user.id });
  await col.sets().deleteMany({ athleteId: athlete.user.id });
  await app.close();
});

// REQ-021

test('GET coach/.../sessions returns athlete session history', async () => {
  const res = await api(app, coach.accessToken).get(
    `/api/v1/coaches/${coach.user.id}/athletes/${athlete.user.id}/sessions`,
  );
  assert.equal(res.statusCode, 200);
  const body = json(res);
  assert.ok(Array.isArray(body.items));
  assert.ok(body.items.length >= 1);
  // Verify it has the summary shape
  const first = body.items[0];
  assert.ok('date' in first);
  assert.ok('status' in first);
  assert.ok('exerciseCount' in first);
});

test('GET coach/.../sessions: sessions sorted by date descending', async () => {
  const res = await api(app, coach.accessToken).get(
    `/api/v1/coaches/${coach.user.id}/athletes/${athlete.user.id}/sessions`,
  );
  const items = json(res).items;
  for (let i = 1; i < items.length; i++) {
    assert.ok(items[i - 1].date >= items[i].date);
  }
});

test('GET coach/.../sessions: unlinked coach returns 403', async () => {
  const res = await api(app, otherCoach.accessToken).get(
    `/api/v1/coaches/${otherCoach.user.id}/athletes/${athlete.user.id}/sessions`,
  );
  assert.equal(res.statusCode, 403);
});

test('GET coach/.../sessions: wrong coachId returns 403', async () => {
  const res = await api(app, coach.accessToken).get(
    `/api/v1/coaches/${otherCoach.user.id}/athletes/${athlete.user.id}/sessions`,
  );
  assert.equal(res.statusCode, 403);
});

// REQ-022

test('GET coach/.../compliance returns compliance report', async () => {
  const res = await api(app, coach.accessToken).get(
    `/api/v1/coaches/${coach.user.id}/athletes/${athlete.user.id}/compliance?assignmentId=${assignmentId}`,
  );
  assert.equal(res.statusCode, 200);
  const body = json(res);
  assert.equal(body.assignmentId, assignmentId);
  assert.ok(Array.isArray(body.days));
  assert.ok(body.days.length >= 1);

  // Each day has the required fields
  const day = body.days[0];
  assert.ok('programDayId' in day);
  assert.ok('weekNumber' in day);
  assert.ok('dayNumber' in day);
  assert.ok('plannedDate' in day);
  assert.ok('completed' in day);

  // At least one completed day (the one linked in setup)
  const completedDays = body.days.filter((d) => d.completed);
  assert.ok(completedDays.length >= 1);
});

test('GET coach/.../compliance: missing assignmentId returns 400', async () => {
  const res = await api(app, coach.accessToken).get(
    `/api/v1/coaches/${coach.user.id}/athletes/${athlete.user.id}/compliance`,
  );
  assert.equal(res.statusCode, 400);
});

test('GET coach/.../compliance: unlinked coach returns 403', async () => {
  const res = await api(app, otherCoach.accessToken).get(
    `/api/v1/coaches/${otherCoach.user.id}/athletes/${athlete.user.id}/compliance?assignmentId=${assignmentId}`,
  );
  assert.equal(res.statusCode, 403);
});
