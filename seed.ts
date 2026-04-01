import 'reflect-metadata';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

config({ path: ['.env.local', '.env'] });

import { AppDataSource } from './src/lib/data-source';
import { User, UserRole } from './src/entities/User';
import { Congregation } from './src/entities/Congregation';
import { CongregationMember, CongregationRole } from './src/entities/CongregationMember';
import { Group } from './src/entities/Group';
import { GroupMember, GroupRole } from './src/entities/GroupMember';
import { Territory } from './src/entities/Territory';
import { TerritoryStatus } from './src/entities/Territory';

async function seed() {
  await AppDataSource.initialize();
  console.log('✅ Database connected');

  const userRepo = AppDataSource.getRepository(User);
  const congregationRepo = AppDataSource.getRepository(Congregation);
  const memberRepo = AppDataSource.getRepository(CongregationMember);
  const groupRepo = AppDataSource.getRepository(Group);
  const groupMemberRepo = AppDataSource.getRepository(GroupMember);
  const territoryRepo = AppDataSource.getRepository(Territory);

  // Create super_admin
  let superAdmin = await userRepo.findOne({ where: { email: 'super@example.com' } });
  if (!superAdmin) {
    superAdmin = userRepo.create({
      email: 'super@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
    });
    await userRepo.save(superAdmin);
    console.log('✅ Created super_admin: super@example.com / password123');
  }

  // Create admin user
  let adminUser = await userRepo.findOne({ where: { email: 'admin@example.com' } });
  if (!adminUser) {
    adminUser = userRepo.create({
      email: 'admin@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Admin User',
      role: UserRole.ADMIN,
    });
    await userRepo.save(adminUser);
    console.log('✅ Created admin: admin@example.com / password123');
  }

  // Create regular users
  const usersData = [
    { email: 'alice@example.com', name: 'Alice Publisher' },
    { email: 'bob@example.com', name: 'Bob Publisher' },
    { email: 'carol@example.com', name: 'Carol Publisher' },
  ];

  const regularUsers: User[] = [];
  for (const ud of usersData) {
    let u = await userRepo.findOne({ where: { email: ud.email } });
    if (!u) {
      u = userRepo.create({
        email: ud.email,
        password: await bcrypt.hash('password123', 10),
        name: ud.name,
        role: UserRole.USER,
      });
      await userRepo.save(u);
      console.log(`✅ Created user: ${ud.email} / password123`);
    }
    regularUsers.push(u);
  }

  // Create test congregation
  let congregation = await congregationRepo.findOne({ where: { slug: 'test-congregation' } });
  if (!congregation) {
    congregation = congregationRepo.create({
      name: 'Test Congregation',
      slug: 'test-congregation',
      city: 'Test City',
      country: 'US',
      createdById: adminUser.id,
    });
    await congregationRepo.save(congregation);
    console.log('✅ Created congregation: Test Congregation');
  }

  // Add admin as service_overseer
  let adminMember = await memberRepo.findOne({
    where: { userId: adminUser.id, congregationId: congregation.id },
  });
  if (!adminMember) {
    adminMember = memberRepo.create({
      userId: adminUser.id,
      congregationId: congregation.id,
      congregationRole: CongregationRole.SERVICE_OVERSEER,
    });
    await memberRepo.save(adminMember);
    console.log('✅ Added admin as service_overseer');
  }

  // Add alice as territory_servant
  const [alice, bob, carol] = regularUsers;
  let aliceMember = await memberRepo.findOne({
    where: { userId: alice.id, congregationId: congregation.id },
  });
  if (!aliceMember) {
    aliceMember = memberRepo.create({
      userId: alice.id,
      congregationId: congregation.id,
      congregationRole: CongregationRole.TERRITORY_SERVANT,
    });
    await memberRepo.save(aliceMember);
    console.log('✅ Added alice as territory_servant');
  }

  // Add bob and carol as regular members
  for (const u of [bob, carol]) {
    const existing = await memberRepo.findOne({
      where: { userId: u.id, congregationId: congregation.id },
    });
    if (!existing) {
      await memberRepo.save(memberRepo.create({ userId: u.id, congregationId: congregation.id }));
      console.log(`✅ Added ${u.name} as congregation member`);
    }
  }

  // Create groups
  let group1 = await groupRepo.findOne({ where: { congregationId: congregation.id, name: 'Group A' } });
  if (!group1) {
    group1 = groupRepo.create({ congregationId: congregation.id, name: 'Group A' });
    await groupRepo.save(group1);
    console.log('✅ Created Group A');
  }

  let group2 = await groupRepo.findOne({ where: { congregationId: congregation.id, name: 'Group B' } });
  if (!group2) {
    group2 = groupRepo.create({ congregationId: congregation.id, name: 'Group B' });
    await groupRepo.save(group2);
    console.log('✅ Created Group B');
  }

  // Add members to groups
  const groupMembersData = [
    { userId: alice.id, groupId: group1.id, groupRole: GroupRole.GROUP_OVERSEER },
    { userId: bob.id, groupId: group1.id, groupRole: GroupRole.MEMBER },
    { userId: carol.id, groupId: group2.id, groupRole: GroupRole.ASSISTANT_OVERSEER },
  ];

  for (const gm of groupMembersData) {
    const existing = await groupMemberRepo.findOne({ where: { userId: gm.userId, groupId: gm.groupId } });
    if (!existing) {
      await groupMemberRepo.save(groupMemberRepo.create(gm));
      console.log(`✅ Added user to group with role ${gm.groupRole}`);
    }
  }

  // Create territories
  const territoriesData = [
    { name: 'Territory 1', number: 'T-001', publisherId: alice.id },
    { name: 'Territory 2', number: 'T-002', groupId: group1.id },
    { name: 'Territory 3', number: 'T-003' },
  ];

  for (const td of territoriesData) {
    const existing = await territoryRepo.findOne({
      where: { congregationId: congregation.id, number: td.number },
    });
    if (!existing) {
      await territoryRepo.save(
        territoryRepo.create({
          congregationId: congregation.id,
          name: td.name,
          number: td.number,
          publisherId: td.publisherId,
          groupId: td.groupId,
          status: td.publisherId || td.groupId ? TerritoryStatus.ASSIGNED : TerritoryStatus.AVAILABLE,
        })
      );
      console.log(`✅ Created ${td.name}`);
    }
  }

  await AppDataSource.destroy();
  console.log('\n🌱 Seed complete!');
  console.log('\nTest credentials:');
  console.log('  super_admin: super@example.com / password123');
  console.log('  admin:       admin@example.com / password123');
  console.log('  user:        alice@example.com / password123 (territory_servant)');
  console.log('  user:        bob@example.com   / password123 (member)');
  console.log('  user:        carol@example.com / password123 (member)');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
