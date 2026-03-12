import { col } from '../db.js';
import { P } from '../helpers/problems.js';

export default async function prRoutes(fastify) {
  // POST /users/:userId/prs  REQ-018
  fastify.post('/users/:userId/prs', { preHandler: fastify.requireRole('athlete') }, async (req, reply) => {
    const { userId } = req.params;
    if (req.user.id !== userId) return reply.status(403).send(P.forbidden());

    const { setId } = req.body ?? {};
    if (!setId) return reply.status(400).send(P.badRequest('setId is required'));

    const set = await col.sets().findOne({ _id: setId, athleteId: userId });
    if (!set) return reply.status(404).send(P.notFound('Set not found'));

    const session = await col.sessions().findOne({ _id: set.sessionId });
    if (!session || session.status !== 'closed') {
      return reply.status(422).send(P.unprocessable('A PR can only be marked from a closed session'));
    }

    const exercise = await col.exercises().findOne({ _id: set.exerciseId });

    // Unmark previous PR for this exercise (if any)
    const prevPR = await col.prs().findOne({ athleteId: userId, exerciseId: set.exerciseId });
    if (prevPR) {
      await col.sets().updateOne({ _id: prevPR.setId }, { $set: { isPR: false, updatedAt: new Date().toISOString() } });
    }

    // Mark new set as PR
    await col.sets().updateOne({ _id: setId }, { $set: { isPR: true, updatedAt: new Date().toISOString() } });

    const prDoc = {
      _id: prevPR?._id ?? crypto.randomUUID(),
      athleteId: userId,
      exerciseId: set.exerciseId,
      setId,
      sessionId: set.sessionId,
      weightLbs: set.weightLbs,
      reps: set.reps,
      achievedAt: session.date,
    };

    if (prevPR) {
      const { _id, ...fields } = prDoc;
      await col.prs().updateOne({ _id: prDoc._id }, { $set: fields });
    } else {
      await col.prs().insertOne(prDoc);
    }

    return reply.send({ ...prDoc, exercise });
  });

  // GET /users/:userId/prs  REQ-019, REQ-020
  fastify.get('/users/:userId/prs', { preHandler: fastify.authenticate }, async (req, reply) => {
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

    const prs = await col.prs().find({ athleteId: userId }).toArray();
    const items = await Promise.all(prs.map(async (pr) => {
      const exercise = await col.exercises().findOne({ _id: pr.exerciseId });
      return { ...pr, id: pr._id, exercise };
    }));

    return reply.send({ items });
  });

  // GET /users/:userId/prs/:exerciseId  REQ-019, REQ-020
  fastify.get('/users/:userId/prs/:exerciseId', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { userId, exerciseId } = req.params;

    if (req.user.role === 'athlete' && req.user.id !== userId) {
      return reply.status(403).send(P.forbidden());
    }
    if (req.user.role === 'coach') {
      const rel = await col.relationships().findOne({
        coachId: req.user.id, athleteId: userId, status: 'active',
      });
      if (!rel) return reply.status(403).send(P.forbidden());
    }

    const pr = await col.prs().findOne({ athleteId: userId, exerciseId });
    if (!pr) return reply.status(404).send(P.notFound('No PR found for this exercise'));

    const exercise = await col.exercises().findOne({ _id: exerciseId });
    return reply.send({ ...pr, id: pr._id, exercise });
  });

  // DELETE /users/:userId/prs/:exerciseId  REQ-018
  fastify.delete('/users/:userId/prs/:exerciseId', { preHandler: fastify.requireRole('athlete') }, async (req, reply) => {
    const { userId, exerciseId } = req.params;
    if (req.user.id !== userId) return reply.status(403).send(P.forbidden());

    const pr = await col.prs().findOne({ athleteId: userId, exerciseId });
    if (!pr) return reply.status(404).send(P.notFound('No PR found for this exercise'));

    await col.sets().updateOne({ _id: pr.setId }, { $set: { isPR: false, updatedAt: new Date().toISOString() } });
    await col.prs().deleteOne({ _id: pr._id });
    return reply.status(204).send();
  });
}
