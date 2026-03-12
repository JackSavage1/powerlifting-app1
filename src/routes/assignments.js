import { col } from '../db.js';
import { P } from '../helpers/problems.js';

// Compute which program day corresponds to today given startDate
function currentProgramDayId(days, startDate, daysPerWeek) {
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const diffMs = today - start;
  if (diffMs < 0) return null;

  const daysSinceStart = Math.floor(diffMs / 86400000);
  // Map calendar day → (weekNumber, dayNumber) treating every day as a training day
  const weekNumber = Math.floor(daysSinceStart / daysPerWeek) + 1;
  const dayNumber = (daysSinceStart % daysPerWeek) + 1;

  const match = days.find((d) => d.weekNumber === weekNumber && d.dayNumber === dayNumber);
  return match?._id ?? null;
}

export default async function assignmentRoutes(fastify) {
  // POST /programs/:programId/assignments  REQ-010
  fastify.post('/programs/:programId/assignments', { preHandler: fastify.requireRole('coach') }, async (req, reply) => {
    const { programId } = req.params;
    const { athleteIds, startDate } = req.body ?? {};

    if (!athleteIds?.length) return reply.status(400).send(P.badRequest('athleteIds must be a non-empty array'));
    if (!startDate) return reply.status(400).send(P.badRequest('startDate is required'));

    const program = await col.programs().findOne({ _id: programId });
    if (!program) return reply.status(404).send(P.notFound('Program not found'));
    if (program.coachId !== req.user.id) return reply.status(403).send(P.forbidden());

    // Verify all athlete IDs belong to athletes on this coach's roster
    const activeRels = await col.relationships()
      .find({ coachId: req.user.id, status: 'active' })
      .toArray();
    const rosterIds = new Set(activeRels.map((r) => r.athleteId));

    for (const id of athleteIds) {
      if (!rosterIds.has(id)) {
        return reply.status(404).send(P.notFound(`Athlete ${id} is not on your roster`));
      }
    }

    const now = new Date().toISOString();
    const items = [];
    for (const athleteId of athleteIds) {
      const assignment = {
        _id: crypto.randomUUID(),
        programId,
        athleteId,
        coachId: req.user.id,
        startDate,
        assignedAt: now,
        status: 'active',
      };
      await col.assignments().insertOne(assignment);
      items.push(assignment);
    }

    return reply.status(201).send({ items });
  });

  // GET /users/:userId/assignments  REQ-011
  fastify.get('/users/:userId/assignments', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { userId } = req.params;
    if (req.user.id !== userId) return reply.status(403).send(P.forbidden());

    const { status } = req.query;
    const filter = { athleteId: userId };
    if (status) filter.status = status;

    const items = await col.assignments().find(filter).toArray();
    return reply.send({ items });
  });

  // GET /users/:userId/assignments/active  REQ-011
  fastify.get('/users/:userId/assignments/active', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { userId } = req.params;
    if (req.user.id !== userId) return reply.status(403).send(P.forbidden());

    const assignment = await col.assignments().findOne({ athleteId: userId, status: 'active' });
    if (!assignment) {
      return reply.status(404).send({
        ...P.notFound('No active assignment'),
        detail: 'This athlete has no active program assignment.',
      });
    }

    const program = await col.programs().findOne({ _id: assignment.programId });
    const days = await col.programDays().find({ programId: assignment.programId }).toArray();
    days.sort((a, b) => a.weekNumber - b.weekNumber || a.dayNumber - b.dayNumber);

    const currentDayId = currentProgramDayId(days, assignment.startDate, program?.daysPerWeek ?? 1);

    return reply.send({ assignment, program, days, currentDayId });
  });
}
