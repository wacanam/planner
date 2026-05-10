'use client';

import type { ReactNode } from 'react';
import { FirebaseAuthProvider } from '@/lib/firebase/auth';

export function Providers({ children }: { children: ReactNode }) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}
