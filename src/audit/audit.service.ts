import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { AuditRepository } from './repositories';
import { IAuditEvent } from './interfaces';
import { SensitiveDataMasker } from './utils';

/**
 * Audit Service
 * Handles business logic for audit logging
 * Uses EventEmitter2 for async processing
 */
@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        private readonly auditRepository: AuditRepository,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Emit audit event (fire-and-forget)
     * This method should be called by interceptors/guards
     * Returns immediately to avoid blocking the request
     */
    emitAuditEvent(event: IAuditEvent): void {
        try {
            // Mask sensitive data before emitting
            const maskedEvent = this.maskSensitiveData(event);

            // Emit event asynchronously (handled by AuditEventListener)
            this.eventEmitter.emit('audit.log', maskedEvent);

            this.logger.debug(
                `Audit event emitted: ${event.action} on ${event.resource}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to emit audit event: ${error.message}`,
                error.stack,
            );
            // Don't throw - audit logging should not break application
        }
    }

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

    /**
     * Mask sensitive data in audit event
     * @param event - Audit event to mask
     * @returns Masked audit event
     */
    private maskSensitiveData(event: IAuditEvent): IAuditEvent {
        return {
            ...event,
            changesBefore: event.changesBefore
                ? SensitiveDataMasker.maskSensitiveData(event.changesBefore)
                : undefined,
            changesAfter: event.changesAfter
                ? SensitiveDataMasker.maskSensitiveData(event.changesAfter)
                : undefined,
            metadata: event.metadata
                ? SensitiveDataMasker.maskSensitiveData(event.metadata)
                : undefined,
        };
    }
}
