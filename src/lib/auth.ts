import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '@/lib/data-source';
import { User } from '@/entities/User';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update every 24h
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
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

        if (!AppDataSource.isInitialized) {
          try {
            await AppDataSource.initialize();
          } catch (err) {
            console.error('[auth] Failed to initialize AppDataSource:', err);
            throw new Error('Database connection failed. Please try again.');
          }
        }

        try {
          const userRepo = AppDataSource.getRepository(User);
          const user = await userRepo.findOne({ where: { email: credentials.email } });

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

          await userRepo.update(user.id, { lastLoginAt: new Date() });

          console.log('[auth] User signed in:', user.id, user.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            congregationId: user.congregationId ?? null,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.congregationId = (user as { congregationId?: string | null }).congregationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { congregationId?: string | null }).congregationId =
          token.congregationId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
};
