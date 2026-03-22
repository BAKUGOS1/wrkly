import Fastify, { type FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { registerRoutes } from './routes';
import { AppError } from './lib/errors';
import { errorHandler } from './lib/error-handler';
import { initializeJobs } from './jobs';
import { UPLOADS_DIR } from './lib/storage';
import { initSocket } from './lib/socket';

// ── Required env vars ──────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET environment variable is required in production');
  process.exit(1);
}

const app = Fastify({ logger: true });

// ── Plugins ────────────────────────────────────────────────────────────────
app.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
});

app.register(fastifyCookie);

app.register(fastifyMultipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB hard cap at transport layer
});

app.register(fastifyJwt, {
  secret: JWT_SECRET ?? 'dev-secret-change-in-production',
});

// ── Rate limiting (auth endpoints) ─────────────────────────────────────────
app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req: FastifyRequest) => req.ip,
});

// Serve uploaded files as static assets
app.register(fastifyStatic, {
  root:       UPLOADS_DIR,
  prefix:     '/uploads/',
  decorateReply: false, // avoid conflict if we add more static mounts later
});

// ── Hooks ──────────────────────────────────────────────────────────────────
app.addHook('onResponse', (request, reply, done) => {
  app.log.info({
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    responseTime: reply.elapsedTime,
  });
  done();
});

// ── Global error handler ───────────────────────────────────────────────────
app.setErrorHandler(errorHandler);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', async (_request, reply) => {
  return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ─────────────────────────────────────────────────────────────────
registerRoutes(app);

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '4000', 10);

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Initialize Socket.io after the HTTP server is bound and listening
  initSocket(app);

  // Start background job system after server is confirmed healthy
  initializeJobs().catch((jobErr) => {
    app.log.error('[jobs] Failed to initialize job system:', jobErr);
  });
});
