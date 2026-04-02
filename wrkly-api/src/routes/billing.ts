import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';

// ── Stripe lazy-loader ────────────────────────────────────────────────────────
// Only initialised if STRIPE_SECRET_KEY is set — safe to deploy without it.
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe');
  return new Stripe(key, { apiVersion: '2024-04-10' });
}

const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? '';

// ── Routes ────────────────────────────────────────────────────────────────────
export async function billingRoutes(app: FastifyInstance) {

  // ── GET /api/billing/plan — current plan + usage ──────────────────────────
  app.get('/billing/plan', { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true, name: true, email: true,
        plan: true, stripeCustomerId: true, stripeSubscriptionId: true,
        _count: {
          select: {
            ownedWorkspaces: true,
          },
        },
      },
    });

    if (!user) return reply.status(404).send({ error: 'User not found' });

    return reply.send({
      plan: user.plan,
      hasStripeCustomer: !!user.stripeCustomerId,
      workspaceCount: user._count.ownedWorkspaces,
      limits: {
        FREE: { workspaces: 3, boards: 10, aiRuns: 5 },
        PRO:  { workspaces: Infinity, boards: Infinity, aiRuns: 500 },
      },
    });
  });

  // ── POST /api/billing/checkout — create Stripe Checkout session ───────────
  app.post('/billing/checkout', { preHandler: authenticate }, async (request, reply) => {
    const stripe = getStripe();
    if (!stripe) {
      return reply.status(503).send({ error: 'Stripe not configured' });
    }
    if (!PRO_PRICE_ID) {
      return reply.status(503).send({ error: 'STRIPE_PRO_PRICE_ID not set' });
    }

    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const appUrl = process.env.APP_URL ?? 'https://app.wrkly.in';

    // Create or reuse Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      success_url: `${appUrl}/settings?tab=billing&success=1`,
      cancel_url:  `${appUrl}/settings?tab=billing`,
      allow_promotion_codes: true,
      metadata: { userId: user.id },
    });

    return reply.send({ url: session.url });
  });

  // ── POST /api/billing/portal — Stripe Customer Portal ────────────────────
  app.post('/billing/portal', { preHandler: authenticate }, async (request, reply) => {
    const stripe = getStripe();
    if (!stripe) {
      return reply.status(503).send({ error: 'Stripe not configured' });
    }

    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return reply.status(400).send({ error: 'No Stripe customer found. Please upgrade first.' });
    }

    const appUrl = process.env.APP_URL ?? 'https://app.wrkly.in';
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/settings?tab=billing`,
    });

    return reply.send({ url: session.url });
  });

  // ── POST /api/billing/webhook — Stripe → update plan ─────────────────────
  app.post('/billing/webhook', async (request, reply) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
      return reply.status(503).send({ error: 'Stripe webhook not configured' });
    }

    const sig = request.headers['stripe-signature'] as string;

    let event;
    try {
      // rawBody is needed — we access it from request.rawBody if available
      const body = (request as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(request.body));
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      app.log.error(`[billing] Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`);
      return reply.status(400).send({ error: 'Webhook signature verification failed' });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { metadata?: { userId?: string }; subscription?: string };
        const userId = session.metadata?.userId;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { plan: 'PRO', stripeSubscriptionId: session.subscription ?? null },
          });
          app.log.info(`[billing] User ${userId} upgraded to PRO`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as { customer?: string };
        if (sub.customer) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: String(sub.customer) },
            data: { plan: 'FREE', stripeSubscriptionId: null },
          });
          app.log.info(`[billing] Customer ${sub.customer} downgraded to FREE`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as { customer?: string; status?: string };
        if (sub.customer) {
          const newPlan = sub.status === 'active' ? 'PRO' : 'FREE';
          await prisma.user.updateMany({
            where: { stripeCustomerId: String(sub.customer) },
            data: { plan: newPlan },
          });
        }
        break;
      }
    }

    return reply.send({ received: true });
  });
}
