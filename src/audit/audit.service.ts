import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditRepository } from './repositories';
import { IAuditEvent } from './interfaces';

/**
 * Audit Service
 * Handles business logic for audit logging
 */
@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly auditRepository: AuditRepository) {}

    /**
     * Create audit log from event
     * This method is called by the event listener
     */
    async createAuditLog(event: IAuditEvent): Promise<void> {
        try {
            const auditLogData: Prisma.AuditLogCreateInput = {
                userId: event.userId,
                username: event.username,
                userRole: event.userRole,
                action: event.action,
                resource: event.resource,
                resourceId: event.resourceId,
                method: event.method,
                endpoint: event.endpoint,
                ipAddress: event.ipAddress,
                userAgent: event.userAgent,
                sessionId: event.sessionId,
                requestId: event.requestId,
                changesBefore: event.changesBefore || null,
                changesAfter: event.changesAfter || null,
                metadata: event.metadata || null,
                statusCode: event.statusCode,
                errorMessage: event.errorMessage,
            };

            await this.auditRepository.create(auditLogData);

            this.logger.debug(
                `Audit log created: ${event.action} on ${event.resource}`,
                { userId: event.userId, action: event.action },
            );
        } catch (error) {
            this.logger.error(
                `Failed to create audit log: ${error.message}`,
                error.stack,
            );
            // Don't throw - audit logging should not break application
        }
    }
}
