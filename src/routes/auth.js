import bcrypt from 'bcryptjs';
import { col } from '../db.js';
import { P } from '../helpers/problems.js';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export default async function authRoutes(fastify) {
  // POST /auth/register  REQ-001
  fastify.post('/auth/register', async (request, reply) => {
    const { email, password, role } = request.body ?? {};

    if (!email || !password || !role) {
      return reply.status(400).send(P.badRequest('email, password, and role are required'));
    }
    if (!['athlete', 'coach'].includes(role)) {
      return reply.status(400).send(P.badRequest('role must be athlete or coach'));
    }
    if (typeof password !== 'string' || password.length < 8) {
      return reply.status(400).send(P.badRequest('password must be at least 8 characters'));
    }

    const existing = await col.users().findOne({ email });
    if (existing) {
      return reply.status(409).send(P.conflict('An account with this email already exists'));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const defaultProfile = role === 'athlete'
      ? { displayName: email.split('@')[0], weightClass: null, dateOfBirth: null }
      : { displayName: email.split('@')[0], bio: null };

    const user = { _id: id, email, passwordHash, role, profile: defaultProfile, createdAt: now };
    await col.users().insertOne(user);

    const token = fastify.jwt.sign({ id, email, role });
    const refreshToken = fastify.jwt.sign({ id, type: 'refresh' }, { expiresIn: '7d' });

    reply.setCookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true, sameSite: 'Lax', maxAge: REFRESH_TTL_MS / 1000, path: '/',
    });

    return reply.status(201).send({
      accessToken: token,
      user: { id, email, role, profile: defaultProfile },
    });
  });

  // POST /auth/login  REQ-002
  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body ?? {};
    if (!email || !password) {
      return reply.status(400).send(P.badRequest('email and password are required'));
    }

    const user = await col.users().findOne({ email });
    const valid = user && await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send(P.unauthorized('Invalid credentials'));
    }

    const token = fastify.jwt.sign({ id: user._id, email: user.email, role: user.role });
    const refreshToken = fastify.jwt.sign({ id: user._id, type: 'refresh' }, { expiresIn: '7d' });

    reply.setCookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true, sameSite: 'Lax', maxAge: REFRESH_TTL_MS / 1000, path: '/',
    });

    return reply.send({
      accessToken: token,
      user: { id: user._id, email: user.email, role: user.role, profile: user.profile },
    });
  });

  // POST /auth/logout  REQ-002
  fastify.post('/auth/logout', {
    preHandler: fastify.authenticate,
  }, async (request, reply) => {
    reply.clearCookie(REFRESH_COOKIE, { path: '/' });
    return reply.status(204).send();
  });

  // POST /auth/token  — refresh access token
  fastify.post('/auth/token', async (request, reply) => {
    const token = request.cookies?.[REFRESH_COOKIE];
    if (!token) return reply.status(401).send(P.unauthorized('No refresh token'));

    let payload;
    try {
      payload = fastify.jwt.verify(token);
    } catch {
      return reply.status(401).send(P.unauthorized('Invalid or expired refresh token'));
    }

    if (payload.type !== 'refresh') {
      return reply.status(401).send(P.unauthorized('Invalid token type'));
    }

    const user = await col.users().findOne({ _id: payload.id });
    if (!user) return reply.status(401).send(P.unauthorized('User not found'));

    const accessToken = fastify.jwt.sign({ id: user._id, email: user.email, role: user.role });
    return reply.send({ accessToken });
  });
}
