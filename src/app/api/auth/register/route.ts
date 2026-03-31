import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '@/lib/data-source';
import { User, UserRole } from '@/entities/User';
import { signToken } from '@/lib/jwt';
import { AppError, handleApiError, errorResponse, successResponse } from '@/lib/error-handler';

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

    // Validation
    if (!email || !password || !name) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Email, password, and name are required',
        400,
      );
    }

    if (!email.includes('@')) {
      throw new AppError('INVALID_EMAIL', 'Please provide a valid email address', 400);
    }

    if (password.length < 8) {
      throw new AppError(
        'PASSWORD_TOO_SHORT',
        'Password must be at least 8 characters',
        400,
      );
    }

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepo = AppDataSource.getRepository(User);

    // Check if email already exists
    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
      throw new AppError(
        'EMAIL_ALREADY_EXISTS',
        'This email is already registered. Please sign in instead.',
        409,
      );
    }

    // Hash password
    let hashedPassword: string;
    try {
      hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
      throw new AppError(
        'PASSWORD_HASH_ERROR',
        'Failed to secure your password. Please try again.',
        500,
      );
    }

    // Create user
    const user = userRepo.create({
      email,
      password: hashedPassword,
      name,
      role: role ?? UserRole.USER,
      congregationId,
    });

    await userRepo.save(user);

    // Generate token
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      congregationId: user.congregationId,
    });

    return NextResponse.json(
      successResponse(
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
        'Account created successfully',
      ),
      { status: 201 },
    );
  } catch (err) {
    const [message, status] = handleApiError(err);
    console.error('[register error]', message);

    return NextResponse.json(errorResponse(message), { status });
  }
}

