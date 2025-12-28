import { Body, Controller, Get, Post, Put, Param, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt/jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../entities/role.entity';
import { RolePermission, PermissionScope } from '../entities/role-permission.entity';
import { IsBoolean, IsOptional, IsString, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CreateRoleDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class RolePermissionDto {
  @IsString()
  permissionKey: string;
}

class UpdateRolePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  permissions: RolePermissionDto[];
}

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  @Get()
  async findAll() {
    return await this.roleRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

   @Post()
   async create(@Body() dto: CreateRoleDto) {
    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description ?? undefined,
      isActive: dto.isActive ?? true,
    });
    return this.roleRepository.save(role);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description ?? undefined;
    if (dto.isActive !== undefined) role.isActive = dto.isActive;

    return this.roleRepository.save(role);
  }

  @Get(':id/permissions')
  async getPermissions(@Param('id', ParseIntPipe) id: number) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    const perms = await this.rolePermissionRepository.find({ where: { roleId: id } });
    return perms.map(p => ({ permissionKey: p.permissionKey }));
  }

  @Put(':id/permissions')
  async updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    const incoming = dto.permissions || [];
    const incomingKeys = incoming.map(p => p.permissionKey);

    // Fetch existing
    const existing = await this.rolePermissionRepository.find({ where: { roleId: id } });
    const existingByKey = new Map(existing.map(p => [p.permissionKey, p]));

    // Upsert incoming
    for (const perm of incoming) {
      const scope = PermissionScope.GLOBAL;
      const current = existingByKey.get(perm.permissionKey);
      if (current) {
        if (current.scope !== scope) {
          current.scope = scope;
          await this.rolePermissionRepository.save(current);
        }
      } else {
        await this.rolePermissionRepository.save(
          this.rolePermissionRepository.create({
            roleId: id,
            permissionKey: perm.permissionKey,
            scope,
          })
        );
      }
    }

    // Remove permissions not in incoming list
    if (incomingKeys.length > 0) {
      const toRemove = existing.filter(e => !incomingKeys.includes(e.permissionKey)).map(e => e.permissionKey);
      if (toRemove.length) {
        await this.rolePermissionRepository.delete({ roleId: id, permissionKey: In(toRemove) });
      }
    } else {
      // If empty list provided, remove all
      await this.rolePermissionRepository.delete({ roleId: id });
    }

    const updated = await this.rolePermissionRepository.find({ where: { roleId: id } });
    return updated.map(p => ({ permissionKey: p.permissionKey }));
  }
}
