import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { signToken } from '@/lib/jwt';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        console.log('[/api/auth/token] Session:', {
            exists: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id,
            email: session?.user?.email,
            role: session?.user?.role,
        });

        if (!session?.user) {
            console.log('[/api/auth/token] No session or user - returning 401');
            return NextResponse.json({ error: 'Unauthorized: No session' }, { status: 401 });
        }

        const token = signToken({
            userId: session.user.id,
            email: session.user.email || '',
            role: session.user.role,
            congregationId: session.user.congregationId,
        });

        console.log('[/api/auth/token] Token generated successfully');
        return NextResponse.json({ token });
    } catch (error) {
        console.error('[/api/auth/token] Error:', error);
        return NextResponse.json({ error: 'Token generation failed' }, { status: 500 });
    }
}
