import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearerToken } from '@/lib/jwt';
import { hasPermission } from '@/lib/permissions';
import type { JwtPayload } from '@/lib/jwt';
import type { UserRole } from '@/entities/User';

export type AuthenticatedRequest = NextRequest & { user: JwtPayload };

/**
 * Middleware that validates JWT and optionally enforces a minimum role.
 * Returns the decoded payload on success, or a NextResponse error on failure.
 */
export function withAuth(
  req: NextRequest,
  requiredRole?: UserRole
): { user: JwtPayload } | NextResponse {
  const token = extractBearerToken(req.headers.get('authorization'));

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: missing token' }, { status: 401 });
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
  }

  if (requiredRole && !hasPermission(payload.role, requiredRole)) {
    return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
  }

  return { user: payload };
}

/**
 * @RequireRole decorator — wraps a Next.js route handler with role-based auth.
 *
 * Usage:
 *   export const GET = RequireRole(UserRole.ADMIN)(async (req, context, user) => { ... });
 */
export function RequireRole(requiredRole: UserRole) {
  return (
    handler: (req: NextRequest, context: unknown, user: JwtPayload) => Promise<NextResponse>
  ) =>
    async (req: NextRequest, context: unknown): Promise<NextResponse> => {
      const result = withAuth(req, requiredRole);
      if (result instanceof NextResponse) return result;
      return handler(req, context, result.user);
    };
}
