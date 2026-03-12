import { buildApp } from '../src/app.js';
import { col } from '../src/db.js';

export async function createApp() {
  return buildApp({ logger: false });
}

const RNG = () => Math.random().toString(36).slice(2, 10);

export async function registerUser(app, role = 'athlete') {
  const email = `test_${Date.now()}_${RNG()}@test.com`;
  const password = 'TestPass123!';
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password, role },
  });
  const body = JSON.parse(res.body);
  return { email, password, ...body };  // { email, password, accessToken, user: { id, role, ... } }
}

// Shorthand inject with auth header
export function api(app, token) {
  return {
    get:    (url)          => app.inject({ method: 'GET',    url, headers: { authorization: `Bearer ${token}` } }),
    post:   (url, payload) => app.inject({ method: 'POST',   url, payload, headers: { authorization: `Bearer ${token}` } }),
    patch:  (url, payload) => app.inject({ method: 'PATCH',  url, payload, headers: { authorization: `Bearer ${token}` } }),
    delete: (url)          => app.inject({ method: 'DELETE', url, headers: { authorization: `Bearer ${token}` } }),
  };
}

// Cleanup helpers — delete documents by filter
export async function cleanup(collectionName, filter) {
  await col[collectionName]().deleteMany(filter);
}

// Parse JSON body or return null
export function json(res) {
  try { return JSON.parse(res.body); }
  catch { return null; }
}
