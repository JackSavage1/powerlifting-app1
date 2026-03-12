import { col } from '../db.js';
import { P } from '../helpers/problems.js';

export default async function setRoutes(fastify) {
  // POST /sessions/:sessionId/sets  REQ-014
  fastify.post('/sessions/:sessionId/sets', { preHandler: fastify.requireRole('athlete') }, async (req, reply) => {
    const session = await col.sessions().findOne({ _id: req.params.sessionId });
    if (!session) return reply.status(404).send(P.notFound('Session not found'));
    if (session.athleteId !== req.user.id) return reply.status(403).send(P.forbidden());
    if (session.status === 'closed') {
      return reply.status(422).send(P.unprocessable('Cannot add sets to a closed session'));
    }

    const { exerciseId, weightLbs, reps, rpe, rir, videoUrl, notes } = req.body ?? {};
    if (!exerciseId) return reply.status(400).send(P.badRequest('exerciseId is required'));
    if (weightLbs === undefined || weightLbs === null) return reply.status(400).send(P.badRequest('weightLbs is required'));
    if (!reps) return reply.status(400).send(P.badRequest('reps is required'));

    // Compute next order
    const existingSets = await col.sets().find({ sessionId: session._id }).toArray();
    const maxOrder = existingSets.length > 0 ? Math.max(...existingSets.map((s) => s.order)) : -1;

    const now = new Date().toISOString();
    const set = {
      _id: crypto.randomUUID(),
      sessionId: session._id,
      athleteId: req.user.id,
      exerciseId,
      weightLbs,
      reps,
      rpe: rpe ?? null,
      rir: rir ?? null,
      videoUrl: videoUrl ?? null,
      notes: notes ?? null,
      order: maxOrder + 1,
      isPR: false,
      createdAt: now,
      updatedAt: now,
    };
    await col.sets().insertOne(set);
    return reply.status(201).send(set);
  });

  // PATCH /sessions/:sessionId/sets/:setId  REQ-015
  fastify.patch('/sessions/:sessionId/sets/:setId', { preHandler: fastify.requireRole('athlete') }, async (req, reply) => {
    const session = await col.sessions().findOne({ _id: req.params.sessionId });
    if (!session) return reply.status(404).send(P.notFound('Session not found'));
    if (session.athleteId !== req.user.id) return reply.status(403).send(P.forbidden());
    if (session.status === 'closed') {
      return reply.status(422).send(P.unprocessable('Cannot edit sets in a closed session'));
    }

    const set = await col.sets().findOne({ _id: req.params.setId, sessionId: session._id });
    if (!set) return reply.status(404).send(P.notFound('Set not found'));

    const allowed = ['weightLbs', 'reps', 'rpe', 'rir', 'videoUrl', 'notes'];
    const updates = { updatedAt: new Date().toISOString() };
    for (const key of allowed) {
      if (key in (req.body ?? {})) updates[key] = req.body[key];
    }

    await col.sets().updateOne({ _id: set._id }, { $set: updates });
    const updated = await col.sets().findOne({ _id: set._id });
    return reply.send(updated);
  });

  // DELETE /sessions/:sessionId/sets/:setId  REQ-015
  fastify.delete('/sessions/:sessionId/sets/:setId', { preHandler: fastify.requireRole('athlete') }, async (req, reply) => {
    const session = await col.sessions().findOne({ _id: req.params.sessionId });
    if (!session) return reply.status(404).send(P.notFound('Session not found'));
    if (session.athleteId !== req.user.id) return reply.status(403).send(P.forbidden());
    if (session.status === 'closed') {
      return reply.status(422).send(P.unprocessable('Cannot delete sets from a closed session'));
    }

    const set = await col.sets().findOne({ _id: req.params.setId, sessionId: session._id });
    if (!set) return reply.status(404).send(P.notFound('Set not found'));

    await col.sets().deleteOne({ _id: set._id });
    return reply.status(204).send();
  });
}
