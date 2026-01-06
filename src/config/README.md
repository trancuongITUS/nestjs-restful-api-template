# Configuration Management

This directory contains the complete configuration management system for the NestJS Backend application, following best practices for environment variable handling, validation, and type safety.

## 📁 File Structure

```
src/config/
├── config.module.ts      # Global configuration module
├── config.service.ts     # Typed configuration service
├── configuration.ts      # Configuration factory and interfaces
├── env.validation.ts     # Environment variable validation schema
├── index.ts             # Centralized exports
└── README.md            # This documentation
```

## 🚀 Quick Start

### 1. Environment Setup

Copy the example environment file and configure your values:

```bash
cp env.example .env
```

### 2. Using Configuration in Your Code

```typescript
import { ConfigService } from './config';

@Injectable()
export class YourService {
    constructor(private readonly configService: ConfigService) {}

    someMethod() {
        // Type-safe access to configuration
        const port = this.configService.app.port;
        const isDev = this.configService.app.isDevelopment;
        const dbUrl = this.configService.database.url;

        // Environment-specific logic
        if (this.configService.isProduction()) {
            // Production-specific code
        }
    }
}
```

## 🔧 Configuration Categories

### Application Configuration

- **port**: Application port (default: 3000)
- **apiPrefix**: API route prefix (default: "api/v1")
- **environment**: Current environment (development/production/test)
- **isDevelopment/isProduction/isTest**: Environment helpers

### Security Configuration

- **allowedOrigins**: CORS allowed origins array
- **maxRequestSize**: Maximum request body size

### Logging Configuration

- **level**: Log level (error/warn/log/debug/verbose)

### Rate Limiting Configuration

- **throttle**: General throttle settings
- **short/medium/long**: Tiered rate limiting configurations

### Performance Configuration

- **requestTimeout**: Request timeout in milliseconds
- **cacheTtl**: Cache time-to-live in milliseconds

### Database Configuration

- **url**: Database connection URL
- **host/port/username/password/name**: Individual connection parameters
- **ssl**: SSL connection flag

### JWT Configuration

- **secret/refreshSecret**: JWT signing secrets
- **expiresIn/refreshExpiresIn**: Token expiration times

### Redis Configuration

- **host/port**: Redis connection details
- **password**: Redis password (optional)
- **db**: Redis database number

### Email Configuration

- **host/port**: Email server details
- **user/password**: SMTP credentials
- **from**: Default sender address

### File Storage Configuration

- **uploadDest**: File upload directory
- **maxFileSize**: Maximum file size
- **allowedFileTypes**: Allowed MIME types array

## 🛡️ Environment Variable Validation

All environment variables are validated using Joi schemas with:

- **Type validation**: Ensures correct data types
- **Format validation**: Validates patterns (URLs, emails, etc.)
- **Default values**: Provides sensible defaults
- **Required/optional**: Enforces required configuration
- **Custom validation**: Business logic validation

### Validation Schema Features

```typescript
// Example validations
NODE_ENV: Joi.string().valid('development', 'production', 'test');
PORT: Joi.number().port().default(3000);
JWT_SECRET: Joi.string().min(32).optional();
DATABASE_URL: Joi.string().uri().optional();
EMAIL_FROM: Joi.string().email().optional();
```

## 📝 Environment Files

The configuration system supports multiple environment files with priority:

1. `.env.${NODE_ENV}.local` (highest priority)
2. `.env.${NODE_ENV}`
3. `.env.local`
4. `.env` (lowest priority)

### Example Environment Files

#### Development (`.env`)

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=log
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200
```

#### Production (`.env.production`)

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
ALLOWED_ORIGINS=https://yourdomain.com
DATABASE_SSL=true
```

#### Testing (`.env.test`)

```env
NODE_ENV=test
PORT=3001
LOG_LEVEL=error
DATABASE_NAME=test_db
```

## 🔍 Configuration Service API

### Basic Usage

```typescript
// Get configuration sections
const appConfig = this.configService.app;
const dbConfig = this.configService.database;

// Environment checks
const isDev = this.configService.isDevelopment();
const isProd = this.configService.isProduction();
const isTest = this.configService.isTest();

// Get specific values
const port = this.configService.get('app.port');
const dbUrl = this.configService.get('database.url', 'default-url');
```

### Advanced Usage

```typescript
// Check if configuration exists
const hasRedis = this.configService.isDefined('redis');

// Validate required configuration
this.configService.validateRequiredConfig(['database.url', 'jwt.secret']);

// Get complete configuration (debugging)
const allConfig = this.configService.getAllConfig();
```

## 🚨 Error Handling

### Validation Errors

If environment variables fail validation, the application will fail to start with detailed error messages:

```
ValidationError: "PORT" must be a valid port number
ValidationError: "JWT_SECRET" length must be at least 32 characters long
```

### Missing Required Configuration

```typescript
// Throws error if required config is missing
this.configService.validateRequiredConfig(['database.url']);
// Error: Missing required configuration: database.url
```

## 🔄 Configuration Updates

### Adding New Configuration

1. **Update validation schema** (`env.validation.ts`):

```typescript
NEW_CONFIG: Joi.string().required().description('New configuration value');
```

2. **Update configuration factory** (`configuration.ts`):

```typescript
export interface NewConfig {
    value: string;
}

// In configuration factory
newConfig: {
    value: env.NEW_CONFIG,
}
```

3. **Update service** (`config.service.ts`):

```typescript
get newConfig(): NewConfig {
    return this.configService.get<NewConfig>('newConfig', { infer: true })!;
}
```

4. **Update environment files**:

```env
NEW_CONFIG=some-value
```

## 🧪 Testing Configuration

```typescript
describe('ConfigService', () => {
    let configService: ConfigService;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            imports: [ConfigModule],
        }).compile();

        configService = module.get<ConfigService>(ConfigService);
    });

    it('should provide app configuration', () => {
        expect(configService.app.port).toBe(3000);
        expect(configService.app.isDevelopment).toBe(true);
    });

    it('should validate environment', () => {
        expect(configService.isDevelopment()).toBe(true);
    });
});
```

## 🔒 Security Best Practices

### Secrets Management

- **Never commit secrets** to version control
- **Use environment variables** for all sensitive data
- **Rotate secrets regularly** in production
- **Use strong, unique secrets** (minimum 32 characters for JWT)

### Environment Separation

- **Different secrets** for each environment
- **Minimal configuration** in development
- **Secure defaults** in production
- **Isolated test environment**

### Configuration Validation

- **Validate all inputs** at startup
- **Fail fast** on invalid configuration
- **Provide clear error messages**
- **Document all requirements**

## 📊 Monitoring and Debugging

### Configuration Logging

```typescript
// Log configuration on startup (without secrets)
const logger = new Logger('Configuration');
logger.log(`Environment: ${this.configService.app.environment}`);
logger.log(`Port: ${this.configService.app.port}`);
logger.log(`API Prefix: ${this.configService.app.apiPrefix}`);
```

### Health Checks

```typescript
@Get('health/config')
getConfigHealth() {
    return {
        environment: this.configService.app.environment,
        hasDatabase: this.configService.isDefined('database'),
        hasRedis: this.configService.isDefined('redis'),
        hasEmail: this.configService.isDefined('email'),
    };
}
```

## 🚀 Deployment Considerations

### Docker

```dockerfile
# Copy environment template
COPY env.example .env

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
```

### Kubernetes

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
    name: app-config
data:
    NODE_ENV: 'production'
    PORT: '3000'
    API_PREFIX: 'api/v1'
---
apiVersion: v1
kind: Secret
metadata:
    name: app-secrets
data:
    JWT_SECRET: <base64-encoded-secret>
    DATABASE_URL: <base64-encoded-url>
```

### Environment Variables Priority

1. **Kubernetes secrets/configmaps**
2. **Docker environment variables**
3. **System environment variables**
4. **Environment files**
5. **Default values**

## 🤝 Contributing

When adding new configuration:

1. **Add validation** in `env.validation.ts`
2. **Update interfaces** in `configuration.ts`
3. **Extend service** in `config.service.ts`
4. **Document changes** in this README
5. **Update example files** (`env.example`)
6. **Add tests** for new configuration

## 📚 Additional Resources

- [NestJS Configuration Documentation](https://docs.nestjs.com/techniques/configuration)
- [Joi Validation Library](https://joi.dev/)
- [Environment Variables Best Practices](https://12factor.net/config)
- [Security Configuration Guidelines](https://owasp.org/www-project-cheat-sheets/cheatsheets/Configuration_Cheat_Sheet.html)
