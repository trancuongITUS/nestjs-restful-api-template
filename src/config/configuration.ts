/**
 * Application configuration factory
 * Transforms and organizes environment variables into typed configuration objects
 */

import { EnvironmentVariables } from './env.validation';

export interface AppConfig {
    port: number;
    apiPrefix: string;
    environment: string;
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
}

export interface SecurityConfig {
    allowedOrigins: string[];
    maxRequestSize: string;
}

export interface LoggingConfig {
    level: string;
}

export interface RateLimitConfig {
    throttle: {
        ttl: number;
        limit: number;
    };
    short: {
        name: string;
        ttl: number;
        limit: number;
    };
    medium: {
        name: string;
        ttl: number;
        limit: number;
    };
    long: {
        name: string;
        ttl: number;
        limit: number;
    };
}

export interface PerformanceConfig {
    requestTimeout: number;
    cacheTtl: number;
}

export interface DatabaseConfig {
    url: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    name?: string;
    ssl: boolean;
    connectionLimit: number;
    poolTimeout: number;
    prismaQueryEngineLibrary?: string;
    prismaQueryEngineBinary?: string;
}

export interface JwtConfig {
    accessSecret?: string;
    accessExpiresIn: string;
    refreshSecret?: string;
    refreshExpiresIn: string;
}

export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db: number;
}

export interface EmailConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    from?: string;
}

export interface FileStorageConfig {
    uploadDest: string;
    maxFileSize: string;
    allowedFileTypes: string[];
}

export interface Configuration {
    app: AppConfig;
    security: SecurityConfig;
    logging: LoggingConfig;
    rateLimit: RateLimitConfig;
    performance: PerformanceConfig;
    database: DatabaseConfig;
    jwt: JwtConfig;
    redis: RedisConfig;
    email: EmailConfig;
    fileStorage: FileStorageConfig;
}

/**
 * Configuration factory function
 * Transforms environment variables into organized configuration object
 */
export default (): Configuration => {
    const env = process.env as unknown as EnvironmentVariables;

    return {
        app: {
            port: env.PORT,
            apiPrefix: env.API_PREFIX,
            environment: env.NODE_ENV,
            isDevelopment: env.NODE_ENV === 'development',
            isProduction: env.NODE_ENV === 'production',
            isTest: env.NODE_ENV === 'test',
        },

        security: {
            allowedOrigins: env.ALLOWED_ORIGINS.split(',').map((origin) =>
                origin.trim(),
            ),
            maxRequestSize: env.MAX_REQUEST_SIZE,
        },

        logging: {
            level: env.LOG_LEVEL,
        },

        rateLimit: {
            throttle: {
                ttl: env.THROTTLE_TTL!,
                limit: env.THROTTLE_LIMIT!,
            },
            short: {
                name: 'short',
                ttl: env.RATE_LIMIT_SHORT_TTL!,
                limit: env.RATE_LIMIT_SHORT_LIMIT!,
            },
            medium: {
                name: 'medium',
                ttl: env.RATE_LIMIT_MEDIUM_TTL!,
                limit: env.RATE_LIMIT_MEDIUM_LIMIT!,
            },
            long: {
                name: 'long',
                ttl: env.RATE_LIMIT_LONG_TTL!,
                limit: env.RATE_LIMIT_LONG_LIMIT!,
            },
        },

        performance: {
            requestTimeout: Number(env.REQUEST_TIMEOUT) || 30000,
            cacheTtl: Number(env.CACHE_TTL) || 300000,
        },

        database: {
            url: env.DATABASE_URL,
            host: env.DATABASE_HOST,
            port: env.DATABASE_PORT,
            username: env.DATABASE_USERNAME,
            password: env.DATABASE_PASSWORD,
            name: env.DATABASE_NAME,
            ssl: env.DATABASE_SSL!,
            connectionLimit: env.DATABASE_CONNECTION_LIMIT!,
            poolTimeout: env.DATABASE_POOL_TIMEOUT!,
            prismaQueryEngineLibrary: env.PRISMA_QUERY_ENGINE_LIBRARY,
            prismaQueryEngineBinary: env.PRISMA_QUERY_ENGINE_BINARY,
        },

        jwt: {
            accessSecret: env.JWT_ACCESS_SECRET,
            accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN!,
            refreshSecret: env.JWT_REFRESH_SECRET,
            refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN!,
        },

        redis: {
            host: env.REDIS_HOST!,
            port: env.REDIS_PORT!,
            password: env.REDIS_PASSWORD,
            db: env.REDIS_DB!,
        },

        email: {
            host: env.EMAIL_HOST,
            port: env.EMAIL_PORT,
            user: env.EMAIL_USER,
            password: env.EMAIL_PASSWORD,
            from: env.EMAIL_FROM,
        },

        fileStorage: {
            uploadDest: env.UPLOAD_DEST!,
            maxFileSize: env.MAX_FILE_SIZE!,
            allowedFileTypes: env
                .ALLOWED_FILE_TYPES!.split(',')
                .map((type) => type.trim()),
        },
    };
};
