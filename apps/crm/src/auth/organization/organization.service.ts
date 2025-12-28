import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organization } from './organization.entity';
import { UserOrganizationRole } from './user-organization-role.entity';
import { CreateOrganizationDto, UpdateOrganizationDto } from './organization.dto';

/**
 * OrganizationService
 * 
 * Manages organization lifecycle and user-organization role assignments.
 * 
 * Responsibilities:
 * 1. CRUD operations for organizations
 * 2. User-organization role management
 * 
 * Follows SOLID:
 * - Single Responsibility: Focused on organization and org-role management
 * - Dependency Inversion: Uses repositories and DataSource, not direct DB access
 * - Open/Closed: Can be extended with new methods without modifying existing ones
 */
@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganizationRole)
    private readonly userOrgRoleRepository: Repository<UserOrganizationRole>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Generate URL-friendly slug from text
   * Converts text to lowercase and replaces spaces with hyphens
   * @param text Text to convert to slug
   * @returns URL-friendly slug
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  }

  /**
   * Create a new organization
   * @param createDto Organization creation data
   * @param userId User ID of the creator (sets ownership for Owner scope)
   * @returns Created organization
   */
  async create(createDto: CreateOrganizationDto, userId: number): Promise<Organization> {
    // Generate slug from name if not provided
    if (!createDto.slug) {
      createDto.slug = this.generateSlug(createDto.name);
    }

    // Check if slug is unique
    const existing = await this.organizationRepository.findOne({
      where: { slug: createDto.slug },
    });

    if (existing) {
      throw new ConflictException('Organization slug already exists');
    }

    const organization = this.organizationRepository.create({
      ...createDto,
      createdById: userId,
    });
    return await this.organizationRepository.save(organization);
  }

  /** Get all active organizations, ordered by creation date (newest first) */
  async findAll(): Promise<Organization[]> {
    return await this.organizationRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find organization by ID
   * @param id Organization ID
   * @throws NotFoundException if organization not found
   */
  async findOne(id: number): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  /**
   * Find organization by slug
   * @param slug Organization slug (URL-friendly name)
   * @throws NotFoundException if organization not found
   */
  async findBySlug(slug: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { slug },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  /**
   * Update organization
   * @param id Organization ID
   * @param updateDto Partial update data
   * @throws ConflictException if new slug already exists
   */
  async update(id: number, updateDto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOne(id);

    // If slug is being updated, check uniqueness
    if (updateDto.slug && updateDto.slug !== organization.slug) {
      const existing = await this.organizationRepository.findOne({
        where: { slug: updateDto.slug },
      });

      if (existing) {
        throw new ConflictException('Organization slug already exists');
      }
    }

    Object.assign(organization, updateDto);
    return await this.organizationRepository.save(organization);
  }

  /** Delete organization by ID */
  async remove(id: number): Promise<void> {
    const organization = await this.findOne(id);
    await this.organizationRepository.remove(organization);
  }

  /**
   * Get organization statistics and metadata
   * @param organizationId Organization ID
   */
  async getOrganizationStats(organizationId: number) {
    const organization = await this.findOne(organizationId);
    
    const userCount = await this.dataSource.query(
      'SELECT COUNT(DISTINCT "userId") as count FROM user_organization_roles WHERE "organizationId" = $1',
      [organizationId],
    );

    const roleCount = await this.dataSource.query(
      'SELECT COUNT(DISTINCT "roleId") as count FROM user_organization_roles WHERE "organizationId" = $1',
      [organizationId],
    );

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      isActive: organization.isActive,
      memberCount: parseInt(userCount[0].count),
      uniqueRolesCount: parseInt(roleCount[0].count),
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      createdById: organization.createdById,
    };
  }

  /**
   * Get all users assigned to an organization with their roles
   * @param organizationId Organization ID
   */
  async getOrganizationUsers(organizationId: number) {
    const users = await this.dataSource.query(
      `SELECT 
        u.id,
        u."firstName",
        u."lastName",
        u.email,
        r.id as "roleId",
        r.name as "roleName",
        uor."createdAt" as "assignedAt"
      FROM user_organization_roles uor
      JOIN "user" u ON uor."userId" = u.id
      JOIN roles r ON uor."roleId" = r.id
      WHERE uor."organizationId" = $1
      ORDER BY u."firstName", u."lastName"`,
      [organizationId],
    );
    return users;
  }

  /**
   * Assign or update a user's role in an organization
   * @param organizationId Organization ID
   * @param userId User ID
   * @param roleId Role ID to assign
   */
  async assignUser(organizationId: number, userId: number, roleId: number) {
    // Check if already assigned
    const existing = await this.userOrgRoleRepository.findOne({
      where: { organizationId, userId },
    });

    if (existing) {
      // Update role if already assigned
      existing.roleId = roleId;
      return await this.userOrgRoleRepository.save(existing);
    }

    const assignment = this.userOrgRoleRepository.create({
      organizationId,
      userId,
      roleId,
    });

    return await this.userOrgRoleRepository.save(assignment);
  }

  /**
   * Remove a user from an organization
   * @param organizationId Organization ID
   * @param userId User ID
   * @throws NotFoundException if assignment not found
   */
  async unassignUser(organizationId: number, userId: number) {
    const assignment = await this.userOrgRoleRepository.findOne({
      where: { organizationId, userId },
    });

    if (!assignment) {
      throw new NotFoundException('User assignment not found');
    }

    await this.userOrgRoleRepository.remove(assignment);
    return { success: true };
  }
}
