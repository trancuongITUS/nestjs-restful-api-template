import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditAction, AuditResource } from '@prisma/client';

describe('AuditInterceptor', () => {
    let interceptor: AuditInterceptor;
    let eventEmitter: EventEmitter2;

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    const createMockExecutionContext = (
        method: string,
        url: string,
        user?: any,
    ): ExecutionContext => {
        const request = {
            method,
            url,
            headers: {
                'user-agent': 'test-agent',
                'x-request-id': 'test-request-id',
            },
            user,
            body: { test: 'data' },
            query: {},
            params: {},
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
        };

        const response = {
            statusCode: 200,
        };

        return {
            switchToHttp: () => ({
                getRequest: () => request,
                getResponse: () => response,
            }),
        } as unknown as ExecutionContext;
    };

    const createMockCallHandler = (data?: any): CallHandler => ({
        handle: () => of(data || { id: '123', name: 'Test' }),
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditInterceptor,
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        interceptor = module.get<AuditInterceptor>(AuditInterceptor);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    describe('shouldAudit', () => {
        it('should audit POST requests', (done) => {
            const context = createMockExecutionContext('POST', '/api/users');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
                done();
            });
        });

        it('should audit PUT requests', (done) => {
            const context = createMockExecutionContext('PUT', '/api/users/123');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
                done();
            });
        });

        it('should audit PATCH requests', (done) => {
            const context = createMockExecutionContext(
                'PATCH',
                '/api/users/123',
            );
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
                done();
            });
        });

        it('should audit DELETE requests', (done) => {
            const context = createMockExecutionContext(
                'DELETE',
                '/api/users/123',
            );
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
                done();
            });
        });

        it('should NOT audit GET requests', (done) => {
            const context = createMockExecutionContext('GET', '/api/users');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                expect(mockEventEmitter.emit).not.toHaveBeenCalled();
                done();
            });
        });

        it('should NOT audit HEAD requests', (done) => {
            const context = createMockExecutionContext('HEAD', '/api/users');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                expect(mockEventEmitter.emit).not.toHaveBeenCalled();
                done();
            });
        });

        it('should NOT audit OPTIONS requests', (done) => {
            const context = createMockExecutionContext('OPTIONS', '/api/users');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                expect(mockEventEmitter.emit).not.toHaveBeenCalled();
                done();
            });
        });
    });

    describe('determineAction', () => {
        it('should identify LOGIN action', (done) => {
            const context = createMockExecutionContext('POST', '/auth/login');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.action).toBe(AuditAction.LOGIN);
                done();
            });
        });

        it('should identify LOGOUT action', (done) => {
            const context = createMockExecutionContext('POST', '/auth/logout');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.action).toBe(AuditAction.LOGOUT);
                done();
            });
        });

        it('should identify CHANGE_PASSWORD action', (done) => {
            const context = createMockExecutionContext(
                'POST',
                '/auth/change-password',
            );
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.action).toBe(AuditAction.CHANGE_PASSWORD);
                done();
            });
        });

        it('should identify CREATE action for POST', (done) => {
            const context = createMockExecutionContext('POST', '/api/users');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.action).toBe(AuditAction.CREATE);
                done();
            });
        });

        it('should identify UPDATE action for PUT', (done) => {
            const context = createMockExecutionContext('PUT', '/api/users/123');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.action).toBe(AuditAction.UPDATE);
                done();
            });
        });

        it('should identify DELETE action', (done) => {
            const context = createMockExecutionContext(
                'DELETE',
                '/api/users/123',
            );
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.action).toBe(AuditAction.DELETE);
                done();
            });
        });
    });

    describe('determineResource', () => {
        it('should identify AUTH resource', (done) => {
            const context = createMockExecutionContext('POST', '/auth/login');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.resource).toBe(AuditResource.AUTH);
                done();
            });
        });

        it('should identify USER resource', (done) => {
            const context = createMockExecutionContext('POST', '/api/users');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.resource).toBe(AuditResource.USER);
                done();
            });
        });

        it('should identify SESSION resource', (done) => {
            const context = createMockExecutionContext(
                'DELETE',
                '/api/session/123',
            );
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.resource).toBe(AuditResource.USER_SESSION);
                done();
            });
        });
    });

    describe('audit event structure', () => {
        it('should capture user context', (done) => {
            const user = {
                sub: 'user-123', // JWT payload uses 'sub' for user ID
                username: 'john.doe',
                role: 'ADMIN',
                sessionId: 'session-123',
            };
            const context = createMockExecutionContext(
                'POST',
                '/api/users',
                user,
            );
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.userId).toBe('user-123');
                expect(emittedEvent.username).toBe('john.doe');
                expect(emittedEvent.userRole).toBe('ADMIN');
                expect(emittedEvent.sessionId).toBe('session-123');
                done();
            });
        });

        it('should capture request metadata', (done) => {
            const context = createMockExecutionContext('POST', '/api/users');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.method).toBe('POST');
                expect(emittedEvent.endpoint).toBe('/api/users');
                expect(emittedEvent.ipAddress).toBe('127.0.0.1');
                expect(emittedEvent.userAgent).toBe('test-agent');
                expect(emittedEvent.requestId).toBe('test-request-id');
                done();
            });
        });

        it('should capture status code', (done) => {
            const context = createMockExecutionContext('POST', '/api/users');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.statusCode).toBe(200);
                done();
            });
        });

        it('should extract resource ID from params', (done) => {
            const mockContext = createMockExecutionContext(
                'PUT',
                '/api/users/123',
            );
            const request = mockContext.switchToHttp().getRequest();
            request.params = { id: '123' };
            const next = createMockCallHandler();

            interceptor.intercept(mockContext, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.resourceId).toBe('123');
                done();
            });
        });

        it('should extract resource ID from response data', (done) => {
            const context = createMockExecutionContext('POST', '/api/users');
            const next = createMockCallHandler({ id: 'new-user-123' });

            interceptor.intercept(context, next).subscribe(() => {
                const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                expect(emittedEvent.resourceId).toBe('new-user-123');
                done();
            });
        });
    });

    describe('error handling', () => {
        it('should emit audit event on error', (done) => {
            const context = createMockExecutionContext('POST', '/api/users');
            const error = { status: 400, message: 'Bad Request' };
            const next: CallHandler = {
                handle: () => throwError(() => error),
            };

            interceptor.intercept(context, next).subscribe({
                error: () => {
                    expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
                    const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
                    expect(emittedEvent.statusCode).toBe(400);
                    expect(emittedEvent.errorMessage).toBe('Bad Request');
                    done();
                },
            });
        });

        it('should not break on event emission failure', (done) => {
            mockEventEmitter.emit.mockImplementation(() => {
                throw new Error('Event emission failed');
            });

            const context = createMockExecutionContext('POST', '/api/users');
            const next = createMockCallHandler();

            interceptor.intercept(context, next).subscribe(() => {
                // Should complete without throwing
                expect(true).toBe(true);
                done();
            });
        });
    });
});
