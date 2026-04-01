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
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, ud.email))
      .limit(1);

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

  // Territories
  const territoriesData = [
    { name: 'Territory 1', number: 'T-001', publisherId: alice.id, groupId: undefined },
    { name: 'Territory 2', number: 'T-002', publisherId: undefined, groupId: group1.id },
    { name: 'Territory 3', number: 'T-003', publisherId: undefined, groupId: undefined },
  ];

  for (const td of territoriesData) {
    const [existing] = await db
      .select()
      .from(territories)
      .where(
        and(
          eq(territories.congregationId, congregation.id),
          eq(territories.number, td.number)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(territories).values({
        congregationId: congregation.id,
        name: td.name,
        number: td.number,
        publisherId: td.publisherId ?? null,
        groupId: td.groupId ?? null,
        status:
          td.publisherId || td.groupId ? TerritoryStatus.ASSIGNED : TerritoryStatus.AVAILABLE,
      });
      console.log(`✅ Created ${td.name}`);
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
