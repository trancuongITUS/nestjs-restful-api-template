/**
 * UserSession repository implementation
 * Manages JWT refresh tokens and user sessions
 */

import { Injectable } from '@nestjs/common';
import { Prisma, UserSession } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UserSessionRepository {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Find session by refresh token
     */
    async findByRefreshToken(refreshToken: string) {
        return this.prisma.userSession.findUnique({
            where: { refreshToken },
        });
    }

    /**
     * Find session by refresh token with user details
     */
    async findByRefreshTokenWithUser(refreshToken: string) {
        return this.prisma.userSession.findUnique({
            where: { refreshToken },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        isActive: true,
                    },
                },
            },
        });
    }

    /**
     * Find active sessions for a user
     */
    async findActiveSessionsForUser(userId: string) {
        return this.prisma.userSession.findMany({
            where: {
                userId,
                revokedAt: null,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });
    }

    /**
     * Create new session for user
     */
    async createSession(userId: string, refreshToken: string, expiresAt: Date) {
        return this.prisma.userSession.create({
            data: {
                user: { connect: { id: userId } },
                refreshToken,
                expiresAt,
            },
        });
    }

    /**
     * Revoke session by refresh token
     */
    async revokeSession(refreshToken: string) {
        return this.prisma.userSession.update({
            where: { refreshToken },
            data: { revokedAt: new Date() },
        });
    }

    /**
     * Revoke all sessions for a user
     */
    async revokeAllUserSessions(userId: string) {
        return this.prisma.userSession.updateMany({
            where: {
                userId,
                revokedAt: null,
            },
            data: { revokedAt: new Date() },
        });
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions() {
        return this.prisma.userSession.deleteMany({
            where: {
                OR: [
                    {
                        expiresAt: {
                            lt: new Date(),
                        },
                    },
                    {
                        revokedAt: {
                            not: null,
                            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        },
                    },
                ],
            },
        });
    }

    /**
     * Check if session is valid
     */
    async isSessionValid(refreshToken: string): Promise<boolean> {
        const session = await this.prisma.userSession.findUnique({
            where: { refreshToken },
        });

        if (!session) {
            return false;
        }

        return session.revokedAt === null && session.expiresAt > new Date();
    }

    /**
     * Get session statistics for a user
     */
    async getUserSessionStats(userId: string) {
        const [activeCount, totalCount, expiredCount] = await Promise.all([
            this.prisma.userSession.count({
                where: {
                    userId,
                    revokedAt: null,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            }),
            this.prisma.userSession.count({ where: { userId } }),
            this.prisma.userSession.count({
                where: {
                    userId,
                    expiresAt: {
                        lt: new Date(),
                    },
                },
            }),
        ]);

        return {
            active: activeCount,
            total: totalCount,
            expired: expiredCount,
            revoked: totalCount - activeCount - expiredCount,
        };
    }

    /**
     * Find session by refresh token with exclusive row lock for atomic operations.
     * Uses FOR UPDATE NOWAIT to prevent race conditions during token refresh.
     * Must be called within a transaction context.
     * @throws Error if row is already locked (concurrent request)
     */
    async findByRefreshTokenForUpdate(
        refreshToken: string,
        tx: Prisma.TransactionClient,
    ): Promise<UserSession | null> {
        const sessions = await tx.$queryRaw<UserSession[]>`
            SELECT * FROM "user_sessions"
            WHERE "refresh_token" = ${refreshToken}
            FOR UPDATE NOWAIT
        `;
        return sessions[0] || null;
    }

    /**
     * Atomically rotate session: revoke old token and create new session.
     * Must be called within a transaction context after acquiring lock.
     */
    async rotateSession(
        oldToken: string,
        userId: string,
        newToken: string,
        expiresAt: Date,
        userAgent: string | undefined,
        ipAddress: string | undefined,
        tx: Prisma.TransactionClient,
    ): Promise<UserSession> {
        // Revoke old session
        await tx.userSession.update({
            where: { refreshToken: oldToken },
            data: { revokedAt: new Date() },
        });
        // Create new session
        return tx.userSession.create({
            data: {
                userId,
                refreshToken: newToken,
                expiresAt,
                userAgent,
                ipAddress,
            },
        });
    }
}
