# Core Middlewares Documentation

This directory contains all the essential middlewares, filters, interceptors, and pipes for the NestJS application. These components follow best practices for security, performance, logging, and error handling.

## 📁 Directory Structure

```
src/core/
├── filters/
│   └── http-exception.filter.ts    # Global exception handling
├── interceptors/
│   ├── logging.interceptor.ts      # Request/response logging
│   ├── timeout.interceptor.ts      # Request timeout handling
│   └── transform.interceptor.ts    # Response transformation
├── middlewares/
│   ├── compression.middleware.ts   # Response compression
│   ├── cors.middleware.ts          # CORS handling
│   ├── request-context.middleware.ts # Request context & ID
│   ├── rate-limit.middleware.ts    # Rate limiting
│   └── security.middleware.ts      # Security headers (Helmet)
└── pipes/
    └── validation.pipe.ts          # Enhanced validation
```

## 🛡️ Security Middlewares

### SecurityMiddleware

- **Purpose**: Applies security headers using Helmet.js
- **Features**:
    - Content Security Policy (CSP)
    - HTTP Strict Transport Security (HSTS)
    - X-Frame-Options, X-XSS-Protection
    - DNS Prefetch Control
    - Hide X-Powered-By header

### CorsMiddleware

- **Purpose**: Handles Cross-Origin Resource Sharing
- **Features**:
    - Environment-based origin allowlist
    - Configurable headers and methods
    - Preflight request handling
    - Credentials support

### RateLimitMiddleware

- **Purpose**: Prevents abuse and DDoS attacks
- **Configuration**: Three-tier rate limiting
    - Short: 10 requests/minute
    - Medium: 50 requests/5 minutes
    - Long: 100 requests/15 minutes

## 📊 Performance Middlewares

### CompressionMiddleware

- **Purpose**: Compresses response bodies to reduce bandwidth
- **Features**:
    - Configurable compression level
    - MIME type filtering
    - Threshold-based compression (>1KB)
    - Memory optimization

### TimeoutInterceptor

- **Purpose**: Prevents requests from running indefinitely
- **Default**: 30-second timeout
- **Error**: Returns structured timeout error

## 📝 Logging & Monitoring

### LoggingInterceptor

- **Purpose**: Comprehensive request/response logging
- **Features**:
    - Request timing
    - Response size tracking
    - Error logging with stack traces
    - Request ID correlation

### RequestContextMiddleware

- **Purpose**: Adds metadata to requests
- **Features**:
    - Request ID generation
    - Security headers
    - Performance timing
    - Request tracking

## ✅ Validation & Transformation

### ValidationPipe

- **Purpose**: Enhanced request validation
- **Features**:
    - Nested validation support
    - Detailed error messages
    - Whitelist filtering
    - Type transformation

### TransformInterceptor

- **Purpose**: Standardizes response format
- **Features**:
    - Consistent API response structure
    - Pagination metadata support
    - Success message generation
    - Error response formatting

## 🚨 Error Handling

### HttpExceptionFilter

- **Purpose**: Global exception handling
- **Features**:
    - Structured error responses
    - Validation error formatting
    - Request ID tracking
    - Environment-aware error details
    - Comprehensive error logging

## 🔧 Configuration

### Environment Variables

```env
# Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200
NODE_ENV=development

# Performance
MAX_REQUEST_SIZE=10mb

# Application
PORT=3000
LOG_LEVEL=log
```

### Rate Limiting Configuration

The rate limiting is configured in `app.module.ts`:

```typescript
ThrottlerModule.forRoot([
    {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests
    },
    {
        name: 'medium',
        ttl: 300000, // 5 minutes
        limit: 50, // 50 requests
    },
    {
        name: 'long',
        ttl: 900000, // 15 minutes
        limit: 100, // 100 requests
    },
]);
```

## 📚 Usage Examples

### Custom Rate Limiting

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('api')
export class ApiController {
    @Throttle({ short: { limit: 5, ttl: 60000 } })
    @Post('upload')
    uploadFile() {
        // This endpoint has custom rate limiting
    }
}
```

### Skip Logging for Specific Routes

```typescript
import { SetMetadata } from '@nestjs/common';

export const SKIP_LOGGING = 'skipLogging';
export const SkipLogging = () => SetMetadata(SKIP_LOGGING, true);

@Controller('health')
export class HealthController {
    @Get()
    @SkipLogging()
    check() {
        return { status: 'ok' };
    }
}
```

### Custom Validation DTO

```typescript
import { IsString, IsEmail, IsOptional, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
    @IsString()
    @Length(2, 50)
    @Transform(({ value }) => value.trim())
    name: string;

    @IsEmail()
    @Transform(({ value }) => value.toLowerCase())
    email: string;

    @IsOptional()
    @IsString()
    @Length(10, 15)
    phone?: string;
}
```

## 🔍 API Response Format

### Success Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Data retrieved successfully",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/users"
}
```

### Error Response

```json
{
    "success": false,
    "statusCode": 400,
    "message": "Validation failed",
    "error": {
        "code": "VALIDATION_FAILED",
        "details": "Request validation failed",
        "validationErrors": [
            {
                "field": "email",
                "value": "invalid-email",
                "constraints": {
                    "isEmail": "email must be an email"
                }
            }
        ],
        "requestId": "req_abc123_xyz789"
    },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/v1/users"
}
```

## 🚀 Performance Impact

- **Compression**: 60-80% size reduction for JSON responses
- **Caching**: Request ID correlation for debugging
- **Timeout**: Prevents resource exhaustion
- **Rate Limiting**: Protects against abuse
- **Validation**: Early request rejection

## 🛠️ Customization

Each middleware can be customized by modifying the respective files:

1. **Security Policy**: Update `security.middleware.ts` CSP directives
2. **CORS Origins**: Modify `getAllowedOrigins()` in `cors.middleware.ts`
3. **Rate Limits**: Adjust values in `app.module.ts`
4. **Timeout Duration**: Change timeout value in `main.ts`
5. **Compression Settings**: Update `compression.middleware.ts` options

## 🔗 Integration

All middlewares are automatically applied through:

1. **AppModule**: Middleware registration
2. **main.ts**: Global pipes, filters, and interceptors
3. **Automatic**: No additional configuration needed

The middlewares work together to provide a robust, secure, and performant API foundation.
