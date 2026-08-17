import { z } from 'zod';

/**
 * Public client-side environment variables schema.
 * All client variables MUST start with NEXT_PUBLIC_.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional().default(''),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional().default(''),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional().default(''),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional().default(''),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional().default(''),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: z.string().optional().default(''),
});

/**
 * Private server-side environment variables schema.
 * NEVER prefix these with NEXT_PUBLIC_. They must never be accessible in the browser.
 */
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FIREBASE_ADMIN_PROJECT_ID: z.string().optional(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  DATABASE_URL: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedPublicEnv: PublicEnv | null = null;
let cachedServerEnv: ServerEnv | null = null;

/**
 * Returns validated public environment variables.
 * Safe to use in both client and server contexts.
 */
export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
  });

  if (!parsed.success) {
    console.error('Invalid public environment variables:', parsed.error.format());
    throw new Error('Invalid public environment variables configuration.');
  }

  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}

/**
 * Returns validated private server environment variables.
 * GUARDS: Throws an error if called in a browser environment to prevent secret leakage.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY VIOLATION: Attempted to access server-only environment variables from the client/browser bundle!'
    );
  }

  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  });

  if (!parsed.success) {
    console.error('Invalid server environment variables:', parsed.error.format());
    throw new Error('Invalid server environment variables configuration.');
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/**
 * Unified env accessor with getter properties.
 */
export const env = {
  get public() {
    return getPublicEnv();
  },
  get server() {
    return getServerEnv();
  },
};
