import 'reflect-metadata';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { AppDataSource } from './src/lib/data-source';
import { User, UserRole } from './src/entities/User';

// Load environment variables
config({
  path: ['.env.local', '.env'],
});

async function testInsertUser() {
  try {
    console.log('🔌 Initializing AppDataSource...');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('✅ AppDataSource initialized');

    const userRepo = AppDataSource.getRepository(User);
    console.log('✅ Got User repository');

    // Create test user
    const testEmail = `test-${Date.now()}@example.com`;
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);

    console.log(`\n📝 Creating test user: ${testEmail}`);
    const user = userRepo.create({
      email: testEmail,
      password: hashedPassword,
      name: 'Test User',
      role: UserRole.USER,
    });

    const savedUser = await userRepo.save(user);
    console.log('✅ User saved successfully!');
    console.log('\n📊 Created User:');
    console.log({
      id: savedUser.id,
      email: savedUser.email,
      name: savedUser.name,
      role: savedUser.role,
      isActive: savedUser.isActive,
      createdAt: savedUser.createdAt,
    });

    // Verify by querying
    console.log(`\n🔍 Verifying user exists in database...`);
    const found = await userRepo.findOne({ where: { email: testEmail } });
    if (found) {
      console.log('✅ User found in database!');
      console.log({
        id: found.id,
        email: found.email,
        name: found.name,
      });
    } else {
      console.log('❌ User NOT found in database!');
    }

    // Test password comparison
    console.log(`\n🔐 Testing password verification...`);
    const isPasswordValid = await bcrypt.compare('TestPassword123!', savedUser.password);
    if (isPasswordValid) {
      console.log('✅ Password verification works!');
    } else {
      console.log('❌ Password verification failed!');
    }

    console.log('\n✅ All tests passed!');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 AppDataSource destroyed');
    }
  }
}

testInsertUser();
