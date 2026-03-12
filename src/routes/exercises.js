import { col } from '../db.js';
import { P } from '../helpers/problems.js';

export default async function exerciseRoutes(fastify) {
  // GET /exercises  REQ-006, REQ-007
  fastify.get('/exercises', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { isDefault } = req.query;
    let filter = {};

    if (isDefault === 'true') {
      filter = { isDefault: true };
    } else if (isDefault === 'false') {
      // Custom exercises created by this user OR by a coach they work with
      filter = { isDefault: false };
    }
    // If no filter, return defaults + caller's own customs
    if (isDefault === undefined) {
      const defaults = await col.exercises().find({ isDefault: true }).toArray();
      const customs = await col.exercises().find({ isDefault: false, createdBy: req.user.id }).toArray();
      return reply.send({ items: [...defaults, ...customs] });
    }

    const items = await col.exercises().find(filter).toArray();
    return reply.send({ items });
  });

  // POST /exercises  REQ-007
  fastify.post('/exercises', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { name } = req.body ?? {};
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return reply.status(400).send(P.badRequest('name is required'));
    }

    const exercise = {
      _id: crypto.randomUUID(),
      name: name.trim(),
      isDefault: false,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
    };
    await col.exercises().insertOne(exercise);
    return reply.status(201).send(exercise);
  });

  // GET /exercises/:exerciseId  REQ-006, REQ-007
  fastify.get('/exercises/:exerciseId', { preHandler: fastify.authenticate }, async (req, reply) => {
    const exercise = await col.exercises().findOne({ _id: req.params.exerciseId });
    if (!exercise) return reply.status(404).send(P.notFound('Exercise not found'));
    return reply.send(exercise);
  });

  // PATCH /exercises/:exerciseId  REQ-007
  fastify.patch('/exercises/:exerciseId', { preHandler: fastify.authenticate }, async (req, reply) => {
    const exercise = await col.exercises().findOne({ _id: req.params.exerciseId });
    if (!exercise) return reply.status(404).send(P.notFound('Exercise not found'));
    if (exercise.isDefault) return reply.status(403).send(P.forbidden('Default exercises cannot be modified'));
    if (exercise.createdBy !== req.user.id) return reply.status(403).send(P.forbidden());

    const { name } = req.body ?? {};
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return reply.status(400).send(P.badRequest('name is required'));
    }

    await col.exercises().updateOne({ _id: exercise._id }, { $set: { name: name.trim() } });
    return reply.send({ ...exercise, name: name.trim() });
  });

  // DELETE /exercises/:exerciseId  REQ-007
  fastify.delete('/exercises/:exerciseId', { preHandler: fastify.authenticate }, async (req, reply) => {
    const exercise = await col.exercises().findOne({ _id: req.params.exerciseId });
    if (!exercise) return reply.status(404).send(P.notFound('Exercise not found'));
    if (exercise.isDefault) return reply.status(403).send(P.forbidden('Default exercises cannot be deleted'));
    if (exercise.createdBy !== req.user.id) return reply.status(403).send(P.forbidden());

    await col.exercises().deleteOne({ _id: exercise._id });
    return reply.status(204).send();
  });
}
