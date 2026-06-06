import { BadRequestException, Injectable } from '@nestjs/common';
import { ChildStatus, UserRole, UserStatus } from '@prisma/client';
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
] as const;

type ParentKey = (typeof SEED_PARENTS)[number]['key'];

const SEED_CHILDREN: Array<{
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  enrollmentStatus: ChildStatus;
  parents: Array<{
    key: ParentKey;
    relationship: string;
    isPrimary: boolean;
    livesWithChild: boolean;
  }>;
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

      // 2. Children + medical + parent links.
      let childrenCreated = 0;
      let linksCreated = 0;
      for (const c of SEED_CHILDREN) {
        const child = await tx.child.create({
          data: {
            centerId,
            firstName: c.firstName,
            lastName: c.lastName,
            gender: c.gender,
            dateOfBirth: new Date(`${c.birthDate}T00:00:00.000Z`),
            enrollmentStatus: c.enrollmentStatus,
            admissionDate: new Date(`${c.birthDate}T00:00:00.000Z`),
            medicalInfo: {
              create: { allergies: [], medications: [], medicalConditions: [] },
            },
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
      }

      return { childrenCreated, parentsCreated: SEED_PARENTS.length, linksCreated };
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
