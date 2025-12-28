import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { PermissionGuard } from '../../permissions/guards/permission.guard';
import { GetUser } from '../user/user.decorator';
import { User } from '../user/user.entity';
import { Permission } from '../../permissions/decorators/permission.decorator';
import { OR, Owner, Permissions } from '@libs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './organization.dto';
import { Organization } from './organization.entity';
import { OrganizationInterceptor } from './organization.interceptor';

/**
 * OrganizationController
 *
 * REST API endpoints for organization management.
 * 
 * Features:
 * - CRUD operations on organizations
 * - User-organization role management
 * - Ownership-based permission checks (creator has full access)
 * 
 * Security:
 * - All endpoints require JWT authentication
 * - Permission-based authorization
 * - Interceptor loads resource for ownership verification
 */
@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(OrganizationInterceptor)
export class OrganizationController {
    constructor(private readonly organizationService: OrganizationService) { }

    /** Create a new organization */
    @Post()
    @Permission(Permissions.Organization.CREATE)
    async create(
        @Body() createDto: CreateOrganizationDto,
        @GetUser() user: User,
    ): Promise<Organization> {
        return await this.organizationService.create(createDto, user.id);
    }

    /**
     * Get all organizations
     * 
     * Requires READ permission or superadmin role.
     * Lists all organizations in the system.
     * 
     * @returns {Promise<Organization[]>} Array of all organizations
     */
    @Get()
    @Permission(Permissions.Organization.READ)
    async findAll(): Promise<Organization[]> {
        return await this.organizationService.findAll();
    }

    /**
     * Get organization by ID
     * 
     * Requires READ permission, or creator (Owner) has full access.
     * The OrganizationInterceptor loads the resource for ownership verification.
     * 
     * @param {string} id - Organization ID
     * @returns {Promise<Organization>} Organization entity
     */
    @Get(':id')
    @Permission(OR(Owner, Permissions.Organization.READ))
    async findOne(@Param('id') id: string): Promise<Organization> {
        return await this.organizationService.findOne(+id);
    }

    /**
     * Get organization statistics
     * 
     * Returns member count, role count, and other metadata.
     * Requires READ or MANAGE_USERS permission.
     * 
     * @param {string} id - Organization ID
     * @returns {Promise} Organization statistics
     */
    @Get(':id/stats')
    @Permission(OR(Owner, Permissions.Organization.READ))
    async getStats(@Param('id') id: string) {
        return await this.organizationService.getOrganizationStats(+id);
    }

    /**
     * Get organization by slug
     * 
     * Requires READ permission, or creator (Owner) has full access.
     * Slug is a unique identifier derived from organization name.
     * 
     * @param {string} slug - Organization slug
     * @returns {Promise<Organization>} Organization entity
     */
    @Get('slug/:slug')
    @Permission(OR(Owner, Permissions.Organization.READ))
    async findBySlug(@Param('slug') slug: string): Promise<Organization> {
        return await this.organizationService.findBySlug(slug);
    }

    /**
     * Update organization
     * 
     * Requires UPDATE permission, or creator (Owner) has full access.
     * Supports partial updates via UpdateOrganizationDto.
     * 
     * @param {string} id - Organization ID
     * @param {UpdateOrganizationDto} updateDto - Organization update data
     * @returns {Promise<Organization>} Updated organization entity
     */
    @Put(':id')
    @Permission(OR(Owner, Permissions.Organization.UPDATE))
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateOrganizationDto,
    ): Promise<Organization> {
        return await this.organizationService.update(+id, updateDto);
    }

    /**
     * Delete organization
     * 
     * Requires DELETE permission, or creator (Owner) has full access.
     * This soft-deletes the organization and cascades to related entities.
     * 
     * @param {string} id - Organization ID
     * @returns {Promise<void>}
     */
    @Delete(':id')
    @Permission(OR(Owner, Permissions.Organization.DELETE))
    async remove(@Param('id') id: string): Promise<void> {
        return await this.organizationService.remove(+id);
    }

    /**
     * Get all users assigned to organization
     * 
     * Requires MANAGE_USERS permission, or creator (Owner) has full access.
     * Returns users with their assigned roles in this organization.
     * 
     * @param {string} id - Organization ID
     * @returns {Promise} Array of users with their roles
     */
    @Get(':id/users')
    @Permission(OR(Owner, Permissions.Organization.MANAGE_USERS))
    async getOrganizationUsers(@Param('id') id: string) {
        return await this.organizationService.getOrganizationUsers(+id);
    }

    /**
     * Assign user to organization with role
     * 
     * Requires MANAGE_USERS permission, or creator (Owner) has full access.
     * Establishes a user-organization-role relationship.
     * 
     * @param {string} id - Organization ID
     * @param {Object} body - Assignment data
     * @param {number} body.userId - User ID to assign
     * @param {number} body.roleId - Role ID to assign
     * @returns {Promise} Created user-organization-role relationship
     */
    @Post(':id/users')
    @Permission(OR(Owner, Permissions.Organization.MANAGE_USERS))
    async assignUser(
        @Param('id') id: string,
        @Body() body: { userId: number; roleId: number },
    ) {
        return await this.organizationService.assignUser(+id, body.userId, body.roleId);
    }

    /**
     * Remove user from organization
     * 
     * Requires MANAGE_USERS permission, or creator (Owner) has full access.
     * Deletes the user-organization-role relationship.
     * 
     * @param {string} id - Organization ID
     * @param {string} userId - User ID to remove
     * @returns {Promise} Removal result
     */
    @Delete(':id/users/:userId')
    @Permission(OR(Owner, Permissions.Organization.MANAGE_USERS))
    async unassignUser(
        @Param('id') id: string,
        @Param('userId') userId: string,
    ) {
        return await this.organizationService.unassignUser(+id, +userId);
    }

    /**
     * Update user role in organization
     * 
     * Requires MANAGE_USERS permission, or creator (Owner) has full access.
     * Updates the role assigned to a user in the organization.
     * 
     * @param {string} id - Organization ID
     * @param {string} userId - User ID to update
     * @param {Object} body - Update data
     * @param {number} body.roleId - New role ID
     * @returns {Promise} Updated user-organization-role relationship
     */
    @Patch(':id/users/:userId')
    @Permission(OR(Owner, Permissions.Organization.MANAGE_USERS))
    async updateUserRole(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Body() body: { roleId: number },
    ) {
        return await this.organizationService.assignUser(+id, +userId, body.roleId);
    }
}
