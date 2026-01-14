/**
 * Environment variable validation schema using Joi
 * Validates and transforms environment variables at application startup
 */

import * as Joi from 'joi';

export interface EnvironmentVariables {
    // Application
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: number;
    API_PREFIX: string;

    // Security
    ALLOWED_ORIGINS: string;
    MAX_REQUEST_SIZE: string;

    // Logging
    LOG_LEVEL: 'error' | 'warn' | 'log' | 'debug' | 'verbose';

    // Rate Limiting
    THROTTLE_TTL?: number;
    THROTTLE_LIMIT?: number;
    RATE_LIMIT_SHORT_TTL?: number;
    RATE_LIMIT_SHORT_LIMIT?: number;
    RATE_LIMIT_MEDIUM_TTL?: number;
    RATE_LIMIT_MEDIUM_LIMIT?: number;
    RATE_LIMIT_LONG_TTL?: number;
    RATE_LIMIT_LONG_LIMIT?: number;

    // Performance
    REQUEST_TIMEOUT?: number;
    CACHE_TTL?: number;

    // Database (required for Prisma)
    DATABASE_URL: string;
    DATABASE_HOST?: string;
    DATABASE_PORT?: number;
    DATABASE_USERNAME?: string;
    DATABASE_PASSWORD?: string;
    DATABASE_NAME?: string;
    DATABASE_SSL?: boolean;

    // Prisma-specific configuration
    PRISMA_QUERY_ENGINE_LIBRARY?: string;
    PRISMA_QUERY_ENGINE_BINARY?: string;
    DATABASE_CONNECTION_LIMIT?: number;
    DATABASE_POOL_TIMEOUT?: number;

    // JWT (required for authentication)
    JWT_ACCESS_SECRET: string;
    JWT_ACCESS_EXPIRES_IN?: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRES_IN?: string;

    // Redis (optional - add when needed)
    REDIS_HOST?: string;
    REDIS_PORT?: number;
    REDIS_PASSWORD?: string;
    REDIS_DB?: number;

    // External Services (optional - add when needed)
    EMAIL_HOST?: string;
    EMAIL_PORT?: number;
    EMAIL_USER?: string;
    EMAIL_PASSWORD?: string;
    EMAIL_FROM?: string;

    // File Storage (optional - add when needed)
    UPLOAD_DEST?: string;
    MAX_FILE_SIZE?: string;
    ALLOWED_FILE_TYPES?: string;

    // Audit Retention (optional - for scheduled cleanup)
    AUDIT_RETENTION_ENABLED?: boolean;
    AUDIT_RETENTION_DAYS?: number;
    AUDIT_RETENTION_CRON?: string;
}

export const validationSchema = Joi.object<EnvironmentVariables>({
    // Application - Required
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development')
        .description('Application environment'),

    PORT: Joi.number().port().default(3000).description('Application port'),

    API_PREFIX: Joi.string().default('api/v1').description('API route prefix'),

    // Security - Required
    ALLOWED_ORIGINS: Joi.string()
        .default(
            'http://localhost:3000,http://localhost:3001,http://localhost:4200',
        )
        .description('Comma-separated list of allowed CORS origins'),

    MAX_REQUEST_SIZE: Joi.string()
        .pattern(/^\d+[kmg]?b$/i)
        .default('10mb')
        .description('Maximum request body size'),

    // Logging - Required
    LOG_LEVEL: Joi.string()
        .valid('error', 'warn', 'log', 'debug', 'verbose')
        .default('log')
        .description('Application log level'),

    // Rate Limiting - Optional with defaults
    THROTTLE_TTL: Joi.number()
        .positive()
        .default(60000)
        .description('General throttle TTL in milliseconds'),

    THROTTLE_LIMIT: Joi.number()
        .positive()
        .default(10)
        .description('General throttle limit'),

    RATE_LIMIT_SHORT_TTL: Joi.number()
        .positive()
        .default(1000)
        .description('Short rate limit TTL in milliseconds'),

    RATE_LIMIT_SHORT_LIMIT: Joi.number()
        .positive()
        .default(3)
        .description('Short rate limit requests count'),

    RATE_LIMIT_MEDIUM_TTL: Joi.number()
        .positive()
        .default(10000)
        .description('Medium rate limit TTL in milliseconds'),

    RATE_LIMIT_MEDIUM_LIMIT: Joi.number()
        .positive()
        .default(20)
        .description('Medium rate limit requests count'),

    RATE_LIMIT_LONG_TTL: Joi.number()
        .positive()
        .default(60000)
        .description('Long rate limit TTL in milliseconds'),

    RATE_LIMIT_LONG_LIMIT: Joi.number()
        .positive()
        .default(100)
        .description('Long rate limit requests count'),

    // Performance - Optional with defaults
    REQUEST_TIMEOUT: Joi.number()
        .positive()
        .default(30000)
        .description('Request timeout in milliseconds'),

    CACHE_TTL: Joi.number()
        .positive()
        .default(300000)
        .description('Cache TTL in milliseconds'),

    // Database - Required for Prisma
    DATABASE_URL: Joi.string()
        .uri()
        .required()
        .description('Prisma database connection URL (required)'),

    // Optional individual database connection parameters (for non-Prisma usage)
    DATABASE_HOST: Joi.string()
        .hostname()
        .optional()
        .description('Database host'),

    DATABASE_PORT: Joi.number().port().optional().description('Database port'),

    DATABASE_USERNAME: Joi.string().optional().description('Database username'),

    DATABASE_PASSWORD: Joi.string().optional().description('Database password'),

    DATABASE_NAME: Joi.string().optional().description('Database name'),

    DATABASE_SSL: Joi.boolean()
        .default(false)
        .description('Enable database SSL connection'),

    // Prisma-specific configuration
    PRISMA_QUERY_ENGINE_LIBRARY: Joi.string()
        .optional()
        .description('Prisma query engine library path'),

    PRISMA_QUERY_ENGINE_BINARY: Joi.string()
        .optional()
        .description('Prisma query engine binary path'),

    DATABASE_CONNECTION_LIMIT: Joi.number()
        .positive()
        .default(10)
        .description('Maximum database connection pool size'),

    DATABASE_POOL_TIMEOUT: Joi.number()
        .positive()
        .default(20000)
        .description('Database connection pool timeout in milliseconds'),

    // JWT - Required for security
    JWT_ACCESS_SECRET: Joi.string()
        .min(32)
        .required()
        .description('JWT access token secret key (minimum 32 characters)'),

    JWT_ACCESS_EXPIRES_IN: Joi.string()
        .pattern(/^\d+[smhdwy]$/)
        .default('15m')
        .description('JWT access token expiration time'),

    JWT_REFRESH_SECRET: Joi.string()
        .min(32)
        .required()
        .description('JWT refresh token secret key'),

    JWT_REFRESH_EXPIRES_IN: Joi.string()
        .pattern(/^\d+[smhdwy]$/)
        .default('7d')
        .description('JWT refresh token expiration time'),

    // Redis - Optional
    REDIS_HOST: Joi.string()
        .hostname()
        .default('localhost')
        .description('Redis host'),

    REDIS_PORT: Joi.number().port().default(6379).description('Redis port'),

    REDIS_PASSWORD: Joi.string().optional().description('Redis password'),

    REDIS_DB: Joi.number()
        .min(0)
        .max(15)
        .default(0)
        .description('Redis database number'),

    // Email - Optional
    EMAIL_HOST: Joi.string()
        .hostname()
        .optional()
        .description('Email server host'),

    EMAIL_PORT: Joi.number().port().optional().description('Email server port'),

    EMAIL_USER: Joi.string().optional().description('Email server username'),

    EMAIL_PASSWORD: Joi.string()
        .optional()
        .description('Email server password'),

    EMAIL_FROM: Joi.string()
        .email()
        .optional()
        .description('Default email sender address'),

    // File Storage - Optional
    UPLOAD_DEST: Joi.string()
        .default('./uploads')
        .description('File upload destination directory'),

    MAX_FILE_SIZE: Joi.string()
        .pattern(/^\d+[kmg]?b$/i)
        .default('5mb')
        .description('Maximum file upload size'),

    ALLOWED_FILE_TYPES: Joi.string()
        .default('image/jpeg,image/png,image/gif,application/pdf')
        .description('Comma-separated list of allowed file MIME types'),

    // Audit Retention - Optional with defaults
    AUDIT_RETENTION_ENABLED: Joi.boolean()
        .default(true)
        .description('Enable/disable audit log retention cleanup'),

    AUDIT_RETENTION_DAYS: Joi.number()
        .integer()
        .min(1)
        .max(3650)
        .default(90)
        .description('Number of days to retain audit logs'),

    AUDIT_RETENTION_CRON: Joi.string()
        .default('0 0 * * 0')
        .description(
            'Cron expression for retention cleanup (default: weekly Sunday midnight)',
        ),
});
