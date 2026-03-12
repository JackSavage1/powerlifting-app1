import { col } from '../db.js';
import { P } from '../helpers/problems.js';

function toPublic(user) {
  const { _id, passwordHash, ...rest } = user;
  return { id: _id, ...rest };
}

export default async function relationshipRoutes(fastify) {
  // GET /coaches/:coachId/athletes  REQ-005
  fastify.get('/coaches/:coachId/athletes', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { coachId } = req.params;
    if (req.user.id !== coachId) return reply.status(403).send(P.forbidden());

    const rels = await col.relationships().find({ coachId, status: 'active' }).toArray();
    const items = await Promise.all(rels.map(async (r) => {
      const athlete = await col.users().findOne({ _id: r.athleteId });
      return { relationshipId: r._id, athlete: athlete ? toPublic(athlete) : null };
    }));
    return reply.send({ items: items.filter((i) => i.athlete) });
  });

  // POST /coaches/:coachId/athletes  REQ-005 — invite
  fastify.post('/coaches/:coachId/athletes', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { coachId } = req.params;
    if (req.user.id !== coachId || req.user.role !== 'coach') {
      return reply.status(403).send(P.forbidden());
    }

    const { athleteEmail } = req.body ?? {};
    if (!athleteEmail) return reply.status(400).send(P.badRequest('athleteEmail is required'));

    const athlete = await col.users().findOne({ email: athleteEmail });
    if (!athlete || athlete.role !== 'athlete') {
      return reply.status(404).send(P.notFound('No athlete account found with that email'));
    }

    const existing = await col.relationships().findOne({
      coachId,
      athleteId: athlete._id,
      status: { $in: ['pending', 'active'] },
    });
    if (existing) return reply.status(409).send(P.conflict('Invitation already exists or relationship is active'));

    const now = new Date().toISOString();
    const rel = {
      _id: crypto.randomUUID(),
      coachId,
      athleteId: athlete._id,
      status: 'pending',
      invitedAt: now,
      resolvedAt: null,
    };
    await col.relationships().insertOne(rel);
    return reply.status(201).send(rel);
  });

  // DELETE /coaches/:coachId/athletes/:athleteId  REQ-005
  fastify.delete('/coaches/:coachId/athletes/:athleteId', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { coachId, athleteId } = req.params;
    if (req.user.id !== coachId || req.user.role !== 'coach') {
      return reply.status(403).send(P.forbidden());
    }

    const rel = await col.relationships().findOne({ coachId, athleteId, status: 'active' });
    if (!rel) return reply.status(404).send(P.notFound('Active relationship not found'));

    await col.relationships().updateOne(
      { _id: rel._id },
      { $set: { status: 'removed', resolvedAt: new Date().toISOString() } },
    );
    return reply.status(204).send();
  });

  // GET /users/:userId/invitations  REQ-005
  fastify.get('/users/:userId/invitations', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { userId } = req.params;
    if (req.user.id !== userId) return reply.status(403).send(P.forbidden());

    const items = await col.relationships().find({ athleteId: userId, status: 'pending' }).toArray();
    return reply.send({ items });
  });

  // PATCH /invitations/:invitationId  REQ-005
  fastify.patch('/invitations/:invitationId', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { invitationId } = req.params;
    const { action } = req.body ?? {};

    if (!['accept', 'decline'].includes(action)) {
      return reply.status(400).send(P.badRequest('action must be accept or decline'));
    }

    const rel = await col.relationships().findOne({ _id: invitationId });
    if (!rel) return reply.status(404).send(P.notFound('Invitation not found'));
    if (req.user.id !== rel.athleteId) return reply.status(403).send(P.forbidden());
    if (rel.status !== 'pending') {
      return reply.status(422).send(P.unprocessable('Invitation is not pending'));
    }

    const newStatus = action === 'accept' ? 'active' : 'declined';
    const now = new Date().toISOString();
    await col.relationships().updateOne(
      { _id: invitationId },
      { $set: { status: newStatus, resolvedAt: now } },
    );
    return reply.send({ ...rel, status: newStatus, resolvedAt: now });
  });

  // GET /users/:userId/coaches  REQ-005
  fastify.get('/users/:userId/coaches', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { userId } = req.params;
    if (req.user.id !== userId) return reply.status(403).send(P.forbidden());

    const items = await col.relationships().find({ athleteId: userId, status: 'active' }).toArray();
    return reply.send({ items });
  });
}
