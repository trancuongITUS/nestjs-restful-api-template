# Prisma Database Integration Guide

This document provides comprehensive guidance on using Prisma with the Authentication Backend application.

## Table of Contents

1. [Overview](#overview)
2. [Setup and Configuration](#setup-and-configuration)
3. [Database Schema](#database-schema)
4. [Migrations](#migrations)
5. [Seeding](#seeding)
6. [Repository Pattern](#repository-pattern)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Common Operations](#common-operations)
10. [Troubleshooting](#troubleshooting)

## Overview

The Authentication Backend uses Prisma as the primary ORM (Object-Relational Mapping) tool for database operations. Prisma provides:

- **Type-safe database access** with auto-generated TypeScript types
- **Declarative data modeling** with schema.prisma
- **Automatic migrations** for database schema changes
- **Powerful query engine** with optimized SQL generation
- **Connection pooling** and performance optimization

## Setup and Configuration

### Environment Variables

The following environment variables are required for Prisma:

```bash
# Required - Primary database connection
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Optional - Connection pool configuration
DATABASE_CONNECTION_LIMIT=10
DATABASE_POOL_TIMEOUT=20000

# Optional - Prisma engine configuration
PRISMA_QUERY_ENGINE_LIBRARY=
PRISMA_QUERY_ENGINE_BINARY=
```

### Configuration Structure

Database configuration is managed through the ConfigService:

```typescript
interface DatabaseConfig {
    url: string; // Primary connection URL
    connectionLimit: number; // Max connections in pool
    poolTimeout: number; // Connection timeout (ms)
    prismaQueryEngineLibrary?: string; // Custom engine library path
    prismaQueryEngineBinary?: string; // Custom engine binary path
}
```

## Database Schema

### Core Models

The Authentication system includes the following core models:

#### User Management & Authentication

- **User**: Base user accounts with role-based access
- **UserSession**: JWT refresh token management for secure authentication
- **UserRole**: Enum for role-based authorization (ADMIN, USER)

### Schema Relationships

```
User (1) → (N) UserSession
User has UserRole enum (ADMIN, USER)
```

### Authentication Flow

The database schema supports JWT-based authentication with:

- **Access Tokens**: Short-lived tokens for API access
- **Refresh Tokens**: Long-lived tokens stored in UserSession table
- **Role-based Authorization**: Using UserRole enum for permission management

## Migrations

### Development Workflow

1. **Modify Schema**: Update `prisma/schema.prisma`
2. **Generate Migration**: `npm run db:migrate`
3. **Apply Migration**: Automatically applied in development
4. **Generate Client**: `npm run db:generate`

### Available Commands

```bash
# Development migrations (creates and applies)
npm run db:migrate

# Production deployment (applies pending migrations)
npm run db:migrate:deploy

# Reset database (WARNING: Deletes all data)
npm run db:migrate:reset

# Generate Prisma client
npm run db:generate

# Push schema changes without migration files
npm run db:push

# Format schema file
npm run db:format

# Validate schema
npm run db:validate
```

### Migration Best Practices

1. **Always review generated migrations** before applying
2. **Test migrations on staging** before production
3. **Backup database** before major schema changes
4. **Use descriptive migration names**
5. **Avoid breaking changes** in production

## Seeding

### Running Seeds

```bash
# Run the seed script
npm run db:seed
```

### Seed Data Includes

- **Admin User**: `admin@example.com` / `admin123` with ADMIN role
- **Sample Users**: 3 regular users with USER role
- **Sample Session**: Demonstration refresh token for admin user

### Custom Seeding

To add custom seed data, modify `prisma/seed.ts`:

```typescript
// Example: Add new user with specific role
const newUser = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
        email: 'manager@example.com',
        username: 'manager',
        firstName: 'Manager',
        lastName: 'User',
        password: await bcrypt.hash('manager123', 10),
        isActive: true,
        role: 'ADMIN',
    },
});
```

## Repository Pattern

### Base Repository

All repositories extend `BaseRepository` which provides:

- **Generic CRUD operations**
- **Pagination support**
- **Transaction handling**
- **Error logging**
- **Type safety**

### Creating a Repository

```typescript
@Injectable()
export class EmployeeRepository extends BaseRepository<
    Employee,
    Prisma.EmployeeCreateInput,
    Prisma.EmployeeUpdateInput,
    Prisma.EmployeeWhereInput,
    Prisma.EmployeeWhereUniqueInput,
    Prisma.EmployeeOrderByWithRelationInput,
    Prisma.EmployeeInclude,
    Prisma.EmployeeSelect
> {
    protected readonly modelName = 'Employee';

    constructor(prisma: PrismaService) {
        super(prisma);
    }

    protected getModel() {
        return this.prisma.employee;
    }

    // Custom methods
    async findByEmployeeId(employeeId: string): Promise<Employee | null> {
        return this.findUnique({ employeeId });
    }
}
```

### Using Repositories in Services

```typescript
@Injectable()
export class EmployeeService {
    constructor(private readonly employeeRepository: EmployeeRepository) {}

    async getEmployee(id: string): Promise<Employee> {
        const employee = await this.employeeRepository.findUnique({ id });
        if (!employee) {
            throw new NotFoundException('Employee not found');
        }
        return employee;
    }
}
```

## Error Handling

### Prisma Error Types

The system automatically converts Prisma errors to HTTP exceptions:

- **P2002** (Unique constraint) → `409 Conflict`
- **P2025** (Record not found) → `404 Not Found`
- **P2003** (Foreign key constraint) → `400 Bad Request`
- **P2011** (Null constraint) → `400 Bad Request`

### Custom Error Handling

```typescript
import { handlePrismaError } from '../database';

try {
    await this.prisma.user.create({ data: userData });
} catch (error) {
    handlePrismaError(error, 'User');
}
```

### Available Exceptions

- `PrismaException`: Base exception
- `PrismaUniqueConstraintException`: Unique constraint violations
- `PrismaRecordNotFoundException`: Record not found
- `PrismaForeignKeyConstraintException`: Foreign key violations
- `PrismaValidationException`: Validation errors

## Best Practices

### Query Optimization

1. **Use select for specific fields**:

```typescript
const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true },
});
```

2. **Include related data efficiently**:

```typescript
const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
        user: { select: { firstName: true, lastName: true } },
        department: true,
        position: true,
    },
});
```

3. **Use pagination for large datasets**:

```typescript
const result = await repository.paginate(where, {
    page: 1,
    limit: 20,
    orderBy: { createdAt: 'desc' },
});
```

### Transaction Management

```typescript
// Using repository transaction method
await repository.transaction(async (prisma) => {
    await prisma.user.create({ data: userData });
    await prisma.employee.create({ data: employeeData });
});

// Using PrismaService directly
await prismaService.executeTransaction(async (prisma) => {
    // Multiple operations
});
```

### Connection Management

- **Use connection pooling** (configured via environment variables)
- **Close connections properly** (handled by PrismaService lifecycle)
- **Monitor connection usage** via health checks

## Common Operations

### Creating Records

```typescript
// Simple creation
const user = await userRepository.create({
    email: 'user@example.com',
    username: 'user123',
    firstName: 'John',
    lastName: 'Doe',
    password: hashedPassword,
});

// Creation with relations
const employee = await employeeRepository.create({
    user: { connect: { id: userId } },
    employeeId: 'EMP001',
    department: { connect: { id: departmentId } },
    hireDate: new Date(),
    salary: 75000,
});
```

### Querying Records

```typescript
// Find unique
const user = await userRepository.findUnique({ email: 'user@example.com' });

// Find with relations
const employee = await employeeRepository.findUnique(
    { id: employeeId },
    {
        include: {
            user: true,
            department: true,
            position: true,
        },
    },
);

// Complex queries
const employees = await employeeRepository.findMany({
    where: {
        status: 'ACTIVE',
        department: { name: 'Engineering' },
        salary: { gte: 50000 },
    },
    orderBy: { hireDate: 'desc' },
});
```

### Updating Records

```typescript
// Simple update
const user = await userRepository.update({ id: userId }, { firstName: 'Jane' });

// Conditional update
const employee = await employeeRepository.updateMany(
    { departmentId: oldDepartmentId },
    { departmentId: newDepartmentId },
);
```

### Deleting Records

```typescript
// Soft delete (update status)
const employee = await employeeRepository.update(
    { id: employeeId },
    { status: 'TERMINATED' },
);

// Hard delete
const user = await userRepository.delete({ id: userId });
```

## Troubleshooting

### Common Issues

1. **Connection Errors**
    - Check DATABASE_URL format
    - Verify database server is running
    - Check network connectivity

2. **Migration Errors**
    - Review migration files for conflicts
    - Check for data that violates new constraints
    - Use `db:migrate:reset` for development (WARNING: Deletes data)

3. **Type Errors**
    - Run `npm run db:generate` after schema changes
    - Restart TypeScript server in IDE
    - Check for outdated @prisma/client version

4. **Performance Issues**
    - Add database indexes for frequently queried fields
    - Use `select` to limit returned fields
    - Implement proper pagination
    - Monitor query performance with logging

### Health Checks

```typescript
// Check database connectivity
const health = await prismaService.healthCheck();
console.log(health); // { status: 'healthy', message: '...' }

// Get database statistics
const stats = await prismaService.getDatabaseStats();
console.log(stats); // { totalConnections: 5, activeConnections: 2, version: '...' }
```

### Logging

Database queries are logged in development mode. To enable query logging:

```typescript
// In PrismaService constructor
super({
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
    ],
});
```

## Production Considerations

1. **Connection Pooling**: Configure appropriate pool size
2. **SSL Connections**: Enable for production databases
3. **Read Replicas**: Consider for read-heavy workloads
4. **Monitoring**: Implement database performance monitoring
5. **Backups**: Regular automated backups
6. **Security**: Use environment variables for credentials
7. **Migrations**: Test thoroughly before deployment

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [NestJS Prisma Integration](https://docs.nestjs.com/recipes/prisma)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
