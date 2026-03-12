import 'dotenv/config';
import Fastify from 'fastify';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import relationshipRoutes from './routes/relationships.js';
import exerciseRoutes from './routes/exercises.js';
import programRoutes from './routes/programs.js';
import programDayRoutes from './routes/program-days.js';
import assignmentRoutes from './routes/assignments.js';
import sessionRoutes from './routes/sessions.js';
import setRoutes from './routes/sets.js';
import prRoutes from './routes/prs.js';
import coachRoutes from './routes/coach.js';

export async function buildApp(opts = {}) {
  const fastify = Fastify({ logger: opts.logger ?? true, ...opts });

  // Set Content-Type for problem responses
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try { done(null, body ? JSON.parse(body) : {}); }
    catch (e) { done(e); }
  });

  // Register auth plugin (JWT + cookie)
  await fastify.register(authPlugin);

  const PREFIX = '/api/v1';

  // Register all routes
  await fastify.register(authRoutes,        { prefix: PREFIX });
  await fastify.register(userRoutes,        { prefix: PREFIX });
  await fastify.register(relationshipRoutes,{ prefix: PREFIX });
  await fastify.register(exerciseRoutes,    { prefix: PREFIX });
  await fastify.register(programRoutes,     { prefix: PREFIX });
  await fastify.register(programDayRoutes,  { prefix: PREFIX });
  await fastify.register(assignmentRoutes,  { prefix: PREFIX });
  await fastify.register(sessionRoutes,     { prefix: PREFIX });
  await fastify.register(setRoutes,         { prefix: PREFIX });
  await fastify.register(prRoutes,          { prefix: PREFIX });
  await fastify.register(coachRoutes,       { prefix: PREFIX });

  return fastify;
}
