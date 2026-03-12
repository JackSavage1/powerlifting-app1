import { col } from '../db.js';
import { P } from '../helpers/problems.js';

async function assertProgramAccess(req, reply, programId) {
  const program = await col.programs().findOne({ _id: programId });
  if (!program) { reply.status(404).send(P.notFound('Program not found')); return null; }
  if (req.user.role === 'coach' && program.coachId !== req.user.id) {
    reply.status(403).send(P.forbidden()); return null;
  }
  if (req.user.role === 'athlete') {
    const assignment = await col.assignments().findOne({
      programId, athleteId: req.user.id, status: 'active',
    });
    if (!assignment) { reply.status(403).send(P.forbidden()); return null; }
  }
  return program;
}

export default async function programDayRoutes(fastify) {
  // GET /programs/:programId/days  REQ-009, REQ-011
  fastify.get('/programs/:programId/days', { preHandler: fastify.authenticate }, async (req, reply) => {
    const program = await assertProgramAccess(req, reply, req.params.programId);
    if (!program) return;

    const items = await col.programDays()
      .find({ programId: req.params.programId })
      .toArray();

    items.sort((a, b) => a.weekNumber - b.weekNumber || a.dayNumber - b.dayNumber);
    return reply.send({ items });
  });

  // POST /programs/:programId/days  REQ-009
  fastify.post('/programs/:programId/days', { preHandler: fastify.requireRole('coach') }, async (req, reply) => {
    const program = await assertProgramAccess(req, reply, req.params.programId);
    if (!program) return;

    const { weekNumber, dayNumber, label, slots } = req.body ?? {};
    if (!weekNumber || !dayNumber) {
      return reply.status(400).send(P.badRequest('weekNumber and dayNumber are required'));
    }
    if (weekNumber > program.durationWeeks) {
      return reply.status(400).send(P.badRequest(`weekNumber cannot exceed program durationWeeks (${program.durationWeeks})`));
    }
    if (dayNumber > program.daysPerWeek) {
      return reply.status(400).send(P.badRequest(`dayNumber cannot exceed program daysPerWeek (${program.daysPerWeek})`));
    }

    const existing = await col.programDays().findOne({
      programId: req.params.programId, weekNumber, dayNumber,
    });
    if (existing) return reply.status(409).send(P.conflict('A day already exists for this week/day combination'));

    const now = new Date().toISOString();
    const normalizedSlots = (slots ?? []).map((s, i) => ({
      slotId: crypto.randomUUID(),
      exerciseId: s.exerciseId,
      order: s.order ?? i,
      targetSets: s.targetSets,
      targetReps: s.targetReps,
      targetWeightLbs: s.targetWeightLbs ?? null,
      targetPercent1RM: s.targetPercent1RM ?? null,
      targetRPE: s.targetRPE ?? null,
    }));

    const day = {
      _id: crypto.randomUUID(),
      programId: req.params.programId,
      weekNumber,
      dayNumber,
      label: label ?? null,
      slots: normalizedSlots,
      updatedAt: now,
    };
    await col.programDays().insertOne(day);
    return reply.status(201).send(day);
  });

  // GET /programs/:programId/days/:dayId  REQ-009, REQ-011
  fastify.get('/programs/:programId/days/:dayId', { preHandler: fastify.authenticate }, async (req, reply) => {
    const program = await assertProgramAccess(req, reply, req.params.programId);
    if (!program) return;

    const day = await col.programDays().findOne({ _id: req.params.dayId, programId: req.params.programId });
    if (!day) return reply.status(404).send(P.notFound('Program day not found'));
    return reply.send(day);
  });

  // PATCH /programs/:programId/days/:dayId  REQ-009
  fastify.patch('/programs/:programId/days/:dayId', { preHandler: fastify.requireRole('coach') }, async (req, reply) => {
    const program = await assertProgramAccess(req, reply, req.params.programId);
    if (!program) return;

    const day = await col.programDays().findOne({ _id: req.params.dayId, programId: req.params.programId });
    if (!day) return reply.status(404).send(P.notFound('Program day not found'));

    const updates = { updatedAt: new Date().toISOString() };
    const { label, slots } = req.body ?? {};
    if (label !== undefined) updates.label = label;
    if (slots !== undefined) {
      updates.slots = slots.map((s, i) => ({
        slotId: s.slotId ?? crypto.randomUUID(),
        exerciseId: s.exerciseId,
        order: s.order ?? i,
        targetSets: s.targetSets,
        targetReps: s.targetReps,
        targetWeightLbs: s.targetWeightLbs ?? null,
        targetPercent1RM: s.targetPercent1RM ?? null,
        targetRPE: s.targetRPE ?? null,
      }));
    }

    await col.programDays().updateOne({ _id: day._id }, { $set: updates });
    const updated = await col.programDays().findOne({ _id: day._id });
    return reply.send(updated);
  });
}
