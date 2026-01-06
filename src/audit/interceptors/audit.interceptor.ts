import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction, AuditResource } from '@prisma/client';
import { IAuditEvent } from '../interfaces';

/**
 * Global Audit Interceptor
 * Captures HTTP requests and emits audit events
 * Performance: <1ms overhead (non-blocking event emission)
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditInterceptor.name);

    constructor(private readonly eventEmitter: EventEmitter2) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        // Skip GET, HEAD, OPTIONS (read-only operations)
        if (!this.shouldAudit(request)) {
            return next.handle();
        }

        // Capture request timestamp for performance tracking
        const startTime = Date.now();

        // Capture request metadata
        const auditEvent: Partial<IAuditEvent> = {
            method: request.method,
            endpoint: request.url,
            ipAddress: this.getClientIp(request),
            userAgent: request.headers['user-agent'],
            requestId: request.headers['x-request-id'] as string,
            userId: (request.user as any)?.id,
            username: (request.user as any)?.username,
            userRole: (request.user as any)?.role,
            sessionId: this.getSessionId(request),
            changesBefore: this.extractBefore(request),
            metadata: {
                headers: this.sanitizeHeaders(request.headers),
                query: request.query,
                params: request.params,
            },
        };

        return next.handle().pipe(
            tap((data) => {
                // Capture response data and complete audit event
                const completeEvent: IAuditEvent = {
                    ...auditEvent,
                    changesAfter: this.extractAfter(data, request),
                    statusCode: response.statusCode,
                    action: this.determineAction(request),
                    resource: this.determineResource(request),
                    resourceId: this.extractResourceId(request, data),
                } as IAuditEvent;

                // Emit event (non-blocking)
                this.emitAuditEvent(completeEvent);

                // Log performance
                const duration = Date.now() - startTime;
                if (duration > 5) {
                    this.logger.warn(
                        `Audit interceptor took ${duration}ms for ${request.method} ${request.url}`,
                    );
                }
            }),
            catchError((error) => {
                // Log errors - complete audit event
                const errorEvent: IAuditEvent = {
                    ...auditEvent,
                    statusCode: error.status || 500,
                    errorMessage: error.message,
                    action: this.determineAction(request),
                    resource: this.determineResource(request),
                } as IAuditEvent;

                this.emitAuditEvent(errorEvent);
                return throwError(() => error);
            }),
        );
    }

    /**
     * Determine if request should be audited
     * Only audit mutations (POST, PUT, PATCH, DELETE)
     */
    private shouldAudit(request: Request): boolean {
        const method = request.method.toUpperCase();
        // Audit mutations only
        return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    }

    /**
     * Determine audit action from request
     */
    private determineAction(request: Request): AuditAction {
        const method = request.method.toUpperCase();
        const path = request.url.toLowerCase();

        // Authentication actions
        if (path.includes('/auth/login')) return AuditAction.LOGIN;
        if (path.includes('/auth/logout')) return AuditAction.LOGOUT;
        if (path.includes('/auth/refresh')) return AuditAction.REFRESH_TOKEN;
        if (path.includes('/auth/register')) return AuditAction.REGISTER;
        if (path.includes('/auth/change-password'))
            return AuditAction.CHANGE_PASSWORD;

        // Administrative actions
        if (path.includes('/role')) return AuditAction.ROLE_CHANGE;
        if (path.includes('/permission')) return AuditAction.PERMISSION_CHANGE;
        if (path.includes('/activate')) return AuditAction.USER_ACTIVATE;
        if (path.includes('/deactivate')) return AuditAction.USER_DEACTIVATE;
        if (path.includes('/session') && method === 'DELETE')
            return AuditAction.SESSION_REVOKE;

        // CRUD actions
        if (method === 'POST') return AuditAction.CREATE;
        if (method === 'PUT' || method === 'PATCH') return AuditAction.UPDATE;
        if (method === 'DELETE') return AuditAction.DELETE;

        return AuditAction.SYSTEM_EVENT;
    }

    /**
     * Determine audit resource from request
     */
    private determineResource(request: Request): AuditResource {
        const path = request.url.toLowerCase();

        // Authentication
        if (path.includes('/auth')) return AuditResource.AUTH;
        if (path.includes('/session')) return AuditResource.USER_SESSION;

        // User management
        if (path.includes('/user')) return AuditResource.USER;
        if (path.includes('/role')) return AuditResource.ROLE;
        if (path.includes('/permission')) return AuditResource.PERMISSION;

        // HRM resources
        if (path.includes('/department')) return AuditResource.DEPARTMENT;
        if (path.includes('/position')) return AuditResource.POSITION;
        if (path.includes('/salary')) return AuditResource.SALARY;
        if (path.includes('/employee')) return AuditResource.EMPLOYEE;

        // System
        if (path.includes('/config')) return AuditResource.CONFIG;

        return AuditResource.SYSTEM;
    }

    /**
     * Extract resource ID from request or response
     */
    private extractResourceId(
        request: Request,
        data: any,
    ): string | undefined {
        // Check params first (e.g., /users/:id)
        if (request.params?.id) return request.params.id;

        // Check response data (e.g., newly created resource)
        if (data?.id) return data.id;
        if (data?.data?.id) return data.data.id;

        return undefined;
    }

    /**
     * Extract "before" state from request
     * For UPDATE/DELETE, capture request body
     */
    private extractBefore(request: Request): any {
        // For UPDATE/DELETE, capture request body as "before" state
        if (['PUT', 'PATCH', 'DELETE'].includes(request.method)) {
            return request.body || null;
        }
        return null;
    }

    /**
     * Extract "after" state from response
     * For CREATE/UPDATE, capture response data
     */
    private extractAfter(data: any, request: Request): any {
        // For CREATE/UPDATE, capture response data as "after" state
        if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
            return data || null;
        }
        return null;
    }

    /**
     * Get client IP address (handles proxies)
     */
    private getClientIp(request: Request): string {
        return (
            (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            (request.headers['x-real-ip'] as string) ||
            request.ip ||
            request.socket.remoteAddress ||
            'unknown'
        );
    }

    /**
     * Get session ID from request
     */
    private getSessionId(request: Request): string | undefined {
        // Extract session ID from JWT or session cookie
        const user = request.user as any;
        return user?.sessionId;
    }

    /**
     * Sanitize headers (remove sensitive data)
     */
    private sanitizeHeaders(headers: any): any {
        const sanitized = { ...headers };
        // Remove sensitive headers
        delete sanitized.authorization;
        delete sanitized.cookie;
        delete sanitized['x-api-key'];
        delete sanitized['x-auth-token'];
        return sanitized;
    }

    /**
     * Emit audit event (non-blocking)
     */
    private emitAuditEvent(event: IAuditEvent): void {
        try {
            this.eventEmitter.emit('audit.log', event);
        } catch (error) {
            this.logger.error(
                `Failed to emit audit event: ${error.message}`,
                error.stack,
            );
            // Don't throw - audit logging should not break application
        }
    }
}
