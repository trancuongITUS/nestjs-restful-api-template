/**
 * Performance monitoring and metrics constants
 */

// =============================================================================
// PERFORMANCE & MONITORING
// =============================================================================

export const PERFORMANCE = {
    // Response time thresholds (in milliseconds)
    SLOW_REQUEST_THRESHOLD: 5000, // 5 seconds
    DEGRADED_RESPONSE_TIME: 2000, // 2 seconds

    // Error rate thresholds (in percentage)
    UNHEALTHY_ERROR_RATE: 10, // 10%
    DEGRADED_ERROR_RATE: 5, // 5%

    // System metrics thresholds (in percentage)
    UNHEALTHY_MEMORY_PERCENT: 90, // 90% heap usage
    DEGRADED_MEMORY_PERCENT: 70, // 70% heap usage
    UNHEALTHY_CPU_PERCENT: 90, // 90% CPU usage
    DEGRADED_CPU_PERCENT: 70, // 70% CPU usage
    UNHEALTHY_EVENT_LOOP_LAG_MS: 100, // 100ms event loop lag
    DEGRADED_EVENT_LOOP_LAG_MS: 50, // 50ms event loop lag

    // System metrics collection intervals (in milliseconds)
    SYSTEM_METRICS_INTERVAL: 5000, // Collect system metrics every 5 seconds
    EVENT_LOOP_LAG_INTERVAL: 500, // Measure event loop lag every 500ms

    // Metrics logging
    METRICS_LOG_INTERVAL: 100, // Log metrics every 100 requests
    TOP_STATUS_CODES_LIMIT: 5, // Show top 5 status codes

    // Cache management
    CACHE_CLEANUP_THRESHOLD: 1000, // Clean cache when > 1000 entries
    // Note: DEFAULT_CACHE_TTL is now managed by ConfigService
} as const;

// =============================================================================
// HEALTH STATUS
// =============================================================================

export const HEALTH_STATUS = {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy',
} as const;
