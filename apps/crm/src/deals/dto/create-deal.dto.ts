import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsDateString, MaxLength } from 'class-validator';
import { DealStage, DealPriority } from '../entities/deal.entity';

export class CreateDealDto {
    @IsString()
    @MaxLength(255)
    title: string;

    @IsNumber()
    @Min(0)
    value: number;

    @IsOptional()
    @IsEnum(DealStage)
    stage?: DealStage;

    @IsOptional()
    @IsEnum(DealPriority)
    priority?: DealPriority;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    probability?: number;

    @IsOptional()
    @IsNumber()
    companyId?: number;

    @IsOptional()
    @IsNumber()
    contactId?: number;

    @IsOptional()
    @IsDateString()
    expectedCloseDate?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsNumber()
    assignedToId?: number;
}
