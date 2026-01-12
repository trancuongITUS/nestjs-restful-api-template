/**
 * JWT Strategy for access token validation
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../database/repositories/user.repository';
import { JwtPayload } from '../interfaces/auth.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        });
    }

    /**
     * Validate JWT payload and return user data
     */
    async validate(payload: JwtPayload): Promise<JwtPayload> {
        const user = await this.userRepository.findUnique({ id: payload.sub });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('User not found or inactive');
        }

        // Check if password was changed after token was issued
        if (user.passwordChangedAt && payload.iat) {
            const passwordChangedTimestamp = Math.floor(
                user.passwordChangedAt.getTime() / 1000,
            );
            if (passwordChangedTimestamp > payload.iat) {
                throw new UnauthorizedException(
                    'Password was changed. Please login again',
                );
            }
        }

        // Check if tokens were revoked (logout)
        if (user.lastTokenIssuedAt && payload.iat) {
            const revokedAtTimestamp = Math.floor(
                user.lastTokenIssuedAt.getTime() / 1000,
            );
            if (revokedAtTimestamp > payload.iat) {
                throw new UnauthorizedException(
                    'Session has been revoked. Please login again',
                );
            }
        }

        return {
            sub: payload.sub,
            email: payload.email,
            username: payload.username,
            role: payload.role,
        };
    }
}
