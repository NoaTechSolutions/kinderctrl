'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Time Clock and history are now a single page. Any links/bookmarks pointing
// at /attendance/my-history land on /attendance. Client-side redirect via
// router.replace updates the URL in the browser bar (server `redirect()` in
// App Router can serve the destination HTML without changing the visible URL).
export default function MyHistoryRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/attendance');
  }, [router]);
  return null;
}
