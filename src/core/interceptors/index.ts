/**
 * Core Interceptors Index
 *
 * This file exports all interceptors for easy importing across the application.
 * These interceptors provide essential functionality for request/response handling,
 * security, performance, and monitoring.
 */

// Request/Response Processing
export { LoggingInterceptor } from './logging.interceptor';
export { TransformInterceptor } from './transform.interceptor';
export { ValidationInterceptor } from './validation.interceptor';

// Performance & Reliability
export { TimeoutInterceptor } from './timeout.interceptor';
export { CachingInterceptor } from './caching.interceptor';
export { MetricsInterceptor } from './metrics.interceptor';

// Security & Rate Limiting
// Rate limiting is handled by ThrottlerModule and ThrottlerGuard

/**
 * Common interceptor configurations for different use cases
 */
export const InterceptorConfigs = {
    /**
     * Basic configuration for most applications
     */
    basic: ['LoggingInterceptor', 'TransformInterceptor', 'TimeoutInterceptor'],

    /**
     * Performance-focused configuration
     */
    performance: [
        'LoggingInterceptor',
        'TransformInterceptor',
        'TimeoutInterceptor',
        'CachingInterceptor',
        'MetricsInterceptor',
    ],

    /**
     * High-availability configuration with resilience patterns
     */
    resilient: [
        'LoggingInterceptor',
        'TransformInterceptor',
        'TimeoutInterceptor',
        'MetricsInterceptor',
    ],

    /**
     * Security-focused configuration
     */
    secure: [
        'LoggingInterceptor',
        'TransformInterceptor',
        'TimeoutInterceptor',
        'ValidationInterceptor',
    ],

    /**
     * Complete configuration with all interceptors
     */
    complete: [
        'LoggingInterceptor',
        'TransformInterceptor',
        'TimeoutInterceptor',
        'CachingInterceptor',
        'MetricsInterceptor',
        'ValidationInterceptor',
    ],
} as const;
