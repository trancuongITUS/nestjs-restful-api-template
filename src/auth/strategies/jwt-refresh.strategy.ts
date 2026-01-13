/**
 * JWT Refresh Strategy for refresh token validation
 * Note: This strategy is primarily for demonstration.
 * For refresh tokens, manual validation in the service is often preferred.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../database/repositories/user.repository';
import { RefreshTokenPayload } from '../interfaces/auth.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
    Strategy,
    'jwt-refresh',
) {
    constructor(
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        });
    }

    /**
     * Validate refresh token payload and return user data
     */
    async validate(payload: RefreshTokenPayload): Promise<RefreshTokenPayload> {
        const user = await this.userRepository.findUnique({ id: payload.sub });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('User not found or inactive');
        }

        return payload;
    }
}
