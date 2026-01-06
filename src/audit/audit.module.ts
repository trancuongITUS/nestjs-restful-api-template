import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditQueryService } from './audit-query.service';
import { AuditController } from './audit.controller';
import { AuditRepository } from './repositories';
import { AuditEventListener } from './listeners';
import { PrismaModule } from '../database/prisma.module';

/**
 * Audit Module
 * Provides audit logging functionality for the application
 * Uses EventEmitter2 for async processing (configured in AppModule)
 */
@Module({
    imports: [PrismaModule],
    controllers: [AuditController],
    providers: [
        AuditService,
        AuditQueryService,
        AuditRepository,
        AuditEventListener,
    ],
    exports: [AuditService, AuditQueryService, AuditRepository],
})
export class AuditModule {}
