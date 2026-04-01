import { type NextResponse } from 'next/server';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status: number;
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleApiError(error: unknown): [string, number] {
  console.error('[API Error]', error);

  if (error instanceof AppError) {
    return [error.message, error.status];
  }

  if (error instanceof SyntaxError) {
    return ['Invalid JSON in request body', 400];
  }

  if (error instanceof TypeError) {
    if (error.message.includes('JSON')) {
      return ['Invalid JSON format', 400];
    }
    return ['Invalid request', 400];
  }

  if (error instanceof Error) {
    // Database errors
    if (error.message.includes('UNIQUE constraint failed')) {
      return ['Email already registered', 409];
    }
    if (error.message.includes('NOT NULL constraint failed')) {
      return ['Required field missing', 400];
    }
    // Generic error with message
    return [error.message, 500];
  }

  return ['Internal server error', 500];
}

export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message: message || 'Request successful',
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(message: string, code?: string, details?: Record<string, unknown>) {
  return {
    success: false,
    error: {
      message,
      code: code || 'UNKNOWN_ERROR',
      details,
    },
    timestamp: new Date().toISOString(),
  };
}
