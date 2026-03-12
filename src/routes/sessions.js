import { col } from '../db.js';
import { P } from '../helpers/problems.js';

async function assertSessionAccess(req, reply, sessionId) {
  const session = await col.sessions().findOne({ _id: sessionId });
  if (!session) { reply.status(404).send(P.notFound('Session not found')); return null; }

  if (req.user.role === 'athlete' && session.athleteId !== req.user.id) {
    reply.status(403).send(P.forbidden()); return null;
  }
  if (req.user.role === 'coach') {
    // Coaches may only read via /coaches/:coachId/athletes/:athleteId/sessions route
    reply.status(403).send(P.forbidden('Coaches access sessions via the coach dashboard endpoints'));
    return null;
  }
  return session;
}

export default async function sessionRoutes(fastify) {
  // POST /sessions  REQ-012, REQ-013
  fastify.post('/sessions', { preHandler: fastify.requireRole('athlete') }, async (req, reply) => {
    const { date, assignmentId, programDayId, bodyweightLbs } = req.body ?? {};
    if (!date) return reply.status(400).send(P.badRequest('date is required'));

    const existing = await col.sessions().findOne({ athleteId: req.user.id, date });
    if (existing) return reply.status(409).send(P.conflict('A session already exists for this date'));

    const now = new Date().toISOString();
    const session = {
      _id: crypto.randomUUID(),
      athleteId: req.user.id,
      date,
      status: 'open',
      bodyweightLbs: bodyweightLbs ?? null,
      assignmentId: assignmentId ?? null,
      programDayId: programDayId ?? null,
      notes: null,
      createdAt: now,
      closedAt: null,
    };
    await col.sessions().insertOne(session);
    return reply.status(201).send(session);
  });

  // GET /users/:userId/sessions  REQ-017
  fastify.get('/users/:userId/sessions', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { userId } = req.params;

    if (req.user.role === 'athlete' && req.user.id !== userId) {
      return reply.status(403).send(P.forbidden());
    }
    if (req.user.role === 'coach') {
      const rel = await col.relationships().findOne({
        coachId: req.user.id, athleteId: userId, status: 'active',
      });
      if (!rel) return reply.status(403).send(P.forbidden());
    }

    const limit = Math.min(parseInt(req.query.limit ?? '20', 10), 100);
    const allSessions = await col.sessions().find({ athleteId: userId }).toArray();
    allSessions.sort((a, b) => b.date.localeCompare(a.date));
    const page = allSessions.slice(0, limit);

    const items = await Promise.all(page.map(async (s) => {
      const sets = await col.sets().find({ sessionId: s._id }).toArray();
      const exerciseIds = new Set(sets.map((st) => st.exerciseId));
      return {
        id: s._id,
        date: s.date,
        status: s.status,
        exerciseCount: exerciseIds.size,
        linkedToProgram: !!s.programDayId,
        bodyweightLbs: s.bodyweightLbs,
      };
    }));

    return reply.send({ items, nextCursor: null });
  });

  // GET /sessions/:sessionId  REQ-017, REQ-021
  fastify.get('/sessions/:sessionId', { preHandler: fastify.authenticate }, async (req, reply) => {
    const session = await col.sessions().findOne({ _id: req.params.sessionId });
    if (!session) return reply.status(404).send(P.notFound('Session not found'));

    if (req.user.role === 'athlete' && session.athleteId !== req.user.id) {
      return reply.status(403).send(P.forbidden());
    }
    if (req.user.role === 'coach') {
      const rel = await col.relationships().findOne({
        coachId: req.user.id, athleteId: session.athleteId, status: 'active',
      });
      if (!rel) return reply.status(403).send(P.forbidden());
    }

    const sets = await col.sets().find({ sessionId: session._id }).toArray();
    sets.sort((a, b) => a.order - b.order);
    return reply.send({ ...session, id: session._id, sets });
  });

  // PATCH /sessions/:sessionId  REQ-013, REQ-016
  fastify.patch('/sessions/:sessionId', { preHandler: fastify.requireRole('athlete') }, async (req, reply) => {
    const session = await col.sessions().findOne({ _id: req.params.sessionId });
    if (!session) return reply.status(404).send(P.notFound('Session not found'));
    if (session.athleteId !== req.user.id) return reply.status(403).send(P.forbidden());

    const body = req.body ?? {};
    const updates = {};

    if ('bodyweightLbs' in body) updates.bodyweightLbs = body.bodyweightLbs;
    if ('notes' in body) updates.notes = body.notes;
    if ('status' in body) {
      if (body.status !== 'closed') {
        return reply.status(400).send(P.badRequest("status can only be set to 'closed'"));
      }
      if (session.status === 'closed') {
        return reply.status(422).send(P.unprocessable('Session is already closed'));
      }
      updates.status = 'closed';
      updates.closedAt = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send(P.badRequest('No valid fields provided'));
    }

    await col.sessions().updateOne({ _id: session._id }, { $set: updates });
    const updated = await col.sessions().findOne({ _id: session._id });
    return reply.send(updated);
  });

  // DELETE /sessions/:sessionId  REQ-012
  fastify.delete('/sessions/:sessionId', { preHandler: fastify.requireRole('athlete') }, async (req, reply) => {
    const session = await col.sessions().findOne({ _id: req.params.sessionId });
    if (!session) return reply.status(404).send(P.notFound('Session not found'));
    if (session.athleteId !== req.user.id) return reply.status(403).send(P.forbidden());
    if (session.status === 'closed') {
      return reply.status(422).send(P.unprocessable('Closed sessions cannot be deleted'));
    }

    await col.sets().deleteMany({ sessionId: session._id });
    await col.sessions().deleteOne({ _id: session._id });
    return reply.status(204).send();
  });
}
