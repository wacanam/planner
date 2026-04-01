import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { signToken } from '@/lib/jwt';
import type { UserRole } from '@/db';

type SessionUser = {
    id: string;
    email?: string | null;
    role: UserRole;
    congregationId?: string | null;
};

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const user = (session as Record<string, unknown> | null)?.user as SessionUser | undefined;

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized: No session' }, { status: 401 });
        }

        const token = signToken({
            userId: user.id,
            email: user.email || '',
            role: user.role,
            congregationId: user.congregationId ?? undefined,
        });

        return NextResponse.json({ token });
    } catch (error) {
        console.error('[/api/auth/token] Error:', error);
        return NextResponse.json({ error: 'Token generation failed' }, { status: 500 });
    }
}

