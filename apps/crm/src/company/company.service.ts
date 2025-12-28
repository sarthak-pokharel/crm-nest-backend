import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { User } from '../auth/user/user.entity';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';

@Injectable()
export class CompanyService {
    constructor(
        @InjectRepository(Company)
        private companyRepository: Repository<Company>,
        @InjectRepository(UserOrganizationRole)
        private userOrganizationRoleRepository: Repository<UserOrganizationRole>,
    ) {}

    async create(createCompanyDto: CreateCompanyDto, user: User, contextOrgId?: number): Promise<Company> {
        const allowedOrgIds = await this.getUserOrganizationIds(user);
        const organizationId = contextOrgId ?? createCompanyDto.organizationId ?? allowedOrgIds[0];
        if (!organizationId) {
            throw new ForbiddenException('Organization context required');
        }
        if (allowedOrgIds.length > 0 && !allowedOrgIds.includes(organizationId)) {
            throw new ForbiddenException('You do not have access to this organization');
        }
        const company = this.companyRepository.create({
            ...createCompanyDto,
            organizationId,
            createdById: user.id,
        });
        return this.companyRepository.save(company);
    }

    async findAll(user: User, contextOrgId?: number): Promise<Company[]> {
        const allowedOrgIds = await this.getUserOrganizationIds(user);
        if (allowedOrgIds.length === 0) {
            throw new ForbiddenException('Organization context required');
        }
        
        let orgId: number;
        if (contextOrgId) {
            if (!allowedOrgIds.includes(contextOrgId)) {
                throw new ForbiddenException('You do not have access to this organization');
            }
            orgId = contextOrgId;
        } else {
            orgId = allowedOrgIds[0];
        }
        
        return this.companyRepository.find({ where: { organizationId: orgId, isActive: true }, order: { createdAt: 'DESC' } });
    }

async findOne(id: number, user: User, contextOrgId?: number): Promise<Company> {
        const company = await this.companyRepository.findOne({ where: { id } });

        if (!company) {
            throw new NotFoundException(`Company with ID ${id} not found`);
        }

        const allowedOrgIds = await this.getUserOrganizationIds(user);
        if (contextOrgId) {
            if (!allowedOrgIds.includes(contextOrgId)) {
                throw new ForbiddenException('You do not have access to this organization');
            }
            if (company.organizationId !== contextOrgId) {
                throw new NotFoundException(`Company with ID ${id} not found`);
            }
        } else if (allowedOrgIds.length > 0 && !allowedOrgIds.includes(company.organizationId)) {
            throw new ForbiddenException('You do not have access to this company');
        }

        return company;
    }

    async update(id: number, updateCompanyDto: UpdateCompanyDto, user: User, contextOrgId?: number): Promise<Company> {
        const company = await this.findOne(id, user, contextOrgId);

        Object.assign(company, updateCompanyDto);
        return this.companyRepository.save(company);
    }

    async remove(id: number, user: User, contextOrgId?: number): Promise<void> {
        const company = await this.findOne(id, user, contextOrgId);
        company.isActive = false;
        await this.companyRepository.save(company);
    }

    private async getUserOrganizationIds(user: User): Promise<number[]> {
        const ids = new Set<number>();
        if (user.organizationId) ids.add(user.organizationId);
        if (Array.isArray((user as any).userOrganizationRoles)) {
            for (const r of (user as any).userOrganizationRoles) {
                if (r?.organizationId) ids.add(r.organizationId);
            }
        }
        const rows = await this.userOrganizationRoleRepository.find({ where: { userId: user.id }, select: ['organizationId'] });
        for (const row of rows) {
            if (row.organizationId) ids.add(row.organizationId);
        }
        return Array.from(ids);
    }
}
