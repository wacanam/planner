import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { congregationMembers, db, users, MemberStatus } from '@/db';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email))
            .limit(1);

          if (!user) {
            throw new Error('Invalid email or password. Please check and try again.');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            throw new Error('Invalid email or password. Please check and try again.');
          }

          if (!user.isActive) {
            throw new Error('Your account has been disabled. Contact support for assistance.');
          }

          await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

          // Resolve congregationId: prefer direct field, fall back to congregation_members
          let congregationId: string | null = user.congregationId ?? null;
          if (!congregationId) {
            const [membership] = await db
              .select()
              .from(congregationMembers)
              .where(
                and(
                  eq(congregationMembers.userId, user.id),
                  eq(congregationMembers.status, MemberStatus.ACTIVE)
                )
              )
              .limit(1);
            congregationId = membership?.congregationId ?? null;
          }

          console.log(
            '[auth] User signed in:',
            user.id,
            user.email,
            'congregation:',
            congregationId
          );

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as import('@/db').UserRole,
            congregationId: congregationId ?? undefined,
          };
        } catch (err) {
          if (err instanceof Error) {
            console.error('[auth signin error]', err.message);
            throw err;
          }
          console.error('[auth signin error]', err);
          throw new Error('Failed to sign in. Please try again.');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.congregationId = user.congregationId;
      }
      // Allow client-side session.update({ congregationId }) to refresh the token
      if (trigger === 'update' && session?.congregationId !== undefined) {
        token.congregationId = session.congregationId;
      }
      // Allow client-side session.update({ congregationId }) to refresh the token
      if (trigger === 'update' && session?.congregationId !== undefined) {
        token.congregationId = session.congregationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.congregationId = token.congregationId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
};
