import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { Deal } from './entities/deal.entity';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Deal]),
        PermissionsModule,
    ],
    controllers: [DealsController],
    providers: [DealsService],
    exports: [DealsService],
})
export class DealsModule {}
