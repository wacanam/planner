import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '@/lib/data-source';
import { User, UserRole } from '@/entities/User';

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
        name: { label: 'Name', type: 'text' },
        mode: { label: 'Mode', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize();
        }

        const userRepo = AppDataSource.getRepository(User);
        const mode = credentials.mode || 'signin';

        // SIGNUP MODE
        if (mode === 'signup') {
          if (!credentials.name) {
            throw new Error('Name is required for registration');
          }

          if (credentials.password.length < 8) {
            throw new Error('Password must be at least 8 characters');
          }

          // Check if email already exists
          const existing = await userRepo.findOne({ where: { email: credentials.email } });
          if (existing) {
            throw new Error('This email is already registered. Please sign in instead.');
          }

          // Hash password and create user
          const hashedPassword = await bcrypt.hash(credentials.password, 12);
          const user = userRepo.create({
            email: credentials.email,
            password: hashedPassword,
            name: credentials.name,
            role: UserRole.USER,
          });

          await userRepo.save(user);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            congregationId: user.congregationId ?? null,
          };
        }

        // SIGNIN MODE (default)
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          congregationId: user.congregationId ?? null,
        };
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
