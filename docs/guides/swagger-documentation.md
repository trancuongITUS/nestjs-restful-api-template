# Swagger API Documentation Guide

This guide provides comprehensive instructions for using Swagger documentation in the HRM Backend project following NestJS best practices.

## Table of Contents

1. [Overview](#overview)
2. [Accessing Swagger Documentation](#accessing-swagger-documentation)
3. [Basic Swagger Decorators](#basic-swagger-decorators)
4. [Controller Documentation](#controller-documentation)
5. [DTO Documentation](#dto-documentation)
6. [Authentication Documentation](#authentication-documentation)
7. [Response Documentation](#response-documentation)
8. [Best Practices](#best-practices)
9. [Examples](#examples)
10. [Troubleshooting](#troubleshooting)

## Overview

The project uses `@nestjs/swagger` to automatically generate OpenAPI 3.0 documentation. Swagger UI is available at `/api/docs` when the application is running.

### Key Features

- **Automatic Schema Generation**: DTOs are automatically converted to OpenAPI schemas
- **Interactive API Testing**: Test endpoints directly from the Swagger UI
- **Authentication Support**: JWT Bearer token authentication integrated
- **Type Safety**: Full TypeScript support with validation
- **Organized Documentation**: APIs grouped by tags for better navigation

## Accessing Swagger Documentation

Once the application is running, access the Swagger documentation at:

```
http://localhost:3000/api/docs
```

The documentation includes:

- All available endpoints
- Request/response schemas
- Authentication requirements
- Interactive testing interface

## Basic Swagger Decorators

### Essential Imports

```typescript
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiProperty,
    ApiPropertyOptional,
    ApiBearerAuth,
    ApiBody,
} from '@nestjs/swagger';
```

### Core Decorators

| Decorator          | Purpose                        | Usage                                                   |
| ------------------ | ------------------------------ | ------------------------------------------------------- |
| `@ApiTags()`       | Group endpoints by category    | `@ApiTags('users')`                                     |
| `@ApiOperation()`  | Describe endpoint operation    | `@ApiOperation({ summary: 'Create user' })`             |
| `@ApiResponse()`   | Document response schemas      | `@ApiResponse({ status: 200, description: 'Success' })` |
| `@ApiProperty()`   | Document DTO properties        | `@ApiProperty({ example: 'john@example.com' })`         |
| `@ApiBearerAuth()` | Mark endpoint as requiring JWT | `@ApiBearerAuth('JWT-auth')`                            |

## Controller Documentation

### 1. Add Controller Tags

```typescript
@ApiTags('users')
@Controller('users')
export class UsersController {
    // ... controller methods
}
```

### 2. Document Each Endpoint

```typescript
@ApiOperation({
    summary: 'Create a new user',
    description: 'Creates a new user account with the provided information',
})
@ApiResponse({
    status: 201,
    description: 'User successfully created',
    schema: {
        type: 'object',
        properties: {
            success: { type: 'boolean', example: true },
            statusCode: { type: 'number', example: 201 },
            message: { type: 'string', example: 'User created successfully' },
            data: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'cuid123' },
                    email: { type: 'string', example: 'user@example.com' },
                    username: { type: 'string', example: 'johndoe' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
        },
    },
})
@ApiResponse({
    status: 400,
    description: 'Bad request - validation errors',
})
@ApiResponse({
    status: 409,
    description: 'Conflict - user already exists',
})
@Post()
async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
}
```

### 3. Protected Endpoints

For endpoints requiring authentication:

```typescript
@ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieve the authenticated user profile',
})
@ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
})
@ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
})
@ApiBearerAuth('JWT-auth')  // Important: This enables the "Authorize" button
@UseGuards(JwtAuthGuard)
@Get('profile')
async getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
}
```

## DTO Documentation

### 1. Basic Property Documentation

```typescript
export class CreateUserDto {
    @ApiProperty({
        description: 'User email address',
        example: 'user@example.com',
        format: 'email',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'User password',
        example: 'SecurePass123!',
        minLength: 8,
        format: 'password',
    })
    @IsString()
    @MinLength(8)
    password: string;
}
```

### 2. Optional Properties

```typescript
export class UpdateUserDto {
    @ApiPropertyOptional({
        description: 'User first name',
        example: 'John',
        minLength: 2,
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    firstName?: string;
}
```

### 3. Enum Properties

```typescript
export class CreateUserDto {
    @ApiProperty({
        description: 'User role',
        enum: UserRole,
        example: UserRole.USER,
        default: UserRole.USER,
    })
    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole = UserRole.USER;
}
```

### 4. Array Properties

```typescript
export class CreateUserDto {
    @ApiProperty({
        description: 'User permissions',
        type: [String],
        example: ['read:users', 'write:users'],
        isArray: true,
    })
    @IsArray()
    @IsString({ each: true })
    permissions: string[];
}
```

### 5. Nested Object Properties

```typescript
export class CreateUserDto {
    @ApiProperty({
        description: 'User address information',
        type: 'object',
        properties: {
            street: { type: 'string', example: '123 Main St' },
            city: { type: 'string', example: 'New York' },
            zipCode: { type: 'string', example: '10001' },
        },
    })
    @ValidateNested()
    @Type(() => AddressDto)
    address: AddressDto;
}
```

## Authentication Documentation

### 1. JWT Bearer Authentication

The project uses JWT Bearer authentication. To test protected endpoints:

1. **Login**: Use the `/auth/login` endpoint to get tokens
2. **Authorize**: Click the "Authorize" button in Swagger UI
3. **Enter Token**: Paste the `accessToken` (without "Bearer " prefix)
4. **Test**: Protected endpoints will now include the Authorization header

### 2. Public Endpoints

Mark public endpoints with `@Public()` decorator:

```typescript
@ApiOperation({
    summary: 'Public endpoint',
    description: 'This endpoint does not require authentication',
})
@Public()
@Get('public')
getPublicData() {
    return { message: 'Public data' };
}
```

### 3. Role-Based Endpoints

Document role requirements:

```typescript
@ApiOperation({
    summary: 'Admin only endpoint',
    description: 'This endpoint requires ADMIN role',
})
@ApiResponse({
    status: 403,
    description: 'Forbidden - ADMIN role required',
})
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get('admin')
getAdminData() {
    return { message: 'Admin data' };
}
```

## Response Documentation

### 1. Success Responses

Document successful responses with examples:

```typescript
@ApiResponse({
    status: 200,
    description: 'Operation successful',
    schema: {
        type: 'object',
        properties: {
            success: { type: 'boolean', example: true },
            statusCode: { type: 'number', example: 200 },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: {
                type: 'object',
                // Define your data structure here
            },
        },
    },
})
```

### 2. Error Responses

Document common error responses:

```typescript
@ApiResponse({
    status: 400,
    description: 'Bad Request - Validation errors',
    schema: {
        type: 'object',
        properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string', example: 'Validation failed' },
            error: {
                type: 'object',
                properties: {
                    code: { type: 'string', example: 'VALIDATION_ERROR' },
                    details: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    },
})
@ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
})
@ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
})
@ApiResponse({
    status: 404,
    description: 'Not Found - Resource not found',
})
@ApiResponse({
    status: 500,
    description: 'Internal Server Error',
})
```

## Best Practices

### 1. Consistent Documentation

- **Always** add `@ApiTags()` to controllers
- **Always** add `@ApiOperation()` to endpoints
- **Always** document success and error responses
- **Always** add `@ApiBearerAuth('JWT-auth')` to protected endpoints

### 2. Meaningful Descriptions

```typescript
// ❌ Bad
@ApiOperation({ summary: 'Get user' })

// ✅ Good
@ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve detailed information about a specific user by their unique identifier',
})
```

### 3. Realistic Examples

```typescript
// ❌ Bad
@ApiProperty({ example: 'string' })

// ✅ Good
@ApiProperty({
    description: 'User email address',
    example: 'john.doe@company.com',
    format: 'email',
})
```

### 4. Complete Response Schemas

Always document the complete response structure including:

- Success/error status
- Status codes
- Messages
- Data structure
- Timestamps

### 5. Validation Alignment

Ensure Swagger documentation matches validation rules:

```typescript
@ApiProperty({
    description: 'Username',
    minLength: 3,
    maxLength: 20,
    pattern: '^[a-zA-Z0-9_-]+$',
    example: 'johndoe123',
})
@IsString()
@MinLength(3)
@MaxLength(20)
@Matches(/^[a-zA-Z0-9_-]+$/)
username: string;
```

## Examples

### Complete Controller Example

```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
    constructor(private readonly employeesService: EmployeesService) {}

    @ApiOperation({
        summary: 'Create new employee',
        description: 'Create a new employee record in the system',
    })
    @ApiResponse({
        status: 201,
        description: 'Employee created successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                statusCode: { type: 'number', example: 201 },
                message: {
                    type: 'string',
                    example: 'Employee created successfully',
                },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'emp_123' },
                        firstName: { type: 'string', example: 'John' },
                        lastName: { type: 'string', example: 'Doe' },
                        email: {
                            type: 'string',
                            example: 'john.doe@company.com',
                        },
                        department: { type: 'string', example: 'Engineering' },
                        position: {
                            type: 'string',
                            example: 'Software Developer',
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation errors',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
    })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.HR)
    @Post()
    async create(@Body() createEmployeeDto: CreateEmployeeDto) {
        return this.employeesService.create(createEmployeeDto);
    }

    @ApiOperation({
        summary: 'Get employee by ID',
        description: 'Retrieve detailed information about a specific employee',
    })
    @ApiParam({
        name: 'id',
        description: 'Employee unique identifier',
        example: 'emp_123',
    })
    @ApiResponse({
        status: 200,
        description: 'Employee retrieved successfully',
        // ... response schema
    })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    @ApiBearerAuth('JWT-auth')
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.employeesService.findOne(id);
    }
}
```

### Complete DTO Example

```typescript
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    IsOptional,
    IsEnum,
    MinLength,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum Department {
    ENGINEERING = 'ENGINEERING',
    HR = 'HR',
    FINANCE = 'FINANCE',
    MARKETING = 'MARKETING',
}

export class CreateEmployeeDto {
    @ApiProperty({
        description: 'Employee first name',
        example: 'John',
        minLength: 2,
        maxLength: 50,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(50)
    firstName: string;

    @ApiProperty({
        description: 'Employee last name',
        example: 'Doe',
        minLength: 2,
        maxLength: 50,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(50)
    lastName: string;

    @ApiProperty({
        description: 'Employee email address',
        example: 'john.doe@company.com',
        format: 'email',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Employee department',
        enum: Department,
        example: Department.ENGINEERING,
    })
    @IsEnum(Department)
    department: Department;

    @ApiPropertyOptional({
        description: 'Employee position/job title',
        example: 'Senior Software Developer',
        maxLength: 100,
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    position?: string;

    @ApiPropertyOptional({
        description: 'Employee phone number',
        example: '+1-555-123-4567',
        pattern: '^\\+?[1-9]\\d{1,14}$',
    })
    @IsOptional()
    @IsString()
    phone?: string;
}
```

## Troubleshooting

### Common Issues

1. **Swagger UI not loading**
    - Check that the application is running
    - Verify the URL: `http://localhost:3000/api/docs`
    - Check console for JavaScript errors

2. **DTOs not appearing in schemas**
    - Ensure `@ApiProperty()` decorators are added
    - Check that DTOs are properly imported and used in controllers
    - Verify class-validator decorators are present

3. **Authentication not working**
    - Ensure `@ApiBearerAuth('JWT-auth')` is added to protected endpoints
    - Check that the JWT token is valid and not expired
    - Verify the token is entered without "Bearer " prefix in Swagger UI

4. **Missing endpoints**
    - Check that controllers are properly imported in modules
    - Ensure `@Controller()` and HTTP method decorators are present
    - Verify the endpoint is not marked as `@Public()` if expecting it to be protected

### Debugging Tips

1. **Check Generated Schema**
    - Visit `/api/docs-json` to see the raw OpenAPI JSON
    - Validate the schema structure

2. **Console Logs**
    - Check browser console for JavaScript errors
    - Check server logs for any startup errors

3. **Validation**
    - Test DTOs independently to ensure validation works
    - Check that validation pipe is properly configured

## Conclusion

Following this guide ensures consistent, comprehensive API documentation that:

- Improves developer experience
- Facilitates API testing
- Provides clear contracts for frontend developers
- Maintains documentation quality standards

Remember to update documentation whenever you:

- Add new endpoints
- Modify existing endpoints
- Change request/response structures
- Update authentication requirements

For questions or improvements to this guide, please refer to the team documentation standards or create an issue in the project repository.
