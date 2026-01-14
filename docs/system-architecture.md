# System Architecture

## Overview

The NestJS RESTful API Template follows a modular, layered architecture designed for scalability, maintainability, and security. This document describes the high-level system design, module interactions, and request/response flow.

---

## Module Architecture

### Core Modules

#### 1. Auth Module (~2,300 LOC)
**Responsibility**: User authentication, session management, token issuance.

**Components**:
- **AuthController**: Routes for register, login, logout, refresh, profile, change-password
- **AuthService**: Core auth logic (registration, login, token generation, refresh)
- **JwtStrategy**: Passport JWT strategy for token validation
- **LocalStrategy**: Passport local strategy for credential-based login
- **JwtRefreshStrategy**: Refresh token validation strategy
- **Guards**:
  - `JwtAuthGuard`: Validates JWT token on protected routes
  - `LocalAuthGuard`: Triggers local strategy (email/password)
  - `RolesGuard`: RBAC enforcement based on @Roles() decorator
  - `GlobalJwtAuthGuard`: Applied globally to all routes except @Public()
- **Decorators**:
  - `@CurrentUser()`: Injects authenticated user from request
  - `@Public()`: Marks route as public (no JWT required)
  - `@Roles(ADMIN, USER)`: Specifies required roles
- **Repositories**: UserRepository, UserSessionRepository
- **DTOs**: LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto

**Key Flow**:
```
User Login (credentials) → LocalAuthGuard → LocalStrategy
  → AuthService.login() → Generate tokens → Return {accessToken, refreshToken}
  → Create UserSession (with expiresAt, userAgent, ipAddress)

Protected Request → JwtAuthGuard → JwtStrategy validates token
  → @CurrentUser() decorator retrieves user → Controller receives user object
```

**Security**:
- Passwords hashed with bcrypt (12 rounds)
- Access token: 15min expiry (stateless)
- Refresh token: 7d expiry (stored in database, revocable)
- Session tracks: expiresAt, revokedAt, userAgent, ipAddress
- Password change requires old password verification

---

#### 2. Audit Module (~3,726 LOC)
**Responsibility**: SOC2-compliant audit logging of state-changing operations.

**Components**:
- **AuditController**: Query API (GET /audit with filters, pagination, export)
- **AuditService**: Audit log creation, querying, filtering, export
- **AuditInterceptor** (global): Captures POST/PUT/PATCH/DELETE operations
- **AuditRepository**: Database queries for audit logs
- **AuditActions**: Enum of 16 action types (CREATE, UPDATE, DELETE, LOGIN, etc.)
- **AuditResources**: Enum of 11 resource types (USER, SESSION, ROLE, etc.)
- **MaskingService**: Applies data masking strategies:
  - **Complete mask**: password → "***"
  - **Partial mask**: email → "u***@example.com"
  - **Recursive mask**: Masks sensitive fields in nested objects
- **Cleanup script**: 90-day retention policy enforcement

**Audit Fields**:
```typescript
{
  id: UUID,
  timestamp: ISO8601,
  userId: UUID (nullable for anonymous actions),
  action: AuditAction,
  resource: AuditResource,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: '/auth/change-password',
  statusCode: 200 | 400 | 401 | ...,
  changesBefore: JSON (nullable),  // State before change
  changesAfter: JSON (nullable),   // State after change
  metadata: {
    userAgent: string,
    ipAddress: string,
    requestId: string,
    ...custom fields
  },
  createdAt: ISO8601
}
```

**Non-Blocking Architecture**:
```
Request → AuditInterceptor (captures data)
  → Emits 'audit.log' event (async via EventEmitter2)
  → Returns response immediately
  → Async: AuditService.createAuditLog() writes to database
```

**Query API**:
```
GET /audit?action=LOGIN&resource=USER&userId=abc123&startDate=2024-01-01&endDate=2024-01-31&skip=0&take=10&sort=-timestamp
  → Returns paginated audit logs
  → Filter by: action, resource, userId, dateRange, endpoint, statusCode
  → Sort: timestamp, action, resource
  → Export: ?format=csv or ?format=json

GET /audit/export?format=csv
  → Streams CSV file (10MB limit)
```

**Access Control**:
- ADMIN-only access to query API
- User can view own audit logs via separate endpoint
- Audit logs themselves are immutable (no updates/deletes)

---

#### 3. Core Module (~3,299 LOC)
**Responsibility**: Cross-cutting infrastructure (interceptors, middlewares, pipes, filters).

**Components**:

**Interceptors (6)**:
| Interceptor | Purpose | Order |
|-------------|---------|-------|
| LoggingInterceptor | Logs request/response with timing | 1st |
| TransformInterceptor | Wraps responses in standard format | 2nd |
| ValidationInterceptor | Re-validates before sending | 3rd |
| TimeoutInterceptor | Enforces per-endpoint timeout (default 30s) | 4th |
| CachingInterceptor | In-memory cache for GET requests (TTL-based) | 5th |
| MetricsInterceptor | Tracks request count, latency, error rate | 6th |

> **Note**: For microservices or heavy external integrations, consider adding RetryInterceptor (exponential backoff) and CircuitBreakerInterceptor (cascade failure prevention).

**Middlewares (5)**:
| Middleware | Purpose | Ordering |
|-----------|---------|----------|
| CompressionMiddleware | Gzip response (threshold: 1KB) | Applied first |
| CorsMiddleware | CORS headers (configurable origins) | 2nd |
| SecurityMiddleware | Helmet: CSP, X-Frame-Options, HSTS | 3rd |
| RequestContextMiddleware | Request ID, logging context, correlation ID | 4th |
| RateLimitMiddleware | Per-IP rate limiting (configurable: 100 req/min) | 5th |

**Pipes (9)**:
| Pipe | Purpose | Level |
|------|---------|-------|
| ValidationPipe | DTO validation via class-validator | Global |
| ParseIntPipe | Convert string to integer with validation | Route param |
| ParseUuidPipe | Validate UUID v4 format | Route param |
| TrimPipe | Trim whitespace from strings | Custom |
| LowerCasePipe | Convert to lowercase | Custom |
| DefaultValuePipe | Apply default value if missing | Custom |
| SanitizePipe | Remove dangerous characters | Custom |
| FileValidationPipe | Validate file size/MIME type | Custom |
| BasePipe | Base class for custom pipes | Internal |

**Filters**:
| Filter | Purpose |
|--------|---------|
| HttpExceptionFilter | Global exception handler - standardizes error responses |

**Filter Behavior**:
```typescript
// Input: UnauthorizedException("Invalid token")
// Output:
{
  success: false,
  statusCode: 401,
  message: 'Invalid token',
  data: null,
  timestamp: '2024-01-07T17:00:00Z',
  path: '/auth/profile'
}

// Input: BadRequestException with validation errors
// Output:
{
  success: false,
  statusCode: 400,
  message: 'Validation failed',
  data: null,
  errors: [
    { field: 'email', message: 'Must be a valid email' },
    { field: 'password', message: 'Must be at least 8 characters' }
  ],
  timestamp: '2024-01-07T17:00:00Z',
  path: '/auth/register'
}
```

---

#### 4. Common Module (~2,662 LOC)
**Responsibility**: Shared utilities, database layer, configuration, types.

**Components**:
- **PrismaService**: ORM integration, connection management
- **BaseRepository<T>**: Generic CRUD for all entities
- **UserRepository**: User-specific queries (findByEmail, findActive, etc.)
- **UserSessionRepository**: Session queries (findActive, revoke, cleanup)
- **AuditRepository**: Audit log queries (findByFilters, export, cleanup)
- **ConfigService**: Type-safe configuration with 10 sections:
  - app (port, nodeEnv, version, apiPrefix)
  - security (corsOrigins, rateLimitWindow)
  - jwt (accessTokenExpiry, refreshTokenExpiry, secret)
  - database (url, logging, ssl)
  - audit (enabled, retention, maskLevel)
  - logging (level, format, transports)
  - cache (ttl, enabled)
  - ...and 3 more
- **Constants**: Organized by concern:
  - HTTP_* (methods, status codes)
  - ERROR_CODES_* (auth errors, validation errors)
  - SECURITY_* (bcrypt rounds, jwt expiry, rate limits)
  - VALIDATION_* (min/max lengths, patterns)
  - PERFORMANCE_* (timeouts, cache ttls, circuit breaker thresholds)
- **Utilities**:
  - AppLogger: Structured logging with context
  - security: hashPassword(), comparePassword(), generateToken()
  - object: pick(), omit(), deepClone(), deepMerge()
  - type-guards: isUUID(), isEmail(), isValidDate()
- **Types**:
  - ApiResponse<T>: Union of SuccessResponse<T> | ErrorResponse
  - SuccessResponse<T>: {success, statusCode, message, data, timestamp, path}
  - ErrorResponse: {success, statusCode, message, data, timestamp, path, errors?}

---

## Request/Response Flow

### Complete Request Lifecycle

```
1. HTTP Request arrives
   ↓
2. Middlewares (in order):
   - CompressionMiddleware (gzip setup)
   - CorsMiddleware (check origin)
   - SecurityMiddleware (add security headers)
   - RequestContextMiddleware (generate request ID)
   - RateLimitMiddleware (check rate limit)
   ↓
3. Global Exception Filter wraps entire pipeline
   ↓
4. Route matching (find controller method)
   ↓
5. Pipes (data transformation):
   - ValidationPipe: Validate DTO against class-validator rules
   - TrimPipe: Trim whitespace
   - SanitizePipe: Remove dangerous chars
   ↓
6. Guards (authorization):
   - JwtAuthGuard: Validate JWT token
   - RolesGuard: Check @Roles() decorator
   ↓
7. Interceptors "before" (request phase):
   - LoggingInterceptor: Log incoming request
   - TimeoutInterceptor: Set request timeout
   - CachingInterceptor: Check cache for GET requests
   ↓
8. Controller method executes:
   - Calls service method
   - Returns DTO object
   ↓
9. Interceptors "after" (response phase):
   - TransformInterceptor: Wrap in standard response format
   - MetricsInterceptor: Record latency, status
   - AuditInterceptor: Emit async audit event
   ↓
10. Global Exception Filter (if exception):
    - Catches all exceptions
    - Standardizes error response format
    - Returns with appropriate status code
    ↓
11. Middlewares (response phase):
    - CompressionMiddleware: Compress if size > threshold
    ↓
12. HTTP Response sent to client
    ↓
13. Async tasks (don't block response):
    - AuditService writes to database
    - MetricsService updates counters
    - EventEmitter2 event handlers fire
```

### Example: User Login Request

```
POST /auth/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}

Flow:
1. Request → Middlewares → RequestContext creates request ID
2. Pipes → ValidationPipe validates LoginDto (email format, password length)
3. Guards → LocalAuthGuard triggers LocalStrategy
4. LocalStrategy → UserRepository.findByEmail() → Bcrypt compare
5. AuthService.login() → Generate tokens → Create UserSession
6. Response wrapped by TransformInterceptor:
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": { id, email, username, role, ... }
  },
  "timestamp": "2024-01-07T17:30:00Z",
  "path": "/auth/login"
}

7. AuditInterceptor (async):
   - Emit 'audit.log' event
   - AuditService writes {userId, action: LOGIN, resource: AUTH, ...}
   - No delay to response
```

---

## Module Dependency Graph

```
                    ┌─────────────────┐
                    │   Audit Module  │
                    │  (Query API)    │
                    └────────┬────────┘
                             │ uses
                             ▼
                    ┌─────────────────┐
                    │  Common Module  │◄──────┐
                    │   (Database,    │       │
                    │   Config, etc)  │       │
                    └────────┬────────┘       │ uses
                             ▲                │
                    ┌────────┴────────┐       │
                    │                 │       │
         ┌──────────▼────────┐   ┌────┴──────▼────┐
         │  Auth Module      │   │  Core Module   │
         │ (Authentication)  │   │ (Interceptors, │
         │                   │   │  Middlewares,  │
         │                   │   │  Pipes, etc)   │
         └───────────────────┘   └────────────────┘
```

---

## Data Flow

### Entity Relationship Diagram

```
┌─────────────────────┐
│       User          │
├─────────────────────┤
│ id (PK)             │
│ email (unique)      │
│ username (unique)   │
│ password (hashed)   │
│ role [ADMIN/USER]   │
│ isActive            │
│ createdAt, updatedAt│
└────────┬────────────┘
         │ 1:M
         │
         ▼
┌─────────────────────────┐
│   UserSession           │
├─────────────────────────┤
│ id (PK)                 │
│ userId (FK → User)      │
│ refreshToken (unique)   │
│ expiresAt               │
│ revokedAt (nullable)    │
│ userAgent, ipAddress    │
│ createdAt, updatedAt    │
└─────────────────────────┘

┌──────────────────────────┐
│      AuditLog            │
├──────────────────────────┤
│ id (PK)                  │
│ userId (FK → User, nullable)
│ action [16 types]        │
│ resource [11 types]      │
│ method, endpoint         │
│ statusCode               │
│ changesBefore, changesAfter (JSON)
│ metadata (JSON)          │
│ timestamp (indexed)      │
│ createdAt                │
└──────────────────────────┘
```

### Authentication Flow (JWT)

```
User Registration/Login
  ↓
Credentials validated (email + password hash)
  ↓
Generate tokens:
  - accessToken (15m, stateless, HS256 JWT)
  - refreshToken (7d, stored in DB, HS256 JWT)
  ↓
Create UserSession record:
  - refreshToken
  - expiresAt = now + 7d
  - revokedAt = null
  - userAgent, ipAddress
  ↓
Return to client:
  {
    accessToken,
    refreshToken,
    expiresIn: 900 (15 min in seconds)
  }
  ↓
Client stores tokens:
  - accessToken: Memory or localStorage (short-lived, less sensitive)
  - refreshToken: HTTP-only cookie (long-lived, secure)

Protected Request (within 15m):
  ↓
Client includes Authorization: Bearer {accessToken}
  ↓
JwtAuthGuard verifies token signature and expiry
  ↓
Granted access to resource

After 15m (accessToken expired):
  ↓
Client sends refreshToken to /auth/refresh
  ↓
JwtStrategy validates refreshToken
  ↓
UserSessionRepository checks:
  - Token exists in database
  - expiresAt > now
  - revokedAt == null
  ↓
Generate new accessToken (same 15m expiry)
  ↓
Return new accessToken to client

User Logout:
  ↓
Client sends POST /auth/logout with refreshToken
  ↓
UserSessionRepository.revoke() sets revokedAt = now
  ↓
All further refresh attempts fail (token revoked)
  ↓
Client clears tokens locally
```

---

## Configuration & Environment

### ConfigService (Type-Safe)

```typescript
// src/common/config/config.service.ts

@Injectable()
export class ConfigService {
  private readonly config: Config;

  constructor() {
    this.config = {
      app: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        apiPrefix: process.env.API_PREFIX || '/api',
      },
      security: {
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
      },
      database: {
        url: process.env.DATABASE_URL,
        logging: process.env.DATABASE_LOGGING === 'true',
        ssl: process.env.DATABASE_SSL === 'true',
      },
      audit: {
        enabled: process.env.AUDIT_ENABLED !== 'false',
        retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS) || 90,
        maskLevel: process.env.AUDIT_MASK_LEVEL || 'partial',
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
        transports: ['console', 'file'],
      },
      cache: {
        ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS) || 300,
        enabled: process.env.CACHE_ENABLED !== 'false',
      },
      // + 3 more sections
    };
  }

  get<T>(path: string): T {
    return get(this.config, path);
  }
}
```

### Environment Variables
See `.env.example` for complete list (~50 variables across 10 sections).

---

## Security Architecture

### Defense Layers

```
Layer 1: HTTPS (production)
  ├─ Enforces encrypted transport
  └─ Prevents MITM attacks

Layer 2: CORS + Security Headers (Helmet)
  ├─ Content-Security-Policy
  ├─ X-Frame-Options: DENY
  ├─ X-Content-Type-Options: nosniff
  ├─ Strict-Transport-Security (HSTS)
  └─ Prevents XSS, clickjacking, etc.

Layer 3: Rate Limiting
  ├─ Per-IP limits
  ├─ Per-endpoint limits
  └─ Prevents brute force, DoS

Layer 4: Input Validation & Sanitization
  ├─ DTO-based validation
  ├─ Pipe-based transformation
  └─ Prevents injection attacks

Layer 5: Authentication (JWT)
  ├─ Token-based stateless auth
  ├─ Session tracking for revocation
  └─ Prevents unauthorized access

Layer 6: Authorization (RBAC)
  ├─ Role-based access control
  ├─ @Roles() decorator enforcement
  └─ Prevents privilege escalation

Layer 7: Data Protection
  ├─ Password: bcrypt (12 rounds)
  ├─ Sensitive data: masking in logs/audit
  ├─ Database: parameterized queries (Prisma)
  └─ Prevents SQL injection, exposure
```

---

## Scheduled Tasks

The application uses `@nestjs/schedule` for background job scheduling.

### Architecture
- **TasksModule**: Centralized task registry in `src/tasks/`
- **Cron-based**: Uses cron expressions for scheduling
- **Configurable**: Environment variables control behavior

### Current Tasks

| Task | Schedule | Purpose |
|------|----------|---------|
| AuditRetentionTask | Weekly (Sunday midnight) | Delete audit logs older than retention period |

### Adding New Tasks
1. Create `{name}.task.ts` in `src/tasks/`
2. Use `@Cron()` decorator with expression from `cron-expressions.ts`
3. Inject required services
4. Export from `src/tasks/index.ts`

### Configuration
```env
AUDIT_RETENTION_ENABLED=true   # Enable/disable task
AUDIT_RETENTION_DAYS=90        # Retention period
AUDIT_RETENTION_CRON="0 0 * * 0"  # Cron expression
```

---

## Scalability Patterns

### Horizontal Scaling
- **Stateless design**: JWT + session stored in database (shareable)
- **Load balancing**: Any instance can handle any request
- **Database connection pooling**: Shared DB connections

### Caching Strategy
- **In-memory cache** (per-instance): User profiles, reference data
- **Redis** (optional): Shared cache for distributed systems
- **Cache invalidation**: On POST/PUT/PATCH/DELETE

### Event-Driven Architecture
- **Async audit logging**: Non-blocking via EventEmitter2
- **Ready for message queue**: EventEmitter → RabbitMQ/Kafka migration path
- **Prevents audit writes from blocking responses**

### Database Optimization
- **Indexing**: On userId, email, createdAt, etc.
- **Pagination**: Enforce limits (default 10, max 100)
- **Eager loading**: Use Prisma includes to avoid N+1
- **Connection pooling**: Configured via DATABASE_URL

---

## Related Documentation

- [Code Standards](./code-standards.md) - Naming conventions, patterns, security
- [Project Overview](./project-overview-pdr.md) - Features, tech stack, requirements
- [Codebase Summary](./codebase-summary.md) - File structure, LOC stats
