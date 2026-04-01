import type { DefaultJWT, DefaultSession, DefaultUser } from 'next-auth';
import type { UserRole, CongregationRole } from '@/db';

declare module 'next-auth' {
  interface User extends DefaultUser {
    id: string;
    role: UserRole;
    congregationId?: string;
    congregationRole?: CongregationRole | null;
  }

  interface Session extends DefaultSession {
    user: User;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    congregationId?: string;
    congregationRole?: CongregationRole | null;
  }
}
