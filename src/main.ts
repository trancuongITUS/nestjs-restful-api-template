import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLogger } from './common/utils/logger.util';
import { ConfigService } from './config';
import { HTTP_STATUS, ERROR_CODE, REGEX_PATTERN } from './common/constants';

async function bootstrap(): Promise<void> {
    // Create NestJS application with custom logger
    const app = await NestFactory.create(AppModule, {
        logger: new AppLogger(),
    });

    // Get configuration service
    const configService = app.get(ConfigService);

    // Global prefix for all routes
    app.setGlobalPrefix(configService.app.apiPrefix);

    // Additional validation pipe (custom pipe is already registered in AppModule)
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // Strip non-whitelisted properties
            forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
            transform: true, // Transform types automatically
            disableErrorMessages: configService.app.isProduction, // Hide detailed validation errors in production
        }),
    );

    // Global guards (Rate limiting is handled by ThrottlerModule automatically)
    // app.useGlobalGuards(new ThrottlerGuard()); // Not needed when using ThrottlerModule

    // Enable shutdown hooks
    app.enableShutdownHooks();

    // Swagger Configuration
    const config = new DocumentBuilder()
        .setTitle('NestJS Restful API Template')
        .setDescription(
            'NestJS Restful API Template Documentation. ' +
                'This API provides comprehensive endpoints for managing employees, authentication, and HR operations.',
        )
        .setVersion('1.0.0')
        .addTag('auth', 'Authentication endpoints')
        .addTag('app', 'Application health and utility endpoints')
        .addTag('examples', 'Example endpoints for testing authentication')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
        )
        .addServer(
            `http://localhost:${configService.app.port}`,
            'Development server',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${configService.app.apiPrefix}/docs`, app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
        customSiteTitle: 'NestJS Restful API Template Documentation',
        customfavIcon: '/favicon.ico',
        customCss: `
            .swagger-ui .topbar { display: none }
            .swagger-ui .info .title { color: #3b82f6 }
        `,
    });

    // CORS configuration (handled by CorsMiddleware in AppModule)
    // Security headers (handled by SecurityMiddleware in AppModule)
    // Request size limiting
    app.use((req: Request, res: Response, next: NextFunction) => {
        const maxSize = configService.security.maxRequestSize;
        const contentLength = req.headers['content-length'];
        if (
            contentLength &&
            parseInt(contentLength) >
                parseInt(maxSize.replace(REGEX_PATTERN.NUMERIC_ONLY, ''))
        ) {
            return res.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json({
                success: false,
                statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
                message: 'Request entity too large',
                error: {
                    code: ERROR_CODE.PAYLOAD_TOO_LARGE,
                    details: `Request size exceeds the maximum allowed size of ${maxSize}`,
                },
                timestamp: new Date().toISOString(),
                path: req.url,
            });
        }
        next();
    });

    // Start the application
    const port = configService.app.port;
    await app.listen(port);

    // Log application startup
    const logger = new AppLogger('Bootstrap');
    logger.log(
        `🚀 Application is running on: http://localhost:${port}/${configService.app.apiPrefix}`,
    );
    logger.log(
        `📚 Swagger documentation available at: http://localhost:${port}/${configService.app.apiPrefix}/docs`,
    );
    logger.log(`📝 Environment: ${configService.app.environment}`);
    logger.log(`🛡️  Security middlewares enabled`);
    logger.log(`📊 Logging and monitoring active`);
    logger.log(`✅ All middlewares configured successfully`);
}

bootstrap().catch((error: Error) => {
    const logger = new AppLogger('Bootstrap');
    logger.error(
        '❌ Failed to start the application',
        error.stack || 'No stack trace',
    );
    process.exit(1);
});
