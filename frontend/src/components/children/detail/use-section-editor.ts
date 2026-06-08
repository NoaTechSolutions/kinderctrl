'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n';
import type { Child } from '@/lib/types/child';

// Centralizes the read↔edit/save/cancel/dirty lifecycle of ONE detail tab, so
// every section component stays thin (it only supplies: how to seed its slice
// from the child, how to save it, and an optional validator). One tab edits at
// a time — the shell enforces that via the published `handle`.

export type SectionMode = 'read' | 'edit';

// A section's save fn can throw this to abort silently (no error toast, stays in
// edit) — e.g. the user cancelled a pre-save confirmation dialog.
export class AbortSave extends Error {}

// Thin surface the shell needs to run the tab-switch / module-exit guard and
// drive the dialog's Save / Discard actions without owning the section's state.
export interface SectionEditorHandle {
  editing: boolean;
  dirty: boolean;
  save: () => Promise<boolean>;
  cancel: () => void;
}

// Every tab section receives this. The shell mounts only the ACTIVE section and
// subscribes to its handle (for the one-at-a-time guard + tab-switch dialog).
export interface SectionProps {
  child: Child;
  canManage: boolean;
  onEditorChange: (handle: SectionEditorHandle) => void;
}

export interface SectionEditor<TState> {
  mode: SectionMode;
  state: TState;
  setState: Dispatch<SetStateAction<TState>>;
  dirty: boolean;
  saving: boolean;
  enterEdit: () => void;
  cancel: () => void;
  save: () => Promise<boolean>;
  handle: SectionEditorHandle;
}

export function useSectionEditor<TState>(opts: {
  /** Fresh slice built from the current child — MUST be memoized by the caller. */
  seed: TState;
  /** Persist the slice (mutation + payload). Throws on failure. */
  save: (state: TState) => Promise<unknown>;
  /** Whether the underlying mutation is in flight. */
  saving: boolean;
  /** Optional: returns the first validation error message, or null when valid. */
  validate?: (state: TState) => string | null;
  /** Optional custom serializer for dirty detection (defaults to JSON). */
  serialize?: (state: TState) => string;
}): SectionEditor<TState> {
  const { t } = useTranslation();
  const serialize = useMemo(
    () => opts.serialize ?? ((s: TState) => JSON.stringify(s)),
    [opts.serialize],
  );
  const seedStr = useMemo(() => serialize(opts.seed), [opts.seed, serialize]);

  const [mode, setMode] = useState<SectionMode>('read');
  const [state, setState] = useState<TState>(opts.seed);
  const [baseline, setBaseline] = useState<string>(seedStr);

  // While reading, keep the slice synced to the latest saved data (the child
  // query refetches after ANY section saves — this is also how Parents/Contacts
  // pick up server-generated ids). Never clobber an in-progress edit.
  useEffect(() => {
    if (mode === 'read') {
      setState(opts.seed);
      setBaseline(seedStr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedStr]);

  const dirty = serialize(state) !== baseline;

  // Refs so save/cancel stay referentially stable (the shell subscribes to the
  // published handle; stable callbacks avoid a publish loop).
  const stateRef = useRef(state);
  stateRef.current = state;
  const saveFnRef = useRef(opts.save);
  saveFnRef.current = opts.save;
  const validateRef = useRef(opts.validate);
  validateRef.current = opts.validate;
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;

  const enterEdit = useCallback(() => {
    setState(opts.seed);
    setBaseline(seedStr);
    setMode('edit');
  }, [opts.seed, seedStr]);

  const cancel = useCallback(() => {
    setState(JSON.parse(baselineRef.current) as TState);
    setMode('read');
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    const err = validateRef.current?.(stateRef.current) ?? null;
    if (err) {
      toast.error(err);
      return false;
    }
    try {
      await saveFnRef.current(stateRef.current);
      setBaseline(serialize(stateRef.current));
      setMode('read');
      return true;
    } catch (e) {
      if (e instanceof AbortSave) return false;
      toast.error(e instanceof ApiError ? e.message : t('children.toastSaveFailed'));
      return false;
    }
  }, [serialize, t]);

  const handle = useMemo<SectionEditorHandle>(
    () => ({ editing: mode === 'edit', dirty, save, cancel }),
    [mode, dirty, save, cancel],
  );

  return { mode, state, setState, dirty, saving: opts.saving, enterEdit, cancel, save, handle };
}
