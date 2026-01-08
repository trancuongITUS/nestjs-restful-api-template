# NestJS RESTful API Template

Production-ready REST API built with NestJS, Prisma, PostgreSQL, and JWT authentication. Includes comprehensive audit logging (SOC2-ready), security middleware, performance optimization, and complete documentation.

**Total LOC**: ~12,000 | **Tech**: NestJS 11, TypeScript, PostgreSQL, Prisma | **Status**: Production-ready

## Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 13+
- Docker (optional)

### Installation

```bash
git clone <repo>
npm install
cp .env.example .env
npx prisma migrate dev
npm run start:dev
```

### Test the API

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# With coverage
npm run test:cov
```

## Key Features

### Authentication & Authorization
- JWT-based auth (access: 15m, refresh: 7d)
- Session tracking with revocation support
- Role-based access control (ADMIN/USER)
- Password security via bcrypt (12 rounds)

### Audit Logging (SOC2 Type II)
- Non-blocking async audit trail
- 16 action types, 11 resource types
- Sensitive data masking (3 strategies)
- 90-day retention with auto-cleanup
- Query API with filtering, pagination, CSV/JSON export

### Infrastructure
- 8 interceptors (logging, caching, retry, circuit breaker)
- 5 middleware layers (CORS, security, compression, rate limiting)
- 9 pipes for validation & transformation
- Global exception handling with standardized responses
- Structured logging with Winston

### Security
- OWASP Top 10 mitigations
- Helmet security headers
- Input validation & sanitization
- SQL injection protection via Prisma
- Rate limiting (configurable per-IP, per-endpoint)

## Project Structure

```
src/
├── auth/              # Authentication, JWT, sessions (~2.3K LOC)
├── audit/             # SOC2 audit logging (~3.7K LOC)
├── core/              # Infrastructure, interceptors, pipes (~3.3K LOC)
├── common/            # Database, config, utilities (~2.7K LOC)
└── main.ts

docs/                  # Comprehensive documentation
├── project-overview-pdr.md      # Features & requirements
├── code-standards.md            # Patterns & conventions
├── system-architecture.md       # Module design & flows
└── codebase-summary.md          # File structure breakdown
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - Logout and revoke session
- `GET /auth/profile` - Get current user
- `POST /auth/change-password` - Change password

### Audit Logs (ADMIN only)
- `GET /audit?filters...` - Query audit logs with filters
- `GET /audit/export?format=csv|json` - Export logs

## Response Format

All endpoints return standardized responses:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {},
  "timestamp": "2024-01-07T17:30:00Z",
  "path": "/auth/login"
}
```

## Configuration

Environment-based via `.env`. See `.env.example` for all options (50+ variables across 10 config sections):
- app (port, nodeEnv, version)
- security (corsOrigins, rateLimiting)
- jwt (tokenExpiry, secrets)
- database (url, ssl)
- audit (retention, masking level)
- logging, caching, and more

## Development

```bash
# Start in dev mode (watch)
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Code quality
npm run lint        # ESLint
npm run format      # Prettier

# Database
npm run db:migrate  # Run migrations
npm run db:seed     # Seed sample data
npm run db:studio   # Prisma Studio UI
```

## Database Schema

### User
```
id (UUID), email (unique), username (unique), password (hashed),
firstName, lastName, role (ADMIN/USER), isActive, emailVerified,
createdAt, updatedAt
```

### UserSession
```
id (UUID), userId (FK), refreshToken (unique), expiresAt, revokedAt,
userAgent, ipAddress, createdAt, updatedAt
```

### AuditLog
```
id (UUID), timestamp, userId (FK, nullable), action, resource, method,
endpoint, statusCode, changesBefore, changesAfter, metadata (JSON),
createdAt
```

## Testing

```bash
npm run test              # Jest unit tests
npm run test:watch       # Watch mode
npm run test:e2e         # E2E tests
npm run test:cov         # Coverage report (target: 80%+)
```

## Deployment

### Docker

```bash
docker build -t api .
docker run -e DATABASE_URL="postgresql://..." -p 3000:3000 api
```

### Environment

Ensure these in production:
- `NODE_ENV=production`
- `JWT_SECRET` (strong, random)
- `DATABASE_URL` (PostgreSQL connection)
- `CORS_ORIGINS` (whitelisted domains)
- `LOG_LEVEL=warn` (reduce noise)

## Documentation

- **[Project Overview & PDR](./docs/project-overview-pdr.md)** - Complete feature list, tech stack, requirements, architecture summary
- **[Code Standards](./docs/code-standards.md)** - Naming conventions, design patterns, security best practices
- **[System Architecture](./docs/system-architecture.md)** - Module interactions, request flow, database design
- **[Codebase Summary](./docs/codebase-summary.md)** - File structure, LOC breakdown, dependencies

## License

MIT
