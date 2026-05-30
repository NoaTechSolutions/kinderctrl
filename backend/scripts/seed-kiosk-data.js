/**
 * Seed kiosk data for seed-director-01's center.
 *
 * Creates:
 *   1. KioskSettings (PIN: 1234, enabled, timeout 2min)
 *   2. Three staff members (María García, Carlos López, Ana Martínez)
 *      + renames qa-staff to "John Doe" (kiosk demo persona)
 *   3. 7 days of kiosk punches with realistic timings
 *      (varied entry/exit times; some days without CLOCK_OUT to simulate
 *       staff still working — only allowed on TODAY since the rest of the
 *       week the @@unique constraint forces a complete CLOCK_OUT)
 *
 * Idempotent: wipes any prior kiosk seed for this center before re-running.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const PIN = '1234';
const DIRECTOR_EMAIL = 'seed-director-01@kinderctrl.com';
const KIOSK_STAFF = [
  { email: 'qa-staff@kinderctrl.com', firstName: 'John', lastName: 'Doe' },
  { email: 'maria.garcia@kinderctrl.com', firstName: 'María', lastName: 'García' },
  { email: 'carlos.lopez@kinderctrl.com', firstName: 'Carlos', lastName: 'López' },
  { email: 'ana.martinez@kinderctrl.com', firstName: 'Ana', lastName: 'Martínez' },
];

// Per-staff schedule profile — gives each staff member a believable rhythm
// instead of all four clocking in at the same minute.
const STAFF_PROFILES = {
  'John Doe':       { clockIn: '07:55', breakIn: '12:00', breakOut: '12:30', clockOut: '16:30' },
  'María García':   { clockIn: '08:30', breakIn: '12:30', breakOut: '13:00', clockOut: '17:30' },
  'Carlos López':   { clockIn: '07:00', breakIn: '11:45', breakOut: '12:15', clockOut: '16:00' },
  'Ana Martínez':   { clockIn: '08:15', breakIn: '13:00', breakOut: '13:30', clockOut: '18:00' },
};

// Add ±N minutes of natural jitter to a HH:MM string.
function jitter(hhmm, maxMinutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const offset = Math.floor(Math.random() * (maxMinutes * 2 + 1)) - maxMinutes;
  const total = h * 60 + m + offset;
  const finalH = Math.max(0, Math.min(23, Math.floor(total / 60)));
  const finalM = Math.max(0, Math.min(59, total % 60));
  return { h: finalH, m: finalM };
}

function buildTimestamp(date, hhmm, maxJitterMin = 8) {
  const { h, m } = jitter(hhmm, maxJitterMin);
  const ts = new Date(date);
  ts.setHours(h, m, Math.floor(Math.random() * 60), 0);
  return ts;
}

function dateOnly(d) {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

async function ensureStaff(prisma, centerId, hashedPassword, profile) {
  // Staff has no email column — User.email is the single source of truth.
  // Look up via the linked User; create Staff + User together if missing.
  const existingUser = await prisma.user.findUnique({
    where: { email: profile.email },
    select: { id: true, staffId: true },
  });

  if (existingUser?.staffId) {
    await prisma.staff.update({
      where: { id: existingUser.staffId },
      data: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        centerId,
        status: 'ACTIVE',
      },
    });
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { centerId },
    });
    return existingUser.staffId;
  }

  // No staff yet — create both records inside a transaction.
  return prisma.$transaction(async (tx) => {
    const staff = await tx.staff.create({
      data: {
        centerId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: 'TEACHER',
        hireDate: new Date('2026-01-15'),
        employmentType: 'full_time',
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    if (existingUser) {
      await tx.user.update({
        where: { id: existingUser.id },
        data: { centerId, staffId: staff.id, role: 'STAFF' },
      });
    } else {
      await tx.user.create({
        data: {
          email: profile.email,
          password: hashedPassword,
          role: 'STAFF',
          status: 'ACTIVE',
          activatedAt: new Date(),
          centerId,
          staffId: staff.id,
        },
      });
    }

    return staff.id;
  });
}

async function seedKioskPunches(prisma, centerId, staffMap) {
  const today = dateOnly(new Date());

  // Generate dates for the past 7 days (today included).
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Skip weekends.
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    days.push(d);
  }

  let inserted = 0;

  for (const day of days) {
    const isToday = day.getTime() === today.getTime();

    for (const [name, staffId] of Object.entries(staffMap)) {
      const profile = STAFF_PROFILES[name];
      if (!profile) continue;

      const date = dateOnly(day);

      // CLOCK_IN
      await prisma.staffTimeEntry.create({
        data: {
          staffId, centerId, date, type: 'CLOCK_IN',
          deviceTimestamp: buildTimestamp(day, profile.clockIn),
          serverReceivedAt: buildTimestamp(day, profile.clockIn),
          source: 'KIOSK',
        },
      });
      inserted++;

      // BREAK_IN + BREAK_OUT
      await prisma.staffTimeEntry.create({
        data: {
          staffId, centerId, date, type: 'BREAK_IN',
          deviceTimestamp: buildTimestamp(day, profile.breakIn, 5),
          serverReceivedAt: buildTimestamp(day, profile.breakIn, 5),
          source: 'KIOSK',
        },
      });
      inserted++;

      await prisma.staffTimeEntry.create({
        data: {
          staffId, centerId, date, type: 'BREAK_OUT',
          deviceTimestamp: buildTimestamp(day, profile.breakOut, 5),
          serverReceivedAt: buildTimestamp(day, profile.breakOut, 5),
          source: 'KIOSK',
        },
      });
      inserted++;

      // CLOCK_OUT — skip for two staff on today to simulate "still working"
      const skipClockOut = isToday && (name === 'María García' || name === 'Ana Martínez');
      if (!skipClockOut) {
        await prisma.staffTimeEntry.create({
          data: {
            staffId, centerId, date, type: 'CLOCK_OUT',
            deviceTimestamp: buildTimestamp(day, profile.clockOut, 10),
            serverReceivedAt: buildTimestamp(day, profile.clockOut, 10),
            source: 'KIOSK',
          },
        });
        inserted++;
      }
    }
  }

  return inserted;
}

async function main() {
  const prisma = new PrismaClient();
  const hashedPassword = await bcrypt.hash('Test1234', 10);
  const hashedPin = await bcrypt.hash(PIN, 10);

  // 1) Resolve director + center.
  const director = await prisma.user.findUnique({
    where: { email: DIRECTOR_EMAIL },
    select: { id: true, centerId: true, center: { select: { name: true } } },
  });
  if (!director?.centerId) {
    throw new Error(`${DIRECTOR_EMAIL} has no center. Run seed-test-centers first.`);
  }
  const centerId = director.centerId;
  console.log(`✓ Director: ${DIRECTOR_EMAIL} → ${director.center?.name}`);

  // 2) Ensure 4 staff members exist with the right names.
  const staffMap = {};
  for (const profile of KIOSK_STAFF) {
    const id = await ensureStaff(prisma, centerId, hashedPassword, profile);
    const displayName = `${profile.firstName} ${profile.lastName}`;
    staffMap[displayName] = id;
    console.log(`✓ Staff: ${displayName} (${profile.email})`);
  }

  // 3) Wipe any prior kiosk seed for this center (idempotent).
  const staffIds = Object.values(staffMap);
  await prisma.staffTimeEntry.deleteMany({
    where: { centerId, staffId: { in: staffIds }, source: 'KIOSK' },
  });
  console.log(`✓ Cleared prior kiosk punches for ${staffIds.length} staff`);

  // 4) Upsert KioskSettings with PIN 1234, enabled, session token.
  const kioskSessionToken = crypto.randomBytes(32).toString('hex');
  await prisma.kioskSettings.upsert({
    where: { centerId },
    create: {
      centerId,
      pin: hashedPin,
      isEnabled: true,
      timeoutMin: 2,
      kioskSessionToken,
    },
    update: {
      pin: hashedPin,
      isEnabled: true,
      timeoutMin: 2,
      kioskSessionToken,
    },
  });
  console.log(`✓ KioskSettings: PIN=${PIN}, enabled, timeout=2min`);

  // 5) Insert 7 days of kiosk punches.
  const count = await seedKioskPunches(prisma, centerId, staffMap);
  console.log(`✓ Inserted ${count} kiosk punches across last week`);

  console.log('\n══════════════════════════════════════════════');
  console.log(' KIOSK SEED COMPLETE');
  console.log('══════════════════════════════════════════════\n');
  console.log(`Director:     ${DIRECTOR_EMAIL} / Test1234`);
  console.log(`Center:       ${director.center?.name}`);
  console.log(`Kiosk PIN:    ${PIN}`);
  console.log(`Staff:        ${KIOSK_STAFF.length} kiosk users`);
  console.log(`Punches:      ${count} entries (source: KIOSK)`);
  console.log('\nLogin as director, go to Kiosk module, see:');
  console.log('  • Stats: Punches Today, Pending Sync, Last Activity');
  console.log('  • Recent Activity feed with last 10 entries');
  console.log('  • Active status — Launch with PIN 1234\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
