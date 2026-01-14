import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_PIPE, APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SecurityMiddleware } from './core/middlewares/security.middleware';
import { CorsMiddleware } from './core/middlewares/cors.middleware';
import { CompressionMiddleware } from './core/middlewares/compression.middleware';
import { RequestContextMiddleware } from './core/middlewares/request-context.middleware';
import { ValidationPipe } from './core/pipes/validation.pipe';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import {
    LoggingInterceptor,
    TransformInterceptor,
    TimeoutInterceptor,
    CachingInterceptor,
    MetricsInterceptor,
    ValidationInterceptor,
} from './core/interceptors';
import { ConfigModule, ConfigService } from './config';
import { PrismaModule } from './database';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { TasksModule } from './tasks';
import { AuditInterceptor } from './audit/interceptors';
import { GlobalJwtAuthGuard } from './auth/guards/global-jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { TIMEOUT_MS } from './common/constants';

@Module({
    imports: [
        // Configuration module (global)
        ConfigModule,

        // Database module (global)
        PrismaModule,

        // Event emitter module (global) for async audit logging
        EventEmitterModule.forRoot({
            // Use this name as a delimiter to segment namespaces
            delimiter: '.',
            // Set this to true if you want to emit events in newListener event
            newListener: false,
            // Set this to true if you want to emit events in removeListener event
            removeListener: false,
            // Set this to true to enable wildcards
            wildcard: false,
            // Set this to false to emit maxListeners exceeded warning
            verboseMemoryLeak: false,
            // Set this to true to disable throwing uncaughtException if an error event is emitted and it has no listeners
            ignoreErrors: false,
        }),

        // Audit logging module (must come after EventEmitterModule)
        AuditModule,

        // Scheduled tasks module
        TasksModule,

        // Authentication module
        AuthModule,

        // Rate limiting configuration using ConfigService
        ThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => [
                {
                    name: configService.rateLimit.short.name,
                    ttl: configService.rateLimit.short.ttl,
                    limit: configService.rateLimit.short.limit,
                },
                {
                    name: configService.rateLimit.medium.name,
                    ttl: configService.rateLimit.medium.ttl,
                    limit: configService.rateLimit.medium.limit,
                },
                {
                    name: configService.rateLimit.long.name,
                    ttl: configService.rateLimit.long.ttl,
                    limit: configService.rateLimit.long.limit,
                },
            ],
        }),
    ],
    controllers: [AppController],
    providers: [
        AppService,
        // Timeout configuration using ConfigService
        {
            provide: TIMEOUT_MS,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) =>
                configService.performance.requestTimeout,
        },
        // Global pipes
        {
            provide: APP_PIPE,
            useClass: ValidationPipe,
        },
        // Global filters
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
        // Global interceptors (order matters - they execute in reverse order)
        {
            provide: APP_INTERCEPTOR,
            useClass: AuditInterceptor, // Must be first to capture all requests
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ValidationInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: CachingInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: MetricsInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TransformInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TimeoutInterceptor,
        },
        // Global guards (order matters - authentication before authorization)
        {
            provide: APP_GUARD,
            useClass: GlobalJwtAuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: RolesGuard,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        // Middleware providers
        SecurityMiddleware,
        CorsMiddleware,
        CompressionMiddleware,
        RequestContextMiddleware,
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                SecurityMiddleware, // Security headers (Helmet)
                CorsMiddleware, // CORS handling
                RequestContextMiddleware, // Request context and ID generation
                CompressionMiddleware, // Response compression
            )
            .forRoutes('/*path'); // Apply to all routes using correct path-to-regexp syntax
    }
}
