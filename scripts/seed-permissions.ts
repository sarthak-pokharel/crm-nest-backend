#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Module } from '@nestjs/common';
import { createTypeOrmConfig } from '../apps/crm/src/typeorm.config.shared';
import { Permissions, getAllPermissionKeys, PermissionScope } from '../libs/common/src';

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
    // Get all available permissions
    const allPermissions = getAllPermissionKeys();
    console.log(`📋 Found ${allPermissions.length} permission keys from constants\n`);

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

    // Assign ALL permissions to superadmin with GLOBAL scope
    console.log('\n🔗 Assigning permissions to superadmin...');
    console.log(`  → Granting GLOBAL scope on all ${allPermissions.length} permissions`);
    
    let assignedCount = 0;
    for (const permKey of allPermissions) {
      const result = await dataSource.query(
        'INSERT INTO role_permissions ("roleId", "permissionKey", scope, "createdAt") VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING RETURNING id',
        [superadminId, permKey, PermissionScope.GLOBAL],
      );
      if (result.length > 0) assignedCount++;
    }

    console.log(`  ✓ Assigned ${assignedCount} permissions (${allPermissions.length - assignedCount} already existed)`);

    console.log('\n✅ Minimal permission seeding completed!\n');
    console.log('Summary:');
    console.log(`  - Superadmin role created with GLOBAL scope`);
    console.log(`  - ${allPermissions.length} permissions available`);
    console.log(`  - To create more roles, use the API or add them here\n`);

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
