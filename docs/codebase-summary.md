# Codebase Summary

## Overview

**Project**: NestJS RESTful API Template
**Total LOC**: ~12,000 lines across src/
**Language**: TypeScript (100%)
**Framework**: NestJS 11.x
**Database**: PostgreSQL with Prisma ORM

This document provides a detailed file structure breakdown and module statistics.

---

## Directory Structure

```
src/
├── auth/                                  (~2,300 LOC) [Authentication Module]
│   ├── controllers/
│   │   └── auth.controller.ts            (~150 LOC)
│   ├── services/
│   │   ├── auth.service.ts               (~400 LOC)
│   │   └── user.service.ts               (~200 LOC)
│   ├── strategies/
│   │   ├── jwt.strategy.ts               (~80 LOC)
│   │   ├── local.strategy.ts             (~70 LOC)
│   │   └── jwt-refresh.strategy.ts       (~80 LOC)
│   ├── guards/
│   │   ├── jwt-auth.guard.ts             (~40 LOC)
│   │   ├── local-auth.guard.ts           (~30 LOC)
│   │   ├── roles.guard.ts                (~60 LOC)
│   │   └── global-jwt-auth.guard.ts      (~40 LOC)
│   ├── decorators/
│   │   ├── current-user.decorator.ts     (~20 LOC)
│   │   ├── public.decorator.ts           (~10 LOC)
│   │   └── roles.decorator.ts            (~15 LOC)
│   ├── dtos/
│   │   ├── login.dto.ts                  (~20 LOC)
│   │   ├── register.dto.ts               (~25 LOC)
│   │   ├── refresh-token.dto.ts          (~15 LOC)
│   │   ├── change-password.dto.ts        (~20 LOC)
│   │   └── user-response.dto.ts          (~30 LOC)
│   ├── repositories/
│   │   ├── user.repository.ts            (~80 LOC)
│   │   └── user-session.repository.ts    (~90 LOC)
│   ├── auth.module.ts                    (~50 LOC)
│   └── README.md
│
├── tasks/                                 (~120 LOC) [Scheduled Tasks Module]
│   ├── constants/
│   │   ├── cron-expressions.ts            (~20 LOC)
│   │   └── index.ts                       (~5 LOC)
│   ├── audit-retention.task.ts            (~60 LOC)
│   ├── tasks.module.ts                    (~30 LOC)
│   └── index.ts                           (~5 LOC)
│
├── audit/                                 (~3,726 LOC) [Audit Logging Module]
│   ├── controllers/
│   │   └── audit.controller.ts           (~120 LOC)
│   ├── services/
│   │   ├── audit.service.ts              (~400 LOC)
│   │   └── masking.service.ts            (~350 LOC)
│   ├── interceptors/
│   │   └── audit.interceptor.ts          (~200 LOC)
│   ├── repositories/
│   │   └── audit.repository.ts           (~300 LOC)
│   ├── enums/
│   │   ├── audit-actions.enum.ts         (~30 LOC)
│   │   └── audit-resources.enum.ts       (~30 LOC)
│   ├── masking/
│   │   ├── strategies/
│   │   │   ├── complete-mask.strategy.ts (~60 LOC)
│   │   │   ├── partial-mask.strategy.ts  (~80 LOC)
│   │   │   └── recursive-mask.strategy.ts (~100 LOC)
│   │   ├── mask-factory.ts               (~50 LOC)
│   │   └── sensitive-fields.config.ts    (~40 LOC)
│   ├── scripts/
│   │   ├── cleanup-old-audit-logs.ts     (~80 LOC)
│   │   └── audit-logs.seeder.ts          (~60 LOC)
│   ├── dtos/
│   │   ├── audit-log.dto.ts              (~50 LOC)
│   │   ├── query-audit.dto.ts            (~40 LOC)
│   │   └── export-audit.dto.ts           (~30 LOC)
│   ├── types/
│   │   └── audit-context.types.ts        (~50 LOC)
│   ├── audit.module.ts                   (~60 LOC)
│   └── README.md
│
├── core/                                  (~3,299 LOC) [Infrastructure Module]
│   ├── interceptors/                     (~800 LOC total)
│   │   ├── logging.interceptor.ts        (~100 LOC)
│   │   ├── transform.interceptor.ts      (~120 LOC)
│   │   ├── validation.interceptor.ts     (~100 LOC)
│   │   ├── timeout.interceptor.ts        (~80 LOC)
│   │   ├── caching.interceptor.ts        (~150 LOC)
│   │   ├── retry.interceptor.ts          (~150 LOC)
│   │   ├── metrics.interceptor.ts        (~100 LOC)
│   │   └── circuit-breaker.interceptor.ts(~100 LOC)
│   ├── middlewares/                      (~600 LOC total)
│   │   ├── compression.middleware.ts     (~80 LOC)
│   │   ├── cors.middleware.ts            (~100 LOC)
│   │   ├── security.middleware.ts        (~150 LOC)
│   │   ├── request-context.middleware.ts (~120 LOC)
│   │   └── rate-limit.middleware.ts      (~150 LOC)
│   ├── pipes/                            (~700 LOC total)
│   │   ├── validation.pipe.ts            (~100 LOC)
│   │   ├── parse-int.pipe.ts             (~60 LOC)
│   │   ├── parse-uuid.pipe.ts            (~70 LOC)
│   │   ├── trim.pipe.ts                  (~50 LOC)
│   │   ├── lower-case.pipe.ts            (~50 LOC)
│   │   ├── default-value.pipe.ts         (~50 LOC)
│   │   ├── sanitize.pipe.ts              (~100 LOC)
│   │   ├── file-validation.pipe.ts       (~100 LOC)
│   │   ├── base.pipe.ts                  (~40 LOC)
│   │   └── base-string.pipe.ts           (~40 LOC)
│   ├── filters/
│   │   └── http-exception.filter.ts      (~100 LOC)
│   ├── decorators/
│   │   └── api-response.decorator.ts     (~50 LOC)
│   ├── core.module.ts                    (~50 LOC)
│   └── README.md
│
├── common/                                (~2,662 LOC) [Shared Utilities]
│   ├── database/                         (~600 LOC)
│   │   ├── prisma.service.ts             (~150 LOC)
│   │   ├── base.repository.ts            (~200 LOC)
│   │   └── repositories/
│   │       ├── user.repository.ts        (~100 LOC)
│   │       └── user-session.repository.ts(~150 LOC)
│   ├── config/                           (~300 LOC)
│   │   ├── config.service.ts             (~200 LOC)
│   │   ├── config.schema.ts              (~80 LOC)
│   │   └── config.types.ts               (~20 LOC)
│   ├── constants/                        (~400 LOC)
│   │   ├── http.constants.ts             (~80 LOC)
│   │   ├── error.constants.ts            (~100 LOC)
│   │   ├── security.constants.ts         (~80 LOC)
│   │   ├── validation.constants.ts       (~80 LOC)
│   │   └── performance.constants.ts      (~60 LOC)
│   ├── utilities/                        (~400 LOC)
│   │   ├── logger.util.ts                (~120 LOC)
│   │   ├── security.util.ts              (~100 LOC)
│   │   ├── object.util.ts                (~100 LOC)
│   │   └── type-guards.util.ts           (~80 LOC)
│   ├── types/                            (~200 LOC)
│   │   ├── api-response.type.ts          (~50 LOC)
│   │   ├── error-response.type.ts        (~40 LOC)
│   │   ├── validation-error.type.ts      (~30 LOC)
│   │   ├── common.types.ts               (~50 LOC)
│   │   └── index.ts                      (~30 LOC)
│   ├── common.module.ts                  (~50 LOC)
│   └── README.md
│
├── app.module.ts                         (~100 LOC)
├── main.ts                               (~80 LOC)
└── README.md

prisma/
├── schema.prisma                         (~150 LOC) [Database Schema]
└── migrations/
    ├── init/
    └── [timestamped migration files]

docs/
├── project-overview-pdr.md               (~400 LOC)
├── code-standards.md                     (~500 LOC)
├── system-architecture.md                (~600 LOC)
└── codebase-summary.md                   (this file)

Configuration Files:
├── .env.example                          (~100 LOC)
├── package.json                          (~80 LOC)
├── tsconfig.json                         (~40 LOC)
├── nest-cli.json                         (~10 LOC)
├── .eslintrc.mjs                         (~80 LOC)
└── .prettierrc                           (~5 LOC)

Test Files:
├── src/**/*.spec.ts                      (~1,500 LOC)
└── test/                                 (~500 LOC for e2e tests)
```

---

## Module Statistics

| Module | LOC | Files | Purpose |
|--------|-----|-------|---------|
| **auth** | ~2,300 | 25 | User authentication, JWT, sessions |
| **tasks** | ~120 | 5 | Scheduled background jobs |
| **audit** | ~3,726 | 35 | SOC2 audit logging, masking, queries |
| **core** | ~3,299 | 20 | Interceptors, middlewares, pipes, filters |
| **common** | ~2,662 | 30 | Database, config, utilities, types |
| **Root** | ~180 | 2 | app.module, main.ts |
| **Prisma** | ~150 | 1 | Database schema + migrations |
| **Docs** | ~1,500 | 4 | Documentation files |
| **Tests** | ~2,000 | 20+ | Unit & E2E test specs |
| **Config** | ~315 | 6 | Environment, eslint, prettier, etc. |
| **TOTAL** | ~12,100+ | 135+ | Complete project |

---

## Key File Descriptions

### Authentication Module (src/auth/)

**Core Logic**:
- `auth.service.ts` - Registration, login, token generation, logout
- `user.service.ts` - User creation, password changes, profile updates
- `jwt.strategy.ts` - JWT token validation strategy
- `local.strategy.ts` - Email/password credential strategy

**Access Control**:
- `jwt-auth.guard.ts` - Protected route guard (validates JWT)
- `local-auth.guard.ts` - Login route guard (triggers local auth)
- `roles.guard.ts` - RBAC enforcement based on @Roles()
- `global-jwt-auth.guard.ts` - Applied globally (except @Public())

**Data Transfer**:
- `login.dto.ts` - Email, password input
- `register.dto.ts` - Email, password, username, name input
- `user-response.dto.ts` - User profile output (no password/tokens)
- `refresh-token.dto.ts` - Refresh token input
- `change-password.dto.ts` - Old password, new password input

**Data Access**:
- `user.repository.ts` - findByEmail, findById, findActive, create, update
- `user-session.repository.ts` - findActive, create, revoke, cleanup

---

### Audit Module (src/audit/)

**Query & Logging**:
- `audit.service.ts` - Create logs, query by filters, export (CSV/JSON)
- `audit.interceptor.ts` - Global interceptor for POST/PUT/PATCH/DELETE
- `audit.repository.ts` - Query, filter, sort, paginate audit logs

**Data Protection**:
- `masking.service.ts` - Apply masking strategies to sensitive data
- `complete-mask.strategy.ts` - Replace entire value (password → ***)
- `partial-mask.strategy.ts` - Mask portion of value (email → u***@example.com)
- `recursive-mask.strategy.ts` - Mask nested sensitive fields in JSON

**Maintenance**:
- `cleanup-old-audit-logs.ts` - 90-day retention script (runs scheduled)
- `audit-logs.seeder.ts` - Generate sample audit logs for testing

**Data Models**:
- `audit-actions.enum.ts` - 16 action types (CREATE, UPDATE, LOGIN, etc.)
- `audit-resources.enum.ts` - 11 resource types (USER, SESSION, etc.)
- `audit-log.dto.ts` - Response model for audit entries
- `query-audit.dto.ts` - Query parameters (filters, pagination, sorting)

---

### Tasks Module (src/tasks/)

Centralized scheduled task registry using NestJS Schedule.

| File | Purpose |
|------|---------|
| `tasks.module.ts` | ScheduleModule.forRoot() registration |
| `audit-retention.task.ts` | Weekly audit log cleanup cron |
| `constants/cron-expressions.ts` | Reusable cron patterns |
| `index.ts` | Barrel export |

---

### Core Infrastructure (src/core/)

**Request Processing (Interceptors)**:
1. **logging.interceptor.ts** - Log requests/responses with timing
2. **transform.interceptor.ts** - Wrap response in standard format
3. **validation.interceptor.ts** - Re-validate before response
4. **timeout.interceptor.ts** - Enforce request timeout
5. **caching.interceptor.ts** - Cache GET responses
6. **retry.interceptor.ts** - Exponential backoff for failures
7. **metrics.interceptor.ts** - Track latency, error rate
8. **circuit-breaker.interceptor.ts** - Prevent cascade failures

**Security & Middleware**:
- **compression.middleware.ts** - Gzip response compression
- **cors.middleware.ts** - CORS header configuration
- **security.middleware.ts** - Helmet security headers
- **request-context.middleware.ts** - Request ID, correlation tracking
- **rate-limit.middleware.ts** - IP-based rate limiting

**Data Transformation (Pipes)**:
- **validation.pipe.ts** - DTO validation via class-validator
- **parse-int.pipe.ts** - String to integer with bounds check
- **parse-uuid.pipe.ts** - UUID v4 format validation
- **trim.pipe.ts** - Whitespace trimming
- **lower-case.pipe.ts** - String lowercasing
- **default-value.pipe.ts** - Apply default if missing
- **sanitize.pipe.ts** - Remove dangerous characters
- **file-validation.pipe.ts** - File size/MIME validation

**Error Handling**:
- **http-exception.filter.ts** - Global exception handler, standardizes responses

---

### Common Utilities (src/common/)

**Database Layer** (database/):
- **prisma.service.ts** - ORM initialization, connection management
- **base.repository.ts** - Generic CRUD operations (abstract)
- **user.repository.ts** - User queries
- **user-session.repository.ts** - Session queries

**Configuration** (config/):
- **config.service.ts** - Type-safe config with 10 sections (~200 LOC)
- **config.schema.ts** - Joi validation schema
- **config.types.ts** - TypeScript interfaces for config

**Constants** (constants/):
- **http.constants.ts** - HTTP methods, status codes, error messages
- **error.constants.ts** - Error codes organized by domain
- **security.constants.ts** - Bcrypt rounds, JWT expiry, limits
- **validation.constants.ts** - Min/max lengths, patterns
- **performance.constants.ts** - Timeouts, cache TTL, thresholds

**Utilities** (utilities/):
- **logger.util.ts** - Structured logging with Winston
- **security.util.ts** - hashPassword, comparePassword, token generation
- **object.util.ts** - pick, omit, deepClone, deepMerge
- **type-guards.util.ts** - isUUID, isEmail, isValidDate, isObject

**Types** (types/):
- **api-response.type.ts** - ApiResponse<T> union type
- **error-response.type.ts** - Error response structure
- **validation-error.type.ts** - Field-level validation errors
- **common.types.ts** - Shared domain types

---

## Code Metrics

### Quality Indicators

| Metric | Target | Status |
|--------|--------|--------|
| Test Coverage | 80%+ | ✓ Implemented |
| Cyclomatic Complexity | <10 per function | ✓ Maintained |
| Lint Violations | 0 | ✓ ESLint configured |
| Documentation | Complete | ✓ This document |
| Type Safety | strict: true | ✓ TypeScript strict |
| Security | OWASP Top 10 | ✓ 7 defense layers |

### File Complexity

| Complexity | Files | Action |
|-----------|-------|--------|
| High (>300 LOC) | masking.service.ts, audit.service.ts, auth.service.ts | Keep focused, consider splitting |
| Medium (100-300 LOC) | Most services, repositories | Well-structured |
| Low (<100 LOC) | Pipes, guards, strategies | Easy to maintain |

---

## Database Schema

### User Table
```
Field          | Type      | Constraints
id             | UUID      | PK, default: uuid()
email          | String    | UNIQUE, NOT NULL, indexed
username       | String    | UNIQUE, NOT NULL
firstName      | String    | NOT NULL
lastName       | String    | NOT NULL
password       | String    | NOT NULL (bcrypt hashed)
isActive       | Boolean   | NOT NULL, default: true
role           | Enum      | ADMIN | USER, default: USER
emailVerified  | Boolean   | default: false
createdAt      | DateTime  | NOT NULL, indexed
updatedAt      | DateTime  | NOT NULL
```

### UserSession Table
```
Field        | Type      | Constraints
id           | UUID      | PK
userId       | UUID      | FK → User, indexed
refreshToken | String    | UNIQUE, NOT NULL
expiresAt    | DateTime  | NOT NULL, indexed
revokedAt    | DateTime  | nullable
userAgent    | String    |
ipAddress    | String    |
createdAt    | DateTime  | NOT NULL
updatedAt    | DateTime  |
```

### AuditLog Table
```
Field         | Type      | Constraints
id            | UUID      | PK
timestamp     | DateTime  | NOT NULL, indexed
userId        | UUID      | FK → User, nullable, indexed
action        | Enum      | 16 action types, indexed
resource      | Enum      | 11 resource types, indexed
method        | String    | GET|POST|PUT|PATCH|DELETE
endpoint      | String    | e.g. "/auth/change-password"
statusCode    | Int       | e.g. 200, 400, 500
changesBefore | JSON      | nullable
changesAfter  | JSON      | nullable
metadata      | JSON      | {userAgent, ipAddress, ...}
createdAt     | DateTime  | NOT NULL, indexed
```

### Indexes
- User: email (UNIQUE), createdAt
- UserSession: userId, expiresAt, revokedAt
- AuditLog: timestamp, userId, action, resource, endpoint

---

## Dependencies

### Core Dependencies
```json
{
  "@nestjs/core": "^11.0.0",
  "@nestjs/jwt": "^12.0.0",
  "@nestjs/passport": "^10.0.0",
  "@prisma/client": "^5.0.0",
  "@nestjs/common": "^11.0.0",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.0",
  "bcrypt": "^5.1.0",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "passport-local": "^1.0.0",
  "eventEmitter2": "^6.4.0",
  "helmet": "^7.0.0",
  "compression": "^1.7.0",
  "winston": "^3.11.0"
}
```

### Dev Dependencies
```json
{
  "@nestjs/testing": "^11.0.0",
  "typescript": "^5.0.0",
  "@types/jest": "^29.0.0",
  "jest": "^29.0.0",
  "@types/express": "^4.17.0",
  "ts-loader": "^9.0.0",
  "eslint": "^8.0.0",
  "prettier": "^3.0.0",
  "@prisma/cli": "^5.0.0"
}
```

---

## Development Scripts

```bash
# Development
npm run start           # Start server (compiled)
npm run start:dev      # Start with nodemon (watch)
npm run start:debug    # Start with debugger

# Building
npm run build          # Compile TypeScript
npm run clean          # Remove dist/

# Testing
npm run test           # Unit tests (Jest)
npm run test:watch    # Unit tests (watch mode)
npm run test:cov      # Coverage report
npm run test:e2e      # E2E tests

# Database
npm run db:migrate    # Run Prisma migrations
npm run db:seed       # Seed sample data
npm run db:studio     # Open Prisma Studio

# Code Quality
npm run lint          # Run ESLint
npm run format        # Run Prettier
npm run format:check  # Check formatting

# Production
npm run build
npm run start:prod    # Start production build
```

---

## Related Documentation

- [Project Overview & PDR](./project-overview-pdr.md) - Features, requirements
- [Code Standards](./code-standards.md) - Patterns, conventions
- [System Architecture](./system-architecture.md) - Module interactions, flows
