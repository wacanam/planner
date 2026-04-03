import 'dotenv/config';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';

config({ path: ['.env.local', '.env'] });

import { db } from './src/db/index';
import {
  users,
  congregations,
  congregationMembers,
  groups,
  groupMembers,
  territories,
  households,
  UserRole,
  CongregationRole,
  GroupRole,
  TerritoryStatus,
} from './src/db/schema';

async function seed() {
  console.log('🌱 Starting seed...');

  // Super admin
  const [existingSuperAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'super@example.com'))
    .limit(1);

  let superAdmin = existingSuperAdmin;
  if (!superAdmin) {
    [superAdmin] = await db
      .insert(users)
      .values({
        email: 'super@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Super Admin',
        role: UserRole.SUPER_ADMIN,
      })
      .returning();
    console.log('✅ Created super_admin: super@example.com / password123');
  }

  // Admin user
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@example.com'))
    .limit(1);

  let adminUser = existingAdmin;
  if (!adminUser) {
    [adminUser] = await db
      .insert(users)
      .values({
        email: 'admin@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Admin User',
        role: UserRole.ADMIN,
      })
      .returning();
    console.log('✅ Created admin: admin@example.com / password123');
  }

  // Regular users
  const usersData = [
    { email: 'alice@example.com', name: 'Alice Publisher' },
    { email: 'bob@example.com', name: 'Bob Publisher' },
    { email: 'carol@example.com', name: 'Carol Publisher' },
  ];

  const regularUsers = [];
  for (const ud of usersData) {
    const [existing] = await db.select().from(users).where(eq(users.email, ud.email)).limit(1);

    if (existing) {
      regularUsers.push(existing);
    } else {
      const [u] = await db
        .insert(users)
        .values({
          email: ud.email,
          password: await bcrypt.hash('password123', 10),
          name: ud.name,
          role: UserRole.USER,
        })
        .returning();
      console.log(`✅ Created user: ${ud.email} / password123`);
      regularUsers.push(u);
    }
  }

  // Congregation
  const [existingCong] = await db
    .select()
    .from(congregations)
    .where(eq(congregations.slug, 'test-congregation'))
    .limit(1);

  let congregation = existingCong;
  if (!congregation) {
    [congregation] = await db
      .insert(congregations)
      .values({
        name: 'Test Congregation',
        slug: 'test-congregation',
        city: 'Test City',
        country: 'US',
        createdById: adminUser.id,
      })
      .returning();
    console.log('✅ Created congregation: Test Congregation');
  }

  // Add admin as service_overseer
  const [existingAdminMember] = await db
    .select()
    .from(congregationMembers)
    .where(
      and(
        eq(congregationMembers.userId, adminUser.id),
        eq(congregationMembers.congregationId, congregation.id)
      )
    )
    .limit(1);

  if (!existingAdminMember) {
    await db.insert(congregationMembers).values({
      userId: adminUser.id,
      congregationId: congregation.id,
      congregationRole: CongregationRole.SERVICE_OVERSEER,
    });
    console.log('✅ Added admin as service_overseer');
  }

  const [alice, bob, carol] = regularUsers;

  // Alice as territory_servant
  const [existingAlice] = await db
    .select()
    .from(congregationMembers)
    .where(
      and(
        eq(congregationMembers.userId, alice.id),
        eq(congregationMembers.congregationId, congregation.id)
      )
    )
    .limit(1);

  if (!existingAlice) {
    await db.insert(congregationMembers).values({
      userId: alice.id,
      congregationId: congregation.id,
      congregationRole: CongregationRole.TERRITORY_SERVANT,
    });
    console.log('✅ Added alice as territory_servant');
  }

  // Bob and carol as regular members
  for (const u of [bob, carol]) {
    const [existing] = await db
      .select()
      .from(congregationMembers)
      .where(
        and(
          eq(congregationMembers.userId, u.id),
          eq(congregationMembers.congregationId, congregation.id)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(congregationMembers).values({
        userId: u.id,
        congregationId: congregation.id,
      });
      console.log(`✅ Added ${u.name} as congregation member`);
    }
  }

  // Groups
  const [existingGroup1] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.congregationId, congregation.id), eq(groups.name, 'Group A')))
    .limit(1);

  let group1 = existingGroup1;
  if (!group1) {
    [group1] = await db
      .insert(groups)
      .values({ congregationId: congregation.id, name: 'Group A' })
      .returning();
    console.log('✅ Created Group A');
  }

  const [existingGroup2] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.congregationId, congregation.id), eq(groups.name, 'Group B')))
    .limit(1);

  let group2 = existingGroup2;
  if (!group2) {
    [group2] = await db
      .insert(groups)
      .values({ congregationId: congregation.id, name: 'Group B' })
      .returning();
    console.log('✅ Created Group B');
  }

  // Group members
  const groupMembersData = [
    { userId: alice.id, groupId: group1.id, groupRole: GroupRole.GROUP_OVERSEER },
    { userId: bob.id, groupId: group1.id, groupRole: GroupRole.MEMBER },
    { userId: carol.id, groupId: group2.id, groupRole: GroupRole.ASSISTANT_OVERSEER },
  ];

  for (const gm of groupMembersData) {
    const [existing] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.userId, gm.userId), eq(groupMembers.groupId, gm.groupId)))
      .limit(1);

    if (!existing) {
      await db.insert(groupMembers).values(gm);
      console.log(`✅ Added user to group with role ${gm.groupRole}`);
    }
  }

  // ── Territories with real boundary polygons (Manolo Fortich, Bukidnon) ──────
  // Approximate boundaries for 4 barangays: Dicklum, Manalo, Fortich, Mock
  // Center: ~8.37°N, 124.85°E (Manolo Fortich area)

  const territoriesData = [
    {
      number: 'T-001',
      name: 'Dicklum',
      publisherId: alice.id,
      status: TerritoryStatus.ASSIGNED,
      // Approximate polygon around Dicklum barangay
      boundary: JSON.stringify({
        type: 'Feature',
        properties: { name: 'Dicklum' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [124.8450, 8.3700], [124.8520, 8.3700],
            [124.8520, 8.3760], [124.8450, 8.3760],
            [124.8450, 8.3700],
          ]],
        },
      }),
      // Households scattered within Dicklum boundary
      householdsData: [
        { address: '12 Rizal St', streetName: 'Rizal Street', city: 'Dicklum', lat: '8.3720', lng: '124.8468', status: 'active' },
        { address: '34 Mabini Ave', streetName: 'Mabini Avenue', city: 'Dicklum', lat: '8.3735', lng: '124.8490', status: 'not_home' },
        { address: '56 Quezon Blvd', streetName: 'Quezon Boulevard', city: 'Dicklum', lat: '8.3748', lng: '124.8505', status: 'return_visit' },
        { address: '78 Bonifacio St', streetName: 'Bonifacio Street', city: 'Dicklum', lat: '8.3712', lng: '124.8512', status: 'new' },
        { address: '90 Del Pilar St', streetName: 'Del Pilar Street', city: 'Dicklum', lat: '8.3755', lng: '124.8475', status: 'new' },
      ],
    },
    {
      number: 'T-002',
      name: 'Manalo',
      publisherId: null,
      status: TerritoryStatus.AVAILABLE,
      boundary: JSON.stringify({
        type: 'Feature',
        properties: { name: 'Manalo' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [124.8530, 8.3700], [124.8600, 8.3700],
            [124.8600, 8.3760], [124.8530, 8.3760],
            [124.8530, 8.3700],
          ]],
        },
      }),
      householdsData: [
        { address: '15 Luna St', streetName: 'Luna Street', city: 'Manalo', lat: '8.3715', lng: '124.8548', status: 'new' },
        { address: '27 Aguinaldo Ave', streetName: 'Aguinaldo Avenue', city: 'Manalo', lat: '8.3730', lng: '124.8565', status: 'new' },
        { address: '43 Lapu-Lapu St', streetName: 'Lapu-Lapu Street', city: 'Manalo', lat: '8.3745', lng: '124.8582', status: 'do_not_visit' },
        { address: '61 Burgos St', streetName: 'Burgos Street', city: 'Manalo', lat: '8.3758', lng: '124.8540', status: 'new' },
      ],
    },
    {
      number: 'T-003',
      name: 'Fortich',
      publisherId: null,
      status: TerritoryStatus.AVAILABLE,
      boundary: JSON.stringify({
        type: 'Feature',
        properties: { name: 'Fortich' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [124.8450, 8.3640], [124.8520, 8.3640],
            [124.8520, 8.3700], [124.8450, 8.3700],
            [124.8450, 8.3640],
          ]],
        },
      }),
      householdsData: [
        { address: '8 Magsaysay St', streetName: 'Magsaysay Street', city: 'Fortich', lat: '8.3655', lng: '124.8462', status: 'new' },
        { address: '22 Osmena Ave', streetName: 'Osmena Avenue', city: 'Fortich', lat: '8.3670', lng: '124.8480', status: 'moved' },
        { address: '39 Marcos Blvd', streetName: 'Marcos Boulevard', city: 'Fortich', lat: '8.3685', lng: '124.8498', status: 'new' },
        { address: '55 Recto St', streetName: 'Recto Street', city: 'Fortich', lat: '8.3648', lng: '124.8510', status: 'active' },
        { address: '71 Quirino Ave', streetName: 'Quirino Avenue', city: 'Fortich', lat: '8.3692', lng: '124.8455', status: 'new' },
      ],
    },
    {
      number: 'T-004',
      name: 'Mock',
      publisherId: null,
      status: TerritoryStatus.AVAILABLE,
      boundary: JSON.stringify({
        type: 'Feature',
        properties: { name: 'Mock' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [124.8530, 8.3640], [124.8600, 8.3640],
            [124.8600, 8.3700], [124.8530, 8.3700],
            [124.8530, 8.3640],
          ]],
        },
      }),
      householdsData: [
        { address: '5 Tandang Sora St', streetName: 'Tandang Sora Street', city: 'Mock', lat: '8.3650', lng: '124.8542', status: 'new' },
        { address: '18 Katipunan Ave', streetName: 'Katipunan Avenue', city: 'Mock', lat: '8.3665', lng: '124.8558', status: 'return_visit' },
        { address: '33 Padre Faura St', streetName: 'Padre Faura Street', city: 'Mock', lat: '8.3680', lng: '124.8575', status: 'new' },
        { address: '47 España Blvd', streetName: 'España Boulevard', city: 'Mock', lat: '8.3695', lng: '124.8545', status: 'not_home' },
      ],
    },
  ];

  for (const td of territoriesData) {
    const [existing] = await db
      .select()
      .from(territories)
      .where(
        and(eq(territories.congregationId, congregation.id), eq(territories.number, td.number))
      )
      .limit(1);

    let territory = existing;
    if (!territory) {
      const [t] = await db.insert(territories).values({
        congregationId: congregation.id,
        name: td.name,
        number: td.number,
        publisherId: td.publisherId ?? null,
        boundary: td.boundary,
        householdsCount: td.householdsData.length,
        status: td.status,
      }).returning();
      territory = t;
      console.log(`✅ Created territory: ${td.number} — ${td.name}`);
    }

    // Seed households within this territory
    for (const h of td.householdsData) {
      const [existingH] = await db
        .select({ id: households.id })
        .from(households)
        .where(and(eq(households.address, h.address), eq(households.city, h.city)))
        .limit(1);

      if (!existingH) {
        await db.insert(households).values({
          address: h.address,
          streetName: h.streetName,
          city: h.city,
          latitude: h.lat,
          longitude: h.lng,
          status: h.status,
          createdById: alice.id,
        });
        console.log(`  🏠 ${h.address}, ${h.city}`);
      }
    }
  }

  console.log('\n🌱 Seed complete!');
  console.log('\nTest credentials:');
  console.log('  super_admin: super@example.com / password123');
  console.log('  admin:       admin@example.com / password123');
  console.log('  user:        alice@example.com / password123 (territory_servant)');
  console.log('  user:        bob@example.com   / password123 (member)');
  console.log('  user:        carol@example.com / password123 (member)');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
