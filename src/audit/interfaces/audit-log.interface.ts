import { AuditAction, AuditResource } from '../enums';

/**
 * Audit Log Interface
 * Matches Prisma AuditLog model
 */
export interface IAuditLog {
    id: string;
    timestamp: Date;

    // User context
    userId?: string | null;
    username?: string | null;
    userRole?: string | null;

    // Request context
    action: AuditAction;
    resource: AuditResource;
    resourceId?: string | null;
    method: string;
    endpoint: string;

    // Metadata
    ipAddress?: string | null;
    userAgent?: string | null;
    sessionId?: string | null;
    requestId?: string | null;

    // Change tracking
    changesBefore?: any;
    changesAfter?: any;
    metadata?: any;

    // Compliance
    statusCode: number;
    errorMessage?: string | null;

    // Audit trail
    createdAt: Date;
}
