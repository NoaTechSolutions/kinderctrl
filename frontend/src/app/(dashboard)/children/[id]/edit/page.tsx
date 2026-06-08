'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// The separate edit form was merged into the unified detail screen
// (/children/[id], inline read↔edit per tab). This route now just redirects so
// any old bookmarks / links keep working. Remove once the unified screen is
// fully adopted.
export default function EditChildRedirect() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  useEffect(() => {
    if (id) router.replace(`/children/${id}`);
  }, [id, router]);

  return null;
}
