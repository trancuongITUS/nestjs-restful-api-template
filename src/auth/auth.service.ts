/**
 * Authentication Service
 * Handles user authentication, JWT token generation, and session management
 */

import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { User } from '@prisma/client';
import type { Request } from 'express';
import { UserRepository } from '../database/repositories/user.repository';
import { UserSessionRepository } from '../database/repositories/user-session.repository';
import { PrismaService } from '../database/prisma.service';
import {
    JwtTokenPayload,
    AuthTokens,
    LoginResponse,
    RefreshTokenPayload,
} from './interfaces/auth.interface';
import { RegisterDto, LoginDto } from './dto';
import { PasswordValidationService } from './services/password-validation.service';
import {
    hashPassword,
    comparePassword,
    getRefreshTokenExpiry,
} from '../common/utils/security.util';
import { AUTH_ERROR_MESSAGES } from '../common/constants/security.constants';
import { IAuditEvent } from '../audit/interfaces';
import { AuditAction, AuditResource } from '../audit/enums';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
        private readonly userRepository: UserRepository,
        private readonly userSessionRepository: UserSessionRepository,
        private readonly passwordValidationService: PasswordValidationService,
        private readonly prisma: PrismaService,
    ) {}

    /**
     * Validate user credentials for local strategy
     */
    async validateUser(
        email: string,
        password: string,
    ): Promise<Omit<User, 'password'> | null> {
        return this.passwordValidationService.validateCredentials(
            email,
            password,
        );
    }

    /**
     * Register a new user
     */
    async register(
        registerDto: RegisterDto,
        req?: Request,
    ): Promise<LoginResponse> {
        // Check if user already exists
        const existingUserByEmail = await this.userRepository.findByEmail(
            registerDto.email,
        );
        if (existingUserByEmail) {
            throw new ConflictException(AUTH_ERROR_MESSAGES.EMAIL_EXISTS);
        }

        const existingUserByUsername = await this.userRepository.findByUsername(
            registerDto.username,
        );
        if (existingUserByUsername) {
            throw new ConflictException(AUTH_ERROR_MESSAGES.USERNAME_TAKEN);
        }

        // Hash password
        const hashedPassword = await hashPassword(registerDto.password);

        // Create user
        const user = await this.userRepository.create({
            email: registerDto.email,
            username: registerDto.username,
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
            password: hashedPassword,
        });

        // Generate tokens and create session
        const tokens = await this.generateTokens(user);
        const refreshTokenExpiry = getRefreshTokenExpiry();

        const session = await this.userSessionRepository.createSession(
            user.id,
            tokens.refreshToken,
            refreshTokenExpiry,
        );

        // Update last login
        await this.userRepository.update(
            { id: user.id },
            { lastLoginAt: new Date() },
        );

        // Emit audit event
        if (req) {
            this.emitAuditEvent({
                userId: user.id,
                username: user.username,
                userRole: user.role,
                action: AuditAction.REGISTER,
                resource: AuditResource.AUTH,
                resourceId: user.id,
                method: 'POST',
                endpoint: '/auth/register',
                ipAddress: this.getClientIp(req),
                userAgent: req.headers['user-agent'],
                sessionId: session.id,
                statusCode: 201,
                metadata: {
                    email: user.email,
                    emailVerified: user.emailVerified,
                },
            });
        }

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                emailVerified: user.emailVerified,
                lastLoginAt: new Date(),
            },
        };
    }

    /**
     * Login user and return tokens
     */
    async login(loginDto: LoginDto, req?: Request): Promise<LoginResponse> {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException(
                AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
            );
        }

        // Generate tokens and create session
        const tokens = await this.generateTokens(user);
        const refreshTokenExpiry = getRefreshTokenExpiry();

        const session = await this.userSessionRepository.createSession(
            user.id,
            tokens.refreshToken,
            refreshTokenExpiry,
        );

        // Update last login
        await this.userRepository.update(
            { id: user.id },
            { lastLoginAt: new Date() },
        );

        // Emit audit event
        if (req) {
            this.emitAuditEvent({
                userId: user.id,
                username: user.username,
                userRole: user.role,
                action: AuditAction.LOGIN,
                resource: AuditResource.AUTH,
                resourceId: user.id,
                method: 'POST',
                endpoint: '/auth/login',
                ipAddress: this.getClientIp(req),
                userAgent: req.headers['user-agent'],
                sessionId: session.id,
                statusCode: 200,
                metadata: {
                    email: user.email,
                    emailVerified: user.emailVerified,
                    loginMethod: 'password',
                },
            });
        }

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                emailVerified: user.emailVerified,
                lastLoginAt: new Date(),
            },
        };
    }

    /**
     * Refresh access token using refresh token.
     * Uses atomic transaction with row-level lock to prevent race conditions (TOCTOU).
     * Concurrent requests with same token: first succeeds, others get 401.
     */
    async refreshToken(
        refreshToken: string,
        req?: Request,
    ): Promise<AuthTokens> {
        try {
            // Verify JWT signature first (fast fail before DB transaction)
            this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
                secret: this.configService.getOrThrow<string>(
                    'JWT_REFRESH_SECRET',
                ),
            });
        } catch {
            throw new UnauthorizedException(
                AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN,
            );
        }

        // Atomic transaction with row-level lock prevents race condition
        const result = await this.prisma.executeTransaction(
            async (tx) => {
                // 1. Lock & fetch session (exclusive lock via FOR UPDATE NOWAIT)
                const session =
                    await this.userSessionRepository.findByRefreshTokenForUpdate(
                        refreshToken,
                        tx,
                    );

                // 2. Validate inside transaction (now atomic)
                if (!session) {
                    throw new UnauthorizedException(
                        AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN,
                    );
                }

                if (session.revokedAt || session.expiresAt < new Date()) {
                    throw new UnauthorizedException(
                        AUTH_ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED,
                    );
                }

                // 3. Fetch user (separate query to avoid lock on users table)
                const user = await this.userRepository.findUnique({
                    id: session.userId,
                });

                if (!user || !user.isActive) {
                    throw new UnauthorizedException(
                        AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN,
                    );
                }

                // 4. Generate new tokens
                const tokens = await this.generateTokens(user);
                const newExpiry = getRefreshTokenExpiry();

                // 5. Atomic rotation (all within same transaction)
                const newSession =
                    await this.userSessionRepository.rotateSession(
                        refreshToken,
                        user.id,
                        tokens.refreshToken,
                        newExpiry,
                        req?.headers['user-agent'],
                        this.getClientIp(req),
                        tx,
                    );

                return {
                    tokens,
                    user,
                    oldSessionId: session.id,
                    newSession,
                };
            },
            {
                isolationLevel: 'ReadCommitted',
                timeout: 5000,
                maxWait: 2000,
            },
        );

        // 6. Emit audit event (outside transaction for non-blocking)
        if (req) {
            this.emitAuditEvent({
                userId: result.user.id,
                username: result.user.username,
                userRole: result.user.role,
                action: AuditAction.REFRESH_TOKEN,
                resource: AuditResource.AUTH,
                resourceId: result.user.id,
                method: 'POST',
                endpoint: '/auth/refresh',
                ipAddress: this.getClientIp(req),
                userAgent: req.headers['user-agent'],
                sessionId: result.newSession.id,
                statusCode: 200,
                metadata: {
                    oldSessionId: result.oldSessionId,
                    newSessionId: result.newSession.id,
                },
            });
        }

        return result.tokens;
    }

    /**
     * Logout user by revoking refresh token
     */
    async logout(
        refreshToken: string,
        userId?: string,
        username?: string,
        userRole?: string,
        req?: Request,
    ): Promise<void> {
        try {
            await this.userSessionRepository.revokeSession(refreshToken);

            // Invalidate all access tokens by updating timestamp
            if (userId) {
                await this.userRepository.update(
                    { id: userId },
                    { lastTokenIssuedAt: new Date() },
                );
            } else {
                this.logger.warn(
                    'Logout called without userId - access tokens will remain valid until expiry',
                );
            }

            // Emit audit event
            if (req && userId) {
                this.emitAuditEvent({
                    userId,
                    username,
                    userRole,
                    action: AuditAction.LOGOUT,
                    resource: AuditResource.AUTH,
                    resourceId: userId,
                    method: 'POST',
                    endpoint: '/auth/logout',
                    ipAddress: this.getClientIp(req),
                    userAgent: req.headers['user-agent'],
                    statusCode: 204,
                    metadata: {
                        logoutMethod: 'single_device',
                    },
                });
            }
        } catch (error) {
            // Log error but don't fail - token might already be revoked
            this.logger.warn(
                `Logout failed for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    /**
     * Logout user from all devices
     */
    async logoutAllDevices(
        userId: string,
        username?: string,
        userRole?: string,
        req?: Request,
    ): Promise<void> {
        await this.userSessionRepository.revokeAllUserSessions(userId);

        // Invalidate all access tokens
        await this.userRepository.update(
            { id: userId },
            { lastTokenIssuedAt: new Date() },
        );

        // Emit audit event
        if (req) {
            this.emitAuditEvent({
                userId,
                username,
                userRole,
                action: AuditAction.LOGOUT,
                resource: AuditResource.AUTH,
                resourceId: userId,
                method: 'POST',
                endpoint: '/auth/logout-all',
                ipAddress: this.getClientIp(req),
                userAgent: req.headers['user-agent'],
                statusCode: 204,
                metadata: {
                    logoutMethod: 'all_devices',
                },
            });
        }
    }

    /**
     * Generate JWT access and refresh tokens
     */
    private async generateTokens(
        user: Pick<User, 'id' | 'role'>,
    ): Promise<AuthTokens> {
        // JWT payload contains only non-PII data (sub, role)
        // PII (email, username) is fetched from DB during token validation
        const jwtPayload: JwtTokenPayload = {
            sub: user.id,
            role: user.role,
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(jwtPayload, {
                secret: this.configService.getOrThrow<string>(
                    'JWT_ACCESS_SECRET',
                ),
                expiresIn: this.configService.get<string>(
                    'JWT_ACCESS_EXPIRES_IN',
                    '15m',
                ),
            }),
            this.jwtService.signAsync(
                { sub: user.id },
                {
                    secret: this.configService.getOrThrow<string>(
                        'JWT_REFRESH_SECRET',
                    ),
                    expiresIn: this.configService.get<string>(
                        'JWT_REFRESH_EXPIRES_IN',
                        '7d',
                    ),
                },
            ),
        ]);

        return {
            accessToken,
            refreshToken,
        };
    }

    /**
     * Change user password
     */
    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string,
        req?: Request,
    ): Promise<void> {
        const user = await this.userRepository.findUnique({ id: userId });
        if (!user) {
            throw new BadRequestException(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Verify current password
        const isCurrentPasswordValid = await comparePassword(
            currentPassword,
            user.password,
        );
        if (!isCurrentPasswordValid) {
            throw new UnauthorizedException(
                AUTH_ERROR_MESSAGES.INCORRECT_PASSWORD,
            );
        }

        // Hash new password
        const hashedNewPassword = await hashPassword(newPassword);

        // Update password and set password changed timestamp
        await this.userRepository.update(
            { id: userId },
            {
                password: hashedNewPassword,
                passwordChangedAt: new Date(),
            },
        );

        // Revoke all user sessions to force re-login
        await this.userSessionRepository.revokeAllUserSessions(userId);

        // Emit audit event
        if (req) {
            this.emitAuditEvent({
                userId,
                username: user.username,
                userRole: user.role,
                action: AuditAction.CHANGE_PASSWORD,
                resource: AuditResource.USER,
                resourceId: userId,
                method: 'POST',
                endpoint: '/auth/change-password',
                ipAddress: this.getClientIp(req),
                userAgent: req.headers['user-agent'],
                statusCode: 204,
                metadata: {
                    passwordChangedAt: new Date().toISOString(),
                    allSessionsRevoked: true,
                },
            });
        }
    }

    /**
     * Get user profile
     */
    async getProfile(userId: string): Promise<Omit<User, 'password'>> {
        const user = await this.userRepository.findUnique({ id: userId });
        if (!user) {
            throw new BadRequestException(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userProfile } = user;
        return userProfile;
    }

    /**
     * Extract client IP address from request
     */
    private getClientIp(req?: Request): string | undefined {
        if (!req) return undefined;
        return (
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            req.ip ||
            req.socket?.remoteAddress ||
            'unknown'
        );
    }

    /**
     * Emit audit event for authentication actions
     */
    private emitAuditEvent(event: IAuditEvent): void {
        try {
            this.eventEmitter.emit('audit.log.created', event);
        } catch (error) {
            // Silent fail - audit should not break authentication flow
            // Error will be logged by EventEmitter
        }
    }
}
