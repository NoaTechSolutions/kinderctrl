import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addChildContact,
  addChildParent,
  createChild,
  getChild,
  getMyChildren,
  listCenterChildren,
  listCenterParents,
  removeChildContact,
  removeChildParent,
  updateChild,
  updateChildConsents,
  updateChildContact,
  updateChildDevelopment,
  updateChildInfantSleep,
  updateChildMedical,
  updateChildParentLink,
  updateChildPersonality,
} from '@/lib/api/children';
import type {
  ChildContactPayload,
  ChildParentPayload,
  ConsentsPayload,
  CreateChildPayload,
  DevelopmentPayload,
  InfantSleepPayload,
  MedicalInfoPayload,
  PersonalityPayload,
  UpdateChildPayload,
} from '@/lib/api/children';
import type { ChildrenQuery } from '@/lib/types/child';

export interface ParentLinkUpdate {
  parentId: string;
  relationship?: string;
  isPrimary?: boolean;
  livesWithChild?: boolean;
}

export interface ParentOps {
  add: ChildParentPayload[];
  updateLinks: ParentLinkUpdate[];
  remove: string[];
}

export interface ContactUpdate {
  id: string;
  payload: Partial<ChildContactPayload>;
}

export interface ContactOps {
  add: ChildContactPayload[];
  update: ContactUpdate[];
  remove: string[];
}

export const childrenQueryKeys = {
  all: ['children'] as const,
  centerList: (centerId: string, query: ChildrenQuery) =>
    [
      'children',
      'center',
      centerId,
      // Search MUST be in the key (same lesson as the staff list) so a new
      // query refetches instead of reusing the cached unsearched slice.
      query.search?.trim() ?? '',
      (query.enrollmentStatus ?? []).join(','),
    ] as const,
  mine: ['children', 'mine'] as const,
  detail: (id: string) => ['children', id] as const,
  centerParents: (centerId: string) =>
    ['children', 'center', centerId, 'parents'] as const,
};

/** Director/SA — children of a center. Disabled until centerId is known. */
export function useCenterChildren(
  centerId: string | undefined,
  query: ChildrenQuery = {},
) {
  return useQuery({
    queryKey: centerId
      ? childrenQueryKeys.centerList(centerId, query)
      : (['children', 'center', 'none'] as const),
    queryFn: () => listCenterChildren(centerId as string, query),
    enabled: !!centerId,
  });
}

/**
 * Director/SA — distinct parents of a center, for the "link an existing parent"
 * picker (create wizard + Parents tab). Disabled until centerId is known.
 */
export function useCenterParents(centerId: string | undefined) {
  return useQuery({
    queryKey: centerId
      ? childrenQueryKeys.centerParents(centerId)
      : (['children', 'center', 'none', 'parents'] as const),
    queryFn: () => listCenterParents(centerId as string),
    enabled: !!centerId,
  });
}

/** Parent — their own children. */
export function useMyChildren() {
  return useQuery({
    queryKey: childrenQueryKeys.mine,
    queryFn: getMyChildren,
  });
}

/** Single child detail. */
export function useChild(id: string | undefined) {
  return useQuery({
    queryKey: id ? childrenQueryKeys.detail(id) : (['children', 'unknown'] as const),
    queryFn: () => getChild(id as string),
    enabled: !!id,
  });
}

// Whether the medical step has anything worth persisting (skips the 2nd call
// when the user left it blank).
function hasMedicalData(m: MedicalInfoPayload): boolean {
  return (
    (m.allergies?.length ?? 0) > 0 ||
    (m.medications?.length ?? 0) > 0 ||
    (m.medicalConditions?.length ?? 0) > 0 ||
    !!m.doctorName ||
    !!m.doctorPhone ||
    !!m.doctorAddress ||
    !!m.medicationAllergies ||
    !!m.medicalPlan ||
    m.hasSpecialNeeds === true
  );
}

/**
 * Create a child. Two backend calls: POST the child (+ parents), then PUT the
 * medical record IF anything was entered (the create endpoint makes an empty
 * one). Invalidates the children lists so the new row shows up.
 */
export function useCreateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      centerId: string;
      payload: CreateChildPayload;
      medical?: MedicalInfoPayload;
    }) => {
      const child = await createChild(args.centerId, args.payload);
      if (args.medical && hasMedicalData(args.medical)) {
        await updateChildMedical(child.id, args.medical);
      }
      return child;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: childrenQueryKeys.all });
    },
  });
}

/**
 * Edit a child. Sequential calls: PATCH the child, PUT the medical record, then
 * apply parent ops. Order is add → update → remove so the backend's "a child
 * must keep >= 1 parent" guard never trips while removing.
 */
export function useUpdateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      childId: string;
      child: UpdateChildPayload;
      medical: MedicalInfoPayload;
      parentOps: ParentOps;
    }) => {
      await updateChild(args.childId, args.child);
      await updateChildMedical(args.childId, args.medical);
      for (const a of args.parentOps.add) {
        await addChildParent(args.childId, a);
      }
      for (const u of args.parentOps.updateLinks) {
        await updateChildParentLink(args.childId, u.parentId, {
          relationship: u.relationship,
          isPrimary: u.isPrimary,
          livesWithChild: u.livesWithChild,
        });
      }
      for (const r of args.parentOps.remove) {
        await removeChildParent(args.childId, r);
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: childrenQueryKeys.all });
      qc.invalidateQueries({ queryKey: childrenQueryKeys.detail(vars.childId) });
    },
  });
}

// ── Per-section saves (tabbed edit form) ────────────────────────────────────

function invalidateChild(qc: ReturnType<typeof useQueryClient>, childId: string) {
  qc.invalidateQueries({ queryKey: childrenQueryKeys.all });
  qc.invalidateQueries({ queryKey: childrenQueryKeys.detail(childId) });
}

/** PATCH /children/:id — Child details tab only. */
export function useUpdateChildDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { childId: string; payload: UpdateChildPayload }) =>
      updateChild(args.childId, args.payload),
    onSuccess: (_d, v) => invalidateChild(qc, v.childId),
  });
}

/** PUT /children/:id/medical-info — Medical tab only. */
export function useUpdateChildMedicalInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { childId: string; payload: MedicalInfoPayload }) =>
      updateChildMedical(args.childId, args.payload),
    onSuccess: (_d, v) => invalidateChild(qc, v.childId),
  });
}

/**
 * PATCH /children/:id/development — Development / Routines / Toilet tabs. The
 * three tabs share this one mutation (same satellite, same merge endpoint),
 * each sending only ITS fields so a per-tab save never clobbers the others.
 */
export function useUpdateChildDevelopment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { childId: string; payload: DevelopmentPayload }) =>
      updateChildDevelopment(args.childId, args.payload),
    onSuccess: (_d, v) => invalidateChild(qc, v.childId),
  });
}

/** PATCH /children/:id/personality — Personality tab (sub-cards share it). */
export function useUpdateChildPersonality() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { childId: string; payload: PersonalityPayload }) =>
      updateChildPersonality(args.childId, args.payload),
    onSuccess: (_d, v) => invalidateChild(qc, v.childId),
  });
}

/** PATCH /children/:id/consents — Permissions tab. */
export function useUpdateChildConsents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { childId: string; payload: ConsentsPayload }) =>
      updateChildConsents(args.childId, args.payload),
    onSuccess: (_d, v) => invalidateChild(qc, v.childId),
  });
}

/** PATCH /children/:id/infant-sleep — Infant sleep tab (2D, age-gated UI). */
export function useUpdateChildInfantSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { childId: string; payload: InfantSleepPayload }) =>
      updateChildInfantSleep(args.childId, args.payload),
    onSuccess: (_d, v) => invalidateChild(qc, v.childId),
  });
}

/**
 * Syncs the primary contact's phone from the Child tab — writes the primary
 * parent's homePhone via the parent-link PATCH (Parent satellite, not Child).
 */
export function useUpdatePrimaryContactPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { childId: string; parentId: string; homePhone: string }) =>
      updateChildParentLink(args.childId, args.parentId, { homePhone: args.homePhone }),
    onSuccess: (_d, v) => invalidateChild(qc, v.childId),
  });
}

/**
 * Parents tab — applies the diff (add → update → remove, the safe order) and
 * returns the FRESH child so the caller can re-seed the tab (new parents get
 * real ids only after the round-trip).
 */
export function useUpdateChildParents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { childId: string; ops: ParentOps }) => {
      for (const a of args.ops.add) await addChildParent(args.childId, a);
      for (const u of args.ops.updateLinks) {
        await updateChildParentLink(args.childId, u.parentId, {
          relationship: u.relationship,
          isPrimary: u.isPrimary,
          livesWithChild: u.livesWithChild,
        });
      }
      for (const r of args.ops.remove) await removeChildParent(args.childId, r);
      return getChild(args.childId);
    },
    onSuccess: (_d, v) => invalidateChild(qc, v.childId),
  });
}

/**
 * Contacts tab (Fase 2 · 2A) — applies the diff (add → update → remove) and
 * returns the FRESH child so the caller can re-seed the tab (new contacts get
 * real ids only after the round-trip), mirroring the Parents tab.
 */
export function useUpdateChildContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { childId: string; ops: ContactOps }) => {
      for (const a of args.ops.add) await addChildContact(args.childId, a);
      for (const u of args.ops.update) {
        await updateChildContact(args.childId, u.id, u.payload);
      }
      for (const r of args.ops.remove) await removeChildContact(args.childId, r);
      return getChild(args.childId);
    },
    onSuccess: (_d, v) => invalidateChild(qc, v.childId),
  });
}
