import { AuditAction, AuditResource } from '../enums';

/**
 * Audit Event Interface
 * Represents an audit event emitted through EventEmitter
 */
export interface IAuditEvent {
    // User context
    userId?: string;
    username?: string;
    userRole?: string;

    // Request context
    action: AuditAction;
    resource: AuditResource;
    resourceId?: string;
    method: string;
    endpoint: string;

    // Metadata
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;

    // Change tracking
    changesBefore?: any;
    changesAfter?: any;
    metadata?: any;

    // Compliance
    statusCode: number;
    errorMessage?: string;
}
