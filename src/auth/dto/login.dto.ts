/**
 * Login Data Transfer Object
 */

import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({
        description: 'User email address',
        example: 'user@example.com',
        format: 'email',
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiProperty({
        description: 'User password',
        example: 'SecurePass123!',
        minLength: 8,
        format: 'password',
    })
    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password: string;

    @ApiPropertyOptional({
        description: 'User agent string from the client',
        example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    })
    @IsOptional()
    @IsString()
    userAgent?: string;

    @ApiPropertyOptional({
        description: 'IP address of the client',
        example: '192.168.1.1',
    })
    @IsOptional()
    @IsString()
    ipAddress?: string;
}
