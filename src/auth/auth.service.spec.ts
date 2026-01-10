/**
 * AuthService Unit Tests - Phase 5: Critical Action Tracking
 * Tests audit event emission for authentication actions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { UserRepository } from '../database/repositories/user.repository';
import { UserSessionRepository } from '../database/repositories/user-session.repository';
import { PasswordValidationService } from './services/password-validation.service';
import { AuditAction, AuditResource } from '../audit/enums';
import * as securityUtil from '../common/utils/security.util';

describe('AuthService - Phase 5: Audit Logging', () => {
    let service: AuthService;
    let eventEmitter: EventEmitter2;
    let userRepository: UserRepository;
    let userSessionRepository: UserSessionRepository;
    let passwordValidationService: PasswordValidationService;

    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        password: 'hashedPassword',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        passwordChangedAt: null,
    };

    const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
        user: mockUser,
    };

    const mockRequest = {
        headers: {
            'user-agent': 'test-agent',
            'x-forwarded-for': '192.168.1.1',
        },
        ip: '192.168.1.1',
        socket: { remoteAddress: '192.168.1.1' },
    } as unknown as Request;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: JwtService,
                    useValue: {
                        signAsync: jest.fn().mockResolvedValue('mock-token'),
                        verify: jest.fn().mockReturnValue({ sub: 'user-123' }),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            const config = {
                                JWT_ACCESS_SECRET: 'access-secret',
                                JWT_REFRESH_SECRET: 'refresh-secret',
                                JWT_ACCESS_EXPIRES_IN: '15m',
                                JWT_REFRESH_EXPIRES_IN: '7d',
                            };
                            return config[key] || null;
                        }),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
                {
                    provide: UserRepository,
                    useValue: {
                        findByEmail: jest.fn(),
                        findByUsername: jest.fn(),
                        findUnique: jest.fn(),
                        create: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: UserSessionRepository,
                    useValue: {
                        createSession: jest.fn(),
                        findByRefreshTokenWithUser: jest.fn(),
                        isSessionValid: jest.fn(),
                        revokeSession: jest.fn(),
                        revokeAllUserSessions: jest.fn(),
                    },
                },
                {
                    provide: PasswordValidationService,
                    useValue: {
                        validateCredentials: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
        userRepository = module.get<UserRepository>(UserRepository);
        userSessionRepository = module.get<UserSessionRepository>(
            UserSessionRepository,
        );
        passwordValidationService = module.get<PasswordValidationService>(
            PasswordValidationService,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('register() - REGISTER audit event', () => {
        it('should emit REGISTER audit event on successful registration', async () => {
            const registerDto = {
                email: 'newuser@example.com',
                username: 'newuser',
                firstName: 'New',
                lastName: 'User',
                password: 'password123',
            };

            jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
            jest.spyOn(userRepository, 'findByUsername').mockResolvedValue(
                null,
            );
            jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser);
            jest.spyOn(userRepository, 'update').mockResolvedValue(mockUser);
            jest.spyOn(
                userSessionRepository,
                'createSession',
            ).mockResolvedValue(mockSession);
            jest.spyOn(securityUtil, 'hashPassword').mockResolvedValue(
                'hashedPassword',
            );

            await service.register(registerDto, mockRequest);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'audit.log.created',
                expect.objectContaining({
                    userId: mockUser.id,
                    username: mockUser.username,
                    userRole: mockUser.role,
                    action: AuditAction.REGISTER,
                    resource: AuditResource.AUTH,
                    resourceId: mockUser.id,
                    method: 'POST',
                    endpoint: '/auth/register',
                    ipAddress: '192.168.1.1',
                    userAgent: 'test-agent',
                    sessionId: mockSession.id,
                    statusCode: 201,
                    metadata: expect.objectContaining({
                        email: mockUser.email,
                        emailVerified: mockUser.emailVerified,
                    }),
                }),
            );
        });

        it('should not emit audit event if request is not provided', async () => {
            const registerDto = {
                email: 'newuser@example.com',
                username: 'newuser',
                firstName: 'New',
                lastName: 'User',
                password: 'password123',
            };

            jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
            jest.spyOn(userRepository, 'findByUsername').mockResolvedValue(
                null,
            );
            jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser);
            jest.spyOn(userRepository, 'update').mockResolvedValue(mockUser);
            jest.spyOn(
                userSessionRepository,
                'createSession',
            ).mockResolvedValue(mockSession);
            jest.spyOn(securityUtil, 'hashPassword').mockResolvedValue(
                'hashedPassword',
            );

            await service.register(registerDto);

            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });
    });

    describe('login() - LOGIN audit event', () => {
        it('should emit LOGIN audit event on successful login', async () => {
            const loginDto = {
                email: 'test@example.com',
                password: 'password123',
            };

            const { password, ...userWithoutPassword } = mockUser;

            jest.spyOn(
                passwordValidationService,
                'validateCredentials',
            ).mockResolvedValue(userWithoutPassword);
            jest.spyOn(userRepository, 'update').mockResolvedValue(mockUser);
            jest.spyOn(
                userSessionRepository,
                'createSession',
            ).mockResolvedValue(mockSession);

            await service.login(loginDto, mockRequest);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'audit.log.created',
                expect.objectContaining({
                    userId: mockUser.id,
                    username: mockUser.username,
                    userRole: mockUser.role,
                    action: AuditAction.LOGIN,
                    resource: AuditResource.AUTH,
                    resourceId: mockUser.id,
                    method: 'POST',
                    endpoint: '/auth/login',
                    ipAddress: '192.168.1.1',
                    userAgent: 'test-agent',
                    sessionId: mockSession.id,
                    statusCode: 200,
                    metadata: expect.objectContaining({
                        email: mockUser.email,
                        emailVerified: mockUser.emailVerified,
                        loginMethod: 'password',
                    }),
                }),
            );
        });

        it('should not emit audit event on failed login', async () => {
            const loginDto = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };

            jest.spyOn(
                passwordValidationService,
                'validateCredentials',
            ).mockResolvedValue(null);

            await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
                UnauthorizedException,
            );
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });
    });

    describe('refreshToken() - REFRESH_TOKEN audit event', () => {
        it('should emit REFRESH_TOKEN audit event on successful refresh', async () => {
            const refreshToken = 'refresh-token-123';

            jest.spyOn(
                userSessionRepository,
                'findByRefreshTokenWithUser',
            ).mockResolvedValue(mockSession);
            jest.spyOn(
                userSessionRepository,
                'isSessionValid',
            ).mockResolvedValue(true);
            jest.spyOn(
                userSessionRepository,
                'revokeSession',
            ).mockResolvedValue(undefined);

            const newSession = { ...mockSession, id: 'session-456' };
            jest.spyOn(
                userSessionRepository,
                'createSession',
            ).mockResolvedValue(newSession);

            await service.refreshToken(refreshToken, mockRequest);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'audit.log.created',
                expect.objectContaining({
                    userId: mockUser.id,
                    username: mockUser.username,
                    userRole: mockUser.role,
                    action: AuditAction.REFRESH_TOKEN,
                    resource: AuditResource.AUTH,
                    resourceId: mockUser.id,
                    method: 'POST',
                    endpoint: '/auth/refresh',
                    ipAddress: '192.168.1.1',
                    userAgent: 'test-agent',
                    sessionId: newSession.id,
                    statusCode: 200,
                    metadata: expect.objectContaining({
                        oldSessionId: mockSession.id,
                        newSessionId: newSession.id,
                    }),
                }),
            );
        });
    });

    describe('logout() - LOGOUT audit event', () => {
        it('should emit LOGOUT audit event on successful logout', async () => {
            const refreshToken = 'refresh-token-123';

            jest.spyOn(
                userSessionRepository,
                'revokeSession',
            ).mockResolvedValue(undefined);

            await service.logout(
                refreshToken,
                mockUser.id,
                mockUser.username,
                mockUser.role,
                mockRequest,
            );

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'audit.log.created',
                expect.objectContaining({
                    userId: mockUser.id,
                    username: mockUser.username,
                    userRole: mockUser.role,
                    action: AuditAction.LOGOUT,
                    resource: AuditResource.AUTH,
                    resourceId: mockUser.id,
                    method: 'POST',
                    endpoint: '/auth/logout',
                    ipAddress: '192.168.1.1',
                    userAgent: 'test-agent',
                    statusCode: 204,
                    metadata: expect.objectContaining({
                        logoutMethod: 'single_device',
                    }),
                }),
            );
        });

        it('should not emit audit event if userId is not provided', async () => {
            const refreshToken = 'refresh-token-123';

            jest.spyOn(
                userSessionRepository,
                'revokeSession',
            ).mockResolvedValue(undefined);

            await service.logout(
                refreshToken,
                undefined,
                undefined,
                undefined,
                mockRequest,
            );

            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });
    });

    describe('logoutAllDevices() - LOGOUT audit event (all devices)', () => {
        it('should emit LOGOUT audit event for all devices', async () => {
            jest.spyOn(
                userSessionRepository,
                'revokeAllUserSessions',
            ).mockResolvedValue(undefined);

            await service.logoutAllDevices(
                mockUser.id,
                mockUser.username,
                mockUser.role,
                mockRequest,
            );

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'audit.log.created',
                expect.objectContaining({
                    userId: mockUser.id,
                    username: mockUser.username,
                    userRole: mockUser.role,
                    action: AuditAction.LOGOUT,
                    resource: AuditResource.AUTH,
                    resourceId: mockUser.id,
                    method: 'POST',
                    endpoint: '/auth/logout-all',
                    ipAddress: '192.168.1.1',
                    userAgent: 'test-agent',
                    statusCode: 204,
                    metadata: expect.objectContaining({
                        logoutMethod: 'all_devices',
                    }),
                }),
            );
        });
    });

    describe('changePassword() - CHANGE_PASSWORD audit event', () => {
        it('should emit CHANGE_PASSWORD audit event on successful password change', async () => {
            jest.spyOn(userRepository, 'findUnique').mockResolvedValue(
                mockUser,
            );
            jest.spyOn(securityUtil, 'comparePassword').mockResolvedValue(true);
            jest.spyOn(securityUtil, 'hashPassword').mockResolvedValue(
                'newHashedPassword',
            );
            jest.spyOn(userRepository, 'update').mockResolvedValue(mockUser);
            jest.spyOn(
                userSessionRepository,
                'revokeAllUserSessions',
            ).mockResolvedValue(undefined);

            await service.changePassword(
                mockUser.id,
                'currentPassword',
                'newPassword',
                mockRequest,
            );

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'audit.log.created',
                expect.objectContaining({
                    userId: mockUser.id,
                    username: mockUser.username,
                    userRole: mockUser.role,
                    action: AuditAction.CHANGE_PASSWORD,
                    resource: AuditResource.USER,
                    resourceId: mockUser.id,
                    method: 'POST',
                    endpoint: '/auth/change-password',
                    ipAddress: '192.168.1.1',
                    userAgent: 'test-agent',
                    statusCode: 204,
                    metadata: expect.objectContaining({
                        allSessionsRevoked: true,
                    }),
                }),
            );
        });

        it('should not emit audit event if password change fails', async () => {
            jest.spyOn(userRepository, 'findUnique').mockResolvedValue(
                mockUser,
            );
            jest.spyOn(securityUtil, 'comparePassword').mockResolvedValue(
                false,
            );

            await expect(
                service.changePassword(
                    mockUser.id,
                    'wrongPassword',
                    'newPassword',
                    mockRequest,
                ),
            ).rejects.toThrow(UnauthorizedException);

            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });
    });

    describe('IP Address Extraction', () => {
        it('should extract IP from x-forwarded-for header', async () => {
            const req = {
                headers: {
                    'x-forwarded-for': '203.0.113.1, 198.51.100.1',
                    'user-agent': 'test-agent',
                },
                ip: '192.168.1.1',
                socket: { remoteAddress: '192.168.1.1' },
            } as unknown as Request;

            const loginDto = {
                email: 'test@example.com',
                password: 'password123',
            };

            const { password, ...userWithoutPassword } = mockUser;

            jest.spyOn(
                passwordValidationService,
                'validateCredentials',
            ).mockResolvedValue(userWithoutPassword);
            jest.spyOn(userRepository, 'update').mockResolvedValue(mockUser);
            jest.spyOn(
                userSessionRepository,
                'createSession',
            ).mockResolvedValue(mockSession);

            await service.login(loginDto, req);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'audit.log.created',
                expect.objectContaining({
                    ipAddress: '203.0.113.1',
                }),
            );
        });

        it('should fall back to socket.remoteAddress if no forwarded header', async () => {
            const req = {
                headers: {
                    'user-agent': 'test-agent',
                },
                socket: { remoteAddress: '10.0.0.1' },
            } as unknown as Request;

            const loginDto = {
                email: 'test@example.com',
                password: 'password123',
            };

            const { password, ...userWithoutPassword } = mockUser;

            jest.spyOn(
                passwordValidationService,
                'validateCredentials',
            ).mockResolvedValue(userWithoutPassword);
            jest.spyOn(userRepository, 'update').mockResolvedValue(mockUser);
            jest.spyOn(
                userSessionRepository,
                'createSession',
            ).mockResolvedValue(mockSession);

            await service.login(loginDto, req);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'audit.log.created',
                expect.objectContaining({
                    ipAddress: '10.0.0.1',
                }),
            );
        });
    });
});
