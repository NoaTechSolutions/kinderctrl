import { BadRequestException, Injectable } from '@nestjs/common';
import { ChildStatus, Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

// Reuses the same Sunshine director the payroll/schedule seeds key off, so the
// children land in the same center testers already use.
const DIRECTOR_EMAIL = 'seed-director-01@kinderctrl.com';

// Known password for every seeded parent so a tester can actually LOG IN as a
// parent and verify the "PARENT sees only their own children" matrix. Dev-only.
const SEED_PARENT_PASSWORD = 'Password123!';

const SEED_PARENTS = [
  {
    key: 'sarah',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'seed-parent-01@kinderctrl.com',
    homePhone: '5551110001',
    workEmployer: 'Northwind Traders',
  },
  {
    key: 'michael',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'seed-parent-02@kinderctrl.com',
    homePhone: '5551110002',
    workEmployer: 'Contoso Ltd',
  },
  {
    key: 'emily',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'seed-parent-03@kinderctrl.com',
    homePhone: '5551110003',
    workEmployer: 'Fabrikam Inc',
  },
  {
    // Dedicated primary contact for the fully-populated test child (Mia).
    key: 'jennifer',
    firstName: 'Jennifer',
    lastName: 'Thompson',
    email: 'seed-parent-04@kinderctrl.com',
    homePhone: '5551110004',
    workEmployer: 'Initech',
  },
] as const;

type ParentKey = (typeof SEED_PARENTS)[number]['key'];

const SEED_CHILDREN: Array<{
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  birthDate: string;
  enrollmentStatus: ChildStatus;
  firstCareDay?: string;
  addressNumber?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  parents: Array<{
    key: ParentKey;
    relationship: string;
    isPrimary: boolean;
    livesWithChild: boolean;
  }>;
  // Fase 2 (2A) — optional extended medical history + contacts for testing.
  medical?: {
    allergies?: string[];
    medicationAllergies?: string;
    medicalConditions?: string[];
    hasSpecialNeeds?: boolean;
    insuranceProvider?: string;
    insurancePolicy?: string;
    doctorName?: string;
    doctorPhone?: string;
    isUnderDoctorCare?: boolean;
    doctorLastExamDate?: string;
    prescribedMedicationDetails?: string;
    medicationSideEffects?: string;
    dentistName?: string;
    dentistPhone?: string;
    dentistAddressStreet?: string;
    dentistAddressCity?: string;
    dentistAddressState?: string;
    dentistAddressZip?: string;
    dentalPlan?: string;
    specialDevices?: string;
    frequentColds?: boolean;
    frequentColdsCount?: number;
    pastIllnesses?: Record<string, { checked: boolean; date?: string }>;
    otherIllnesses?: string;
  };
  contacts?: Array<{
    contactType: string;
    name: string;
    relationship?: string;
    phone?: string;
    homePhone?: string;
    workPhone?: string;
    addressStreet?: string;
    addressCity?: string;
    addressState?: string;
    addressZip?: string;
  }>;
  // Fase 2 (2B) — optional development/routines/toilet profile for testing.
  development?: {
    walkedAtMonths?: number;
    talkedAtMonths?: number;
    toiletTrainedAtMonths?: number;
    developmentNotes?: string;
    wakeUpTime?: string;
    bedTime?: string;
    takesNap?: boolean;
    napStartTime?: string;
    napEndTime?: string;
    diet?: string;
    mealTimes?: string;
    toiletTrained?: boolean;
    toiletWords?: string;
    toiletHelpLevel?: string;
    toiletAccidents?: string;
  };
}> = [
  {
    firstName: 'Liam',
    lastName: 'Johnson',
    gender: 'MALE',
    birthDate: '2022-03-15',
    enrollmentStatus: ChildStatus.ACTIVE,
    parents: [
      { key: 'sarah', relationship: 'MOTHER', isPrimary: true, livesWithChild: true },
    ],
    // Full extended-medical sample: doctor care, dentist, devices, colds,
    // past-illness checklist (a couple checked with dates).
    medical: {
      doctorName: 'Dr. Alan Pierce',
      doctorPhone: '5552220001',
      isUnderDoctorCare: true,
      doctorLastExamDate: '2025-11-20',
      prescribedMedicationDetails: 'Albuterol inhaler, as needed for asthma.',
      medicationSideEffects: 'Mild drowsiness possible.',
      dentistName: 'Dr. Mary Stone',
      dentistPhone: '5553330001',
      dentistAddressStreet: '88 Elm Street',
      dentistAddressCity: 'Springfield',
      dentistAddressState: 'CA',
      dentistAddressZip: '94010',
      dentalPlan: 'Delta Dental Family',
      specialDevices: 'Glasses (full-time).',
      frequentColds: true,
      frequentColdsCount: 4,
      pastIllnesses: {
        CHICKEN_POX: { checked: true, date: '2024-02-10' },
        ASTHMA: { checked: true },
        THREE_DAY_MEASLES: { checked: false },
      },
      otherIllnesses: 'Seasonal allergies (spring).',
    },
    contacts: [
      {
        contactType: 'EMERGENCY',
        name: 'Sarah Johnson',
        relationship: 'Mother',
        phone: '5551110001',
        homePhone: '5551110001',
      },
      {
        contactType: 'AUTHORIZED_PICKUP',
        name: 'Grandma Johnson',
        relationship: 'Grandmother',
        phone: '5554440001',
      },
    ],
    // Full 2B sample: milestones, full daily routine with nap, toilet trained.
    development: {
      walkedAtMonths: 12,
      talkedAtMonths: 14,
      toiletTrainedAtMonths: 30,
      developmentNotes: 'Meeting milestones on track. Very social.',
      wakeUpTime: '07:00',
      bedTime: '20:00',
      takesNap: true,
      napStartTime: '13:00',
      napEndTime: '15:00',
      diet: 'No nuts. Vegetarian.',
      mealTimes: 'Breakfast 08:00, Lunch 12:00, Snack 15:30.',
      toiletTrained: true,
      toiletWords: 'Uses "potty".',
      toiletHelpLevel: 'NEEDS_REMINDERS',
      toiletAccidents: 'Rare, mostly during naps.',
    },
  },
  {
    // Sibling of Liam — same parent, exercises the "parent with multiple kids".
    firstName: 'Olivia',
    lastName: 'Johnson',
    gender: 'FEMALE',
    birthDate: '2023-07-22',
    enrollmentStatus: ChildStatus.ACTIVE,
    parents: [
      { key: 'sarah', relationship: 'MOTHER', isPrimary: true, livesWithChild: true },
    ],
  },
  {
    firstName: 'Noah',
    lastName: 'Chen',
    gender: 'MALE',
    birthDate: '2021-11-05',
    enrollmentStatus: ChildStatus.ACTIVE,
    parents: [
      { key: 'michael', relationship: 'FATHER', isPrimary: true, livesWithChild: true },
    ],
  },
  {
    firstName: 'Emma',
    lastName: 'Rodriguez',
    gender: 'FEMALE',
    birthDate: '2024-01-10',
    enrollmentStatus: ChildStatus.PENDING,
    parents: [
      { key: 'emily', relationship: 'MOTHER', isPrimary: true, livesWithChild: true },
    ],
  },
  {
    // Two parents — exercises multi-parent links + a non-primary GUARDIAN.
    firstName: 'Ava',
    lastName: 'Rodriguez',
    gender: 'FEMALE',
    birthDate: '2022-09-30',
    enrollmentStatus: ChildStatus.ACTIVE,
    parents: [
      { key: 'emily', relationship: 'MOTHER', isPrimary: true, livesWithChild: true },
      { key: 'michael', relationship: 'GUARDIAN', isPrimary: false, livesWithChild: false },
    ],
    // One of each contact type — exercises the full discriminator set.
    medical: {
      isUnderDoctorCare: false,
      frequentColds: false,
      pastIllnesses: {
        HAY_FEVER: { checked: true, date: '2023-05-01' },
      },
    },
    contacts: [
      {
        contactType: 'EMERGENCY',
        name: 'Emily Rodriguez',
        relationship: 'Mother',
        phone: '5551110003',
      },
      {
        contactType: 'AUTHORIZED_PICKUP',
        name: 'Michael Chen',
        relationship: 'Guardian',
        phone: '5551110002',
        workPhone: '5556660002',
      },
      {
        contactType: 'RESPONSIBLE',
        name: 'Aunt Carla',
        relationship: 'Aunt',
        phone: '5557770003',
        addressStreet: '12 Maple Ave',
        addressCity: 'Springfield',
        addressState: 'CA',
        addressZip: '94010',
      },
    ],
    // Younger child — not toilet trained yet (in diapers), no nap window set.
    development: {
      walkedAtMonths: 13,
      developmentNotes: 'Just started forming two-word phrases.',
      wakeUpTime: '06:30',
      bedTime: '19:30',
      takesNap: true,
      diet: 'No dairy.',
      toiletTrained: false,
      toiletHelpLevel: 'IN_DIAPERS',
    },
  },
  {
    // FULLY-POPULATED test child — every tab has data (incl. middle name,
    // allergies + special needs → header badge, primary contact w/ phone).
    firstName: 'Mia',
    middleName: 'Grace',
    lastName: 'Thompson',
    gender: 'FEMALE',
    birthDate: '2022-06-12',
    enrollmentStatus: ChildStatus.ACTIVE,
    firstCareDay: '2024-09-02',
    addressNumber: '742',
    addressStreet: 'Evergreen Terrace',
    addressCity: 'Springfield',
    addressState: 'CA',
    addressZip: '94010',
    parents: [
      { key: 'jennifer', relationship: 'MOTHER', isPrimary: true, livesWithChild: true },
    ],
    medical: {
      allergies: ['Peanuts', 'Bee stings'],
      medicationAllergies: 'Penicillin',
      medicalConditions: ['Mild eczema', 'Asthma'],
      hasSpecialNeeds: true,
      insuranceProvider: 'Blue Shield of California',
      insurancePolicy: 'BSC-99887766',
      doctorName: 'Dr. Helen Park',
      doctorPhone: '5552220004',
      isUnderDoctorCare: true,
      doctorLastExamDate: '2026-03-10',
      prescribedMedicationDetails: 'EpiPen Jr. on file for severe allergic reactions.',
      medicationSideEffects: 'None reported.',
      dentistName: 'Dr. Omar Reyes',
      dentistPhone: '5553330004',
      dentistAddressStreet: '15 Birch Lane',
      dentistAddressCity: 'Springfield',
      dentistAddressState: 'CA',
      dentistAddressZip: '94010',
      dentalPlan: 'Cigna Dental',
      specialDevices: 'Hearing aid (left ear).',
      frequentColds: true,
      frequentColdsCount: 3,
      pastIllnesses: {
        CHICKEN_POX: { checked: true, date: '2024-04-18' },
        HAY_FEVER: { checked: true },
      },
      otherIllnesses: 'Occasional ear infections.',
    },
    contacts: [
      {
        contactType: 'EMERGENCY',
        name: 'Jennifer Thompson',
        relationship: 'Mother',
        phone: '5551110004',
        homePhone: '5551110004',
        addressStreet: '742 Evergreen Terrace',
        addressCity: 'Springfield',
        addressState: 'CA',
        addressZip: '94010',
      },
      {
        contactType: 'AUTHORIZED_PICKUP',
        name: 'Robert Thompson',
        relationship: 'Father',
        phone: '5554440004',
      },
      {
        contactType: 'RESPONSIBLE',
        name: 'Grandpa Joe',
        relationship: 'Grandfather',
        homePhone: '5555550004',
        workPhone: '5556660004',
      },
    ],
    development: {
      walkedAtMonths: 11,
      talkedAtMonths: 13,
      toiletTrainedAtMonths: 28,
      developmentNotes: 'Curious and verbal. Loves building blocks.',
      wakeUpTime: '07:15',
      bedTime: '20:00',
      takesNap: true,
      napStartTime: '13:00',
      napEndTime: '14:30',
      diet: 'No peanuts (allergy). Otherwise unrestricted.',
      mealTimes: 'Breakfast 08:00, Lunch 12:00, Snack 15:30.',
      toiletTrained: true,
      toiletWords: 'Says "potty".',
      toiletHelpLevel: 'NEEDS_REMINDERS',
      toiletAccidents: 'Very rare.',
    },
  },
];

@Injectable()
export class ChildrenSeedService {
  constructor(private prisma: PrismaService) {}

  /**
   * Seeds a handful of children (with linked parents + empty medical records)
   * into the Sunshine center. Idempotent: drops everything it previously
   * created first, keyed by the fixed seed emails / names, so re-running is
   * safe. SUPER_ADMIN + NODE_ENV-gated at the controller.
   */
  async seedChildren(): Promise<object> {
    const centerId = await this.resolveCenterId();
    await this.reset(centerId);

    const passwordHash = await bcrypt.hash(SEED_PARENT_PASSWORD, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Parents (satellite + a login-able User each).
      const parentIdByKey = new Map<ParentKey, string>();
      for (const p of SEED_PARENTS) {
        const parent = await tx.parent.create({
          data: {
            centerId,
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
            homePhone: p.homePhone,
            workEmployer: p.workEmployer,
          },
          select: { id: true },
        });
        await tx.user.create({
          data: {
            email: p.email,
            password: passwordHash,
            role: UserRole.PARENT,
            status: UserStatus.ACTIVE,
            centerId,
            parentId: parent.id,
            activatedAt: new Date(),
            firstName: p.firstName,
            lastName: p.lastName,
          },
        });
        parentIdByKey.set(p.key, parent.id);
      }

      // 2. Children + medical + parent links + contacts.
      let childrenCreated = 0;
      let linksCreated = 0;
      let contactsCreated = 0;
      for (const c of SEED_CHILDREN) {
        const m = c.medical;
        const d = c.development;
        const child = await tx.child.create({
          data: {
            centerId,
            firstName: c.firstName,
            middleName: c.middleName ?? null,
            lastName: c.lastName,
            gender: c.gender,
            dateOfBirth: new Date(`${c.birthDate}T00:00:00.000Z`),
            enrollmentStatus: c.enrollmentStatus,
            admissionDate: new Date(`${c.birthDate}T00:00:00.000Z`),
            firstCareDay: c.firstCareDay
              ? new Date(`${c.firstCareDay}T00:00:00.000Z`)
              : null,
            addressNumber: c.addressNumber ?? null,
            addressStreet: c.addressStreet ?? null,
            addressCity: c.addressCity ?? null,
            addressState: c.addressState ?? null,
            addressZip: c.addressZip ?? null,
            medicalInfo: {
              create: {
                allergies: m?.allergies ?? [],
                medications: [],
                medicalConditions: m?.medicalConditions ?? [],
                medicationAllergies: m?.medicationAllergies ?? null,
                hasSpecialNeeds: m?.hasSpecialNeeds ?? false,
                insuranceProvider: m?.insuranceProvider ?? null,
                insurancePolicy: m?.insurancePolicy ?? null,
                // Fase 2 (2A) — extended fields when the seed child has them.
                doctorName: m?.doctorName ?? null,
                doctorPhone: m?.doctorPhone ?? null,
                isUnderDoctorCare: m?.isUnderDoctorCare ?? false,
                doctorLastExamDate: m?.doctorLastExamDate
                  ? new Date(`${m.doctorLastExamDate}T00:00:00.000Z`)
                  : null,
                prescribedMedicationDetails:
                  m?.prescribedMedicationDetails ?? null,
                medicationSideEffects: m?.medicationSideEffects ?? null,
                dentistName: m?.dentistName ?? null,
                dentistPhone: m?.dentistPhone ?? null,
                dentistAddressStreet: m?.dentistAddressStreet ?? null,
                dentistAddressCity: m?.dentistAddressCity ?? null,
                dentistAddressState: m?.dentistAddressState ?? null,
                dentistAddressZip: m?.dentistAddressZip ?? null,
                dentalPlan: m?.dentalPlan ?? null,
                specialDevices: m?.specialDevices ?? null,
                frequentColds: m?.frequentColds ?? false,
                frequentColdsCount: m?.frequentColdsCount ?? null,
                pastIllnesses: m?.pastIllnesses ?? Prisma.JsonNull,
                otherIllnesses: m?.otherIllnesses ?? null,
              },
            },
            // Fase 2 (2B) — development/routines/toilet satellite when present.
            // Field names align 1:1 with the model, so a direct spread is safe;
            // schema defaults cover the unset booleans (takesNap, toiletTrained).
            development: d ? { create: { ...d } } : undefined,
          },
          select: { id: true },
        });
        childrenCreated++;
        for (const link of c.parents) {
          await tx.childParent.create({
            data: {
              childId: child.id,
              parentId: parentIdByKey.get(link.key)!,
              relationship: link.relationship,
              isPrimary: link.isPrimary,
              livesWithChild: link.livesWithChild,
            },
          });
          linksCreated++;
        }
        if (c.contacts?.length) {
          await tx.childContact.createMany({
            data: c.contacts.map((ct) => ({ childId: child.id, ...ct })),
          });
          contactsCreated += c.contacts.length;
        }
      }

      return {
        childrenCreated,
        parentsCreated: SEED_PARENTS.length,
        linksCreated,
        contactsCreated,
      };
    });

    return {
      centerId,
      ...result,
      parentLogin: {
        emails: SEED_PARENTS.map((p) => p.email),
        password: SEED_PARENT_PASSWORD,
      },
    };
  }

  /** Removes everything the children seed created (idempotency + cleanup). */
  async resetChildren(): Promise<object> {
    const centerId = await this.resolveCenterId();
    const deleted = await this.reset(centerId);
    return { centerId, ...deleted };
  }

  // ─── internals ──────────────────────────────────────────────────────────

  private async reset(centerId: string): Promise<{
    deletedChildren: number;
    deletedParents: number;
  }> {
    const seedEmails = SEED_PARENTS.map((p) => p.email);
    const childNames = SEED_CHILDREN.map((c) => ({
      firstName: c.firstName,
      lastName: c.lastName,
    }));

    return this.prisma.$transaction(async (tx) => {
      // Children first — cascades their ChildParent + ChildMedicalInfo rows.
      const children = await tx.child.deleteMany({
        where: { centerId, OR: childNames },
      });
      // Users referencing the seed parents must go before the Parent rows
      // (User.parentId FK is Restrict by default).
      await tx.user.deleteMany({ where: { email: { in: seedEmails } } });
      // Parents (cascades any leftover ChildParent rows).
      const parents = await tx.parent.deleteMany({
        where: { centerId, email: { in: seedEmails } },
      });
      return {
        deletedChildren: children.count,
        deletedParents: parents.count,
      };
    });
  }

  private async resolveCenterId(): Promise<string> {
    const director = await this.prisma.user.findUnique({
      where: { email: DIRECTOR_EMAIL },
      select: {
        centerId: true,
        ownedCenters: { select: { id: true }, take: 1 },
      },
    });
    const centerId = director?.centerId ?? director?.ownedCenters[0]?.id ?? null;
    if (!centerId) {
      throw new BadRequestException(
        `Seed director "${DIRECTOR_EMAIL}" has no center. Run the Sunshine ` +
          `Learning Academy seed first.`,
      );
    }
    return centerId;
  }
}
