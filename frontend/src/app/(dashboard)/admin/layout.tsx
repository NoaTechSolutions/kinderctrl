'use client';

import { useRequireRole } from '@/lib/hooks/use-require-role';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, allowed } = useRequireRole(['SUPER_ADMIN']);
  if (!ready || !allowed) return null;
  return <>{children}</>;
}
