/**
 * JwtStrategy Unit Tests - Token Revocation Validation
 * Tests JWT validation including lastTokenIssuedAt check
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';
import { UserRepository } from '../../database/repositories/user.repository';
import { JwtPayload } from '../interfaces/auth.interface';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let userRepository: UserRepository;

    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        password: 'hashedPassword',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        passwordChangedAt: null,
        lastTokenIssuedAt: null,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        emailVerifiedAt: null,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtStrategy,
                {
                    provide: ConfigService,
                    useValue: {
                        getOrThrow: jest.fn().mockReturnValue('test-secret'),
                    },
                },
                {
                    provide: UserRepository,
                    useValue: {
                        findUnique: jest.fn(),
                    },
                },
            ],
        }).compile();

        strategy = module.get<JwtStrategy>(JwtStrategy);
        userRepository = module.get<UserRepository>(UserRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validate()', () => {
        it('should return payload for valid active user', async () => {
            jest.spyOn(userRepository, 'findUnique').mockResolvedValue(
                mockUser,
            );

            const payload: JwtPayload = {
                sub: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                role: UserRole.USER,
                iat: Math.floor(Date.now() / 1000),
            };

            const result = await strategy.validate(payload);

            expect(result).toEqual({
                sub: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                role: UserRole.USER,
            });
        });

        it('should throw UnauthorizedException if user not found', async () => {
            jest.spyOn(userRepository, 'findUnique').mockResolvedValue(null);

            const payload: JwtPayload = {
                sub: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                role: UserRole.USER,
                iat: Math.floor(Date.now() / 1000),
            };

            await expect(strategy.validate(payload)).rejects.toThrow(
                new UnauthorizedException('User not found or inactive'),
            );
        });

        it('should throw UnauthorizedException if user is inactive', async () => {
            jest.spyOn(userRepository, 'findUnique').mockResolvedValue({
                ...mockUser,
                isActive: false,
            });

            const payload: JwtPayload = {
                sub: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                role: UserRole.USER,
                iat: Math.floor(Date.now() / 1000),
            };

            await expect(strategy.validate(payload)).rejects.toThrow(
                new UnauthorizedException('User not found or inactive'),
            );
        });

        it('should throw UnauthorizedException if password was changed after token issued', async () => {
            const tokenIssuedAt = Math.floor(Date.now() / 1000) - 60; // 1 min ago
            const passwordChangedTime = new Date(); // Now

            jest.spyOn(userRepository, 'findUnique').mockResolvedValue({
                ...mockUser,
                passwordChangedAt: passwordChangedTime,
            });

            const payload: JwtPayload = {
                sub: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                role: UserRole.USER,
                iat: tokenIssuedAt,
            };

            await expect(strategy.validate(payload)).rejects.toThrow(
                new UnauthorizedException(
                    'Password was changed. Please login again',
                ),
            );
        });

        it('should reject token issued before lastTokenIssuedAt (session revoked)', async () => {
            const tokenIssuedAt = Math.floor(Date.now() / 1000) - 60; // 1 min ago
            const logoutTime = new Date(); // Now

            jest.spyOn(userRepository, 'findUnique').mockResolvedValue({
                ...mockUser,
                lastTokenIssuedAt: logoutTime,
            });

            const payload: JwtPayload = {
                sub: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                role: UserRole.USER,
                iat: tokenIssuedAt,
            };

            await expect(strategy.validate(payload)).rejects.toThrow(
                new UnauthorizedException(
                    'Session has been revoked. Please login again',
                ),
            );
        });

        it('should allow token issued after lastTokenIssuedAt (new login after logout)', async () => {
            const logoutTime = new Date(Date.now() - 60000); // 1 min ago
            const tokenIssuedAt = Math.floor(Date.now() / 1000); // Now

            jest.spyOn(userRepository, 'findUnique').mockResolvedValue({
                ...mockUser,
                lastTokenIssuedAt: logoutTime,
            });

            const payload: JwtPayload = {
                sub: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                role: UserRole.USER,
                iat: tokenIssuedAt,
            };

            const result = await strategy.validate(payload);
            expect(result.sub).toBe('user-123');
        });

        it('should allow token when lastTokenIssuedAt is null (never logged out)', async () => {
            jest.spyOn(userRepository, 'findUnique').mockResolvedValue(
                mockUser,
            );

            const payload: JwtPayload = {
                sub: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                role: UserRole.USER,
                iat: Math.floor(Date.now() / 1000),
            };

            const result = await strategy.validate(payload);
            expect(result.sub).toBe('user-123');
        });

        it('should allow token when passwordChangedAt is null (password never changed)', async () => {
            jest.spyOn(userRepository, 'findUnique').mockResolvedValue(
                mockUser,
            );

            const payload: JwtPayload = {
                sub: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                role: UserRole.USER,
                iat: Math.floor(Date.now() / 1000),
            };

            const result = await strategy.validate(payload);
            expect(result.sub).toBe('user-123');
        });
    });
});
