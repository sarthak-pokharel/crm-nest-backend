#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Module } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createTypeOrmConfig } from '../apps/crm/src/typeorm.config.shared';
import { Permissions, getAllPermissionKeys } from '../libs/common/src';
// Register module-specific permissions (side-effect imports)
import '../apps/crm/src/company/company.permissions';
import '../apps/crm/src/leads/leads.permissions';
import '../apps/crm/src/contacts/contacts.permissions';
import '../apps/crm/src/deals/deals.permissions';
import '../apps/crm/src/activities/activities.permissions';
import '../apps/crm/src/tasks/tasks.permissions';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
class AppConfigModule {}

async function seedPermissions() {
  console.log('🌱 Starting permission seeding...\n');

  const app = await NestFactory.createApplicationContext(AppConfigModule, {
    logger: false,
  });

  const config = app.get(ConfigService);
  const dataSource = new DataSource({
    ...createTypeOrmConfig(config),
  });

  await dataSource.initialize();

  try {
    // Get all available permissions from core + manually add module permissions
    const corePermissions = getAllPermissionKeys();
    
    // Add CRM module permissions manually (since registerModulePermissions runs at runtime)
    const modulePermissions = [
      // Organization
      'organization:read', 'organization:create', 'organization:update', 'organization:delete', 'organization:manage_users',
      // Company
      'company:read', 'company:create', 'company:update', 'company:delete',
      // Leads
      'lead:read', 'lead:create', 'lead:update', 'lead:delete', 'lead:assign',
      // Contacts
      'contact:read', 'contact:create', 'contact:update', 'contact:delete',
      // Deals
      'deal:read', 'deal:create', 'deal:update', 'deal:delete', 'deal:approve', 'deal:close',
      // Activities
      'activity:read', 'activity:create', 'activity:update', 'activity:delete',
      // Tasks
      'task:read', 'task:create', 'task:update', 'task:delete', 'task:complete',
    ];
    
    const allPermissions = [...new Set([...corePermissions, ...modulePermissions])];
    console.log(`📋 Found ${allPermissions.length} permission keys (${corePermissions.length} core + ${modulePermissions.length} module)\n`);

    // Create minimal role: superadmin only
    console.log('👥 Creating superadmin role...');
    const role = { name: 'superadmin', description: 'Super Administrator with full global access' };

    const existing = await dataSource.query(
      'SELECT id FROM roles WHERE name = $1',
      [role.name],
    );

    let superadminId: number;

    if (existing.length === 0) {
      const result = await dataSource.query(
        'INSERT INTO roles (name, description, "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
        [role.name, role.description, true],
      );
      superadminId = result[0].id;
      console.log(`  ✓ Created role: ${role.name} (id: ${superadminId})`);
    } else {
      superadminId = existing[0].id;
      console.log(`  ⊙ Role already exists: ${role.name} (id: ${superadminId})`);
    }

    // Assign ALL permissions to superadmin (scope-less, default global)
    console.log('\n🔗 Assigning permissions to superadmin...');
    console.log(`  → Granting all ${allPermissions.length} permissions`);
    
    let assignedCount = 0;
    for (const permKey of allPermissions) {
      const result = await dataSource.query(
        'INSERT INTO role_permissions ("roleId", "permissionKey", "createdAt") VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING RETURNING id',
        [superadminId, permKey],
      );
      if (result.length > 0) assignedCount++;
    }

    console.log(`  ✓ Assigned ${assignedCount} permissions (${allPermissions.length - assignedCount} already existed)`);

    // Create default organization
    console.log('\n🏢 Creating default organization...');
    const defaultOrg = {
      name: 'Default Organization',
      description: 'Default organization for initial setup',
      slug: 'default',
    };

    const existingOrg = await dataSource.query(
      'SELECT id FROM organizations WHERE slug = $1',
      [defaultOrg.slug],
    );

    let orgId: number;

    if (existingOrg.length === 0) {
      const orgResult = await dataSource.query(
        'INSERT INTO organizations (name, description, slug, "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id',
        [defaultOrg.name, defaultOrg.description, defaultOrg.slug, true],
      );
      orgId = orgResult[0].id;
      console.log(`  ✓ Created organization: ${defaultOrg.name} (id: ${orgId})`);
    } else {
      orgId = existingOrg[0].id;
      console.log(`  ⊙ Organization already exists: ${defaultOrg.name} (id: ${orgId})`);
    }

    // Create superadmin user
    console.log('\n👤 Creating superadmin user...');
    const superadminUser = {
      email: 'admin@crm.local',
      firstName: 'Super',
      lastName: 'Admin',
      password: 'Admin@123456',
    };

    try {
      const existingUser = await dataSource.query(
        'SELECT id FROM "user" WHERE email = $1',
        [superadminUser.email],
      );

      let superadminUserId: number;

      if (existingUser.length === 0) {
        const hashedPassword = await bcrypt.hash(superadminUser.password, 10);
        const userResult = await dataSource.query(
          'INSERT INTO "user" (email, "firstName", "lastName", password, "isActive", "organizationId") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [superadminUser.email, superadminUser.firstName, superadminUser.lastName, hashedPassword, true, orgId],
        );
        superadminUserId = userResult[0].id;
        console.log(`  ✓ Created user: ${superadminUser.email} (id: ${superadminUserId})`);
      } else {
        superadminUserId = existingUser[0].id;
        console.log(`  ⊙ User already exists: ${superadminUser.email} (id: ${superadminUserId})`);
      }

      // Assign superadmin role to user
      console.log('\n🔗 Assigning superadmin role to user...');
      const roleAssignResult = await dataSource.query(
        'INSERT INTO user_roles ("userId", "roleId", "createdAt") VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING RETURNING id',
        [superadminUserId, superadminId],
      );

      if (roleAssignResult.length > 0) {
        console.log(`  ✓ Assigned superadmin role to user`);
      } else {
        console.log(`  ⊙ Role assignment already existed`);
      }

      // Assign superadmin role to user in organization context
      console.log('\n🔗 Assigning superadmin role to user in organization...');
      const orgRoleAssignResult = await dataSource.query(
        'INSERT INTO user_organization_roles ("userId", "organizationId", "roleId", "createdAt") VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING RETURNING id',
        [superadminUserId, orgId, superadminId],
      );

      if (orgRoleAssignResult.length > 0) {
        console.log(`  ✓ Assigned superadmin role in organization`);
      } else {
        console.log(`  ⊙ Organization role assignment already existed`);
      }
    } catch (error: any) {
      if (error.code === '42P01' && error.table === undefined) {
        // users table doesn't exist
        console.log(`  ⚠️  Users table not found. Run migrations first:`);
        console.log(`     pnpm run migrate:dev`);
      } else {
        throw error;
      }
    }

    console.log('\n✅ Minimal permission seeding completed!\n');
    console.log('Summary:');
    console.log(`  - Superadmin user created: ${superadminUser.email}`);
    console.log(`  - Password: ${superadminUser.password}`);
    console.log(`  - Superadmin role created with GLOBAL scope`);
    console.log(`  - ${allPermissions.length} permissions available`);
    console.log(`  - To create more users/roles, use the API or add them here\n`);

  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    await app.close();
  }
}

seedPermissions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
