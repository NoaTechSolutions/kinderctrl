import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Idempotent seed for the single "KinderCtrl Admin" center.
 *
 * The center's ownerId is required, so we attach it to the first existing
 * SUPER_ADMIN. The admin center is a holding area (e.g. directors in
 * transit) — it is hidden from DIRECTOR/STAFF and locked against
 * edit/delete/status changes by the centers service.
 */
async function main() {
  const existing = await prisma.center.findFirst({
    where: { isAdminCenter: true },
    select: { id: true },
  });
  if (existing) {
    console.log(`Admin center already exists: ${existing.id} — nothing to do.`);
    return;
  }

  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true },
  });
  if (!superAdmin) {
    console.error(
      'No SUPER_ADMIN user found — cannot create the Admin center. ' +
        'Create a SUPER_ADMIN first, then re-run `npx prisma db seed`.',
    );
    process.exitCode = 1;
    return;
  }

  const center = await prisma.center.create({
    data: {
      name: 'KinderCtrl Admin',
      isAdminCenter: true,
      status: 'ACTIVE',
      ownerId: superAdmin.id,
      // Placeholder operational fields — this center is never a real
      // childcare location, just a system holding area.
      street: 'N/A',
      city: 'N/A',
      state: 'N/A',
      zipCode: '00000',
      phone: '0000000000',
      email: superAdmin.email,
      capacity: 0,
      timezone: 'America/Los_Angeles',
    },
    select: { id: true },
  });

  console.log(
    `Created "KinderCtrl Admin" center ${center.id} (owner: ${superAdmin.email}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
