'use client';

import { useAuth as useAuthContext } from '@/components/auth-provider';

export function useAuth() {
  return useAuthContext();
}

export type { User } from '@/components/auth-provider';
