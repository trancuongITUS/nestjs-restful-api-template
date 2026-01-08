# Project Overview & Product Development Requirements

## Project Description

**NestJS RESTful API Template** is a production-ready API framework designed to accelerate development of scalable, secure REST services. Built with modern technologies and industry best practices, it provides comprehensive solutions for authentication, audit logging, error handling, and infrastructure concerns—enabling teams to focus on business logic rather than framework plumbing.

**Total LOC**: ~12,000 lines across src/ | **Status**: Production-ready

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | NestJS | 11.x | Modular, scalable backend framework |
| **Language** | TypeScript | Latest | Type safety, IDE support, developer experience |
| **Database** | PostgreSQL | 13+ | Relational data persistence |
| **ORM** | Prisma | Latest | Type-safe database access with migrations |
| **Authentication** | JWT + Local | - | Token-based + local strategy auth |
| **Password** | bcrypt | 12 rounds | Secure password hashing |
| **Logging** | Winston | - | Structured logging with transports |
| **Events** | EventEmitter2 | - | Async event-driven audit logging |
| **Compression** | Gzip | - | HTTP response compression |
| **Validation** | class-validator | - | DTO/request validation |
| **Security** | Helmet + CORS | - | HTTP security headers + cross-origin requests |

---

## Core Features

### 1. Authentication & Authorization
- **JWT-based authentication** with access (15m) & refresh tokens (7d)
- **Session tracking** via UserSession table (expiresAt, revokedAt, userAgent, ipAddress)
- **Local strategy** for credential-based login
- **Password security**: bcrypt hashing with 12 rounds
- **Role-based access control (RBAC)** with ADMIN/USER roles
- **Guards**: JwtAuthGuard, LocalAuthGuard, RolesGuard, GlobalJwtAuthGuard
- **Decorators**: @CurrentUser(), @Public(), @Roles()

**Endpoints**:
- `POST /auth/register` - User registration with email/password
- `POST /auth/login` - Credential-based login with session creation
- `POST /auth/refresh` - Token refresh using refresh token
- `POST /auth/logout` - Session revocation
- `GET /auth/profile` - Current user profile
- `POST /auth/change-password` - Password change with audit trail

### 2. Comprehensive Audit Logging (SOC2-ready)
- **Non-blocking architecture** via EventEmitter2 (async, doesn't block requests)
- **Global AuditInterceptor** for POST/PUT/PATCH/DELETE operations
- **16 audit actions**: CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.
- **11 audit resources**: USER, AUTH, SESSION, ROLE, PROFILE, etc.
- **Sensitive data masking**: Complete, partial, recursive masking strategies
- **Query API** with filtering, pagination, sorting
- **Export formats**: CSV, JSON
- **Retention policy**: 90-day automatic cleanup via scheduled script

**Audit Fields**:
- timestamp, userId, action, resource, method, endpoint, statusCode
- changesBefore, changesAfter, metadata (userAgent, ipAddress)

### 3. Request/Response Infrastructure
- **Standard response format** (all endpoints):
  ```json
  {
    "success": boolean,
    "statusCode": number,
    "message": string,
    "data": T,
    "timestamp": ISO8601,
    "path": string
  }
  ```
- **Global exception handling** via HttpExceptionFilter
- **Error response format** with validation errors array

### 4. Performance & Resilience
- **8 interceptors**: Logging, Transform, Validation, Timeout, Caching, Retry (exponential backoff), Metrics, CircuitBreaker
- **Retry logic**: Exponential backoff for transient failures
- **Circuit breaker**: Prevent cascade failures
- **Request timeout**: Configurable per-endpoint
- **Response caching**: In-memory cache with TTL
- **Metrics collection**: Request count, latency tracking

### 5. Security & Middleware
- **5 middleware layers**:
  1. Compression (gzip)
  2. CORS (configurable origins)
  3. Security (Helmet: CSP, X-Frame-Options, X-Content-Type-Options, etc.)
  4. Request context (logging, request ID tracking)
  5. Rate limiting (IP/endpoint based)
- **Input validation**: 9 pipes for data transformation & validation
- **SQL injection protection**: Via Prisma parameterized queries
- **CSRF tokens**: Configuration ready
- **HTTPS enforcement**: In production mode

### 6. Data Validation & Transformation
- **9 pipes**: ValidationPipe, ParseIntPipe, ParseUuidPipe, TrimPipe, LowerCasePipe, DefaultValuePipe, SanitizePipe, FileValidationPipe, + BasePipe
- **DTO-based validation** with class-validator decorators
- **Custom transformers**: Automatic trimming, lowercasing, sanitization
- **File upload validation**: Size, MIME type, virus scanning ready

---

## Database Schema

### User Table
```sql
{
  id: UUID (primary key),
  email: string (unique),
  username: string (unique),
  firstName: string,
  lastName: string,
  password: string (hashed),
  isActive: boolean (default: true),
  role: enum [ADMIN, USER] (default: USER),
  emailVerified: boolean (default: false),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### UserSession Table
```sql
{
  id: UUID (primary key),
  userId: UUID (foreign key → User),
  refreshToken: string (unique),
  expiresAt: timestamp,
  revokedAt: timestamp (nullable),
  userAgent: string,
  ipAddress: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### AuditLog Table
```sql
{
  id: UUID (primary key),
  timestamp: timestamp,
  userId: UUID (nullable, foreign key → User),
  action: enum [CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, ...],
  resource: enum [USER, AUTH, SESSION, ROLE, ...],
  method: string [GET, POST, PUT, PATCH, DELETE],
  endpoint: string,
  statusCode: number,
  changesBefore: JSON (nullable),
  changesAfter: JSON (nullable),
  metadata: JSON {userAgent, ipAddress, ...},
  createdAt: timestamp
}
```

---

## Architecture Overview

### Module Structure
```
src/
├── auth/                    # Authentication module (~2,300 LOC)
│   ├── controllers/
│   ├── services/
│   ├── strategies/          # JWT, Local, JwtRefresh
│   ├── guards/              # JwtAuthGuard, LocalAuthGuard, RolesGuard
│   ├── decorators/          # @CurrentUser, @Public, @Roles
│   └── dtos/
│
├── audit/                   # Audit logging module (~3,726 LOC)
│   ├── controllers/
│   ├── services/
│   ├── interceptors/        # AuditInterceptor (global)
│   ├── repositories/
│   ├── actions/
│   ├── resources/
│   ├── masking/             # Data masking strategies
│   └── scripts/             # Cleanup jobs
│
├── core/                    # Infrastructure (~3,299 LOC)
│   ├── interceptors/        # 8 core interceptors
│   ├── middlewares/         # 5 core middlewares
│   ├── pipes/               # 9 core pipes
│   └── filters/             # Global exception filter
│
├── common/                  # Shared utilities (~2,662 LOC)
│   ├── database/
│   │   ├── prisma.service.ts
│   │   ├── base.repository.ts
│   │   └── repositories/
│   ├── config/
│   │   └── config.service.ts (type-safe, 10 sections)
│   ├── constants/
│   ├── utilities/
│   ├── types/
│   └── logger/
│
└── main.ts                  # Application bootstrap
```

### Request Flow Diagram
```
HTTP Request
    ↓
CORS Middleware → Compression → Security (Helmet) → Request Context
    ↓
Rate Limiting Middleware
    ↓
Global Exception Filter (wraps all below)
    ↓
Route Matching
    ↓
Pipes: Validation, Transformation, Sanitization
    ↓
Guards: JWT Auth, RBAC
    ↓
Interceptors: Logging, Metrics, Retry, Circuit Breaker, Timeout
    ↓
Controller → Service → Repository → Database
    ↓
Interceptors: Transform, Audit (async event)
    ↓
Response Format: {success, statusCode, message, data, timestamp, path}
    ↓
HTTP Response
```

---

## Product Development Requirements (PDR)

### Functional Requirements

| ID | Requirement | Status | Details |
|-----|------------|--------|---------|
| FR-AUTH-001 | User registration | Implemented | Email/password signup with validation |
| FR-AUTH-002 | User login | Implemented | JWT token issuance, session creation |
| FR-AUTH-003 | Token refresh | Implemented | Refresh token rotation (7d lifetime) |
| FR-AUTH-004 | User logout | Implemented | Session revocation, token blacklist ready |
| FR-AUTH-005 | Password change | Implemented | Audit trail integration |
| FR-AUTH-006 | RBAC | Implemented | ADMIN/USER roles, @Roles() decorator |
| FR-AUDIT-001 | Action logging | Implemented | Non-blocking via EventEmitter2 |
| FR-AUDIT-002 | Data masking | Implemented | Sensitive field protection (3 strategies) |
| FR-AUDIT-003 | Query API | Implemented | Filter, paginate, sort, export (JSON/CSV) |
| FR-AUDIT-004 | Retention policy | Implemented | 90-day auto-cleanup script |
| FR-API-001 | Standard responses | Implemented | Consistent format across all endpoints |
| FR-API-002 | Error handling | Implemented | Global filter, validation error details |

### Non-Functional Requirements

| ID | Requirement | Status | Details |
|-----|------------|--------|---------|
| NFR-SEC-001 | Password security | Implemented | bcrypt 12 rounds, constant-time comparison |
| NFR-SEC-002 | JWT security | Implemented | HS256, configurable expiry, refresh rotation |
| NFR-SEC-003 | HTTPS enforcement | Ready | Helmet + environment-based enforcement |
| NFR-SEC-004 | Rate limiting | Implemented | IP-based, endpoint-based configurable |
| NFR-SEC-005 | Input validation | Implemented | Class-validator, custom sanitization |
| NFR-PERF-001 | Request timeout | Implemented | Configurable, default 30s |
| NFR-PERF-002 | Response caching | Implemented | In-memory with TTL, cache invalidation |
| NFR-PERF-003 | Gzip compression | Implemented | ~60% size reduction on JSON responses |
| NFR-PERF-004 | Retry logic | Implemented | Exponential backoff, max 3 attempts |
| NFR-PERF-005 | Circuit breaker | Implemented | Prevent cascade failures, automatic recovery |
| NFR-OBS-001 | Structured logging | Implemented | Winston with context, log levels |
| NFR-OPS-001 | Health check | Ready | Liveness/readiness probes for k8s |
| NFR-OPS-002 | Metrics | Implemented | Request count, latency tracking |

### Acceptance Criteria

- All endpoints return standard response format
- All errors include descriptive messages
- Sensitive data (passwords, tokens) never logged
- Audit trail captures all state-changing operations
- JWT tokens validate on every request
- Rate limiting prevents brute force attacks
- Performance: <200ms p95 response time (excl. DB)
- Security: OWASP Top 10 mitigations in place
- Code: 80%+ test coverage, no critical bugs
- Deployment: Docker-ready, environment-configurable

---

## Configuration

### Environment Variables (via ConfigService)
- **app**: port, nodeEnv, version, apiPrefix
- **security**: corsOrigins, rateLimitWindow, jwtSecret
- **jwt**: accessTokenExpiry (15m), refreshTokenExpiry (7d)
- **database**: url, logging, ssl
- **audit**: enabled, retention (90 days), maskLevel
- **logging**: level, format, transports
- **cache**: ttl, enabled
- And 4 more sections

See `.env.example` for all available options.

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- npm or yarn

### Installation
```bash
git clone <repo>
npm install
cp .env.example .env
npx prisma migrate dev
npm run start:dev
```

### Running Tests
```bash
npm run test              # Unit tests
npm run test:e2e         # E2E tests
npm run test:cov         # Coverage report
```

### Building for Production
```bash
npm run build
npm run start:prod
```

---

## Related Documentation

- [Code Standards](./code-standards.md) - Naming conventions, patterns, error handling
- [System Architecture](./system-architecture.md) - Module interactions, request flow, database design
- [Codebase Summary](./codebase-summary.md) - File structure, module breakdown, LOC stats
