import 'dotenv/config';
import { PrismaClient } from 'src/database/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { buildDatabaseUrl } from '../../common/utils/build-database-url';

function createPrismaClient() {
  const connectionString = buildDatabaseUrl();
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const permissionNames = [
  // User
  'user.create',
  'user.read',
  'user.update',
  'user.delete',
  // Role
  'role.create',
  'role.read',
  'role.update',
  'role.delete',
  // Todo
  'todo.create',
  'todo.read',
  'todo.update',
  'todo.delete',
];

async function seed() {
  console.log('🌱 Starting database seeding...');
  const prisma = createPrismaClient();

  try {
    // Seed permissions
    const permissions: any[] = [];
    for (const name of permissionNames) {
      let permission = await prisma.permission.findUnique({
        where: { name },
      });
      if (!permission) {
        permission = await prisma.permission.create({ data: { name } });
      }
      permissions.push(permission);
    }

    // Seed admin role (system-level)
    let adminRole = await prisma.role.findFirst({
      where: { name: 'admin' },
    });
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: { name: 'admin' },
      });
    }

    // Link permissions to role
    for (const permission of permissions) {
      const exists = await prisma.rolePermission.findFirst({
        where: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });
      if (!exists) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        });
      }
    }

    // Seed admin user
    const adminEmail = 'admin@example.com';
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          username: 'System Administrator',
          password: hashedPassword,
          roleId: adminRole.id,
        },
      });
      console.log(`👤 Created default user: ${adminEmail}`);
    }

    console.log('✅ Admin role and all permissions seeded!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .then(() => {
    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  });
