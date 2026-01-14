/**
 * Typed configuration service
 * Provides type-safe access to configuration values throughout the application
 */

import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import {
    Configuration,
    AppConfig,
    SecurityConfig,
    LoggingConfig,
    RateLimitConfig,
    PerformanceConfig,
    DatabaseConfig,
    JwtConfig,
    RedisConfig,
    EmailConfig,
    FileStorageConfig,
    AuditRetentionConfig,
} from './configuration';

@Injectable()
export class ConfigService {
    constructor(
        private readonly configService: NestConfigService<Configuration>,
    ) {}

    /**
     * Get application configuration
     */
    get app(): AppConfig {
        return this.configService.get<AppConfig>('app', { infer: true })!;
    }

    /**
     * Get security configuration
     */
    get security(): SecurityConfig {
        return this.configService.get<SecurityConfig>('security', {
            infer: true,
        })!;
    }

    /**
     * Get logging configuration
     */
    get logging(): LoggingConfig {
        return this.configService.get<LoggingConfig>('logging', {
            infer: true,
        })!;
    }

    /**
     * Get rate limiting configuration
     */
    get rateLimit(): RateLimitConfig {
        return this.configService.get<RateLimitConfig>('rateLimit', {
            infer: true,
        })!;
    }

    /**
     * Get performance configuration
     */
    get performance(): PerformanceConfig {
        return this.configService.get<PerformanceConfig>('performance', {
            infer: true,
        })!;
    }

    /**
     * Get database configuration
     */
    get database(): DatabaseConfig {
        return this.configService.get<DatabaseConfig>('database', {
            infer: true,
        })!;
    }

    /**
     * Get JWT configuration
     */
    get jwt(): JwtConfig {
        return this.configService.get<JwtConfig>('jwt', { infer: true })!;
    }

    /**
     * Get Redis configuration
     */
    get redis(): RedisConfig {
        return this.configService.get<RedisConfig>('redis', { infer: true })!;
    }

    /**
     * Get email configuration
     */
    get email(): EmailConfig {
        return this.configService.get<EmailConfig>('email', { infer: true })!;
    }

    /**
     * Get file storage configuration
     */
    get fileStorage(): FileStorageConfig {
        return this.configService.get<FileStorageConfig>('fileStorage', {
            infer: true,
        })!;
    }

    /**
     * Get audit retention configuration
     */
    get auditRetention(): AuditRetentionConfig {
        return this.configService.get<AuditRetentionConfig>('auditRetention', {
            infer: true,
        })!;
    }

    /**
     * Check if a configuration value exists and is not undefined/null
     */
    isDefined(key: keyof Configuration): boolean {
        const value = this.configService.get(key);
        return value !== undefined && value !== null;
    }

    /**
     * Get a specific nested configuration value with type safety
     * @param path - Dot notation path to the configuration value
     * @param defaultValue - Default value if the path doesn't exist
     */
    get<T = any>(path: string, defaultValue?: T): T | undefined {
        return this.configService.get(
            path as keyof Configuration,
            defaultValue,
        );
    }

    /**
     * Get environment-specific values
     */
    getEnvironmentValue<T = string>(
        key: string,
        defaultValue?: T,
    ): T | undefined {
        return this.configService.get(key as keyof Configuration, defaultValue);
    }

    /**
     * Utility methods for common checks
     */
    isDevelopment(): boolean {
        return this.app.isDevelopment;
    }

    isProduction(): boolean {
        return this.app.isProduction;
    }

    isTest(): boolean {
        return this.app.isTest;
    }

    /**
     * Get the complete configuration object (useful for debugging)
     */
    getAllConfig(): Configuration {
        return {
            app: this.app,
            security: this.security,
            logging: this.logging,
            rateLimit: this.rateLimit,
            performance: this.performance,
            database: this.database,
            jwt: this.jwt,
            redis: this.redis,
            email: this.email,
            fileStorage: this.fileStorage,
            auditRetention: this.auditRetention,
        };
    }

    /**
     * Validate that required configuration is present
     * Throws an error if required config is missing
     */
    validateRequiredConfig(requiredKeys: string[]): void {
        const missingKeys: string[] = [];

        for (const key of requiredKeys) {
            const value = this.configService.get(key as keyof Configuration);
            if (value === undefined || value === null || value === '') {
                missingKeys.push(key);
            }
        }

        if (missingKeys.length > 0) {
            throw new Error(
                `Missing required configuration: ${missingKeys.join(', ')}`,
            );
        }
    }
}
