import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChildStatus, Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { UpdateMedicalInfoDto } from './dto/update-medical-info.dto';
import { UpdateDevelopmentDto } from './dto/update-development.dto';
import { UpdatePersonalityDto } from './dto/update-personality.dto';
import { UpdateConsentsDto } from './dto/update-consents.dto';
import { UpdateInfantSleepDto } from './dto/update-infant-sleep.dto';
import { QueryChildrenDto } from './dto/query-children.dto';
import { ChildParentInputDto } from './dto/child-parent-input.dto';
import { UpdateChildParentDto } from './dto/update-child-parent.dto';
import { CreateChildContactDto } from './dto/create-child-contact.dto';
import { UpdateChildContactDto } from './dto/update-child-contact.dto';

// Everything a child detail returns: center, medical, and the linked parents
// (with their HOME/WORK contact + the User account status). Keeps the payload
// consistent across create / findOne / update so the frontend reads one shape.
const CHILD_DETAIL_INCLUDE = {
  center: { select: { id: true, name: true } },
  medicalInfo: true,
  // Fase 2 (2A) — contacts travel with the child detail so the edit-form tabs
  // read one shape (ordered by type, then creation for a stable list).
  contacts: {
    orderBy: [{ contactType: 'asc' }, { createdAt: 'asc' }],
  },
  // Fase 2 (2B) — development/routines/toilet satellite travels with the child
  // detail too, so the edit-form tabs read it from the same shape.
  development: true,
  // Fase 2 (2C) — personality + consents satellites travel with the detail.
  personality: true,
  consents: true,
  // Fase 2 (2D) — infant sleep plan satellite (LIC 9227).
  infantSleep: true,
  childParents: {
    orderBy: { isPrimary: 'desc' },
    include: {
      parent: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
          status: true,
          homePhone: true,
          homeAddressNumber: true,
          homeAddressStreet: true,
          homeAddressCity: true,
          homeAddressState: true,
          homeAddressZip: true,
          workPhone: true,
          workEmployer: true,
          workAddressNumber: true,
          workAddressStreet: true,
          workAddressCity: true,
          workAddressState: true,
          workAddressZip: true,
          user: { select: { id: true, email: true, status: true } },
        },
      },
    },
  },
} satisfies Prisma.ChildInclude;

@Injectable()
export class ChildrenService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  // ───────────────────────────────────────────── CREATE

  /**
   * POST /centers/:centerId/children — DIRECTOR (own center) / SUPER_ADMIN
   * (any center via the route param, the SA-parity pattern). Creates the
   * Child + an (empty) ChildMedicalInfo + ≥1 ChildParent in one transaction.
   * Each parent entry either links an existing parent (same center) or creates
   * a new Parent satellite + User(PARENT, password=null) and emails a welcome
   * setup link — the Staff create flow, reused.
   */
  async create(centerId: string, dto: CreateChildDto, userId: string, userRole: UserRole) {
    await this.assertCanManageCenter(centerId, userId, userRole);
    this.validateDateOfBirth(dto.dateOfBirth);

    // Pre-validate the parent list so a bad entry fails before we open the tx.
    if (!dto.parents?.length) {
      throw new BadRequestException('At least one parent is required');
    }
    // New-parent emails must be unique against existing Users up front (the
    // tx would otherwise blow up on the @unique constraint mid-flight).
    await this.assertNewParentEmailsFree(dto.parents);

    const newParentUserIds: string[] = [];

    const child = await this.prisma.$transaction(async (tx) => {
      const created = await tx.child.create({
        data: {
          centerId,
          createdByUserId: userId,
          firstName: dto.firstName,
          middleName: dto.middleName ?? null,
          lastName: dto.lastName,
          dateOfBirth: dto.dateOfBirth,
          gender: dto.gender,
          photoUrl: dto.photoUrl ?? null,
          addressNumber: dto.addressNumber ?? null,
          addressStreet: dto.addressStreet ?? null,
          addressCity: dto.addressCity ?? null,
          addressState: dto.addressState ?? null,
          addressZip: dto.addressZip ?? null,
          phone: dto.phone ?? null,
          admissionDate: dto.admissionDate ?? null,
          firstCareDay: dto.firstCareDay ?? null,
          // Spec: initial enrollment is PENDING (schema default, set
          // explicitly for clarity).
          enrollmentStatus: ChildStatus.PENDING,
          // 1:1 medical record created alongside the child (empty defaults).
          medicalInfo: {
            create: {
              allergies: [],
              medications: [],
              medicalConditions: [],
            },
          },
        },
        select: { id: true },
      });

      for (const input of dto.parents) {
        const { parentId, newUserId } = await this.resolveParentInTx(
          tx,
          centerId,
          input,
        );
        if (newUserId) newParentUserIds.push(newUserId);
        await tx.childParent.create({
          data: {
            childId: created.id,
            parentId,
            relationship: input.relationship,
            isPrimary: input.isPrimary ?? false,
            livesWithChild: input.livesWithChild ?? false,
          },
        });
      }

      return created;
    });

    // Welcome-setup emails fire AFTER commit — an email failure must never roll
    // back the child create (the admin can re-trigger from the parent later).
    await this.dispatchParentSetupEmails(newParentUserIds, userId, centerId);

    return this.findOne(child.id, userId, userRole);
  }

  // ───────────────────────────────────────────── READ

  /**
   * GET /centers/:centerId/children — DIRECTOR (own) / SUPER_ADMIN (any).
   * STAFF and PARENT cannot list a center's roster (parents use findMine).
   * Server-side name search + enrollmentStatus filter (defaults to
   * everything-but-WITHDRAWN, the soft-delete tombstone).
   */
  async findAll(
    centerId: string,
    query: QueryChildrenDto,
    userId: string,
    userRole: UserRole,
  ) {
    await this.assertCanManageCenter(centerId, userId, userRole);

    const where: Prisma.ChildWhereInput = { centerId };

    if (query.enrollmentStatus && query.enrollmentStatus.length > 0) {
      where.enrollmentStatus = { in: query.enrollmentStatus };
    } else {
      where.enrollmentStatus = { not: ChildStatus.WITHDRAWN };
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { middleName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    if (query.classroomId) {
      where.classroomChildren = { some: { classroomId: query.classroomId } };
    }

    return this.prisma.child.findMany({
      where,
      include: CHILD_DETAIL_INCLUDE,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  /**
   * GET /children/mine — PARENT lists the children they're linked to (across
   * however many ChildParent rows point at their satellite). Other roles use
   * the center-scoped findAll.
   */
  async findMine(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { parentId: true },
    });
    if (!user?.parentId) return [];

    return this.prisma.child.findMany({
      where: {
        childParents: { some: { parentId: user.parentId } },
      },
      include: CHILD_DETAIL_INCLUDE,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  /**
   * GET /children/:id — DIRECTOR (own center) / SUPER_ADMIN / PARENT (only a
   * child they're linked to). STAFF denied.
   */
  async findOne(id: string, userId: string, userRole: UserRole) {
    const child = await this.prisma.child.findUnique({
      where: { id },
      include: CHILD_DETAIL_INCLUDE,
    });
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    await this.assertCanViewChild(
      { id: child.id, centerId: child.centerId },
      userId,
      userRole,
    );

    // Resolve the consent signer's name for the detail's audit line
    // ("Registered by {name}"). signedByUserId is a plain Uuid (no relation,
    // per the audit-column convention), so we look it up here — one extra
    // query, detail-only (findAll/list never shows the signature).
    if (child.consents?.signedByUserId) {
      const signer = await this.prisma.user.findUnique({
        where: { id: child.consents.signedByUserId },
        select: { firstName: true, lastName: true, email: true },
      });
      return { ...child, consents: { ...child.consents, signedBy: signer } };
    }

    return child;
  }

  // ───────────────────────────────────────────── UPDATE

  /** PATCH /children/:id — edit core child fields. DIRECTOR (own) / SA. */
  async update(
    id: string,
    dto: UpdateChildDto,
    userId: string,
    userRole: UserRole,
  ) {
    const child = await this.loadForManage(id, userId, userRole);

    if (dto.dateOfBirth) {
      this.validateDateOfBirth(dto.dateOfBirth);
    }

    await this.prisma.child.update({
      where: { id: child.id },
      data: {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        photoUrl: dto.photoUrl,
        addressNumber: dto.addressNumber,
        addressStreet: dto.addressStreet,
        addressCity: dto.addressCity,
        addressState: dto.addressState,
        addressZip: dto.addressZip,
        phone: dto.phone,
        admissionDate: dto.admissionDate,
        firstCareDay: dto.firstCareDay,
        reasonForCare: dto.reasonForCare,
        lastEnrollmentDate: dto.lastEnrollmentDate,
        enrollmentStatus: dto.enrollmentStatus,
      },
    });

    return this.findOne(id, userId, userRole);
  }

  /**
   * PATCH /children/:id/medical-info — partial MERGE upsert of the 1:1 medical
   * record. The Medical tab is split into independent cards (Doctor / Allergies
   * & medications / Dentist / Health / Past illnesses), each saving ONLY its
   * fields — so this must merge, not full-replace (same posture as 2B
   * development). Scalars: Prisma ignores `undefined` (keep) and writes `null`
   * (clear). The non-nullable Json lists only get a default `[]` on first insert
   * (create branch); on update they're skipped unless the Allergies card sends
   * them. pastIllnesses (nullable Json) defaults to JsonNull on create.
   */
  async updateMedicalInfo(
    id: string,
    dto: UpdateMedicalInfoDto,
    userId: string,
    userRole: UserRole,
  ) {
    await this.loadForManage(id, userId, userRole);

    // Scalars pass straight through (undefined = keep, null = clear). Shared by
    // both upsert branches.
    const fields = {
      doctorName: dto.doctorName,
      doctorPhone: dto.doctorPhone,
      doctorAddress: dto.doctorAddress,
      medicationAllergies: dto.medicationAllergies,
      medicalPlan: dto.medicalPlan,
      hasSpecialNeeds: dto.hasSpecialNeeds,
      insuranceProvider: dto.insuranceProvider,
      insurancePolicy: dto.insurancePolicy,
      isUnderDoctorCare: dto.isUnderDoctorCare,
      doctorLastExamDate: dto.doctorLastExamDate,
      prescribedMedicationDetails: dto.prescribedMedicationDetails,
      medicationSideEffects: dto.medicationSideEffects,
      dentistName: dto.dentistName,
      dentistPhone: dto.dentistPhone,
      dentistAddressStreet: dto.dentistAddressStreet,
      dentistAddressCity: dto.dentistAddressCity,
      dentistAddressState: dto.dentistAddressState,
      dentistAddressZip: dto.dentistAddressZip,
      dentalPlan: dto.dentalPlan,
      specialDevices: dto.specialDevices,
      frequentColds: dto.frequentColds,
      frequentColdsCount: dto.frequentColdsCount,
      otherIllnesses: dto.otherIllnesses,
    };
    // Json fields cast to InputJsonValue; `undefined` skips on update.
    const allergies = dto.allergies as Prisma.InputJsonValue | undefined;
    const medications = dto.medications as Prisma.InputJsonValue | undefined;
    const medicalConditions = dto.medicalConditions as Prisma.InputJsonValue | undefined;
    const pastIllnesses = dto.pastIllnesses as Prisma.InputJsonValue | undefined;

    return this.prisma.childMedicalInfo.upsert({
      where: { childId: id },
      create: {
        childId: id,
        ...fields,
        // Non-nullable Json lists need a concrete value on first insert.
        allergies: allergies ?? [],
        medications: medications ?? [],
        medicalConditions: medicalConditions ?? [],
        pastIllnesses: pastIllnesses ?? Prisma.JsonNull,
      },
      update: {
        ...fields,
        allergies,
        medications,
        medicalConditions,
        pastIllnesses,
      },
    });
  }

  /**
   * PATCH /children/:id/development — partial MERGE upsert of the 1:1
   * development/routines/toilet satellite. The three edit-form tabs
   * (Development / Routines / Toilet) each save independently, sending only
   * THEIR fields — so this must NOT full-replace (that would wipe the other
   * tabs' columns). Prisma ignores `undefined`, so passing the dto straight
   * through gives exactly merge semantics: an omitted field keeps its stored
   * value on update (or takes the column default on create), while an explicit
   * `null` clears the column. If no row exists yet it's created with whatever
   * arrived (the rest fall back to schema defaults / null).
   */
  async updateDevelopment(
    id: string,
    dto: UpdateDevelopmentDto,
    userId: string,
    userRole: UserRole,
  ) {
    await this.loadForManage(id, userId, userRole);

    const data = {
      // Desarrollo.
      walkedAtMonths: dto.walkedAtMonths,
      talkedAtMonths: dto.talkedAtMonths,
      toiletTrainedAtMonths: dto.toiletTrainedAtMonths,
      developmentNotes: dto.developmentNotes,
      // Rutinas.
      wakeUpTime: dto.wakeUpTime,
      bedTime: dto.bedTime,
      takesNap: dto.takesNap,
      napStartTime: dto.napStartTime,
      napEndTime: dto.napEndTime,
      diet: dto.diet,
      mealTimes: dto.mealTimes,
      sleepsWell: dto.sleepsWell,
      eatingProblems: dto.eatingProblems,
      // Toilet.
      toiletTrained: dto.toiletTrained,
      toiletWordBowel: dto.toiletWordBowel,
      toiletWordUrination: dto.toiletWordUrination,
      toiletHelpLevel: dto.toiletHelpLevel,
      toiletAccidents: dto.toiletAccidents,
      bowelMovementsRegular: dto.bowelMovementsRegular,
      bowelMovementTime: dto.bowelMovementTime,
    };

    return this.prisma.childDevelopment.upsert({
      where: { childId: id },
      create: { childId: id, ...data },
      update: data,
    });
  }

  /**
   * PATCH /children/:id/personality — partial MERGE upsert of the 1:1
   * personality satellite (same posture as updateDevelopment: undefined keeps,
   * null clears, upsert creates).
   */
  async updatePersonality(
    id: string,
    dto: UpdatePersonalityDto,
    userId: string,
    userRole: UserRole,
  ) {
    await this.loadForManage(id, userId, userRole);

    const data = {
      personalityWords: dto.personalityWords,
      likesToDo: dto.likesToDo,
      favoriteFoods: dto.favoriteFoods,
      dislikedFoods: dto.dislikedFoods,
      fears: dto.fears,
      favoriteIndoorActivity: dto.favoriteIndoorActivity,
      favoriteOutdoorActivity: dto.favoriteOutdoorActivity,
      favoriteToy: dto.favoriteToy,
      napsAtHome: dto.napsAtHome,
      napTimeAtHome: dto.napTimeAtHome,
      expressesEmotions: dto.expressesEmotions,
      homeDiscipline: dto.homeDiscipline,
      getsAlongWith: dto.getsAlongWith,
      groupPlayExperience: dto.groupPlayExperience,
      sickCarePlan: dto.sickCarePlan,
      transitionTips: dto.transitionTips,
      anythingElse: dto.anythingElse,
    };

    return this.prisma.childPersonality.upsert({
      where: { childId: id },
      create: { childId: id, ...data },
      update: data,
    });
  }

  /**
   * PATCH /children/:id/consents — partial MERGE upsert of the consent
   * checklist. signedByUserId + signedAt are stamped HERE from the
   * authenticated caller + now (the DTO never carries them), so the legal
   * trail is trustworthy. Every save refreshes who-confirmed-and-when.
   */
  async updateConsents(
    id: string,
    dto: UpdateConsentsDto,
    userId: string,
    userRole: UserRole,
  ) {
    await this.loadForManage(id, userId, userRole);

    const data = {
      waterPlay: dto.waterPlay,
      photoInternal: dto.photoInternal,
      photoMarketing: dto.photoMarketing,
      sunscreenRepellent: dto.sunscreenRepellent,
      sunscreenProducts: dto.sunscreenProducts,
      sunscreenInstructions: dto.sunscreenInstructions,
      sunscreenStartDate: dto.sunscreenStartDate,
      sunscreenEndDate: dto.sunscreenEndDate,
      emergencyMedical: dto.emergencyMedical,
      emergencyTransport: dto.emergencyTransport,
      // Server-stamped legal trail (client never sends these).
      signedByUserId: userId,
      signedAt: new Date(),
    };

    return this.prisma.childConsent.upsert({
      where: { childId: id },
      create: { childId: id, ...data },
      update: data,
    });
  }

  /**
   * PATCH /children/:id/infant-sleep — partial MERGE upsert of the LIC 9227
   * infant sleep plan satellite (same posture as the other satellites). The
   * infant-only age-gate lives in the UI; the endpoint is unrestricted.
   */
  async updateInfantSleep(
    id: string,
    dto: UpdateInfantSleepDto,
    userId: string,
    userRole: UserRole,
  ) {
    await this.loadForManage(id, userId, userRole);

    const data = {
      sleepLocation: dto.sleepLocation,
      sleepLocationOther: dto.sleepLocationOther,
      usualSleepHours: dto.usualSleepHours,
      averageNapDuration: dto.averageNapDuration,
      usesPacifier: dto.usesPacifier,
      pacifierBrand: dto.pacifierBrand,
      canRollOver: dto.canRollOver,
      rollOverDate: dto.rollOverDate,
      providerObservedRoll: dto.providerObservedRoll,
      medicalExemption: dto.medicalExemption,
      medicalExemptionInstructions: dto.medicalExemptionInstructions,
    };

    return this.prisma.childInfantSleep.upsert({
      where: { childId: id },
      create: { childId: id, ...data },
      update: data,
    });
  }

  /** DELETE /children/:id — soft delete (enrollmentStatus = WITHDRAWN). */
  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const child = await this.loadForManage(id, userId, userRole);
    await this.prisma.child.update({
      where: { id: child.id },
      data: { enrollmentStatus: ChildStatus.WITHDRAWN },
    });
  }

  // ───────────────────────────────────────────── PARENT LINKS

  /** POST /children/:id/parents — link an existing parent or create a new one. */
  async addParent(
    childId: string,
    input: ChildParentInputDto,
    userId: string,
    userRole: UserRole,
  ) {
    const child = await this.loadForManage(childId, userId, userRole);
    await this.assertNewParentEmailsFree([input]);

    let newUserId: string | undefined;
    await this.prisma.$transaction(async (tx) => {
      const resolved = await this.resolveParentInTx(tx, child.centerId, input);
      newUserId = resolved.newUserId;

      const existingLink = await tx.childParent.findUnique({
        where: { childId_parentId: { childId, parentId: resolved.parentId } },
        select: { id: true },
      });
      if (existingLink) {
        throw new ConflictException('Parent is already linked to this child');
      }

      await tx.childParent.create({
        data: {
          childId,
          parentId: resolved.parentId,
          relationship: input.relationship,
          isPrimary: input.isPrimary ?? false,
          livesWithChild: input.livesWithChild ?? false,
        },
      });
    });

    if (newUserId) {
      await this.dispatchParentSetupEmails([newUserId], userId, child.centerId);
    }

    return this.findOne(childId, userId, userRole);
  }

  /** PATCH /children/:id/parents/:parentId — edit pivot metadata. */
  async updateParentLink(
    childId: string,
    parentId: string,
    dto: UpdateChildParentDto,
    userId: string,
    userRole: UserRole,
  ) {
    await this.loadForManage(childId, userId, userRole);

    const link = await this.prisma.childParent.findUnique({
      where: { childId_parentId: { childId, parentId } },
      select: { id: true },
    });
    if (!link) {
      throw new NotFoundException('Parent is not linked to this child');
    }

    await this.prisma.childParent.update({
      where: { id: link.id },
      data: {
        relationship: dto.relationship,
        isPrimary: dto.isPrimary,
        livesWithChild: dto.livesWithChild,
      },
    });

    // Detail refactor — the Child tab's "primary contact phone" syncs into the
    // Parent satellite (only when explicitly sent). undefined leaves it; an
    // empty string clears it. Kept separate from the pivot update above.
    if (dto.homePhone !== undefined) {
      await this.prisma.parent.update({
        where: { id: parentId },
        data: { homePhone: dto.homePhone || null },
      });
    }

    return this.findOne(childId, userId, userRole);
  }

  /** DELETE /children/:id/parents/:parentId — unlink (keeps the parent record). */
  async removeParent(
    childId: string,
    parentId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    await this.loadForManage(childId, userId, userRole);

    const links = await this.prisma.childParent.findMany({
      where: { childId },
      select: { id: true, parentId: true },
    });
    const target = links.find((l) => l.parentId === parentId);
    if (!target) {
      throw new NotFoundException('Parent is not linked to this child');
    }
    // Spec invariant: a child must always keep ≥1 parent.
    if (links.length <= 1) {
      throw new BadRequestException(
        'Cannot remove the last parent — a child must have at least one.',
      );
    }

    await this.prisma.childParent.delete({ where: { id: target.id } });
  }

  // ───────────────────────────────────────────── CONTACTS (Fase 2 · 2A)
  //
  // Emergency / authorized-pickup / responsible contacts, one ChildContact row
  // each (single table, `contactType` discriminator). VIEW follows the child
  // (DIRECTOR own · SA · PARENT own-child); WRITE is manage-only (DIRECTOR/SA).

  /** GET /children/:id/contacts — list a child's contacts. */
  async listContacts(childId: string, userId: string, userRole: UserRole) {
    await this.loadForView(childId, userId, userRole);
    return this.prisma.childContact.findMany({
      where: { childId },
      orderBy: [{ contactType: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** POST /children/:id/contacts — add a contact. */
  async addContact(
    childId: string,
    dto: CreateChildContactDto,
    userId: string,
    userRole: UserRole,
  ) {
    await this.loadForManage(childId, userId, userRole);
    return this.prisma.childContact.create({
      data: {
        childId,
        contactType: dto.contactType,
        name: dto.name,
        relationship: dto.relationship ?? null,
        phone: dto.phone ?? null,
        homePhone: dto.homePhone ?? null,
        workPhone: dto.workPhone ?? null,
        addressStreet: dto.addressStreet ?? null,
        addressCity: dto.addressCity ?? null,
        addressState: dto.addressState ?? null,
        addressZip: dto.addressZip ?? null,
      },
    });
  }

  /** PATCH /children/:id/contacts/:contactId — edit a contact (partial). */
  async updateContact(
    childId: string,
    contactId: string,
    dto: UpdateChildContactDto,
    userId: string,
    userRole: UserRole,
  ) {
    await this.loadForManage(childId, userId, userRole);
    // Scope the contact to THIS child so a valid contactId from another child
    // can't be edited through this route.
    const existing = await this.prisma.childContact.findFirst({
      where: { id: contactId, childId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Contact not found for this child');
    }
    // PATCH semantics: only the provided keys change (undefined is ignored by
    // Prisma); a passed-through null clears a nullable column.
    return this.prisma.childContact.update({
      where: { id: existing.id },
      data: {
        contactType: dto.contactType,
        name: dto.name,
        relationship: dto.relationship,
        phone: dto.phone,
        homePhone: dto.homePhone,
        workPhone: dto.workPhone,
        addressStreet: dto.addressStreet,
        addressCity: dto.addressCity,
        addressState: dto.addressState,
        addressZip: dto.addressZip,
      },
    });
  }

  /** DELETE /children/:id/contacts/:contactId — remove a contact. */
  async removeContact(
    childId: string,
    contactId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    await this.loadForManage(childId, userId, userRole);
    const existing = await this.prisma.childContact.findFirst({
      where: { id: contactId, childId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Contact not found for this child');
    }
    await this.prisma.childContact.delete({ where: { id: existing.id } });
  }

  // ───────────────────────────────────────────── PERMISSION MATRIX
  //
  // VIEW   : DIRECTOR (own center) · SUPER_ADMIN (any) · PARENT (own child via
  //          ChildParent) · STAFF NO.
  // MANAGE : DIRECTOR (own center) · SUPER_ADMIN (any) · PARENT NO · STAFF NO.
  // Tenant isolation is enforced here, server-side — never trusting a passed
  // centerId. The Director's own User.centerId is the source of truth.

  /** Center-scoped gate for create / list (DIRECTOR own, SA any). */
  private async assertCanManageCenter(
    centerId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    if (userRole === UserRole.SUPER_ADMIN) {
      const center = await this.prisma.center.findUnique({
        where: { id: centerId },
        select: { id: true },
      });
      if (!center) throw new NotFoundException('Center not found');
      return;
    }
    if (userRole === UserRole.DIRECTOR) {
      const director = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { centerId: true },
      });
      if (director?.centerId !== centerId) {
        // 404 (not 403) so a Director can't probe which center IDs exist.
        throw new NotFoundException('Center not found');
      }
      return;
    }
    throw new ForbiddenException('Insufficient permissions');
  }

  /** Read gate for a single child. PARENT allowed only for their own child. */
  private async assertCanViewChild(
    child: { id: string; centerId: string },
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    if (userRole === UserRole.SUPER_ADMIN) return;

    if (userRole === UserRole.DIRECTOR) {
      const director = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { centerId: true },
      });
      if (director?.centerId !== child.centerId) {
        throw new NotFoundException('Child not found');
      }
      return;
    }

    if (userRole === UserRole.PARENT) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { parentId: true },
      });
      if (!user?.parentId) {
        throw new NotFoundException('Child not found');
      }
      const link = await this.prisma.childParent.findUnique({
        where: {
          childId_parentId: { childId: child.id, parentId: user.parentId },
        },
        select: { id: true },
      });
      if (!link) {
        throw new NotFoundException('Child not found');
      }
      return;
    }

    // STAFF (and anything else) cannot access children.
    throw new ForbiddenException('Insufficient permissions');
  }

  /** Write gate for a single child. DIRECTOR (own) / SA only. */
  private async assertCanManageChild(
    child: { centerId: string },
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    if (userRole === UserRole.SUPER_ADMIN) return;
    if (userRole === UserRole.DIRECTOR) {
      const director = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { centerId: true },
      });
      if (director?.centerId !== child.centerId) {
        throw new NotFoundException('Child not found');
      }
      return;
    }
    throw new ForbiddenException('Insufficient permissions');
  }

  /** Load a child (centerId only) + assert the caller may MANAGE it. */
  private async loadForManage(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ id: string; centerId: string }> {
    const child = await this.prisma.child.findUnique({
      where: { id },
      select: { id: true, centerId: true },
    });
    if (!child) {
      throw new NotFoundException('Child not found');
    }
    await this.assertCanManageChild(
      { centerId: child.centerId },
      userId,
      userRole,
    );
    return child;
  }

  /** Load a child (id + centerId) + assert the caller may VIEW it (PARENT ok). */
  private async loadForView(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ id: string; centerId: string }> {
    const child = await this.prisma.child.findUnique({
      where: { id },
      select: { id: true, centerId: true },
    });
    if (!child) {
      throw new NotFoundException('Child not found');
    }
    await this.assertCanViewChild(
      { id: child.id, centerId: child.centerId },
      userId,
      userRole,
    );
    return child;
  }

  // ───────────────────────────────────────────── PARENT RESOLUTION (Staff flow)

  /**
   * Within a transaction: resolve an input parent to a parentId, creating a new
   * Parent satellite + User(PARENT, password=null) when no parentId is given.
   * Returns the new User id (if created) so the caller can fire the setup email
   * AFTER the transaction commits.
   */
  private async resolveParentInTx(
    tx: Prisma.TransactionClient,
    centerId: string,
    input: ChildParentInputDto,
  ): Promise<{ parentId: string; newUserId?: string }> {
    if (input.parentId) {
      // Tenant isolation: only parents already in THIS center can be linked.
      const existing = await tx.parent.findUnique({
        where: { id: input.parentId },
        select: { id: true, centerId: true },
      });
      if (!existing || existing.centerId !== centerId) {
        throw new NotFoundException('Parent not found in this center');
      }
      return { parentId: existing.id };
    }

    // New parent — firstName/lastName/email are guaranteed by the DTO's
    // ValidateIf when parentId is absent.
    const email = input.email!.trim().toLowerCase();
    const parent = await tx.parent.create({
      data: {
        centerId,
        firstName: input.firstName!,
        middleName: input.middleName ?? null,
        lastName: input.lastName!,
        email,
        homePhone: input.homePhone ?? null,
        homeAddressNumber: input.homeAddressNumber ?? null,
        homeAddressStreet: input.homeAddressStreet ?? null,
        homeAddressCity: input.homeAddressCity ?? null,
        homeAddressState: input.homeAddressState ?? null,
        homeAddressZip: input.homeAddressZip ?? null,
        workPhone: input.workPhone ?? null,
        workEmployer: input.workEmployer ?? null,
        workAddressNumber: input.workAddressNumber ?? null,
        workAddressStreet: input.workAddressStreet ?? null,
        workAddressCity: input.workAddressCity ?? null,
        workAddressState: input.workAddressState ?? null,
        workAddressZip: input.workAddressZip ?? null,
      },
      select: { id: true },
    });

    const user = await tx.user.create({
      data: {
        email,
        // Same posture as Staff createWithSetupEmail: no throwaway password,
        // login is blocked until the parent sets one via the welcome email.
        password: null,
        role: UserRole.PARENT,
        status: UserStatus.ACTIVE,
        centerId,
        parentId: parent.id,
        activatedAt: new Date(),
      },
      select: { id: true },
    });

    return { parentId: parent.id, newUserId: user.id };
  }

  /** Reject up front if any new-parent email already belongs to a User. */
  private async assertNewParentEmailsFree(
    inputs: ChildParentInputDto[],
  ): Promise<void> {
    const emails = inputs
      .filter((i) => !i.parentId && i.email)
      .map((i) => i.email!.trim().toLowerCase());
    if (emails.length === 0) return;

    // Duplicate emails within the same payload would collide in-tx.
    const seen = new Set<string>();
    for (const e of emails) {
      if (seen.has(e)) {
        throw new ConflictException(`Duplicate parent email in request: ${e}`);
      }
      seen.add(e);
    }

    const taken = await this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });
    if (taken.length > 0) {
      throw new ConflictException(
        `Email already registered: ${taken.map((t) => t.email).join(', ')}`,
      );
    }
  }

  /** Fire welcome-setup emails for freshly-created parent Users (post-commit). */
  private async dispatchParentSetupEmails(
    newUserIds: string[],
    actorId: string,
    centerId: string,
  ): Promise<void> {
    if (newUserIds.length === 0) return;

    const [actor, center] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: actorId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          staff: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.center.findUnique({
        where: { id: centerId },
        select: { name: true },
      }),
    ]);
    const inviterName = actor?.staff
      ? `${actor.staff.firstName} ${actor.staff.lastName}`
      : [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') ||
        actor?.email ||
        'A KinderCtrl admin';
    const centerName = center?.name ?? 'your center';

    for (const userId of newUserIds) {
      void this.authService.issueWelcomeSetupToken(userId, actorId, {
        inviterName,
        centerName,
      });
    }
  }

  // ───────────────────────────────────────────── VALIDATION

  private validateDateOfBirth(dateOfBirth: Date): void {
    const now = new Date();
    if (dateOfBirth > now) {
      throw new BadRequestException('Date of birth cannot be in the future');
    }
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    if (dateOfBirth < tenYearsAgo) {
      throw new BadRequestException('Child must be born within the last 10 years');
    }
  }
}
