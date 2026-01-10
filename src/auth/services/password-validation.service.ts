/**
 * Password Validation Service
 * Handles password validation and user credential verification
 * Provides centralized authentication logic used by both AuthService and LocalStrategy
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { User } from '@prisma/client';
import { UserRepository } from '../../database/repositories/user.repository';
import {
    comparePassword,
    stripPassword,
} from '../../common/utils/security.util';
import {
    AUTH,
    AUTH_ERROR_MESSAGES,
} from '../../common/constants/security.constants';
import { AuditAction, AuditResource } from '../../audit/enums';

@Injectable()
export class PasswordValidationService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Validate user credentials by email and password
     * Implements brute-force protection with account lockout
     */
    async validateCredentials(
        email: string,
        password: string,
    ): Promise<Omit<User, 'password'> | null> {
        const user = await this.userRepository.findByEmail(email);

        // User not found - return null (don't track non-existent accounts)
        if (!user) {
            return null;
        }

        // Check if account is inactive
        if (!user.isActive) {
            return null;
        }

        // Check if account is locked
        const lockStatus = this.userRepository.getAccountLockStatus(user);
        if (lockStatus.isLocked) {
            // Emit audit event for locked account login attempt
            this.eventEmitter.emit('audit.log', {
                userId: user.id,
                username: user.username,
                userRole: user.role,
                action: AuditAction.LOCKED_ACCOUNT_LOGIN_ATTEMPT,
                resource: AuditResource.AUTH,
                resourceId: user.id,
                method: 'POST',
                endpoint: '/auth/login',
                statusCode: 401,
                errorMessage: AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED,
                metadata: {
                    email,
                    remainingLockoutMs: lockStatus.remainingMs,
                    lockedUntil: lockStatus.lockedUntil,
                },
            });

            throw new UnauthorizedException(AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED);
        }

        // Validate password
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            // Increment failed attempts
            const updatedUser =
                await this.userRepository.incrementFailedLoginAttempts(user.id);

            // Check if threshold reached - lock account
            if (updatedUser.failedLoginAttempts >= AUTH.MAX_LOGIN_ATTEMPTS) {
                await this.userRepository.lockAccount(
                    user.id,
                    AUTH.LOCKOUT_DURATION_MS,
                );

                // Emit audit event for account lockout
                this.eventEmitter.emit('audit.log', {
                    userId: user.id,
                    username: user.username,
                    userRole: user.role,
                    action: AuditAction.ACCOUNT_LOCKED,
                    resource: AuditResource.AUTH,
                    resourceId: user.id,
                    method: 'POST',
                    endpoint: '/auth/login',
                    statusCode: 401,
                    errorMessage: 'Account locked due to exceeded failed login attempts',
                    metadata: {
                        email,
                        failedAttempts: updatedUser.failedLoginAttempts,
                        maxAttempts: AUTH.MAX_LOGIN_ATTEMPTS,
                        lockoutDurationMs: AUTH.LOCKOUT_DURATION_MS,
                    },
                });
            }

            return null;
        }

        // Successful login - reset failed attempts
        await this.userRepository.resetFailedLoginAttempts(user.id);

        return stripPassword(user);
    }
}
