/**
 * Authentication Module
 * Configures JWT, Passport strategies, and authentication services
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PasswordValidationService } from './services/password-validation.service';
import { UserRepository } from '../database/repositories/user.repository';
import { UserSessionRepository } from '../database/repositories/user-session.repository';
import { PrismaModule } from '../database/prisma.module';

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>(
                        'JWT_ACCESS_EXPIRES_IN',
                        '15m',
                    ),
                },
            }),
            inject: [ConfigService],
        }),
        PrismaModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        PasswordValidationService,
        JwtStrategy,
        JwtRefreshStrategy,
        LocalStrategy,
        UserRepository,
        UserSessionRepository,
    ],
    exports: [AuthService, JwtModule],
})
export class AuthModule {}
