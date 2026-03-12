import { col } from '../db.js';
import { P } from '../helpers/problems.js';

export default async function programRoutes(fastify) {
  // GET /programs  REQ-008
  fastify.get('/programs', { preHandler: fastify.requireRole('coach') }, async (req, reply) => {
    const items = await col.programs().find({ coachId: req.user.id }).toArray();
    return reply.send({ items });
  });

  // POST /programs  REQ-008
  fastify.post('/programs', { preHandler: fastify.requireRole('coach') }, async (req, reply) => {
    const { name, description, durationWeeks, daysPerWeek } = req.body ?? {};
    if (!name) return reply.status(400).send(P.badRequest('name is required'));
    if (!durationWeeks || durationWeeks < 1) return reply.status(400).send(P.badRequest('durationWeeks must be ≥ 1'));
    if (!daysPerWeek || daysPerWeek < 1 || daysPerWeek > 7) {
      return reply.status(400).send(P.badRequest('daysPerWeek must be 1–7'));
    }

    const now = new Date().toISOString();
    const program = {
      _id: crypto.randomUUID(),
      coachId: req.user.id,
      name,
      description: description ?? null,
      durationWeeks,
      daysPerWeek,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    await col.programs().insertOne(program);
    return reply.status(201).send(program);
  });

  // GET /programs/:programId  REQ-008, REQ-011
  fastify.get('/programs/:programId', { preHandler: fastify.authenticate }, async (req, reply) => {
    const program = await col.programs().findOne({ _id: req.params.programId });
    if (!program) return reply.status(404).send(P.notFound('Program not found'));

    // Coach must own it; athlete must be assigned to it
    if (req.user.role === 'coach' && program.coachId !== req.user.id) {
      return reply.status(403).send(P.forbidden());
    }
    if (req.user.role === 'athlete') {
      const assignment = await col.assignments().findOne({
        programId: program._id,
        athleteId: req.user.id,
        status: 'active',
      });
      if (!assignment) return reply.status(403).send(P.forbidden());
    }

    return reply.send(program);
  });

  // PATCH /programs/:programId  REQ-008
  fastify.patch('/programs/:programId', { preHandler: fastify.requireRole('coach') }, async (req, reply) => {
    const program = await col.programs().findOne({ _id: req.params.programId });
    if (!program) return reply.status(404).send(P.notFound('Program not found'));
    if (program.coachId !== req.user.id) return reply.status(403).send(P.forbidden());

    // Block edits if there are active assignments
    const activeAssignment = await col.assignments().findOne({
      programId: program._id,
      status: 'active',
    });
    if (activeAssignment) {
      return reply.status(422).send(P.unprocessable('Cannot edit a program with active assignments'));
    }

    const allowed = ['name', 'description', 'durationWeeks', 'daysPerWeek', 'status'];
    const updates = { updatedAt: new Date().toISOString() };
    for (const key of allowed) {
      if (key in (req.body ?? {})) updates[key] = req.body[key];
    }

    await col.programs().updateOne({ _id: program._id }, { $set: updates });
    const updated = await col.programs().findOne({ _id: program._id });
    return reply.send(updated);
  });

  // DELETE /programs/:programId  REQ-008
  fastify.delete('/programs/:programId', { preHandler: fastify.requireRole('coach') }, async (req, reply) => {
    const program = await col.programs().findOne({ _id: req.params.programId });
    if (!program) return reply.status(404).send(P.notFound('Program not found'));
    if (program.coachId !== req.user.id) return reply.status(403).send(P.forbidden());

    const activeAssignment = await col.assignments().findOne({
      programId: program._id,
      status: 'active',
    });
    if (activeAssignment) {
      return reply.status(422).send(P.unprocessable('Cannot delete a program with active assignments'));
    }

    await col.programs().deleteOne({ _id: program._id });
    return reply.status(204).send();
  });
}
