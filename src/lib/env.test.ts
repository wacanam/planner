import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getPublicEnv, getServerEnv, publicEnvSchema, serverEnvSchema } from './env';

describe('Environment Variables Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('validates public environment variables with defaults', () => {
    const publicEnv = getPublicEnv();
    expect(publicEnv).toBeDefined();
    expect(typeof publicEnv.NEXT_PUBLIC_FIREBASE_API_KEY).toBe('string');
  });

  it('validates custom public environment values correctly', () => {
    const parsed = publicEnvSchema.parse({
      NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
    });

    expect(parsed.NEXT_PUBLIC_FIREBASE_API_KEY).toBe('test-api-key');
    expect(parsed.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBe('test-project');
    expect(parsed.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).toBe('');
  });

  it('validates server environment schema correctly', () => {
    const parsed = serverEnvSchema.parse({
      NODE_ENV: 'test',
      FIREBASE_ADMIN_PROJECT_ID: 'admin-proj',
    });
    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.FIREBASE_ADMIN_PROJECT_ID).toBe('admin-proj');
  });

  it('validates server environment variables in node environment', () => {
    const serverEnv = getServerEnv();
    expect(serverEnv).toBeDefined();
    expect(['development', 'production', 'test']).toContain(serverEnv.NODE_ENV);
  });

  it('prevents access to server environment variables in a browser environment', () => {
    // Simulate browser window global
    // @ts-expect-error - simulating browser
    globalThis.window = {};

    expect(() => getServerEnv()).toThrow(/SECURITY VIOLATION/);

    // Clean up
    // @ts-expect-error - removing browser simulation
    delete globalThis.window;
  });

  it('provides convenient access via unified env helper', () => {
    expect(getPublicEnv()).toEqual(publicEnvSchema.parse(process.env));
  });
});
