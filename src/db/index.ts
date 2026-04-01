import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
    if (!dbInstance) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is not set');
        }
        const sql = neon(process.env.DATABASE_URL);
        dbInstance = drizzle(sql, { schema });
    }
    return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
    get: (_target, prop) => {
        return getDb()[prop as keyof ReturnType<typeof drizzle>];
    },
});

export * from './schema';
