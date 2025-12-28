import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { User } from '../auth/user/user.entity';

@Injectable()
export class CompanyService {
    constructor(
        @InjectRepository(Company)
        private companyRepository: Repository<Company>,
    ) {}

    async create(createCompanyDto: CreateCompanyDto, user: User): Promise<Company> {
        const company = this.companyRepository.create({
            ...createCompanyDto,
            ownerId: user.id,
        });
        return this.companyRepository.save(company);
    }

    async findAll(user: User): Promise<Company[]> {
        // Filter based on user's company scope if they have one
        const where = user.companyId ? { id: user.companyId } : {};
        return this.companyRepository.find({ where, order: { createdAt: 'DESC' } });
    }

    async findOne(id: number, user: User): Promise<Company> {
        const company = await this.companyRepository.findOne({ where: { id } });
        
        if (!company) {
            throw new NotFoundException(`Company with ID ${id} not found`);
        }

        // Check scope - if user has companyId, they can only see their own company
        if (user.companyId && company.id !== user.companyId) {
            throw new ForbiddenException('You do not have access to this company');
        }

        return company;
    }

    async update(id: number, updateCompanyDto: UpdateCompanyDto, user: User): Promise<Company> {
        const company = await this.findOne(id, user);

        // Additional ownership check
        if (company.ownerId !== user.id && user.companyId) {
            throw new ForbiddenException('You do not have permission to update this company');
        }

        Object.assign(company, updateCompanyDto);
        return this.companyRepository.save(company);
    }

    async remove(id: number, user: User): Promise<void> {
        const company = await this.findOne(id, user);

        // Additional ownership check
        if (company.ownerId !== user.id && user.companyId) {
            throw new ForbiddenException('You do not have permission to delete this company');
        }

        await this.companyRepository.softDelete(id);
    }
}
