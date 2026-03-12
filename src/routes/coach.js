import { col } from '../db.js';
import { P } from '../helpers/problems.js';

async function assertCoachAthleteLink(coachId, athleteId) {
  const rel = await col.relationships().findOne({ coachId, athleteId, status: 'active' });
  return !!rel;
}

export default async function coachRoutes(fastify) {
  // GET /coaches/:coachId/athletes/:athleteId/sessions  REQ-021
  fastify.get('/coaches/:coachId/athletes/:athleteId/sessions', {
    preHandler: fastify.requireRole('coach'),
  }, async (req, reply) => {
    const { coachId, athleteId } = req.params;
    if (req.user.id !== coachId) return reply.status(403).send(P.forbidden());

    const linked = await assertCoachAthleteLink(coachId, athleteId);
    if (!linked) return reply.status(403).send(P.forbidden('No active relationship with this athlete'));

    const limit = Math.min(parseInt(req.query.limit ?? '20', 10), 100);
    const allSessions = await col.sessions().find({ athleteId }).toArray();
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

  // GET /coaches/:coachId/athletes/:athleteId/compliance  REQ-022
  fastify.get('/coaches/:coachId/athletes/:athleteId/compliance', {
    preHandler: fastify.requireRole('coach'),
  }, async (req, reply) => {
    const { coachId, athleteId } = req.params;
    const { assignmentId } = req.query;

    if (req.user.id !== coachId) return reply.status(403).send(P.forbidden());
    if (!assignmentId) return reply.status(400).send(P.badRequest('assignmentId query param is required'));

    const linked = await assertCoachAthleteLink(coachId, athleteId);
    if (!linked) return reply.status(403).send(P.forbidden('No active relationship with this athlete'));

    const assignment = await col.assignments().findOne({ _id: assignmentId, athleteId });
    if (!assignment) return reply.status(404).send(P.notFound('Assignment not found'));

    const program = await col.programs().findOne({ _id: assignment.programId });
    if (!program) return reply.status(404).send(P.notFound('Program not found'));

    const programDays = await col.programDays().find({ programId: assignment.programId }).toArray();
    programDays.sort((a, b) => a.weekNumber - b.weekNumber || a.dayNumber - b.dayNumber);

    // Get all sessions for this athlete linked to this assignment
    const sessions = await col.sessions().find({ athleteId, assignmentId }).toArray();
    const completedDayIds = new Set(sessions.filter((s) => s.programDayId).map((s) => s.programDayId));
    const sessionByDayId = Object.fromEntries(
      sessions.filter((s) => s.programDayId).map((s) => [s.programDayId, s._id]),
    );

    // Compute planned date for each program day
    const startDate = new Date(assignment.startDate);
    startDate.setHours(0, 0, 0, 0);

    const days = programDays.map((d) => {
      const dayIndex = (d.weekNumber - 1) * program.daysPerWeek + (d.dayNumber - 1);
      const plannedDate = new Date(startDate.getTime() + dayIndex * 86400000)
        .toISOString()
        .slice(0, 10);
      return {
        programDayId: d._id,
        weekNumber: d.weekNumber,
        dayNumber: d.dayNumber,
        plannedDate,
        completed: completedDayIds.has(d._id),
        sessionId: sessionByDayId[d._id] ?? null,
      };
    });

    return reply.send({ assignmentId, days });
  });
}
