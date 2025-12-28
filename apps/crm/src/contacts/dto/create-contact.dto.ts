import { IsString, IsEmail, IsOptional, IsBoolean, IsNumber, MaxLength, IsDateString, IsUrl } from 'class-validator';

export class CreateContactDto {
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
    @MaxLength(50)
    mobile?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    jobTitle?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    department?: string;

    @IsOptional()
    @IsNumber()
    companyId?: number;

    @IsOptional()
    @IsUrl()
    linkedInUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    twitterHandle?: string;

    @IsOptional()
    @IsString()
    notes?: string;

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
    @IsDateString()
    birthday?: string;

    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
