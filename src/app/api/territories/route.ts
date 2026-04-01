import { asc, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import {
  db,
  serviceGroups,
  TerritoryStatus,
  territories,
  territoryAssignments,
  UserRole,
  users,
} from '@/db';
import {
  ApiErrors,
  generateRequestId,
  paginatedResponse,
  successResponse,
  validateRequired,
} from '@/lib/api-helpers';
import { RequireRole, withAuth } from '@/lib/auth-middleware';
import type { JwtPayload } from '@/lib/jwt';

interface TerritoryData {
  id: string;
  congregationId: string;
  number: string;
  name: string;
  status: string;
  householdsCount?: number;
  notes?: string;
  boundary?: string;
  coveragePercent?: string;
  createdAt: Date;
  updatedAt: Date;
  assignment?: {
    id: string;
    status: string | null;
    publisher?: {
      id: string;
      name: string | null;
      email: string | null;
    } | null;
    group?: {
      id: string;
      name: string | null;
    } | null;
  } | null;
}

// GET /api/territories
export async function GET(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const requestId = generateRequestId();
  try {
    const { searchParams } = new URL(req.url);
    const congregationId = searchParams.get('congregationId');
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

    if (!congregationId) {
      return ApiErrors.badRequest('congregationId is required', undefined, requestId);
    }

    // Fetch territories with active assignments, publishers, and groups
    const rows = await db
      .select({
        territoryId: territories.id,
        congregationId: territories.congregationId,
        number: territories.number,
        name: territories.name,
        status: territories.status,
        householdsCount: territories.householdsCount,
        notes: territories.notes,
        boundary: territories.boundary,
        coveragePercent: territories.coveragePercent,
        createdAt: territories.createdAt,
        updatedAt: territories.updatedAt,
        assignmentId: territoryAssignments.id,
        assignmentStatus: territoryAssignments.status,
        userId: territoryAssignments.userId,
        userName: users.name,
        userEmail: users.email,
        serviceGroupId: serviceGroups.id,
        serviceGroupName: serviceGroups.name,
      })
      .from(territories)
      .leftJoin(territoryAssignments, eq(territories.id, territoryAssignments.territoryId))
      .leftJoin(users, eq(territoryAssignments.userId, users.id))
      .leftJoin(serviceGroups, eq(territoryAssignments.serviceGroupId, serviceGroups.id))
      .where(eq(territories.congregationId, congregationId))
      .orderBy(asc(territories.number));

    // Aggregate: group by territory, keep only first/active assignment
    const territoryMap = new Map<string, TerritoryData>();
    rows.forEach((row) => {
      if (!territoryMap.has(row.territoryId)) {
        territoryMap.set(row.territoryId, {
          id: row.territoryId,
          congregationId: row.congregationId,
          number: row.number,
          name: row.name,
          status: row.status,
          householdsCount: row.householdsCount ?? undefined,
          notes: row.notes ?? undefined,
          boundary: row.boundary ?? undefined,
          coveragePercent: row.coveragePercent ?? undefined,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          assignment: null,
        });
      }

      // Only add assignment if this is the first one (or if none exists yet)
      const territory = territoryMap.get(row.territoryId);
      if (territory && row.assignmentId && !territory.assignment) {
        territory.assignment = {
          id: row.assignmentId,
          status: row.assignmentStatus,
          publisher: row.userId
            ? {
              id: row.userId,
              name: row.userName,
              email: row.userEmail,
            }
            : null,
          group: row.serviceGroupId
            ? {
              id: row.serviceGroupId,
              name: row.serviceGroupName,
            }
            : null,
        };
      }
    });

    const all = Array.from(territoryMap.values());
    const total = all.length;
    const paginated = all.slice((page - 1) * limit, page * limit);
    return paginatedResponse(paginated, total, page, limit, requestId);
  } catch (err) {
    console.error('[GET /api/territories]', err);
    return ApiErrors.internalError(undefined, requestId);
  }
}

// POST /api/territories
export const POST = RequireRole(UserRole.SERVICE_OVERSEER)(
  async (req: NextRequest, _ctx: unknown, user: JwtPayload) => {
    const requestId = generateRequestId();
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const validation = validateRequired(body, ['name', 'number'], requestId);
      if (validation) return validation;

      const [territory] = await db
        .insert(territories)
        .values({
          name: body.name as string,
          number: body.number as string,
          notes: body.notes as string | undefined,
          householdsCount: Number(body.householdsCount ?? 0),
          boundary: body.boundary as string | undefined,
          status: TerritoryStatus.AVAILABLE,
          coveragePercent: '0',
          congregationId: (body.congregationId as string) || (user.congregationId ?? ''),
        })
        .returning();

      return successResponse(territory, 'Territory created', 201, requestId);
    } catch (err) {
      console.error('[POST /api/territories]', err);
      return ApiErrors.internalError(undefined, requestId);
    }
  }
);
