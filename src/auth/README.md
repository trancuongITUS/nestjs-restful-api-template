# Authentication & Authorization System

This authentication system implements JWT-based authentication with role-based authorization following NestJS best practices.

## Features

- **JWT Authentication**: Access tokens (15 minutes) and refresh tokens (7 days)
- **Role-based Authorization**: Support for USER and ADMIN roles
- **Global Protection**: All endpoints are protected by default unless marked as `@Public()`
- **Session Management**: Track and manage user sessions with refresh token rotation
- **Security Enhancements**: Password validation, email verification tracking, login tracking
- **Type Safety**: Full TypeScript support with Prisma integration

## Quick Start

### 1. Environment Configuration

Add the following environment variables:

```env
# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-at-least-32-characters-long
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-at-least-32-characters-long
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/hrm_db
```

### 2. Database Migration

```bash
npm run db:generate
npm run db:push
```

### 3. Usage Examples

#### Register a new user

```bash
POST /auth/register
{
  "email": "user@example.com",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePass123!"
}
```

#### Login

```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token

```bash
POST /auth/refresh
{
  "refreshToken": "your-refresh-token"
}
```

#### Access Protected Endpoint

```bash
GET /auth/profile
Authorization: Bearer your-access-token
```

## Controller Protection

### Public Endpoints

```typescript
@Public()
@Controller('public')
export class PublicController {
    @Get()
    getPublicData() {
        return { message: 'No authentication required' };
    }
}
```

### Protected Endpoints (Default)

```typescript
@Controller('protected')
export class ProtectedController {
    @Get()
    getProtectedData(@CurrentUser() user: JwtPayload) {
        return { message: 'Authentication required', user };
    }
}
```

### Role-based Authorization

```typescript
@Controller('admin')
export class AdminController {
    @Roles(UserRole.ADMIN)
    @Get()
    getAdminData(@CurrentUser() user: JwtPayload) {
        return { message: 'Admin access required', user };
    }
}
```

## Available Decorators

- `@Public()`: Mark endpoints as publicly accessible
- `@CurrentUser()`: Extract current user from JWT payload
- `@Roles(...roles)`: Require specific roles for access

## Available Guards

- `GlobalJwtAuthGuard`: Automatically applied to all routes
- `JwtAuthGuard`: Manual JWT authentication
- `RolesGuard`: Role-based authorization
- `LocalAuthGuard`: Username/password authentication

## Database Schema

### User Model

```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  username          String    @unique
  firstName         String
  lastName          String
  password          String
  isActive          Boolean   @default(true)
  role              UserRole  @default(USER)
  emailVerified     Boolean   @default(false)
  emailVerifiedAt   DateTime?
  lastLoginAt       DateTime?
  passwordChangedAt DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  sessions UserSession[]
}
```

### UserSession Model

```prisma
model UserSession {
  id           String    @id @default(cuid())
  userId       String
  refreshToken String    @unique
  expiresAt    DateTime
  createdAt    DateTime  @default(now())
  revokedAt    DateTime?
  userAgent    String?
  ipAddress    String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Security Features

1. **Password Hashing**: bcrypt with salt rounds of 12
2. **Token Rotation**: Refresh tokens are rotated on each use
3. **Session Tracking**: Track user agent and IP address
4. **Password Change Detection**: Invalidate tokens when password changes
5. **Session Management**: Revoke individual or all user sessions

## Error Handling

The system provides comprehensive error handling:

- `UnauthorizedException`: Invalid credentials or tokens
- `ConflictException`: Duplicate email/username during registration
- `ForbiddenException`: Insufficient permissions for role-based access
- `BadRequestException`: Invalid request data

## Testing

Use the example controller at `src/auth/examples/protected-example.controller.ts` to test different authentication scenarios.

## Architecture

```
src/auth/
├── auth.module.ts           # Main authentication module
├── auth.service.ts          # Authentication business logic
├── auth.controller.ts       # Authentication endpoints
├── dto/                     # Data Transfer Objects
├── guards/                  # Authentication & authorization guards
├── strategies/              # Passport strategies
├── decorators/              # Custom decorators
├── interfaces/              # TypeScript interfaces
└── examples/                # Usage examples
```

## Best Practices

1. **Always use HTTPS in production**
2. **Store JWT secrets securely (environment variables)**
3. **Implement rate limiting on auth endpoints**
4. **Use strong password policies**
5. **Monitor and log authentication events**
6. **Implement proper session cleanup**
7. **Consider implementing 2FA for sensitive applications**
