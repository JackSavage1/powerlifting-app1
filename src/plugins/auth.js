import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { P } from '../helpers/problems.js';

async function authPlugin(fastify) {
  await fastify.register(cookie);

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    sign:   { expiresIn: '1h' },
  });

  // Decorator: verifies Bearer token and attaches user to request
  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send(P.unauthorized());
    }
  });

  // Decorator: requires caller to have a specific role
  fastify.decorate('requireRole', (role) => async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send(P.unauthorized());
    }
    if (request.user.role !== role) {
      return reply.status(403).send(P.forbidden(`Role '${role}' required`));
    }
  });
}

export default fp(authPlugin);
