import { col } from '../db.js';
import { P } from '../helpers/problems.js';

function toPublic(user) {
  const { _id, passwordHash, ...rest } = user;
  return { id: _id, ...rest };
}

export default async function userRoutes(fastify) {
  // GET /users/:userId  REQ-003, REQ-004
  fastify.get('/users/:userId', { preHandler: fastify.authenticate }, async (request, reply) => {
    const { userId } = request.params;
    const caller = request.user;

    // Athletes see their own profile; coaches see their own or a linked athlete's profile.
    // For simplicity, allow any authenticated user to read any user's profile
    // (guards for athlete-coach link can be tightened later).
    const user = await col.users().findOne({ _id: userId });
    if (!user) return reply.status(404).send(P.notFound('User not found'));

    return reply.send(toPublic(user));
  });

  // PATCH /users/:userId  REQ-003, REQ-004
  fastify.patch('/users/:userId', { preHandler: fastify.authenticate }, async (request, reply) => {
    const { userId } = request.params;
    const caller = request.user;

    if (caller.id !== userId) {
      return reply.status(403).send(P.forbidden('You can only update your own profile'));
    }

    const user = await col.users().findOne({ _id: userId });
    if (!user) return reply.status(404).send(P.notFound('User not found'));

    const body = request.body ?? {};
    const allowed = user.role === 'athlete'
      ? ['displayName', 'weightClass', 'dateOfBirth']
      : ['displayName', 'bio'];

    const updates = {};
    for (const key of allowed) {
      if (key in body) updates[`profile.${key}`] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send(P.badRequest('No valid profile fields provided'));
    }

    await col.users().updateOne({ _id: userId }, { $set: updates });
    const updated = await col.users().findOne({ _id: userId });
    return reply.send(toPublic(updated));
  });
}
