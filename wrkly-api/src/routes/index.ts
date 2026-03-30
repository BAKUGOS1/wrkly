import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { workspaceRoutes } from './workspaces';
import { boardRoutes } from './boards';
import { listRoutes } from './lists';
import { cardRoutes } from './cards';
import { blockRoutes } from './blocks';
import { commentRoutes } from './comments';
import { labelRoutes } from './labels';
import { notificationRoutes } from './notifications';
import { searchRoutes } from './search';
import { activityRoutes } from './activity';
import { templateRoutes } from './templates';
import { cardTemplateRoutes } from './card-templates';
import { uploadRoutes } from './upload';
import { automationRoutes } from './automations';
import { workspaceStatsRoutes } from './workspace-stats';

import { createRateLimit } from '../middleware/rate-limit';

export async function registerRoutes(app: FastifyInstance) {
  const globalRateLimit = createRateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'global',
  });
  app.addHook('preHandler', globalRateLimit);

  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(workspaceRoutes, { prefix: '/api/workspaces' });
  app.register(workspaceStatsRoutes, { prefix: '/api' });
  app.register(boardRoutes, { prefix: '/api' });
  app.register(listRoutes, { prefix: '/api' });
  app.register(cardRoutes, { prefix: '/api' });
  app.register(blockRoutes, { prefix: '/api' });
  app.register(commentRoutes, { prefix: '/api' });
  app.register(labelRoutes, { prefix: '/api' });
  app.register(notificationRoutes, { prefix: '/api' });
  app.register(searchRoutes, { prefix: '/api' });
  app.register(activityRoutes, { prefix: '/api' });
  app.register(uploadRoutes, { prefix: '/api' });
  app.register(templateRoutes, { prefix: '/api' });
  app.register(cardTemplateRoutes, { prefix: '/api' });
  app.register(automationRoutes, { prefix: '/api' });
}
