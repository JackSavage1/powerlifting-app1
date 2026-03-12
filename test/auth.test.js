import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, json } from './helpers.js';
import { col } from '../src/db.js';

let app;
const createdEmails = [];

before(async () => { app = await createApp(); });
after(async () => {
  for (const email of createdEmails) {
    await col.users().deleteMany({ email });
  }
  await app.close();
});

const uniqueEmail = () => {
  const e = `auth_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
  createdEmails.push(e);
  return e;
};

// --- REQ-001 register ---

test('register: creates athlete account', async () => {
  const email = uniqueEmail();
  const res = await app.inject({
    method: 'POST', url: '/api/v1/auth/register',
    payload: { email, password: 'Password1!', role: 'athlete' },
  });
  assert.equal(res.statusCode, 201);
  const body = json(res);
  assert.ok(body.accessToken);
  assert.equal(body.user.email, email);
  assert.equal(body.user.role, 'athlete');
});

test('register: creates coach account', async () => {
  const email = uniqueEmail();
  const res = await app.inject({
    method: 'POST', url: '/api/v1/auth/register',
    payload: { email, password: 'Password1!', role: 'coach' },
  });
  assert.equal(res.statusCode, 201);
  assert.equal(json(res).user.role, 'coach');
});

test('register: rejects duplicate email with 409', async () => {
  const email = uniqueEmail();
  await app.inject({ method: 'POST', url: '/api/v1/auth/register',
    payload: { email, password: 'Password1!', role: 'athlete' } });
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/register',
    payload: { email, password: 'Password1!', role: 'athlete' } });
  assert.equal(res.statusCode, 409);
});

test('register: rejects short password with 400', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/register',
    payload: { email: uniqueEmail(), password: 'short', role: 'athlete' } });
  assert.equal(res.statusCode, 400);
});

test('register: rejects invalid role with 400', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/register',
    payload: { email: uniqueEmail(), password: 'Password1!', role: 'admin' } });
  assert.equal(res.statusCode, 400);
});

// --- REQ-002 login / logout ---

test('login: returns token for valid credentials', async () => {
  const email = uniqueEmail();
  await app.inject({ method: 'POST', url: '/api/v1/auth/register',
    payload: { email, password: 'Password1!', role: 'athlete' } });
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login',
    payload: { email, password: 'Password1!' } });
  assert.equal(res.statusCode, 200);
  assert.ok(json(res).accessToken);
});

test('login: rejects wrong password with 401', async () => {
  const email = uniqueEmail();
  await app.inject({ method: 'POST', url: '/api/v1/auth/register',
    payload: { email, password: 'Password1!', role: 'athlete' } });
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login',
    payload: { email, password: 'WrongPassword!' } });
  assert.equal(res.statusCode, 401);
});

test('login: rejects unknown email with 401', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login',
    payload: { email: 'nobody@nowhere.com', password: 'Password1!' } });
  assert.equal(res.statusCode, 401);
});

test('logout: 204 with valid token', async () => {
  const email = uniqueEmail();
  const reg = await app.inject({ method: 'POST', url: '/api/v1/auth/register',
    payload: { email, password: 'Password1!', role: 'athlete' } });
  const token = json(reg).accessToken;
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/logout',
    headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.statusCode, 204);
});

test('logout: 401 without token', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/v1/auth/logout' });
  assert.equal(res.statusCode, 401);
});
