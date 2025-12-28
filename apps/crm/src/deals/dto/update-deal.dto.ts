import { PartialType } from '@nestjs/mapped-types';
import { CreateDealDto } from './create-deal.dto';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateDealDto extends PartialType(CreateDealDto) {
    @IsOptional()
    @IsDateString()
    actualCloseDate?: string;

    @IsOptional()
    @IsString()
    lostReason?: string;
}
