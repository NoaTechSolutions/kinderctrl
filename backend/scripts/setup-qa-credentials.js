/**
 * Setup QA testing credentials. Creates fresh QA-prefixed users so we
 * never touch production-looking accounts. Idempotent: re-running cleans
 * any previous QA-* users first.
 *
 * Output: prints credentials block ready to paste into Israel's template.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const PASS = 'Test1234';

async function main() {
  const p = new PrismaClient();
  const hash = await bcrypt.hash(PASS, 10);

  // 1) Wipe any prior QA-* run (idempotent).
  await p.user.deleteMany({
    where: { email: { startsWith: 'qa-' } },
  });
  await p.staff.deleteMany({
    where: { email: { startsWith: 'qa-' } },
  });
  await p.parent.deleteMany({
    where: { email: { startsWith: 'qa-' } },
  });

  // 2) SUPER_ADMIN — no center, sees everything.
  await p.user.create({
    data: {
      email: 'qa-superadmin@kinderctrl.com',
      password: hash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      activatedAt: new Date(),
    },
  });

  // 3) DIRECTOR A + B — reuse existing seed directors (already have centers + known password).
  const dirA = await p.user.findUnique({
    where: { email: 'seed-director-01@kinderctrl.com' },
    select: { id: true, centerId: true, center: { select: { name: true } } },
  });
  const dirB = await p.user.findUnique({
    where: { email: 'seed-director-02@kinderctrl.com' },
    select: { id: true, centerId: true, center: { select: { name: true } } },
  });

  if (!dirA?.centerId) throw new Error('seed-director-01 has no center');
  if (!dirB?.centerId) throw new Error('seed-director-02 has no center');

  // 4) STAFF — proper record (Staff + User with staffId) linked to DIRECTOR A's center.
  //    Gives QA the full flow: login → /staff sees self → topbar shows job title.
  await p.$transaction(async (tx) => {
    const staff = await tx.staff.create({
      data: {
        centerId: dirA.centerId,
        firstName: 'QA',
        lastName: 'Teacher',
        email: 'qa-staff@kinderctrl.com',
        role: 'TEACHER',
        hireDate: new Date('2026-05-18'),
        employmentType: 'full_time',
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });
    await tx.user.create({
      data: {
        email: 'qa-staff@kinderctrl.com',
        password: hash,
        role: 'STAFF',
        status: 'ACTIVE',
        activatedAt: new Date(),
        centerId: dirA.centerId,
        staffId: staff.id,
      },
    });
  });

  // 5) PARENT — minimal user (role=PARENT, no centerId, no Parent record).
  //    Enough to verify the Staff menu is hidden in nav. If QA needs a
  //    full parent (linked to a center with children) later, build it then.
  await p.user.create({
    data: {
      email: 'qa-parent@kinderctrl.com',
      password: hash,
      role: 'PARENT',
      status: 'ACTIVE',
      activatedAt: new Date(),
    },
  });

  console.log('\n══════════════════════════════════════════════');
  console.log(' QA CREDENTIALS — Staff Module Visual Testing');
  console.log('══════════════════════════════════════════════\n');
  console.log('SUPER_ADMIN:');
  console.log('  Email:    qa-superadmin@kinderctrl.com');
  console.log('  Password: Test1234\n');
  console.log('DIRECTOR A:');
  console.log('  Email:    seed-director-01@kinderctrl.com');
  console.log('  Password: Test1234');
  console.log(`  Center:   ${dirA.center?.name}\n`);
  console.log('DIRECTOR B:');
  console.log('  Email:    seed-director-02@kinderctrl.com');
  console.log('  Password: Test1234');
  console.log(`  Center:   ${dirB.center?.name}\n`);
  console.log('STAFF (linked to DIRECTOR A center, ACTIVE):');
  console.log('  Email:    qa-staff@kinderctrl.com');
  console.log('  Password: Test1234');
  console.log(`  Center:   ${dirA.center?.name}\n`);
  console.log('PARENT (minimal, sin centerId — para menu test):');
  console.log('  Email:    qa-parent@kinderctrl.com');
  console.log('  Password: Test1234\n');

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
