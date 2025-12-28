import { IsString, IsEmail, IsOptional, IsEnum, IsNumber, MaxLength, IsUrl } from 'class-validator';
import { LeadStatus, LeadSource } from '../entities/lead.entity';

export class CreateLeadDto {
    @IsString()
    @MaxLength(100)
    firstName: string;

    @IsString()
    @MaxLength(100)
    lastName: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    jobTitle?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    companyName?: string;

    @IsOptional()
    @IsNumber()
    companyId?: number;

    @IsOptional()
    @IsEnum(LeadStatus)
    status?: LeadStatus;

    @IsOptional()
    @IsEnum(LeadSource)
    source?: LeadSource;

    @IsOptional()
    @IsNumber()
    score?: number;

    @IsOptional()
    @IsNumber()
    estimatedValue?: number;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsUrl()
    website?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    state?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    zipCode?: string;

    @IsOptional()
    @IsNumber()
    assignedToId?: number;
}
