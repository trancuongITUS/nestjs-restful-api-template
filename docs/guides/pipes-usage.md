# Pipe Usage Examples

This document demonstrates how to use the common pipes in your NestJS controllers and services.

## 1. ValidationPipe (Global)

The `ValidationPipe` is already registered globally and works automatically with DTOs.

```typescript
// user.dto.ts
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsNotEmpty()
    @MinLength(2)
    name: string;

    @IsEmail()
    email: string;
}

// user.controller.ts
@Post()
createUser(@Body() createUserDto: CreateUserDto) {
    // ValidationPipe automatically validates the DTO
    return this.userService.create(createUserDto);
}
```

## 2. ParseIntPipe

```typescript
import { ParseIntPipe } from '../core/pipes';

@Controller('users')
export class UserController {
    // Basic usage
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.userService.findOne(id);
    }

    // With validation options
    @Get()
    findMany(
        @Query('page', new ParseIntPipe({ min: 1, max: 1000 })) page: number,
        @Query('limit', new ParseIntPipe({ min: 1, max: 100 })) limit: number,
    ) {
        return this.userService.findMany(page, limit);
    }

    // Only positive integers
    @Get(':id/posts')
    getUserPosts(
        @Param('id', new ParseIntPipe({ allowNegative: false })) userId: number,
    ) {
        return this.userService.getUserPosts(userId);
    }
}
```

## 3. ParseUuidPipe

```typescript
import { ParseUuidPipe } from '../core/pipes';

@Controller('organizations')
export class OrganizationController {
    // Basic UUID validation
    @Get(':id')
    findOne(@Param('id', ParseUuidPipe) id: string) {
        return this.organizationService.findOne(id);
    }

    // Specific UUID version
    @Put(':id')
    update(
        @Param('id', new ParseUuidPipe({ version: '4' })) id: string,
        @Body() updateDto: UpdateOrganizationDto,
    ) {
        return this.organizationService.update(id, updateDto);
    }
}
```

## 4. TrimPipe

```typescript
import { TrimPipe } from '../core/pipes';

@Controller('posts')
export class PostController {
    // Basic trimming
    @Get('search')
    search(@Query('q', TrimPipe) query: string) {
        return this.postService.search(query);
    }

    // Advanced trimming with options
    @Post()
    create(
        @Body('title', new TrimPipe({ removeExtraSpaces: true })) title: string,
        @Body(
            'content',
            new TrimPipe({
                removeExtraSpaces: true,
                preserveNewlines: true,
            }),
        )
        content: string,
    ) {
        return this.postService.create({ title, content });
    }
}
```

## 5. LowerCasePipe

```typescript
import { LowerCasePipe } from '../core/pipes';

@Controller('auth')
export class AuthController {
    @Post('login')
    login(
        @Body('email', LowerCasePipe) email: string,
        @Body('password') password: string,
    ) {
        return this.authService.login(email, password);
    }

    // With trimming disabled
    @Post('register')
    register(
        @Body('username', new LowerCasePipe({ trim: false })) username: string,
        @Body('email', LowerCasePipe) email: string,
    ) {
        return this.authService.register(username, email);
    }
}
```

## 6. DefaultValuePipe

```typescript
import { DefaultValuePipe } from '../core/pipes';

@Controller('products')
export class ProductController {
    @Get()
    findAll(
        @Query('page', new DefaultValuePipe(1)) page: number,
        @Query('limit', new DefaultValuePipe(10)) limit: number,
        @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
        @Query('sortOrder', new DefaultValuePipe('desc'))
        sortOrder: 'asc' | 'desc',
    ) {
        return this.productService.findAll({ page, limit, sortBy, sortOrder });
    }

    // Replace empty strings with default
    @Get('search')
    search(
        @Query('category', new DefaultValuePipe('all', true)) category: string,
    ) {
        return this.productService.searchByCategory(category);
    }
}
```

## 7. SanitizePipe

```typescript
import { SanitizePipe } from '../core/pipes';

@Controller('comments')
export class CommentController {
    // Basic sanitization
    @Post()
    create(
        @Body('content', SanitizePipe) content: string,
        @Body(
            'authorName',
            new SanitizePipe({
                removeSpecialChars: true,
                maxLength: 50,
            }),
        )
        authorName: string,
    ) {
        return this.commentService.create({ content, authorName });
    }

    // Allow specific HTML tags
    @Put(':id')
    update(
        @Param('id', ParseUuidPipe) id: string,
        @Body(
            'content',
            new SanitizePipe({
                allowedTags: ['b', 'i', 'em', 'strong'],
                maxLength: 1000,
            }),
        )
        content: string,
    ) {
        return this.commentService.update(id, { content });
    }
}
```

## 8. FileValidationPipe

```typescript
import { FileValidationPipe } from '../core/pipes';
import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
    // Single file upload with validation
    @Post('avatar')
    @UseInterceptors(FileInterceptor('avatar'))
    uploadAvatar(
        @UploadedFile(
            new FileValidationPipe({
                maxSize: 2 * 1024 * 1024, // 2MB
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
                allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
            }),
        )
        file: Express.Multer.File,
    ) {
        return this.uploadService.saveAvatar(file);
    }

    // Multiple files upload
    @Post('documents')
    @UseInterceptors(FilesInterceptor('documents', 5))
    uploadDocuments(
        @UploadedFiles(
            new FileValidationPipe({
                maxSize: 10 * 1024 * 1024, // 10MB per file
                maxFiles: 5,
                allowedMimeTypes: ['application/pdf', 'application/msword'],
                allowedExtensions: ['.pdf', '.doc', '.docx'],
                requireExtension: true,
            }),
        )
        files: Express.Multer.File[],
    ) {
        return this.uploadService.saveDocuments(files);
    }
}
```

## 9. Combining Multiple Pipes

You can chain multiple pipes together:

```typescript
@Controller('api')
export class ApiController {
    @Get('search')
    search(
        @Query(
            'q',
            TrimPipe,
            LowerCasePipe,
            new SanitizePipe({ maxLength: 100 }),
        )
        query: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe)
        page: number,
    ) {
        return this.searchService.search(query, page);
    }
}
```

## 10. Custom Pipe Usage in Services

You can also use pipes programmatically in services:

```typescript
import { Injectable } from '@nestjs/common';
import { TrimPipe, SanitizePipe } from '../core/pipes';

@Injectable()
export class DataProcessingService {
    private readonly trimPipe = new TrimPipe();
    private readonly sanitizePipe = new SanitizePipe();

    processUserInput(input: string): string {
        const trimmed = this.trimPipe.transform(input, {} as any);
        const sanitized = this.sanitizePipe.transform(trimmed, {} as any);
        return sanitized as string;
    }
}
```

## Best Practices

1. **Use ValidationPipe globally** for DTO validation
2. **Combine pipes** for complex transformations
3. **Configure pipes** with appropriate options for your use case
4. **Use type-safe pipes** like ParseIntPipe and ParseUuidPipe for parameters
5. **Always sanitize user input** that will be stored or displayed
6. **Validate file uploads** with appropriate size and type restrictions
7. **Use DefaultValuePipe** for optional query parameters
8. **Chain pipes** in logical order (trim → sanitize → validate)
