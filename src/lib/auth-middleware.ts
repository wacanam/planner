import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearerToken } from '@/lib/jwt';
import { hasPermission } from '@/lib/permissions';
import type { JwtPayload } from '@/lib/jwt';
import { eq, and } from 'drizzle-orm';
import { db, congregationMembers, UserRole, CongregationRole, MemberStatus } from '@/db';
import type { CongregationMember } from '@/db';

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
    console.log('[withAuth] No bearer token found in Authorization header');
    return NextResponse.json({ error: 'Unauthorized: missing token' }, { status: 401 });
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
    console.log('[withAuth] Token verified successfully for user:', payload.userId);
  } catch (error) {
    console.error('[withAuth] Token verification failed:', error);
    return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
  }

  if (requiredRole && !hasPermission(payload.role, requiredRole)) {
    console.log('[withAuth] Insufficient permissions:', payload.role, 'required:', requiredRole);
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

  console.log('[withCongregationAuth] Checking congregation membership:', {
    userId: user.userId,
    userRole: user.role,
    congregationId,
    isGlobalAdmin: (GLOBAL_ROLES as string[]).includes(user.role),
  });

  // Global admins bypass congregation checks
  if ((GLOBAL_ROLES as string[]).includes(user.role)) {
    console.log('[withCongregationAuth] User is global admin - bypassing congregation checks');
    return { user, member: null };
  }

  // Verify congregation membership
  const [member] = await db
    .select()
    .from(congregationMembers)
    .where(
      and(
        eq(congregationMembers.userId, user.userId),
        eq(congregationMembers.congregationId, congregationId),
        eq(congregationMembers.status, MemberStatus.ACTIVE)
      )
    )
    .limit(1);

  if (!member) {
    console.log('[withCongregationAuth] User is not a member of this congregation');
    return NextResponse.json(
      { error: 'Forbidden: not a member of this congregation' },
      { status: 403 }
    );
  }

  console.log(
    '[withCongregationAuth] User is member with congregation role:',
    member.congregationRole
  );

  // Check congregation role if required
  if (requiredCongregationRole) {
    const roleHierarchy = [CongregationRole.TERRITORY_SERVANT, CongregationRole.SERVICE_OVERSEER];
    const memberRoleIndex = member.congregationRole
      ? roleHierarchy.indexOf(member.congregationRole as CongregationRole)
      : -1;
    const requiredIndex = roleHierarchy.indexOf(requiredCongregationRole);
    if (memberRoleIndex < requiredIndex) {
      console.log(
        '[withCongregationAuth] Insufficient congregation role:',
        member.congregationRole
      );
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
