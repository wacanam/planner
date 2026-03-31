import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '@/lib/data-source';
import { User } from '@/entities/User';
import { signToken } from '@/lib/jwt';
import { AppError, handleApiError, errorResponse, successResponse } from '@/lib/error-handler';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { email, password } = body as { email: string; password: string };

    if (!email || !password) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Email and password are required',
        400,
      );
    }

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    // Generic message to avoid revealing which emails exist
    if (!user) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        'Invalid email or password. Please check and try again.',
        401,
      );
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        'Invalid email or password. Please check and try again.',
        401,
      );
    }

    if (!user.isActive) {
      throw new AppError(
        'ACCOUNT_DISABLED',
        'Your account has been disabled. Contact support for assistance.',
        403,
      );
    }

    // Update last login timestamp
    try {
      await userRepo.update(user.id, { lastLoginAt: new Date() });
    } catch (err) {
      console.warn('[login] Failed to update last login:', err);
      // Don't fail the login if this fails
    }

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
        'Login successful',
      ),
    );
  } catch (err) {
    const [message, status] = handleApiError(err);
    console.error('[login error]', message);

    return NextResponse.json(errorResponse(message), { status });
  }
}
