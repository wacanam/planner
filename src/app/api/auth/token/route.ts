import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { signToken } from '@/lib/jwt';
import { NextResponse } from 'next/server';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = signToken({
        userId: (session.user as any).id,
        email: session.user.email || '',
        role: (session.user as any).role,
        congregationId: (session.user as any).congregationId,
    });

    return NextResponse.json({ token });
}
