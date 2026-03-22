import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ── Demo User ─────────────────────────────────────────────────────────────
  console.log('👤 Upserting demo user...');
  const passwordHash = await bcryptjs.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@wrkly.in' },
    update: {},
    create: {
      email: 'demo@wrkly.in',
      name: 'Demo User',
      passwordHash,
      avatarUrl: null,
    },
  });
  console.log(`   ✔ User: ${user.email}`);

  // ── Clean slate for relational data ───────────────────────────────────────
  console.log('🧹 Cleaning existing seed data...');
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.block.deleteMany();
  await prisma.cardLabel.deleteMany();
  await prisma.cardAssignee.deleteMany();
  await prisma.card.deleteMany();
  await prisma.list.deleteMany();
  await prisma.label.deleteMany();
  await prisma.board.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();

  // ── Workspace ─────────────────────────────────────────────────────────────
  console.log('🏢 Creating workspace...');
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Demo Workspace',
      slug: 'demo-workspace',
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: 'OWNER' },
      },
    },
  });
  console.log(`   ✔ Workspace: ${workspace.name}`);

  // ── Board ──────────────────────────────────────────────────────────────────
  console.log('📋 Creating Sprint Board...');
  const board = await prisma.board.create({
    data: {
      name: 'Sprint Board',
      background: '#4F46E5',
      workspaceId: workspace.id,
      createdById: user.id,
    },
  });
  console.log(`   ✔ Board: ${board.name}`);

  // ── Labels ─────────────────────────────────────────────────────────────────
  console.log('🏷️  Creating labels...');
  const labelData = [
    { name: 'Bug', color: '#EF4444' },
    { name: 'Feature', color: '#3B82F6' },
    { name: 'Urgent', color: '#F59E0B' },
    { name: 'Backend', color: '#8B5CF6' },
    { name: 'Frontend', color: '#10B981' },
  ];
  const labels = await Promise.all(
    labelData.map((l) =>
      prisma.label.create({ data: { ...l, boardId: board.id } })
    )
  );
  const [labelBug, labelFeature, labelUrgent, labelBackend, labelFrontend] = labels;
  console.log(`   ✔ ${labels.length} labels created`);

  // ── Lists & Cards ──────────────────────────────────────────────────────────
  console.log('📝 Creating lists and cards...');
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // --- Backlog ---
  const backlog = await prisma.list.create({
    data: { boardId: board.id, name: 'Backlog', position: 1.0 },
  });

  const card1 = await prisma.card.create({
    data: {
      listId: backlog.id,
      title: 'Integrate Stripe Payment SDK',
      description: 'Set up Stripe checkout and webhook handling',
      position: 1.0,
      dueDate: nextWeek,
      createdById: user.id,
      labels: { create: [{ labelId: labelFeature.id }, { labelId: labelBackend.id }] },
    },
  });

  await prisma.card.create({
    data: {
      listId: backlog.id,
      title: 'Fix auth token expiry bug',
      description: 'JWT tokens are not rotating correctly on refresh',
      position: 2.0,
      dueDate: nextWeek,
      createdById: user.id,
      labels: { create: [{ labelId: labelBug.id }, { labelId: labelUrgent.id }] },
    },
  });

  await prisma.card.create({
    data: {
      listId: backlog.id,
      title: 'Design onboarding flow',
      description: 'Create wireframes for the 3-step onboarding',
      position: 3.0,
      dueDate: nextMonth,
      createdById: user.id,
      labels: { create: [{ labelId: labelFeature.id }, { labelId: labelFrontend.id }] },
    },
  });

  await prisma.card.create({
    data: {
      listId: backlog.id,
      title: 'Write API documentation',
      description: 'Document all public endpoints using OpenAPI spec',
      position: 4.0,
      createdById: user.id,
    },
  });

  // --- In Progress ---
  const inProgress = await prisma.list.create({
    data: { boardId: board.id, name: 'In Progress', position: 2.0 },
  });

  await prisma.card.create({
    data: {
      listId: inProgress.id,
      title: 'Build Kanban drag and drop',
      description: 'Use @dnd-kit to implement list and card reordering',
      position: 1.0,
      dueDate: nextWeek,
      createdById: user.id,
      labels: { create: [{ labelId: labelFeature.id }, { labelId: labelFrontend.id }] },
      assignees: { create: [{ userId: user.id }] },
    },
  });

  await prisma.card.create({
    data: {
      listId: inProgress.id,
      title: 'Set up Redis queue for jobs',
      description: 'Configure BullMQ workers for automation rules',
      position: 2.0,
      createdById: user.id,
      labels: { create: [{ labelId: labelBackend.id }] },
      assignees: { create: [{ userId: user.id }] },
    },
  });

  // --- Done ---
  const done = await prisma.list.create({
    data: { boardId: board.id, name: 'Done', position: 3.0 },
  });

  await prisma.card.create({
    data: {
      listId: done.id,
      title: 'Scaffold Next.js frontend',
      description: 'Bootstrapped wrkly-web with Tailwind + shadcn',
      position: 1.0,
      createdById: user.id,
    },
  });

  await prisma.card.create({
    data: {
      listId: done.id,
      title: 'Define Prisma schema',
      description: 'All 14 models with correct relations and indices',
      position: 2.0,
      createdById: user.id,
    },
  });

  await prisma.card.create({
    data: {
      listId: done.id,
      title: 'Setup Docker Compose',
      description: 'PostgreSQL 16, Redis 7, pgAdmin all running locally',
      position: 3.0,
      createdById: user.id,
    },
  });

  console.log(`   ✔ 3 lists and 9 cards created`);

  // ── Blocks on first card ───────────────────────────────────────────────────
  console.log('🧱 Creating blocks on first card...');
  await prisma.block.create({
    data: {
      cardId: card1.id,
      type: 'TEXT',
      position: 1.0,
      content: { html: '<p>Implement the Stripe payment SDK with support for one-time and subscription payments.</p>' },
    },
  });

  await prisma.block.create({
    data: {
      cardId: card1.id,
      type: 'CHECKLIST',
      position: 2.0,
      content: {
        title: 'Steps',
        items: [
          { id: '1', text: 'Install SDK', checked: true },
          { id: '2', text: 'Configure keys', checked: false },
          { id: '3', text: 'Create checkout session', checked: false },
          { id: '4', text: 'Handle webhook events', checked: false },
        ],
      },
    },
  });
  console.log(`   ✔ 2 blocks created`);

  // ── Comment ────────────────────────────────────────────────────────────────
  console.log('💬 Creating comment...');
  await prisma.comment.create({
    data: {
      cardId: card1.id,
      userId: user.id,
      content: 'Stripe SDK v12 now supports automatic tax calculation — worth enabling during setup.',
    },
  });
  console.log(`   ✔ Comment created`);

  console.log('\n✅ Seed complete!');
  console.log(`   Email:    demo@wrkly.in`);
  console.log(`   Password: password123`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
