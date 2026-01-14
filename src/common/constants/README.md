# Constants Directory

This directory contains static constants that are used throughout the application. These constants are **environment-independent** and contain fixed values that don't change based on configuration.

## 📁 File Structure

```
src/common/constants/
├── application.constants.ts  # Environment types, compression settings
├── error.constants.ts        # Error codes and messages
├── http.constants.ts         # HTTP status codes, methods, headers
├── performance.constants.ts  # Performance thresholds and metrics
├── security.constants.ts     # Security patterns, auth settings
├── validation.constants.ts   # Validation rules and limits
├── index.ts                 # Centralized exports
└── README.md               # This documentation
```

## 🔧 Configuration vs Constants

### ✅ **Use Constants For:**

- **Static values** that never change (error codes, HTTP status codes)
- **Business logic thresholds** (performance limits, validation rules)
- **Enum-like values** (environment types, states)
- **Security patterns** (sensitive field names, safe HTTP methods)

### ❌ **Use ConfigService For:**

- **Environment-dependent values** (ports, URLs, timeouts)
- **Configurable limits** (rate limits, request sizes)
- **External service settings** (database, Redis, email)
- **Feature flags** and environment-specific behavior

## 📚 **File Descriptions**

### `application.constants.ts`

**Non-environment dependent application constants**

- Environment type enums (for type checking)
- Compression settings (static algorithm parameters)
- Log context names

```typescript
export const ENVIRONMENT = {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TEST: 'test',
} as const;

export const COMPRESSION = {
    THRESHOLD: 1024, // Only compress responses larger than 1KB
    LEVEL: 6, // Compression level (1-9)
} as const;
```

### `error.constants.ts`

**Error codes and error-related constants**

- HTTP error codes
- Validation error codes
- Business logic error codes
- Circuit breaker error codes

```typescript
export const ERROR_CODE = {
    PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',
    // ... more error codes
} as const;
```

### `http.constants.ts`

**HTTP-related constants**

- HTTP status codes
- HTTP methods
- Content types
- Header names

```typescript
export const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    INTERNAL_SERVER_ERROR: 500,
    // ... more status codes
} as const;

export const HTTP_METHOD = {
    GET: 'GET',
    POST: 'POST',
    // ... more methods
} as const;
```

### `performance.constants.ts`

**Performance monitoring constants**

- Response time thresholds
- Error rate thresholds
- Metrics collection settings
- Health status enums

```typescript
export const PERFORMANCE = {
    SLOW_REQUEST_THRESHOLD: 5000, // 5 seconds
    UNHEALTHY_ERROR_RATE: 10, // 10%
    METRICS_LOG_INTERVAL: 100, // Log every 100 requests
} as const;

export const HEALTH_STATUS = {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy',
} as const;
```

### `security.constants.ts`

**Security-related constants**

- Sensitive data field patterns
- Security header names and values
- Authentication settings (bcrypt rounds, token expiry)

```typescript
export const SENSITIVE_FIELDS = [
    'password',
    'token',
    'secret',
    'apiKey',
    // ... more sensitive fields
] as const;

export const AUTH = {
    BCRYPT_SALT_ROUNDS: 12,
    REFRESH_TOKEN_EXPIRY_DAYS: 7,
    MAX_LOGIN_ATTEMPTS: 5,
    // ... more auth settings
} as const;
```

### `validation.constants.ts`

**Validation rules and limits**

- Pagination limits
- Search query limits
- String length limits
- File validation rules
- Regex patterns

```typescript
export const VALIDATION = {
    MIN_PAGE_NUMBER: 1,
    MAX_PAGINATION_LIMIT: 100,
    MIN_SEARCH_LENGTH: 2,
    MAX_SEARCH_LENGTH: 100,
} as const;

export const REGEX_PATTERN = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    // ... more patterns
} as const;
```

## 🚀 **Usage Examples**

### **Importing Constants**

```typescript
// Import specific constants
import { ERROR_CODE, HTTP_STATUS } from '../common/constants';

// Import all constants (not recommended for large files)
import * as Constants from '../common/constants';

// Import from specific file (when you know exactly what you need)
import { VALIDATION } from '../common/constants/validation.constants';
```

### **Using Constants in Code**

```typescript
// Error handling
throw new BadRequestException({
    message: 'Invalid request',
    error: ERROR_CODE.VALIDATION_ERROR,
});

// HTTP status checks
if (response.status === HTTP_STATUS.OK) {
    // Handle success
}

// Validation
if (searchQuery.length < VALIDATION.MIN_SEARCH_LENGTH) {
    throw new Error('Search query too short');
}

// Performance monitoring
if (responseTime > PERFORMANCE.SLOW_REQUEST_THRESHOLD) {
    this.logger.warn(`Slow request detected: ${responseTime}ms`);
}
```

### **Type Safety**

```typescript
// Constants are strongly typed
type Environment = (typeof ENVIRONMENT)[keyof typeof ENVIRONMENT]; // 'development' | 'production' | 'test'
type HttpMethod = (typeof HTTP_METHOD)[keyof typeof HTTP_METHOD]; // 'GET' | 'POST' | etc.
type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE]; // 'VALIDATION_ERROR' | etc.
```

## 🔄 **Migration from Old Constants**

### **Removed Constants (Now in ConfigService)**

These constants have been removed and are now managed by the ConfigService:

```typescript
// ❌ OLD (removed)
import { DEFAULT, RATE_LIMIT, TIMEOUT } from '../common/constants';
const port = DEFAULT.PORT;
const rateLimit = RATE_LIMIT.SHORT_LIMIT;
const timeout = TIMEOUT.DEFAULT_REQUEST_TIMEOUT;

// ✅ NEW (use ConfigService)
import { ConfigService } from '../config';
const port = this.configService.app.port;
const rateLimit = this.configService.rateLimit.short.limit;
const timeout = this.configService.performance.requestTimeout;
```

### **Removed Constants (Resilience Patterns)**

Circuit breaker and retry constants were removed as they're only needed for microservices or heavy external integrations:

```typescript
// ❌ REMOVED - Not needed for single-server, DB-only apps
import { CIRCUIT_BREAKER, RETRY } from '../common/constants';

// ✅ Add back if needed for microservices architecture
// See: src/core/interceptors/index.ts for guidance
```

## 📋 **Best Practices**

### **When to Add New Constants**

1. **Static business rules** that don't change with environment
2. **Enum-like values** for type safety
3. **Validation thresholds** that are business requirements
4. **Error codes** for consistent error handling

### **When to Use ConfigService Instead**

1. **Environment-dependent values** (ports, URLs, secrets)
2. **Configurable timeouts** and limits
3. **Feature flags** and toggles
4. **External service configuration**

### **Naming Conventions**

- Use **UPPER_CASE** for constant objects
- Use **descriptive names** that explain the purpose
- Group related constants in objects
- Add JSDoc comments for complex constants

### **Organization**

- Keep constants **logically grouped** by domain
- Use **as const** for type safety
- Export from **index.ts** for centralized access
- Document **breaking changes** when reorganizing

## 🔍 **Validation and Testing**

### **Type Checking**

```typescript
// Ensure constants are properly typed
const validEnvironment: Environment = ENVIRONMENT.PRODUCTION; // ✅
const invalidEnvironment: Environment = 'invalid'; // ❌ TypeScript error
```

### **Runtime Validation**

```typescript
// Validate constant usage in tests
describe('Constants', () => {
    it('should have valid HTTP status codes', () => {
        expect(HTTP_STATUS.OK).toBe(200);
        expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    });

    it('should have valid error codes', () => {
        expect(ERROR_CODE.VALIDATION_ERROR).toBeDefined();
        expect(typeof ERROR_CODE.VALIDATION_ERROR).toBe('string');
    });
});
```

## 🚨 **Common Pitfalls**

### **Don't Mix Configuration with Constants**

```typescript
// ❌ BAD - Environment-dependent value in constants
export const API_URL = process.env.API_URL || 'http://localhost:3000';

// ✅ GOOD - Use ConfigService for environment values
// This belongs in configuration.ts, not constants
```

### **Don't Hardcode Magic Numbers**

```typescript
// ❌ BAD - Magic number in code
if (responseTime > 5000) {
    /* slow request */
}

// ✅ GOOD - Use named constant
if (responseTime > PERFORMANCE.SLOW_REQUEST_THRESHOLD) {
    /* slow request */
}
```

### **Don't Create Overly Granular Constants**

```typescript
// ❌ BAD - Too granular
export const COLORS = {
    PRIMARY_BUTTON_BACKGROUND: '#007bff',
    SECONDARY_BUTTON_BACKGROUND: '#6c757d',
    // ... 50 more color constants
};

// ✅ GOOD - Appropriate granularity
export const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    // ... logical grouping
};
```

This constants system now works in harmony with the ConfigService to provide a clean separation between static constants and configurable values! 🎉
