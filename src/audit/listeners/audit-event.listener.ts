import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditService } from '../audit.service';
import { IAuditEvent } from '../interfaces';

/**
 * Audit Event Listener
 * Listens for 'audit.log' events and persists them to database
 * Runs asynchronously to avoid blocking the request flow
 */
@Injectable()
export class AuditEventListener {
    private readonly logger = new Logger(AuditEventListener.name);

    constructor(private readonly auditService: AuditService) {}

    /**
     * Handle audit log events
     * This runs asynchronously after the event is emitted
     * @param event - Audit event payload
     */
    @OnEvent('audit.log', { async: true })
    async handleAuditLog(event: IAuditEvent): Promise<void> {
        try {
            this.logger.debug(
                `Processing audit event: ${event.action} on ${event.resource}`,
                {
                    userId: event.userId,
                    action: event.action,
                    resource: event.resource,
                    requestId: event.requestId,
                },
            );

            // Persist to database
            await this.auditService.createAuditLog(event);

            this.logger.debug(
                `Audit event processed successfully: ${event.action} on ${event.resource}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to process audit event: ${error.message}`,
                {
                    error: error.stack,
                    event: {
                        action: event.action,
                        resource: event.resource,
                        userId: event.userId,
                        requestId: event.requestId,
                    },
                },
            );
            // Don't throw - audit logging should not break application
        }
    }
}
