import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity';

/**
 * OrganizationInterceptor
 * 
 * Loads organization entity from database and attaches it to request
 * for use in permission checks (ownership verification).
 * 
 * Single Responsibility: Load and attach the organization resource to the request
 */
@Injectable()
export class OrganizationInterceptor implements NestInterceptor {
    constructor(
        @InjectRepository(Organization)
        private organizationRepository: Repository<Organization>,
    ) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const orgId = request.params.id;

        if (orgId) {
            try {
                const organization = await this.organizationRepository.findOne({
                    where: { id: parseInt(orgId, 10) },
                });
                if (organization) {
                    request.resource = organization;
                }
            } catch {
                // Silently fail - permission guard will deny access if resource is missing
            }
        }

        return next.handle();
    }
}

