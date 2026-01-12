import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PasswordValidationService } from './password-validation.service';
import { UserRepository } from '../../database/repositories/user.repository';
import {
    AUTH,
    AUTH_ERROR_MESSAGES,
} from '../../common/constants/security.constants';
import { AuditAction } from '../../audit/enums';
import * as securityUtil from '../../common/utils/security.util';

// Mock security utilities
jest.mock('../../common/utils/security.util', () => ({
    comparePassword: jest.fn(),
    stripPassword: jest.fn((user) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...rest } = user;
        return rest;
    }),
}));

describe('PasswordValidationService', () => {
    let service: PasswordValidationService;
    let userRepository: jest.Mocked<UserRepository>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedPassword',
        isActive: true,
        role: 'USER' as const,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        emailVerified: false,
        emailVerifiedAt: null,
        lastLoginAt: null,
        passwordChangedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PasswordValidationService,
                {
                    provide: UserRepository,
                    useValue: {
                        findByEmail: jest.fn(),
                        incrementFailedLoginAttempts: jest.fn(),
                        resetFailedLoginAttempts: jest.fn(),
                        lockAccount: jest.fn(),
                        getAccountLockStatus: jest.fn(),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<PasswordValidationService>(
            PasswordValidationService,
        );
        userRepository = module.get(UserRepository);
        eventEmitter = module.get(EventEmitter2);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateCredentials', () => {
        it('should return null for non-existent user but still perform password comparison', async () => {
            userRepository.findByEmail.mockResolvedValue(null);
            (securityUtil.comparePassword as jest.Mock).mockResolvedValue(
                false,
            );

            const result = await service.validateCredentials(
                'unknown@example.com',
                'password',
            );

            expect(result).toBeNull();
            // CRITICAL: Verify bcrypt comparison was performed for timing safety
            expect(securityUtil.comparePassword).toHaveBeenCalledTimes(1);
            expect(
                userRepository.incrementFailedLoginAttempts,
            ).not.toHaveBeenCalled();
        });

        it('should return null for inactive user after performing password comparison', async () => {
            userRepository.findByEmail.mockResolvedValue({
                ...mockUser,
                isActive: false,
            });
            (securityUtil.comparePassword as jest.Mock).mockResolvedValue(true);

            const result = await service.validateCredentials(
                'test@example.com',
                'password',
            );

            expect(result).toBeNull();
            // Verify comparison still happened for timing safety
            expect(securityUtil.comparePassword).toHaveBeenCalledTimes(1);
            expect(userRepository.getAccountLockStatus).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException for locked account and emit audit event', async () => {
            userRepository.findByEmail.mockResolvedValue(mockUser);
            (securityUtil.comparePassword as jest.Mock).mockResolvedValue(true);
            userRepository.getAccountLockStatus.mockReturnValue({
                isLocked: true,
                lockedUntil: new Date(Date.now() + 900000),
                remainingMs: 900000,
            });

            await expect(
                service.validateCredentials('test@example.com', 'password'),
            ).rejects.toThrow(
                new UnauthorizedException(AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED),
            );

            // Verify audit event was emitted
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'audit.log',
                expect.objectContaining({
                    userId: 'user-123',
                    username: 'testuser',
                    action: AuditAction.LOCKED_ACCOUNT_LOGIN_ATTEMPT,
                    statusCode: 401,
                    errorMessage: AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED,
                }),
            );
        });

        it('should return null and increment attempts on wrong password', async () => {
            userRepository.findByEmail.mockResolvedValue(mockUser);
            userRepository.getAccountLockStatus.mockReturnValue({
                isLocked: false,
                lockedUntil: null,
                remainingMs: 0,
            });
            userRepository.incrementFailedLoginAttempts.mockResolvedValue({
                ...mockUser,
                failedLoginAttempts: 1,
            });
            (securityUtil.comparePassword as jest.Mock).mockResolvedValue(
                false,
            );

            const result = await service.validateCredentials(
                'test@example.com',
                'wrongpassword',
            );

            expect(result).toBeNull();
            expect(
                userRepository.incrementFailedLoginAttempts,
            ).toHaveBeenCalledWith('user-123');
            expect(userRepository.lockAccount).not.toHaveBeenCalled();
        });

        it('should lock account after 5 failed attempts and emit audit event', async () => {
            userRepository.findByEmail.mockResolvedValue({
                ...mockUser,
                failedLoginAttempts: 4,
            });
            userRepository.getAccountLockStatus.mockReturnValue({
                isLocked: false,
                lockedUntil: null,
                remainingMs: 0,
            });
            userRepository.incrementFailedLoginAttempts.mockResolvedValue({
                ...mockUser,
                failedLoginAttempts: 5,
            });
            (securityUtil.comparePassword as jest.Mock).mockResolvedValue(
                false,
            );

            const result = await service.validateCredentials(
                'test@example.com',
                'wrongpassword',
            );

            expect(result).toBeNull();
            expect(userRepository.lockAccount).toHaveBeenCalledWith(
                'user-123',
                AUTH.LOCKOUT_DURATION_MS,
            );

            // Verify audit event was emitted for account lockout
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'audit.log',
                expect.objectContaining({
                    userId: 'user-123',
                    username: 'testuser',
                    action: AuditAction.ACCOUNT_LOCKED,
                    statusCode: 401,
                    metadata: expect.objectContaining({
                        failedAttempts: 5,
                        maxAttempts: AUTH.MAX_LOGIN_ATTEMPTS,
                    }),
                }),
            );
        });

        it('should reset attempts on successful login', async () => {
            userRepository.findByEmail.mockResolvedValue({
                ...mockUser,
                failedLoginAttempts: 3,
            });
            userRepository.getAccountLockStatus.mockReturnValue({
                isLocked: false,
                lockedUntil: null,
                remainingMs: 0,
            });
            userRepository.resetFailedLoginAttempts.mockResolvedValue({
                ...mockUser,
                failedLoginAttempts: 0,
            });
            (securityUtil.comparePassword as jest.Mock).mockResolvedValue(true);

            const result = await service.validateCredentials(
                'test@example.com',
                'correctpassword',
            );

            expect(result).toBeDefined();
            expect(
                userRepository.resetFailedLoginAttempts,
            ).toHaveBeenCalledWith('user-123');
        });

        it('should allow login after lockout expires', async () => {
            const expiredLockout = new Date(Date.now() - 1000); // 1 second ago
            userRepository.findByEmail.mockResolvedValue({
                ...mockUser,
                lockedUntil: expiredLockout,
                failedLoginAttempts: 5,
            });
            userRepository.getAccountLockStatus.mockReturnValue({
                isLocked: false, // Expired
                lockedUntil: expiredLockout,
                remainingMs: 0,
            });
            userRepository.resetFailedLoginAttempts.mockResolvedValue({
                ...mockUser,
                failedLoginAttempts: 0,
                lockedUntil: null,
            });
            (securityUtil.comparePassword as jest.Mock).mockResolvedValue(true);

            const result = await service.validateCredentials(
                'test@example.com',
                'correctpassword',
            );

            expect(result).toBeDefined();
            expect(userRepository.resetFailedLoginAttempts).toHaveBeenCalled();
        });

        it('should not track attempts for non-existent user', async () => {
            userRepository.findByEmail.mockResolvedValue(null);
            (securityUtil.comparePassword as jest.Mock).mockResolvedValue(
                false,
            );

            await service.validateCredentials(
                'unknown@example.com',
                'anypassword',
            );

            expect(
                userRepository.incrementFailedLoginAttempts,
            ).not.toHaveBeenCalled();
            expect(userRepository.lockAccount).not.toHaveBeenCalled();
        });
    });

    describe('timing attack prevention', () => {
        it('should call comparePassword for both existing and non-existing users', async () => {
            // Test 1: Non-existent user
            userRepository.findByEmail.mockResolvedValue(null);
            (securityUtil.comparePassword as jest.Mock).mockResolvedValue(
                false,
            );

            await service.validateCredentials(
                'unknown@example.com',
                'password',
            );
            expect(securityUtil.comparePassword).toHaveBeenCalledTimes(1);

            jest.clearAllMocks();

            // Test 2: Existing user
            userRepository.findByEmail.mockResolvedValue(mockUser);
            userRepository.getAccountLockStatus.mockReturnValue({
                isLocked: false,
                lockedUntil: null,
                remainingMs: 0,
            });
            (securityUtil.comparePassword as jest.Mock).mockResolvedValue(
                false,
            );
            userRepository.incrementFailedLoginAttempts.mockResolvedValue({
                ...mockUser,
                failedLoginAttempts: 1,
            });

            await service.validateCredentials('test@example.com', 'password');
            expect(securityUtil.comparePassword).toHaveBeenCalledTimes(1);
        });

        it('should use dummy hash when user not found', async () => {
            userRepository.findByEmail.mockResolvedValue(null);
            (securityUtil.comparePassword as jest.Mock).mockResolvedValue(
                false,
            );

            await service.validateCredentials(
                'unknown@example.com',
                'password',
            );

            // Verify comparePassword called with dummy hash (second argument)
            const callArgs = (securityUtil.comparePassword as jest.Mock).mock
                .calls[0];
            expect(callArgs[0]).toBe('password');
            // Second arg should be the dummy hash (starts with $2b$12$)
            expect(callArgs[1]).toMatch(/^\$2b\$12\$/);
        });
    });
});
