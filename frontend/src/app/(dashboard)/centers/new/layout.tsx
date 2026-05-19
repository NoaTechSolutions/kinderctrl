'use client';

import { useRequireRole } from '@/lib/hooks/use-require-role';

export default function NewCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, allowed } = useRequireRole(['DIRECTOR', 'SUPER_ADMIN']);
  if (!ready || !allowed) return null;
  return <>{children}</>;
}
