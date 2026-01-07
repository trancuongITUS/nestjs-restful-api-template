import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from './audit.service';
import { AuditRepository } from './repositories';
import { AuditAction, AuditResource } from '@prisma/client';
import { IAuditEvent } from './interfaces';

describe('AuditService', () => {
    let service: AuditService;
    let auditRepository: AuditRepository;
    let eventEmitter: EventEmitter2;

    const mockAuditRepository = {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                {
                    provide: AuditRepository,
                    useValue: mockAuditRepository,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<AuditService>(AuditService);
        auditRepository = module.get<AuditRepository>(AuditRepository);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('emitAuditEvent', () => {
        it('should emit audit event with masked sensitive data', () => {
            const event: IAuditEvent = {
                action: AuditAction.LOGIN,
                resource: AuditResource.AUTH,
                method: 'POST',
                endpoint: '/auth/login',
                statusCode: 200,
                userId: 'user-123',
                username: 'john.doe',
                changesBefore: {
                    password: 'secret123',
                    email: 'john@example.com',
                },
                changesAfter: {
                    password: 'newsecret456',
                    email: 'john@example.com',
                },
            };

            service.emitAuditEvent(event);

            expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'audit.log',
                expect.objectContaining({
                    action: AuditAction.LOGIN,
                    resource: AuditResource.AUTH,
                    method: 'POST',
                    endpoint: '/auth/login',
                    statusCode: 200,
                    userId: 'user-123',
                    username: 'john.doe',
                    // Sensitive data should be masked
                    changesBefore: expect.objectContaining({
                        password: '***MASKED***',
                    }),
                    changesAfter: expect.objectContaining({
                        password: '***MASKED***',
                    }),
                }),
            );
        });

        it('should emit event without sensitive data when not present', () => {
            const event: IAuditEvent = {
                action: AuditAction.READ,
                resource: AuditResource.USER,
                method: 'GET',
                endpoint: '/users/123',
                statusCode: 200,
                userId: 'user-123',
            };

            service.emitAuditEvent(event);

            expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'audit.log',
                event,
            );
        });

        it('should not throw error if event emission fails', () => {
            mockEventEmitter.emit.mockImplementation(() => {
                throw new Error('Event emission failed');
            });

            const event: IAuditEvent = {
                action: AuditAction.LOGIN,
                resource: AuditResource.AUTH,
                method: 'POST',
                endpoint: '/auth/login',
                statusCode: 200,
            };

            expect(() => service.emitAuditEvent(event)).not.toThrow();
        });

        it('should mask nested sensitive data', () => {
            const event: IAuditEvent = {
                action: AuditAction.UPDATE,
                resource: AuditResource.USER,
                method: 'PUT',
                endpoint: '/users/123',
                statusCode: 200,
                metadata: {
                    user: {
                        username: 'john.doe',
                        password: 'secret123',
                        profile: {
                            email: 'john@example.com',
                            ssn: '123-45-6789',
                        },
                    },
                },
            };

            service.emitAuditEvent(event);

            const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
            expect(emittedEvent.metadata.user.password).toBe('***MASKED***');
            expect(emittedEvent.metadata.user.profile.ssn).toBe('***MASKED***');
        });

        it('should mask arrays of objects with sensitive data', () => {
            const event: IAuditEvent = {
                action: AuditAction.CREATE,
                resource: AuditResource.USER,
                method: 'POST',
                endpoint: '/users',
                statusCode: 201,
                changesAfter: {
                    users: [
                        { username: 'user1', password: 'pass1' },
                        { username: 'user2', password: 'pass2' },
                    ],
                },
            };

            service.emitAuditEvent(event);

            const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
            expect(emittedEvent.changesAfter.users[0].password).toBe(
                '***MASKED***',
            );
            expect(emittedEvent.changesAfter.users[1].password).toBe(
                '***MASKED***',
            );
        });
    });

    describe('createAuditLog', () => {
        it('should create audit log in database', async () => {
            const event: IAuditEvent = {
                action: AuditAction.LOGIN,
                resource: AuditResource.AUTH,
                method: 'POST',
                endpoint: '/auth/login',
                statusCode: 200,
                userId: 'user-123',
                username: 'john.doe',
                userRole: 'USER',
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
                sessionId: 'sess-123',
                requestId: 'req-123',
            };

            const createdLog = {
                id: 'log-123',
                timestamp: new Date(),
                ...event,
                changesBefore: null,
                changesAfter: null,
                metadata: null,
                errorMessage: null,
                createdAt: new Date(),
            };

            mockAuditRepository.create.mockResolvedValue(createdLog);

            await service.createAuditLog(event);

            expect(mockAuditRepository.create).toHaveBeenCalledTimes(1);
            expect(mockAuditRepository.create).toHaveBeenCalledWith({
                userId: 'user-123',
                username: 'john.doe',
                userRole: 'USER',
                action: AuditAction.LOGIN,
                resource: AuditResource.AUTH,
                resourceId: undefined,
                method: 'POST',
                endpoint: '/auth/login',
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
                sessionId: 'sess-123',
                requestId: 'req-123',
                changesBefore: null,
                changesAfter: null,
                metadata: null,
                statusCode: 200,
                errorMessage: undefined,
            });
        });

        it('should handle null/undefined optional fields', async () => {
            const event: IAuditEvent = {
                action: AuditAction.READ,
                resource: AuditResource.USER,
                method: 'GET',
                endpoint: '/users/123',
                statusCode: 200,
            };

            mockAuditRepository.create.mockResolvedValue({
                id: 'log-123',
                timestamp: new Date(),
                createdAt: new Date(),
            });

            await service.createAuditLog(event);

            expect(mockAuditRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: undefined,
                    username: undefined,
                    userRole: undefined,
                    changesBefore: null,
                    changesAfter: null,
                    metadata: null,
                }),
            );
        });

        it('should not throw error if database write fails', async () => {
            mockAuditRepository.create.mockRejectedValue(
                new Error('Database error'),
            );

            const event: IAuditEvent = {
                action: AuditAction.LOGIN,
                resource: AuditResource.AUTH,
                method: 'POST',
                endpoint: '/auth/login',
                statusCode: 200,
            };

            await expect(service.createAuditLog(event)).resolves.not.toThrow();
        });

        it('should create audit log with error message', async () => {
            const event: IAuditEvent = {
                action: AuditAction.LOGIN,
                resource: AuditResource.AUTH,
                method: 'POST',
                endpoint: '/auth/login',
                statusCode: 401,
                errorMessage: 'Invalid credentials',
            };

            mockAuditRepository.create.mockResolvedValue({
                id: 'log-123',
                timestamp: new Date(),
                createdAt: new Date(),
            });

            await service.createAuditLog(event);

            expect(mockAuditRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 401,
                    errorMessage: 'Invalid credentials',
                }),
            );
        });

        it('should create audit log with metadata', async () => {
            const event: IAuditEvent = {
                action: AuditAction.CONFIG_CHANGE,
                resource: AuditResource.CONFIG,
                method: 'PUT',
                endpoint: '/config',
                statusCode: 200,
                metadata: {
                    configKey: 'max_login_attempts',
                    oldValue: 3,
                    newValue: 5,
                },
            };

            mockAuditRepository.create.mockResolvedValue({
                id: 'log-123',
                timestamp: new Date(),
                createdAt: new Date(),
            });

            await service.createAuditLog(event);

            expect(mockAuditRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: {
                        configKey: 'max_login_attempts',
                        oldValue: 3,
                        newValue: 5,
                    },
                }),
            );
        });

        it('should create audit log with changes before/after', async () => {
            const event: IAuditEvent = {
                action: AuditAction.UPDATE,
                resource: AuditResource.USER,
                method: 'PUT',
                endpoint: '/users/123',
                statusCode: 200,
                changesBefore: {
                    email: 'old@example.com',
                    role: 'USER',
                },
                changesAfter: {
                    email: 'new@example.com',
                    role: 'ADMIN',
                },
            };

            mockAuditRepository.create.mockResolvedValue({
                id: 'log-123',
                timestamp: new Date(),
                createdAt: new Date(),
            });

            await service.createAuditLog(event);

            expect(mockAuditRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    changesBefore: {
                        email: 'old@example.com',
                        role: 'USER',
                    },
                    changesAfter: {
                        email: 'new@example.com',
                        role: 'ADMIN',
                    },
                }),
            );
        });
    });
});
