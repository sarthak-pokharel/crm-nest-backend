import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsDateString, MaxLength } from 'class-validator';
import { ActivityType, ActivityRelationType } from '../entities/activity.entity';

export class CreateActivityDto {
    @IsEnum(ActivityType)
    type: ActivityType;

    @IsString()
    @MaxLength(255)
    subject: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsEnum(ActivityRelationType)
    relationType: ActivityRelationType;

    @IsNumber()
    relationId: number;

    @IsOptional()
    @IsNumber()
    duration?: number;

    @IsOptional()
    @IsDateString()
    activityDate?: string;

    @IsOptional()
    @IsBoolean()
    isCompleted?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    outcome?: string;
}
