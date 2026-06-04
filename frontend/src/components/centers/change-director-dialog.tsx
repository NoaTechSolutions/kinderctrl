'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Search, UserCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSearchUsers } from '@/lib/hooks/use-admin';
import { useChangeDirector } from '@/lib/hooks/use-centers';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api/client';
import type { SystemUser } from '@/lib/api/admin';

// ----------------------------------------------------------------- helpers

function userDisplayName(user: SystemUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email;
}

const ROLE_LABEL: Record<SystemUser['role'], string> = {
  SUPER_ADMIN: 'Super Admin',
  DIRECTOR: 'Director',
  STAFF: 'Staff',
  PARENT: 'Parent',
};

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string | string[] } | null;
    const msg = body?.message;
    if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
    if (typeof msg === 'string' && msg) return msg;
  }
  return fallback;
}

// ----------------------------------------------------------------- props

interface ChangeDirectorDialogProps {
  centerId: string;
  centerName: string;
  currentDirectorName: string;
  currentDirectorEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ----------------------------------------------------------------- component

/**
 * Two-step "Change Director" flow for SUPER_ADMIN.
 *
 * Step 1 (selection Dialog): debounced user search → user list → select a user.
 * Step 2 (confirmation AlertDialog): a plain warning of who loses and who
 *         gains Director access (no typed confirmation gate — CAMBIO 1).
 */
export function ChangeDirectorDialog({
  centerId,
  centerName,
  currentDirectorName,
  currentDirectorEmail,
  open,
  onOpenChange,
}: ChangeDirectorDialogProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SystemUser | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  // Only STAFF/DIRECTOR can become a center's Director — exclude PARENT and
  // SUPER_ADMIN from the picker (filtered server-side so the 25-row cap
  // isn't wasted on ineligible users).
  const { data: users = [], isFetching } = useSearchUsers(debouncedSearch, [
    'STAFF',
    'DIRECTOR',
  ]);

  const changeDirector = useChangeDirector();

  // The confirmation AlertDialog opens once a user is selected.
  const confirmOpen = selected !== null;

  const handleClose = () => {
    if (changeDirector.isPending) return;
    setSearch('');
    setSelected(null);
    onOpenChange(false);
  };

  const handleSelectUser = (user: SystemUser) => {
    setSelected(user);
  };

  const handleCancelConfirm = () => {
    if (changeDirector.isPending) return;
    setSelected(null);
  };

  const handleConfirm = () => {
    if (!selected) return;
    changeDirector.mutate(
      { centerId, newDirectorUserId: selected.id },
      {
        onSuccess: () => {
          toast.success('Director changed successfully');
          handleClose();
        },
        onError: (err) => {
          toast.error(
            apiErrorMessage(err, 'Failed to change director. Please try again.'),
          );
        },
      },
    );
  };

  return (
    <>
      {/* ---- STEP 1: selection dialog ---- */}
      <Dialog
        open={open && !confirmOpen}
        onOpenChange={(next) => {
          if (!next) handleClose();
        }}
      >
        <DialogContent className="sm:max-w-md [&>*]:min-w-0">
          <DialogHeader>
            <DialogTitle>Change Director</DialogTitle>
            <DialogDescription>
              Search and select the user you want to assign as director of{' '}
              <strong>{centerName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Search input */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: 'var(--kc-text-3)' }}
              aria-hidden
            />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* User list */}
          <div
            className="max-h-64 overflow-y-auto rounded-md border"
            style={{ borderColor: 'var(--kc-border)' }}
          >
            {isFetching && users.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2
                  className="h-5 w-5 animate-spin"
                  style={{ color: 'var(--kc-text-3)' }}
                />
              </div>
            ) : users.length === 0 ? (
              <p
                className="py-8 text-center text-sm"
                style={{ color: 'var(--kc-text-3)' }}
              >
                No users found.
              </p>
            ) : (
              <ul role="listbox" aria-label="System users">
                {users.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => handleSelectUser(user)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:bg-accent"
                    >
                      <UserCheck
                        className="h-4 w-4 flex-none"
                        style={{ color: 'var(--kc-p-600)' }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-medium"
                          style={{ color: 'var(--kc-text-1)' }}
                        >
                          {userDisplayName(user)}
                        </p>
                        <p
                          className="truncate text-xs"
                          style={{ color: 'var(--kc-text-3)' }}
                        >
                          {user.email}
                          {user.center ? ` · ${user.center.name}` : ''}
                        </p>
                      </div>
                      <Badge variant="outline" className="flex-none text-xs">
                        {ROLE_LABEL[user.role]}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- STEP 2: confirmation AlertDialog (warning only, CAMBIO 1) ---- */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!next) handleCancelConfirm();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Director</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div
                  className="rounded-md border p-3 space-y-3"
                  style={{ borderColor: 'var(--kc-border)' }}
                >
                  <div className="space-y-0.5">
                    <p
                      className="text-xs font-medium uppercase tracking-wide"
                      style={{ color: 'var(--kc-text-3)' }}
                    >
                      Remove as Director
                    </p>
                    <p style={{ color: 'var(--kc-text-1)' }}>
                      👤 {currentDirectorName}
                      {currentDirectorEmail ? ` (${currentDirectorEmail})` : ''}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p
                      className="text-xs font-medium uppercase tracking-wide"
                      style={{ color: 'var(--kc-text-3)' }}
                    >
                      Assign as new Director
                    </p>
                    <p style={{ color: 'var(--kc-text-1)' }}>
                      👤 {selected ? userDisplayName(selected) : ''}
                      {selected ? ` (${selected.email})` : ''}
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-start gap-2 rounded-md p-2.5"
                  style={{ background: 'var(--kc-warning-bg)' }}
                >
                  <AlertTriangle
                    className="h-4 w-4 flex-none mt-0.5"
                    style={{ color: 'var(--kc-warning)' }}
                    aria-hidden
                  />
                  <p className="text-sm" style={{ color: 'var(--kc-warning)' }}>
                    This action will immediately revoke {currentDirectorName}
                    &rsquo;s Director access.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => {
                e.preventDefault();
                handleCancelConfirm();
              }}
              disabled={changeDirector.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={changeDirector.isPending}
              style={{ background: 'var(--kc-p-600)' }}
            >
              {changeDirector.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
