import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '@/lib/data-source';
import { User, UserRole } from '@/entities/User';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    // Validate inputs
    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!password?.trim()) {
      return NextResponse.json(
        { error: 'Password is required.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required.' },
        { status: 400 }
      );
    }

    // Initialize database
    if (!AppDataSource.isInitialized) {
      try {
        await AppDataSource.initialize();
      } catch (err) {
        console.error('[register] Failed to initialize database:', err);
        return NextResponse.json(
          { error: 'Database connection failed. Please try again.' },
          { status: 500 }
        );
      }
    }

    const userRepo = AppDataSource.getRepository(User);

    // Check if email already exists
    const existing = await userRepo.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json(
        { error: 'This email is already registered. Please sign in instead.' },
        { status: 409 }
      );
    }

    // Hash password
    let hashedPassword: string;
    try {
      hashedPassword = await bcrypt.hash(password, 12);
    } catch (_err) {
      return NextResponse.json(
        { error: 'Failed to secure your password. Please try again.' },
        { status: 500 }
      );
    }

    // Create user
    const user = userRepo.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: UserRole.USER,
      isActive: true,
    });

    const savedUser = await userRepo.save(user);

    console.log('[register] User created:', savedUser.id, savedUser.email);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          name: savedUser.name,
          role: savedUser.role,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[register error]', err);

    if (err instanceof Error) {
      return NextResponse.json(
        { error: err.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
