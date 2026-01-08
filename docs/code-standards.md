# Code Standards & Implementation Guidelines

## Naming Conventions

### Classes & Interfaces
- **PascalCase** for all classes: `UserService`, `CreateUserDto`, `JwtAuthGuard`
- **Suffixes matter**:
  - Services: `*Service` (e.g., `AuthService`, `UserService`)
  - Controllers: `*Controller` (e.g., `AuthController`)
  - Guards: `*Guard` (e.g., `JwtAuthGuard`, `RolesGuard`)
  - Strategies: `*Strategy` (e.g., `JwtStrategy`, `LocalStrategy`)
  - Repositories: `*Repository` (e.g., `UserRepository`)
  - DTOs: `*Dto` or `Create*Dto`, `Update*Dto` (e.g., `CreateUserDto`, `LoginDto`)
  - Interceptors: `*Interceptor` (e.g., `LoggingInterceptor`)
  - Pipes: `*Pipe` (e.g., `ValidationPipe`, `TrimPipe`)
  - Decorators: `@Uppercase` or `@lowercase` (e.g., `@CurrentUser()`, `@Public()`)
  - Filters: `*Filter` or `*Exception` (e.g., `HttpExceptionFilter`)

### Functions & Variables
- **camelCase** for all functions and variables: `getUserById()`, `isActive`, `maxRetries`
- **Boolean prefixes**: `is*`, `has*`, `can*`, `should*` (e.g., `isActive`, `hasPermission`, `canDelete`)
- **Database queries**: `find*` (e.g., `findUserById`), `create*`, `update*`, `delete*`

### Constants
- **UPPER_SNAKE_CASE** for constants: `MAX_RETRIES`, `DEFAULT_TIMEOUT`, `JWT_SECRET`
- **Grouped logically**:
  ```typescript
  // Security
  const BCRYPT_ROUNDS = 12;
  const JWT_EXPIRY_MINUTES = 15;

  // Performance
  const DEFAULT_TIMEOUT_MS = 30000;
  const CIRCUIT_BREAKER_THRESHOLD = 5;
  ```

### Enums
- **PascalCase** for enum name, **UPPER_SNAKE_CASE** for values:
  ```typescript
  enum UserRole {
    ADMIN = 'ADMIN',
    USER = 'USER',
  }

  enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
  }
  ```

### Files & Folders
- **kebab-case** for files: `user.service.ts`, `jwt.strategy.ts`, `create-user.dto.ts`
- **Organized by domain**:
  ```
  src/
  ├── auth/
  │   ├── controllers/
  │   ├── services/
  │   ├── strategies/
  │   ├── guards/
  │   ├── decorators/
  │   ├── dtos/
  │   └── auth.module.ts
  ├── audit/
  ├── core/
  ├── common/
  └── main.ts
  ```

---

## Project Structure & Layering

### Directory Organization
```
src/
├── auth/                          # Feature module
│   ├── controllers/auth.controller.ts
│   ├── services/auth.service.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── local.strategy.ts
│   │   └── jwt-refresh.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── local-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── global-jwt-auth.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── roles.decorator.ts
│   ├── dtos/
│   │   ├── login.dto.ts
│   │   ├── register.dto.ts
│   │   ├── refresh-token.dto.ts
│   │   └── change-password.dto.ts
│   ├── repositories/user.repository.ts
│   └── auth.module.ts
│
├── core/                          # Cross-cutting infrastructure
│   ├── interceptors/              # 8 interceptors
│   │   ├── logging.interceptor.ts
│   │   ├── transform.interceptor.ts
│   │   ├── validation.interceptor.ts
│   │   ├── timeout.interceptor.ts
│   │   ├── caching.interceptor.ts
│   │   ├── retry.interceptor.ts
│   │   ├── metrics.interceptor.ts
│   │   └── circuit-breaker.interceptor.ts
│   ├── middlewares/               # 5 middlewares
│   │   ├── compression.middleware.ts
│   │   ├── cors.middleware.ts
│   │   ├── security.middleware.ts
│   │   ├── request-context.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── pipes/                     # 9 pipes
│   │   ├── validation.pipe.ts
│   │   ├── parse-int.pipe.ts
│   │   ├── parse-uuid.pipe.ts
│   │   ├── trim.pipe.ts
│   │   ├── lower-case.pipe.ts
│   │   ├── default-value.pipe.ts
│   │   ├── sanitize.pipe.ts
│   │   ├── file-validation.pipe.ts
│   │   └── base.pipe.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── core.module.ts
│
├── common/                        # Shared utilities
│   ├── database/
│   │   ├── prisma.service.ts
│   │   ├── base.repository.ts
│   │   └── repositories/
│   │       ├── user.repository.ts
│   │       └── user-session.repository.ts
│   ├── config/
│   │   └── config.service.ts      # Type-safe config
│   ├── constants/
│   │   ├── http.constants.ts
│   │   ├── error.constants.ts
│   │   ├── security.constants.ts
│   │   ├── validation.constants.ts
│   │   └── performance.constants.ts
│   ├── utilities/
│   │   ├── logger.util.ts
│   │   ├── security.util.ts
│   │   ├── object.util.ts
│   │   └── type-guards.util.ts
│   ├── types/
│   │   ├── api-response.type.ts
│   │   ├── error-response.type.ts
│   │   └── common.types.ts
│   └── common.module.ts
│
├── audit/                         # Feature module (~3.7K LOC)
│   ├── controllers/audit.controller.ts
│   ├── services/audit.service.ts
│   ├── interceptors/audit.interceptor.ts (global)
│   ├── repositories/audit.repository.ts
│   ├── actions/audit-actions.enum.ts
│   ├── resources/audit-resources.enum.ts
│   ├── masking/
│   │   ├── masking.service.ts
│   │   ├── strategies/
│   │   │   ├── complete-mask.strategy.ts
│   │   │   ├── partial-mask.strategy.ts
│   │   │   └── recursive-mask.strategy.ts
│   │   └── sensitive-fields.config.ts
│   ├── scripts/cleanup-old-audit-logs.ts
│   └── audit.module.ts
│
└── main.ts                        # Application bootstrap
```

### Layering Pattern
```
Controller/Route
    ↓ (DTOs, Guards)
Service
    ↓ (Business logic, validation)
Repository
    ↓ (Database queries)
Prisma/Database

Middleware ← [Request lifecycle] → Interceptor
    ↓                                  ↓
Pipe (validation)              Filter (exception handling)
    ↓
Guard (authorization)
    ↓
Controller
```

---

## Code Patterns & Best Practices

### 1. DTOs (Data Transfer Objects)
**Purpose**: Define request/response contracts, enable validation.

```typescript
// src/auth/dtos/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Must be a valid email' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}

// src/auth/dtos/user.response.dto.ts
export class UserResponseDto {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}
```

**Rules**:
- One DTO per operation type (LoginDto, RegisterDto, CreateUserDto, UpdateUserDto)
- Always include validation decorators
- Use inheritance for common fields
- Response DTOs exclude sensitive fields (password, refreshToken)

### 2. Services (Business Logic)
**Purpose**: Encapsulate business logic, coordinate repositories, emit events.

```typescript
// src/auth/services/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokens(user);
    return tokens;
  }

  private generateTokens(user: User) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: this.config.jwt.accessTokenExpiry },
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: this.config.jwt.refreshTokenExpiry },
    );
    return { accessToken, refreshToken };
  }
}
```

**Rules**:
- Inject dependencies via constructor
- Throw domain-specific exceptions (UnauthorizedException, BadRequestException)
- Keep methods focused on single responsibility
- Use async/await, avoid callbacks
- Emit domain events (this.eventEmitter.emit('user.created', {...}))

### 3. Repositories (Data Access)
**Purpose**: Abstract database operations, enable testing without DB.

```typescript
// src/common/database/base.repository.ts
import { Repository } from 'typeorm';

export abstract class BaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findAll(skip = 0, take = 10): Promise<T[]> {
    return this.repository.find({ skip, take });
  }

  async create(data: Partial<T>): Promise<T> {
    return this.repository.save(data);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }
}

// src/auth/repositories/user.repository.ts
@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findActiveUsers(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { isActive: true },
    });
  }
}
```

**Rules**:
- Extend BaseRepository for common CRUD operations
- Add domain-specific query methods
- Use Prisma parameterized queries (automatic SQL injection protection)
- Return domain models, not database entities
- Keep repository logic focused on queries, not business rules

### 4. Controllers (HTTP Routes)
**Purpose**: Define endpoints, handle HTTP protocol details.

```typescript
// src/auth/controllers/auth.controller.ts
import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dtos/login.dto';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @Public()
  async login(@Req() req: any) {
    return this.authService.login(req.user);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refresh(@CurrentUser() user: User) {
    return this.authService.refresh(user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: User, @Req() req: any) {
    return this.authService.logout(user.id, req.sessionId);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return this.authService.getUserProfile(user.id);
  }
}
```

**Rules**:
- Use decorators: @Post, @Get, @Put, @Patch, @Delete
- Apply guards: @UseGuards(JwtAuthGuard) for protected routes
- Use DTOs for request validation
- Delegate business logic to services
- Controllers should be thin wrappers around services

### 5. Interceptors
**Purpose**: Cross-cutting concerns applied to request/response cycle.

```typescript
// src/core/interceptors/logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Logger } from '@nestjs/common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('LoggingInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(`${method} ${url} - ${duration}ms`);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(`${method} ${url} - ${duration}ms - ${error.message}`);
        throw error;
      }),
    );
  }
}
```

**Rules**:
- Order matters: Applied in registration order
- Use tap() for success side effects
- Use catchError() for error handling
- Never suppress errors (always re-throw)
- Keep interceptors focused on single concern

### 6. Guards
**Purpose**: Control access to routes based on authorization logic.

```typescript
// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid JWT token');
    }
    return user;
  }
}

// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

**Rules**:
- Return boolean or throw exception
- Use Reflector for metadata
- Combine guards with @UseGuards() decorator
- Order guards: JwtAuthGuard (authentication) → RolesGuard (authorization)

### 7. Pipes
**Purpose**: Transform and validate request data.

```typescript
// src/core/pipes/validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errors.map(error => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
        })),
      });
    }

    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
```

**Rules**:
- Transform data before controller receives it
- Throw BadRequestException for validation errors
- Include error details in response
- Apply globally or per-route

---

## Error Handling

### Exception Hierarchy
```typescript
// Use specific NestJS exceptions
UnauthorizedException      // 401 - Invalid credentials
ForbiddenException        // 403 - Insufficient permissions
NotFoundException         // 404 - Resource not found
BadRequestException       // 400 - Invalid input
ConflictException         // 409 - Resource conflict (duplicate)
InternalServerErrorException // 500 - Unexpected error
```

### Global Exception Filter
```typescript
// src/core/filters/http-exception.filter.ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    response.status(status).json({
      success: false,
      statusCode: status,
      message: exceptionResponse['message'] || 'Internal server error',
      data: null,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
    });
  }
}
```

**Rules**:
- Always throw domain-specific exceptions
- Never return error directly; filter standardizes format
- Log errors with context (user, action, endpoint)
- Never expose stack traces in production

---

## Type Safety

### Request/Response Types
```typescript
// src/common/types/api-response.type.ts
export interface SuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  data: null;
  timestamp: string;
  path: string;
  errors?: ValidationError[]; // For 400 errors
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export interface ValidationError {
  field: string;
  message: string;
}
```

**Rules**:
- All endpoints return ApiResponse<T>
- Use generics for type safety
- Define enums for fixed values (UserRole, AuditAction)
- Leverage TypeScript strict mode

---

## Security Best Practices

### Password Handling
```typescript
// Hash on registration
const hashedPassword = await bcrypt.hash(password, 12);

// Never log passwords
logger.info('User login attempt', { email, timestamp }); // OK
logger.info('User login attempt', { email, password }); // WRONG

// Always use constant-time comparison (bcrypt does this)
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

### JWT Token Handling
```typescript
// Separate access (short-lived) and refresh (long-lived) tokens
const accessToken = sign({...}, {expiresIn: '15m'});
const refreshToken = sign({...}, {expiresIn: '7d'});

// Store refresh tokens in database (enables revocation)
await sessionRepository.create({
  userId,
  refreshToken,
  expiresAt: futureDate,
  userAgent,
  ipAddress,
});

// Never store access tokens server-side (they're stateless)
```

### Sensitive Data Masking
```typescript
// Before logging/auditing
const maskedUser = {
  ...user,
  password: '***',
  email: 'u***@example.com',
};

logger.info('User updated', maskedUser);
```

---

## Testing Strategy

### Unit Tests
```bash
npm run test
```

**Coverage targets**: 80%+ per module

### E2E Tests
```bash
npm run test:e2e
```

**Test authentication flow**: register → login → refresh → logout

### Test Structure
```typescript
// src/auth/services/auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let userRepository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: { findByEmail: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
  });

  it('should throw UnauthorizedException for invalid email', async () => {
    jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);

    await expect(service.login('test@example.com', 'password')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
```

---

## Performance Considerations

### Database Queries
- **Use indexes** on: id, userId, email, createdAt
- **Pagination**: Always limit results (default: 10, max: 100)
- **Eager loading**: Use Prisma's `include` for related data
- **Avoid N+1**: Batch queries when possible

### Caching Strategy
- **HTTP responses**: Cache GET requests for read-only data
- **TTL**: 5min for user data, 1h for reference data
- **Invalidation**: Clear on POST/PUT/PATCH/DELETE

### Monitoring
- **Request latency**: Target <200ms p95
- **Error rate**: Keep <0.1% of requests
- **Database**: Monitor connection pool, query time

---

## Related Documentation

- [System Architecture](./system-architecture.md) - Module interactions, request flow
- [Project Overview](./project-overview-pdr.md) - Feature list, requirements
