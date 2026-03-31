import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '@/lib/data-source';
import { User, UserRole } from '@/entities/User';
import { signToken } from '@/lib/jwt';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { email, password, name, role, congregationId } = body as {
      email: string;
      password: string;
      name: string;
      role?: UserRole;
      congregationId?: string;
    };

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepo = AppDataSource.getRepository(User);

    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = userRepo.create({
      email,
      password: hashedPassword,
      name,
      role: role ?? UserRole.USER,
      congregationId,
    });

    await userRepo.save(user);

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      congregationId: user.congregationId,
    });

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          congregationId: user.congregationId,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
