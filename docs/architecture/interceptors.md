# NestJS Interceptors Collection

This directory contains a comprehensive set of interceptors that implement common patterns and best practices for NestJS applications. These interceptors provide essential functionality for request/response handling, security, performance monitoring, and reliability.

## 🚀 Overview

Interceptors in NestJS are powerful tools that can transform the result returned from a function, extend the basic function behavior, or completely override a function depending on specific conditions. Our collection includes:

### Core Interceptors

1. **[LoggingInterceptor](#logging-interceptor)** - Request/response logging with timing
2. **[TransformInterceptor](#transform-interceptor)** - Standardized API response format
3. **[TimeoutInterceptor](#timeout-interceptor)** - Request timeout handling
4. **[ValidationInterceptor](#validation-interceptor)** - Enhanced request/response validation
5. **[CachingInterceptor](#caching-interceptor)** - GET request caching with TTL
6. **[MetricsInterceptor](#metrics-interceptor)** - Performance monitoring and metrics
7. **[RetryInterceptor](#retry-interceptor)** - Transient failure handling with exponential backoff
8. **[CircuitBreakerInterceptor](#circuit-breaker-interceptor)** - Circuit breaker pattern implementation

**Note**: Rate limiting is handled by the official **ThrottlerModule** and **ThrottlerGuard** from `@nestjs/throttler`.

## 📦 Installation & Setup

### 1. Import Interceptors

```typescript
import {
    LoggingInterceptor,
    TransformInterceptor,
    TimeoutInterceptor,
    CachingInterceptor,
    MetricsInterceptor,
    ValidationInterceptor,
} from './core/interceptors';
```

### 2. Register Globally (Recommended)

```typescript
// app.module.ts
@Module({
    providers: [
        // Global interceptors (order matters - they execute in reverse order)
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
    ],
})
export class AppModule {}
```

### 3. Use Specific Interceptors

```typescript
// On controllers
@Controller('users')
@UseInterceptors(CachingInterceptor)
export class UsersController {}

// On routes
@Get(':id')
@UseInterceptors(new RetryInterceptor(3, 1000))
getUserById(@Param('id') id: string) {}
```

## 📋 Detailed Documentation

### Logging Interceptor

**Purpose**: Comprehensive request/response logging with performance timing.

**Features**:

- Request details logging (method, URL, IP, user-agent)
- Response timing and size tracking
- Error logging with stack traces
- Request ID generation and tracking
- Structured logging format

**Usage**:

```typescript
// Automatic when registered globally
// Or use on specific routes
@UseInterceptors(LoggingInterceptor)
```

**Configuration**: No configuration needed - works out of the box.

---

### Transform Interceptor

**Purpose**: Standardizes all API responses into a consistent format.

**Features**:

- Wraps responses in standard success format
- Handles pagination metadata
- Adds timestamp and request path
- Customizable success messages per HTTP method

**Response Format**:

```typescript
{
    success: true,
    statusCode: 200,
    message: "Data retrieved successfully",
    data: { /* your data */ },
    timestamp: "2023-12-07T10:30:00.000Z",
    path: "/api/users",
    meta?: { /* pagination info */ }
}
```

**Usage**: Register globally for consistent API responses.

---

### Timeout Interceptor

**Purpose**: Prevents requests from running indefinitely.

**Features**:

- Configurable timeout duration (default: 30 seconds)
- Proper timeout error handling
- Detailed timeout exception messages

**Usage**:

```typescript
// With custom timeout
@UseInterceptors(new TimeoutInterceptor(10000)) // 10 seconds

// Default timeout (30 seconds)
@UseInterceptors(TimeoutInterceptor)
```

---

### Validation Interceptor

**Purpose**: Enhanced request/response validation beyond standard NestJS pipes.

**Features**:

- Request size validation (prevents oversized payloads)
- Content-Type validation
- Query parameter validation (pagination, sorting, search)
- Response structure validation
- Sensitive data leak detection

**Validations**:

- **Request Size**: Max 10MB payload
- **Content-Type**: Required for POST/PUT/PATCH
- **Pagination**: `page` >= 1, `limit` 1-100
- **Sort**: Format validation (`field:asc/desc`)
- **Search**: 2-100 characters

**Usage**: Register globally for comprehensive validation.

---

### Caching Interceptor

**Purpose**: Caches GET requests to improve performance.

**Features**:

- In-memory caching with TTL support
- Cache-Control header support
- Automatic cleanup of expired entries
- Cache statistics and management
- Only caches successful responses

**Configuration**:

```typescript
const caching = new CachingInterceptor();
caching.clearCache(); // Clear all cache
caching.getCacheStats(); // Get cache statistics
```

**Cache Control**:

- Respects `Cache-Control: no-cache` header
- Uses `max-age` from Cache-Control header
- Default TTL: 5 minutes

---

### Metrics Interceptor

**Purpose**: Collects performance metrics and monitoring data.

**Features**:

- Request count and timing tracking
- Success/error rate monitoring
- Status code distribution
- Endpoint-specific metrics
- Health status based on metrics
- Slow request detection (>5 seconds)

**Metrics Collected**:

- Total requests
- Average/min/max response time
- Success/error counts
- Status code distribution
- Per-endpoint metrics

**Usage**:

```typescript
// Inject the interceptor to access metrics
constructor(private metricsInterceptor: MetricsInterceptor) {}

// Get metrics
const metrics = this.metricsInterceptor.getMetrics();
const health = this.metricsInterceptor.getHealthStatus();
```

---

### Retry Interceptor

**Purpose**: Handles transient failures with intelligent retry logic.

**Features**:

- Exponential backoff with jitter
- Configurable retry attempts (default: 3)
- Safe HTTP method detection (GET, HEAD, OPTIONS)
- Smart error detection (network errors, 5xx, timeouts)
- Detailed retry logging

**Configuration**:

```typescript
// Custom configuration
const retry = RetryInterceptor.create({
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000
});

@UseInterceptors(retry)
```

**Retry Conditions**:

- Network errors (ECONNRESET, ENOTFOUND)
- Server errors (500, 502, 503, 504)
- Timeout errors
- 429 (Too Many Requests)

---

### Circuit Breaker Interceptor

**Purpose**: Implements circuit breaker pattern to prevent cascading failures.

**Features**:

- Three states: CLOSED, OPEN, HALF_OPEN
- Configurable failure threshold
- Recovery timeout with automatic state transitions
- Detailed circuit breaker metrics
- Manual circuit control

**Configuration**:

```typescript
const circuitBreaker = new CircuitBreakerInterceptor({
    failureThreshold: 5, // Failures to open circuit
    recoveryTimeout: 60000, // Time before attempting recovery
    monitoringPeriod: 300000, // Monitoring window
    halfOpenMaxCalls: 3, // Test calls in half-open state
});
```

**States**:

- **CLOSED**: Normal operation
- **OPEN**: Blocking requests, returning 503
- **HALF_OPEN**: Testing service recovery

---

## 🚦 Rate Limiting

Rate limiting is handled by the official **NestJS ThrottlerModule** and **ThrottlerGuard**.

### Configuration

The throttler is configured in `app.module.ts` with multiple time windows:

```typescript
ThrottlerModule.forRoot([
    {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
    },
    {
        name: 'medium',
        ttl: 300000, // 5 minutes
        limit: 50, // 50 requests per 5 minutes
    },
    {
        name: 'long',
        ttl: 900000, // 15 minutes
        limit: 100, // 100 requests per 15 minutes
    },
]);
```

### Usage

```typescript
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('users')
export class UsersController {
    // Custom rate limit for specific endpoint
    @Throttle({ short: { limit: 5, ttl: 60000 } })
    @Post()
    createUser() {}

    // Skip rate limiting
    @SkipThrottle()
    @Get('health')
    healthCheck() {}

    // Use global rate limits (default)
    @Get()
    getUsers() {}
}
```

### Features

- ✅ **Official NestJS solution**
- ✅ **Multiple time windows**
- ✅ **Decorator-based control**
- ✅ **IP-based tracking**
- ✅ **Automatic headers** (`X-RateLimit-*`)
- ✅ **Redis support** (for distributed systems)

## 🔧 Configuration Presets

Use predefined interceptor configurations for common scenarios:

```typescript
import { InterceptorConfigs } from './core/interceptors';

// Basic setup
const basicInterceptors = InterceptorConfigs.basic;

// Performance-focused
const performanceInterceptors = InterceptorConfigs.performance;

// High availability with resilience
const resilientInterceptors = InterceptorConfigs.resilient;

// Security-focused
const secureInterceptors = InterceptorConfigs.secure;

// Complete setup with all interceptors
const completeInterceptors = InterceptorConfigs.complete;
```

## 📊 Monitoring & Observability

### Metrics Collection

The MetricsInterceptor provides comprehensive monitoring:

```typescript
// Get global metrics
const globalMetrics = metricsInterceptor.getMetrics().global;

// Get endpoint-specific metrics
const endpointMetrics = metricsInterceptor.getEndpointMetrics('GET /users');

// Health check
const health = metricsInterceptor.getHealthStatus();
```

### Circuit Breaker Status

Monitor circuit breaker health:

```typescript
const status = circuitBreaker.getStatus();
console.log(`Circuit State: ${status.state}`);
console.log(
    `Failure Rate: ${status.metrics.failures}/${status.metrics.totalCalls}`,
);
```

### Cache Statistics

Monitor cache performance:

```typescript
const stats = cachingInterceptor.getCacheStats();
console.log(`Cache Size: ${stats.size}`);
console.log(`Cache Keys: ${stats.keys.join(', ')}`);
```

## 🔒 Security Considerations

### Authentication

The AuthInterceptor provides JWT-based authentication:

- Token validation with expiration checking
- Role-based access control
- Secure user context injection

### Rate Limiting

Rate limiting is provided by the official NestJS ThrottlerModule:

- IP-based rate limiting with multiple time windows
- Decorator-based control for fine-grained limits
- Automatic rate limit headers in responses
- Redis support for distributed applications

### Input Validation

The ValidationInterceptor provides security-focused validation:

- Request size limits prevent DoS attacks
- Content-Type validation prevents MIME confusion
- Sensitive data leak detection in responses

## 🚀 Performance Optimization

### Caching Strategy

- Cache only GET requests
- Respect cache headers
- Automatic cleanup prevents memory leaks
- TTL-based expiration

### Retry Logic

- Exponential backoff prevents thundering herd
- Jitter reduces retry synchronization
- Safe method detection prevents data corruption

### Circuit Breaker

- Fail-fast prevents resource exhaustion
- Automatic recovery testing
- Configurable thresholds for different services

## 🔧 Best Practices

### Interceptor Order

Order matters when using multiple interceptors:

1. **LoggingInterceptor** - Should be first to log everything
2. **ValidationInterceptor** - Early validation
3. **CachingInterceptor** - Check cache before processing
4. **MetricsInterceptor** - Collect metrics
5. **TransformInterceptor** - Transform response format
6. **TimeoutInterceptor** - Should be last to timeout everything

### Error Handling

All interceptors follow consistent error handling:

- Structured error responses
- Proper HTTP status codes
- Detailed error information for debugging
- Security-conscious error messages

### Performance Monitoring

Monitor interceptor performance:

- Track execution time
- Monitor memory usage
- Watch cache hit rates
- Monitor circuit breaker states

## 🧪 Testing

Test interceptors in isolation:

```typescript
describe('LoggingInterceptor', () => {
    let interceptor: LoggingInterceptor;
    let mockExecutionContext: ExecutionContext;
    let mockCallHandler: CallHandler;

    beforeEach(() => {
        interceptor = new LoggingInterceptor();
        // Setup mocks...
    });

    it('should log request and response', async () => {
        // Test implementation...
    });
});
```

## 📈 Future Enhancements

Potential improvements and additions:

1. **Distributed Caching**: Redis integration for cache sharing
2. **Advanced Metrics**: Prometheus/Grafana integration
3. **Tracing**: Distributed tracing support
4. **Configuration**: Environment-based configuration
5. **Health Checks**: Advanced health check endpoints
6. **Documentation**: OpenAPI/Swagger integration

## 🤝 Contributing

When adding new interceptors:

1. Follow TypeScript strict mode
2. Include comprehensive JSDoc comments
3. Add proper error handling
4. Write unit tests
5. Update this documentation
6. Follow existing patterns and conventions

## 📚 References

- [NestJS Interceptors Documentation](https://docs.nestjs.com/interceptors)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [Caching Best Practices](https://docs.microsoft.com/en-us/azure/architecture/best-practices/caching)
