import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearerToken } from '@/lib/jwt';
import { hasPermission } from '@/lib/permissions';
import type { JwtPayload } from '@/lib/jwt';
import { UserRole } from '@/entities/User';
import { CongregationRole } from '@/entities/CongregationMember';
import { AppDataSource } from '@/lib/data-source';
import { CongregationMember } from '@/entities/CongregationMember';

export type AuthenticatedRequest = NextRequest & { user: JwtPayload };

/** Global roles that bypass congregation membership checks */
const GLOBAL_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

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
 * Verify that the authenticated user is a member of the given congregation.
 * Global admins bypass this check.
 * Optionally enforce a specific congregation role.
 */
export async function withCongregationAuth(
  req: NextRequest,
  congregationId: string,
  requiredCongregationRole?: CongregationRole
): Promise<{ user: JwtPayload; member: CongregationMember | null } | NextResponse> {
  const authResult = withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  // Global admins bypass congregation checks
  if (GLOBAL_ROLES.includes(user.role)) {
    return { user, member: null };
  }

  // Verify congregation membership
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const memberRepo = AppDataSource.getRepository(CongregationMember);
  const member = await memberRepo.findOne({
    where: { userId: user.userId, congregationId },
  });

  if (!member) {
    return NextResponse.json(
      { error: 'Forbidden: not a member of this congregation' },
      { status: 403 }
    );
  }

  // Check congregation role if required
  if (requiredCongregationRole) {
    const roleHierarchy = [CongregationRole.TERRITORY_SERVANT, CongregationRole.SERVICE_OVERSEER];
    const memberRoleIndex = member.congregationRole
      ? roleHierarchy.indexOf(member.congregationRole)
      : -1;
    const requiredIndex = roleHierarchy.indexOf(requiredCongregationRole);
    if (memberRoleIndex < requiredIndex) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient congregation role' },
        { status: 403 }
      );
    }
  }

  return { user, member };
}

/**
 * @RequireRole decorator — wraps a Next.js route handler with role-based auth.
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

/**
 * Congregation-scoped route handler decorator.
 * Injects `user` and `member` (null for global admins).
 */
export function WithCongregationAuth(requiredCongregationRole?: CongregationRole) {
  return (
    handler: (
      req: NextRequest,
      context: { params: { id: string; [key: string]: string } },
      user: JwtPayload,
      member: CongregationMember | null
    ) => Promise<NextResponse>
  ) =>
    async (
      req: NextRequest,
      context: { params: { id: string; [key: string]: string } }
    ): Promise<NextResponse> => {
      const { id } = context.params;
      const result = await withCongregationAuth(req, id, requiredCongregationRole);
      if (result instanceof NextResponse) return result;
      return handler(req, context, result.user, result.member);
    };
}
