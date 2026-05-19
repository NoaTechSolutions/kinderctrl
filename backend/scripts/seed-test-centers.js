/**
 * Seed 20 fully-populated centers with their DIRECTOR owners and operating
 * hours. Idempotent: re-running skips centers whose owner email already
 * exists. Run with: `node scripts/seed-test-centers.js` from backend/.
 *
 * Defaults: password "Test1234" for every seeded DIRECTOR. Status mix is
 * tuned so all five filter tabs (incl. All) show data when QA filters.
 */
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PASSWORD = 'Test1234';
const PREFIX = 'seed-director-';

const CENTERS = [
  // ACTIVE — 10
  { name: 'Sunshine Learning Academy', street: '1422 Mission Street', city: 'San Francisco', state: 'CA', zip: '94103', phone: '4155551001', email: 'hello@sunshinelearning.test', website: 'https://sunshinelearning.test', capacity: 80, license: 'CA-DAYCARE-10421', timezone: 'America/Los_Angeles', status: 'ACTIVE' },
  { name: 'Little Acorns Daycare', street: '2210 South Lamar Boulevard', city: 'Austin', state: 'TX', zip: '78704', phone: '5125552002', email: 'contact@littleacorns.test', website: 'https://littleacorns.test', capacity: 60, license: 'TX-CCL-88210', timezone: 'America/Chicago', status: 'ACTIVE' },
  { name: 'Rainbow Bridge Preschool', street: '510 Pine Street', city: 'Seattle', state: 'WA', zip: '98101', phone: '2065553003', email: 'admin@rainbowbridge.test', website: 'https://rainbowbridge.test', capacity: 45, license: 'WA-DCYF-22501', timezone: 'America/Los_Angeles', status: 'ACTIVE' },
  { name: 'Bright Beginnings Childcare', street: '88 Beacon Street', city: 'Boston', state: 'MA', zip: '02108', phone: '6175554004', email: 'info@brightbeginnings.test', website: 'https://brightbeginnings.test', capacity: 100, license: 'MA-EEC-33119', timezone: 'America/New_York', status: 'ACTIVE' },
  { name: 'Maple Tree Learning Center', street: '4400 Forbes Avenue', city: 'Pittsburgh', state: 'PA', zip: '15213', phone: '4125555005', email: 'office@mapletreelc.test', website: 'https://mapletreelc.test', capacity: 55, license: 'PA-DHS-44280', timezone: 'America/New_York', status: 'ACTIVE' },
  { name: 'Tiny Tots Academy', street: '1100 Peachtree Street NE', city: 'Atlanta', state: 'GA', zip: '30309', phone: '4045556006', email: 'enroll@tinytotsacademy.test', website: 'https://tinytotsacademy.test', capacity: 70, license: 'GA-BFCS-55330', timezone: 'America/New_York', status: 'ACTIVE' },
  { name: 'Bluebird Early Education', street: '230 East Second Street', city: 'Reno', state: 'NV', zip: '89501', phone: '7755557007', email: 'hello@bluebirdedu.test', website: 'https://bluebirdedu.test', capacity: 40, license: 'NV-DCFS-66410', timezone: 'America/Los_Angeles', status: 'ACTIVE' },
  { name: 'Wonder Years Daycare', street: '901 Wynkoop Street', city: 'Denver', state: 'CO', zip: '80202', phone: '3035558008', email: 'team@wonderyears.test', website: 'https://wonderyears.test', capacity: 65, license: 'CO-CDEC-77525', timezone: 'America/Denver', status: 'ACTIVE' },
  { name: 'Happy Hearts Childcare', street: '1500 Bardstown Road', city: 'Louisville', state: 'KY', zip: '40205', phone: '5025559009', email: 'admin@happyhearts.test', website: 'https://happyhearts.test', capacity: 50, license: 'KY-CCAP-88641', timezone: 'America/New_York', status: 'ACTIVE' },
  { name: 'Starfish Kids Academy', street: '720 Duval Street', city: 'Key West', state: 'FL', zip: '33040', phone: '3055550010', email: 'contact@starfishkids.test', website: 'https://starfishkids.test', capacity: 35, license: 'FL-DCF-99715', timezone: 'America/New_York', status: 'ACTIVE' },

  // SETUP_PENDING — 5 (no centerHours, so they remain pending)
  { name: 'Cedar Grove Preschool', street: '320 Lake Avenue', city: 'Saint Paul', state: 'MN', zip: '55102', phone: '6515551011', email: 'info@cedargrove.test', website: 'https://cedargrove.test', capacity: 75, license: 'MN-DHS-11820', timezone: 'America/Chicago', status: 'SETUP_PENDING' },
  { name: 'Whispering Pines Daycare', street: '4502 Forest Boulevard', city: 'Portland', state: 'OR', zip: '97214', phone: '5035551012', email: 'hello@whisperingpines.test', website: 'https://whisperingpines.test', capacity: 50, license: 'OR-ELD-22910', timezone: 'America/Los_Angeles', status: 'SETUP_PENDING' },
  { name: 'River Bend Childcare', street: '1840 Riverside Drive', city: 'Nashville', state: 'TN', zip: '37206', phone: '6155551013', email: 'admin@riverbendcc.test', website: 'https://riverbendcc.test', capacity: 60, license: 'TN-DHS-34022', timezone: 'America/Chicago', status: 'SETUP_PENDING' },
  { name: 'Honey Bee Learning Center', street: '212 East Magnolia Street', city: 'Charleston', state: 'SC', zip: '29403', phone: '8435551014', email: 'enroll@honeybeelc.test', website: 'https://honeybeelc.test', capacity: 40, license: 'SC-DSS-45133', timezone: 'America/New_York', status: 'SETUP_PENDING' },
  { name: 'Adventure Kids Academy', street: '6020 Tower Court', city: 'Alexandria', state: 'VA', zip: '22304', phone: '7035551015', email: 'team@adventurekids.test', website: 'https://adventurekids.test', capacity: 85, license: 'VA-DOE-56244', timezone: 'America/New_York', status: 'SETUP_PENDING' },

  // SUSPENDED — 3 (need centerHours so we can transition ACTIVE -> SUSPENDED)
  { name: 'Meadow Lark Preschool', street: '1233 Wilshire Boulevard', city: 'Santa Monica', state: 'CA', zip: '90401', phone: '3105551016', email: 'office@meadowlark.test', website: 'https://meadowlark.test', capacity: 55, license: 'CA-DAYCARE-67355', timezone: 'America/Los_Angeles', status: 'SUSPENDED' },
  { name: 'Glacier Path Childcare', street: '88 West Northern Lights Boulevard', city: 'Anchorage', state: 'AK', zip: '99503', phone: '9075551017', email: 'contact@glacierpath.test', website: 'https://glacierpath.test', capacity: 30, license: 'AK-OCS-78466', timezone: 'America/Anchorage', status: 'SUSPENDED' },
  { name: 'Coral Reef Kids', street: '450 Ala Moana Boulevard', city: 'Honolulu', state: 'HI', zip: '96813', phone: '8085551018', email: 'hello@coralreefkids.test', website: 'https://coralreefkids.test', capacity: 40, license: 'HI-DHS-89577', timezone: 'Pacific/Honolulu', status: 'SUSPENDED' },

  // CLOSED — 2
  { name: 'Old Mill Daycare', street: '301 North Plum Street', city: 'Lancaster', state: 'PA', zip: '17602', phone: '7175551019', email: 'admin@oldmilldc.test', website: 'https://oldmilldc.test', capacity: 50, license: 'PA-DHS-90688', timezone: 'America/New_York', status: 'CLOSED' },
  { name: 'Lakeside Learning Center', street: '7720 East McDowell Road', city: 'Scottsdale', state: 'AZ', zip: '85257', phone: '4805551020', email: 'office@lakesidelc.test', website: 'https://lakesidelc.test', capacity: 65, license: 'AZ-DCYF-01799', timezone: 'America/Denver', status: 'CLOSED' },
];

// Mon-Fri 07:00-18:00, weekend closed. Schema days are 0=Sun .. 6=Sat.
const WEEKDAY_HOURS = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  openTime: '07:00',
  closeTime: '18:00',
  isOpen: true,
}));
const WEEKEND_HOURS = [0, 6].map((dayOfWeek) => ({
  dayOfWeek,
  openTime: '07:00',
  closeTime: '18:00',
  isOpen: false,
}));
const FULL_WEEK_HOURS = [...WEEKEND_HOURS, ...WEEKDAY_HOURS].sort(
  (a, b) => a.dayOfWeek - b.dayOfWeek,
);

function pad2(n) {
  return String(n).padStart(2, '0');
}

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  let created = 0;
  let skipped = 0;
  const summary = { ACTIVE: 0, SETUP_PENDING: 0, SUSPENDED: 0, CLOSED: 0 };

  for (let i = 0; i < CENTERS.length; i++) {
    const c = CENTERS[i];
    const email = `${PREFIX}${pad2(i + 1)}@kinderctrl.com`;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`  [skip] ${email} already exists`);
      skipped++;
      continue;
    }

    // Director + Center created in a single transaction so a partial seed
    // never leaves an orphan director or an unowned center.
    const center = await prisma.$transaction(async (tx) => {
      const director = await tx.user.create({
        data: {
          email,
          password: hash,
          role: 'DIRECTOR',
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      });

      const newCenter = await tx.center.create({
        data: {
          name: c.name,
          street: c.street,
          city: c.city,
          state: c.state,
          zipCode: c.zip,
          phone: c.phone,
          email: c.email,
          website: c.website,
          capacity: c.capacity,
          licenseNumber: c.license,
          timezone: c.timezone,
          status: c.status,
          ownerId: director.id,
          setupCompletedAt: c.status === 'SETUP_PENDING' ? null : new Date(),
        },
      });

      // Link director to the center so the topbar dropdown / dashboard
      // greeting find a populated `center` relation.
      await tx.user.update({
        where: { id: director.id },
        data: { centerId: newCenter.id },
      });

      if (c.status !== 'SETUP_PENDING') {
        await tx.centerHours.createMany({
          data: FULL_WEEK_HOURS.map((h) => ({
            centerId: newCenter.id,
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isOpen: h.isOpen,
          })),
        });
      }

      return newCenter;
    });

    summary[c.status]++;
    created++;
    console.log(`  [ok]   ${c.status.padEnd(14)} ${c.name} (${email})`);
  }

  console.log('');
  console.log(`Created: ${created}, Skipped: ${skipped}`);
  console.log(
    `By status — ACTIVE: ${summary.ACTIVE}, SETUP_PENDING: ${summary.SETUP_PENDING}, SUSPENDED: ${summary.SUSPENDED}, CLOSED: ${summary.CLOSED}`,
  );
  console.log(`Login as any with password: ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
