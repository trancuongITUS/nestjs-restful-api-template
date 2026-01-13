/**
 * Authentication interfaces and types
 */

import type { UserRole } from '@prisma/client';

/**
 * JWT token payload (stored in token) - contains only non-PII data
 * PII (email, username) should NOT be stored in JWT tokens
 */
export interface JwtTokenPayload {
    sub: string; // User ID
    role: UserRole;
    iat?: number;
    exp?: number;
}

/**
 * Enriched user context (after DB lookup during validation)
 * Contains PII fetched from database, NOT stored in token
 */
export interface JwtPayload extends JwtTokenPayload {
    email: string;
    username: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
    user: {
        id: string;
        email: string;
        username: string;
        firstName: string;
        lastName: string;
        role: UserRole;
        emailVerified: boolean;
        lastLoginAt: Date | null;
    };
}

export interface RefreshTokenPayload {
    sub: string; // User ID
    tokenId: string; // Session ID
    iat?: number;
    exp?: number;
}

export interface RequestWithUser extends Request {
    user: JwtPayload;
}
