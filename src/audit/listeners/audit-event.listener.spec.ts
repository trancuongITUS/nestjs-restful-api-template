import { Test, TestingModule } from '@nestjs/testing';
import { AuditEventListener } from './audit-event.listener';
import { AuditService } from '../audit.service';
import { AuditAction, AuditResource } from '@prisma/client';
import { IAuditEvent } from '../interfaces';

describe('AuditEventListener', () => {
    let listener: AuditEventListener;
    let auditService: AuditService;

    const mockAuditService = {
        createAuditLog: jest.fn(),
        emitAuditEvent: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditEventListener,
                {
                    provide: AuditService,
                    useValue: mockAuditService,
                },
            ],
        }).compile();

        listener = module.get<AuditEventListener>(AuditEventListener);
        auditService = module.get<AuditService>(AuditService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(listener).toBeDefined();
    });

    describe('handleAuditLog', () => {
        it('should call auditService.createAuditLog with event', async () => {
            const event: IAuditEvent = {
                action: AuditAction.LOGIN,
                resource: AuditResource.AUTH,
                method: 'POST',
                endpoint: '/auth/login',
                statusCode: 200,
                userId: 'user-123',
                username: 'john.doe',
            };

            mockAuditService.createAuditLog.mockResolvedValue(undefined);

            await listener.handleAuditLog(event);

            expect(mockAuditService.createAuditLog).toHaveBeenCalledTimes(1);
            expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(event);
        });

        it('should handle authentication events', async () => {
            const event: IAuditEvent = {
                action: AuditAction.LOGIN,
                resource: AuditResource.AUTH,
                method: 'POST',
                endpoint: '/auth/login',
                statusCode: 200,
                userId: 'user-123',
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
                sessionId: 'sess-123',
            };

            mockAuditService.createAuditLog.mockResolvedValue(undefined);

            await listener.handleAuditLog(event);

            expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(event);
        });

        it('should handle CRUD events', async () => {
            const event: IAuditEvent = {
                action: AuditAction.UPDATE,
                resource: AuditResource.USER,
                method: 'PUT',
                endpoint: '/users/123',
                statusCode: 200,
                userId: 'admin-123',
                resourceId: 'user-456',
                changesBefore: { role: 'USER' },
                changesAfter: { role: 'ADMIN' },
            };

            mockAuditService.createAuditLog.mockResolvedValue(undefined);

            await listener.handleAuditLog(event);

            expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(event);
        });

        it('should handle error events with error message', async () => {
            const event: IAuditEvent = {
                action: AuditAction.LOGIN,
                resource: AuditResource.AUTH,
                method: 'POST',
                endpoint: '/auth/login',
                statusCode: 401,
                errorMessage: 'Invalid credentials',
                ipAddress: '192.168.1.1',
            };

            mockAuditService.createAuditLog.mockResolvedValue(undefined);

            await listener.handleAuditLog(event);

            expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(event);
        });

        it('should handle events with metadata', async () => {
            const event: IAuditEvent = {
                action: AuditAction.CONFIG_CHANGE,
                resource: AuditResource.CONFIG,
                method: 'PUT',
                endpoint: '/config',
                statusCode: 200,
                userId: 'admin-123',
                metadata: {
                    configKey: 'max_login_attempts',
                    oldValue: 3,
                    newValue: 5,
                },
            };

            mockAuditService.createAuditLog.mockResolvedValue(undefined);

            await listener.handleAuditLog(event);

            expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(event);
        });

        it('should not throw error if createAuditLog fails', async () => {
            const event: IAuditEvent = {
                action: AuditAction.LOGIN,
                resource: AuditResource.AUTH,
                method: 'POST',
                endpoint: '/auth/login',
                statusCode: 200,
            };

            mockAuditService.createAuditLog.mockRejectedValue(
                new Error('Database error'),
            );

            await expect(listener.handleAuditLog(event)).resolves.not.toThrow();
        });

        it('should handle DELETE events', async () => {
            const event: IAuditEvent = {
                action: AuditAction.DELETE,
                resource: AuditResource.USER,
                method: 'DELETE',
                endpoint: '/users/123',
                statusCode: 204,
                userId: 'admin-123',
                resourceId: 'user-456',
                changesBefore: {
                    id: 'user-456',
                    username: 'john.doe',
                    email: 'john@example.com',
                },
            };

            mockAuditService.createAuditLog.mockResolvedValue(undefined);

            await listener.handleAuditLog(event);

            expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(event);
        });

        it('should handle role change events', async () => {
            const event: IAuditEvent = {
                action: AuditAction.ROLE_CHANGE,
                resource: AuditResource.USER,
                method: 'PUT',
                endpoint: '/users/123/role',
                statusCode: 200,
                userId: 'admin-123',
                resourceId: 'user-456',
                changesBefore: { role: 'USER' },
                changesAfter: { role: 'ADMIN' },
            };

            mockAuditService.createAuditLog.mockResolvedValue(undefined);

            await listener.handleAuditLog(event);

            expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(event);
        });

        it('should handle session revoke events', async () => {
            const event: IAuditEvent = {
                action: AuditAction.SESSION_REVOKE,
                resource: AuditResource.USER_SESSION,
                method: 'DELETE',
                endpoint: '/auth/sessions/123',
                statusCode: 200,
                userId: 'admin-123',
                resourceId: 'session-456',
                metadata: {
                    reason: 'Security policy violation',
                },
            };

            mockAuditService.createAuditLog.mockResolvedValue(undefined);

            await listener.handleAuditLog(event);

            expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(event);
        });

        it('should handle system events', async () => {
            const event: IAuditEvent = {
                action: AuditAction.SYSTEM_EVENT,
                resource: AuditResource.SYSTEM,
                method: 'POST',
                endpoint: '/system/maintenance',
                statusCode: 200,
                metadata: {
                    eventType: 'maintenance_mode_enabled',
                    duration: '2 hours',
                },
            };

            mockAuditService.createAuditLog.mockResolvedValue(undefined);

            await listener.handleAuditLog(event);

            expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(event);
        });

        it('should handle events with request ID for tracing', async () => {
            const event: IAuditEvent = {
                action: AuditAction.READ,
                resource: AuditResource.USER,
                method: 'GET',
                endpoint: '/users/123',
                statusCode: 200,
                userId: 'user-123',
                requestId: 'req-abc-123',
            };

            mockAuditService.createAuditLog.mockResolvedValue(undefined);

            await listener.handleAuditLog(event);

            expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestId: 'req-abc-123',
                }),
            );
        });

        it('should handle concurrent events', async () => {
            const events: IAuditEvent[] = [
                {
                    action: AuditAction.LOGIN,
                    resource: AuditResource.AUTH,
                    method: 'POST',
                    endpoint: '/auth/login',
                    statusCode: 200,
                },
                {
                    action: AuditAction.READ,
                    resource: AuditResource.USER,
                    method: 'GET',
                    endpoint: '/users/123',
                    statusCode: 200,
                },
                {
                    action: AuditAction.UPDATE,
                    resource: AuditResource.USER,
                    method: 'PUT',
                    endpoint: '/users/123',
                    statusCode: 200,
                },
            ];

            mockAuditService.createAuditLog.mockResolvedValue(undefined);

            await Promise.all(
                events.map((event) => listener.handleAuditLog(event)),
            );

            expect(mockAuditService.createAuditLog).toHaveBeenCalledTimes(3);
        });
    });
});
