import { kioskPunch } from '@/lib/api/kiosk';
import {
  getPendingPunches,
  markSynced,
  cleanupOldPunches,
} from './offline-store';

export interface SyncResult {
  synced: number;
  failed: number;
}

let syncing = false;

export async function syncPendingPunches(token: string): Promise<SyncResult> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;

  try {
    const pending = await getPendingPunches();
    if (pending.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const punch of pending) {
      try {
        await kioskPunch(token, {
          staffId: punch.staffId,
          type: punch.type,
          deviceTimestamp: punch.deviceTimestamp,
          latitude: punch.latitude,
          longitude: punch.longitude,
        });
        await markSynced(punch.id!);
        synced++;
      } catch {
        failed++;
      }
    }

    await cleanupOldPunches();
    return { synced, failed };
  } finally {
    syncing = false;
  }
}
