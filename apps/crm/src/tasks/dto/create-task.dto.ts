import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsDateString, MaxLength } from 'class-validator';
import { TaskPriority, TaskStatus } from '../entities/task.entity';

export class CreateTaskDto {
    @IsString()
    @MaxLength(255)
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsNumber()
    assignedToId?: number;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    relatedToType?: string;

    @IsOptional()
    @IsNumber()
    relatedToId?: number;

    @IsOptional()
    @IsBoolean()
    isReminder?: boolean;

    @IsOptional()
    @IsDateString()
    reminderDate?: string;
}
