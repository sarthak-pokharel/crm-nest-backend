import { IsString, IsEmail, IsOptional, IsNumber, IsBoolean, MaxLength, IsUrl } from 'class-validator';

export class CreateCompanyDto {
    @IsString()
    @MaxLength(255)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    industry?: string;

    @IsOptional()
    @IsUrl()
    website?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    phone?: string;

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
    employeeCount?: number;

    @IsOptional()
    @IsNumber()
    annualRevenue?: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
