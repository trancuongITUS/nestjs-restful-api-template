import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditQueryService } from './audit-query.service';
import { AuditController } from './audit.controller';
import { AuditRepository } from './repositories';
import { PrismaModule } from '../database/prisma.module';

/**
 * Audit Module
 * Provides audit logging functionality for the application
 */
@Module({
    imports: [PrismaModule],
    controllers: [AuditController],
    providers: [AuditService, AuditQueryService, AuditRepository],
    exports: [AuditService, AuditQueryService, AuditRepository],
})
export class AuditModule {}
