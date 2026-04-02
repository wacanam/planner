import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, territories, users, UserRole, TerritoryStatus } from '@/db';
import { withCongregationAuth } from '@/lib/auth-middleware';

// GET /api/congregations/:id/reports/coverage
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: congregationId } = await params;
  const auth = await withCongregationAuth(req, congregationId);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (
    user.role !== UserRole.SUPER_ADMIN &&
    user.role !== UserRole.ADMIN &&
    user.role !== UserRole.SERVICE_OVERSEER &&
    user.role !== UserRole.TERRITORY_SERVANT
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const rows = await db
      .select({
        id: territories.id,
        number: territories.number,
        name: territories.name,
        status: territories.status,
        coveragePercent: territories.coveragePercent,
        publisherName: users.name,
      })
      .from(territories)
      .leftJoin(users, eq(territories.publisherId, users.id))
      .where(eq(territories.congregationId, congregationId));

    const totalTerritories = rows.length;
    const avgCoveragePercent =
      totalTerritories > 0
        ? rows.reduce((sum, t) => sum + Number(t.coveragePercent), 0) / totalTerritories
        : 0;

    const byStatus = {
      available: rows.filter((t) => t.status === TerritoryStatus.AVAILABLE).length,
      assigned: rows.filter((t) => t.status === TerritoryStatus.ASSIGNED).length,
      completed: rows.filter((t) => t.status === TerritoryStatus.COMPLETED).length,
      archived: rows.filter((t) => t.status === TerritoryStatus.ARCHIVED).length,
    };

    const territoriesList = rows.map((t) => ({
      id: t.id,
      number: t.number,
      name: t.name,
      status: t.status,
      coveragePercent: Number(t.coveragePercent),
      publisherName: t.publisherName ?? undefined,
    }));

    return NextResponse.json({
      data: {
        totalTerritories,
        avgCoveragePercent: Math.round(avgCoveragePercent * 100) / 100,
        byStatus,
        territories: territoriesList,
      },
    });
  } catch (err) {
    console.error('[GET /api/congregations/:id/reports/coverage]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
