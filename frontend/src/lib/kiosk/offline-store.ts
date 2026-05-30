import Dexie, { type EntityTable } from 'dexie';

export interface PendingPunch {
  id?: number;
  staffId: string;
  staffName: string;
  type: string;
  deviceTimestamp: string;
  latitude?: number;
  longitude?: number;
  centerId: string;
  synced: boolean;
  syncedAt?: string;
  createdAt: string;
}

class KioskOfflineDB extends Dexie {
  pendingPunches!: EntityTable<PendingPunch, 'id'>;

  constructor() {
    super('KioskOfflineDB');
    this.version(1).stores({
      pendingPunches: '++id, synced, createdAt',
    });
  }
}

export const offlineDB = new KioskOfflineDB();

export async function savePunchOffline(punch: Omit<PendingPunch, 'id' | 'synced' | 'createdAt'>) {
  return offlineDB.pendingPunches.add({
    ...punch,
    synced: false,
    createdAt: new Date().toISOString(),
  });
}

export async function getPendingPunches() {
  return offlineDB.pendingPunches
    .where('synced')
    .equals(0)
    .sortBy('createdAt');
}

export async function getPendingCount() {
  return offlineDB.pendingPunches
    .where('synced')
    .equals(0)
    .count();
}

export async function markSynced(id: number) {
  return offlineDB.pendingPunches.update(id, {
    synced: true,
    syncedAt: new Date().toISOString(),
  });
}

export async function cleanupOldPunches() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();

  const old = await offlineDB.pendingPunches
    .where('synced')
    .equals(1)
    .filter((p) => p.syncedAt != null && p.syncedAt < cutoff)
    .toArray();

  if (old.length > 0) {
    await offlineDB.pendingPunches.bulkDelete(old.map((p) => p.id!));
  }
  return old.length;
}
