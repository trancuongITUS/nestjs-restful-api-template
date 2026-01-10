/**
 * Authentication Controller
 * Handles authentication endpoints
 */

import {
    Controller,
    Post,
    Body,
    UseGuards,
    Get,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import {
    RegisterDto,
    LoginDto,
    RefreshTokenDto,
    ChangePasswordDto,
} from './dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './interfaces/auth.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * Register a new user
     */
    @ApiOperation({
        summary: 'Register a new user',
        description:
            'Create a new user account with email, username, and password',
    })
    @ApiResponse({
        status: 201,
        description: 'User successfully registered',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                statusCode: { type: 'number', example: 201 },
                message: {
                    type: 'string',
                    example: 'User registered successfully',
                },
                data: {
                    type: 'object',
                    properties: {
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', example: 'cuid123' },
                                email: {
                                    type: 'string',
                                    example: 'user@example.com',
                                },
                                username: {
                                    type: 'string',
                                    example: 'johndoe123',
                                },
                                firstName: { type: 'string', example: 'John' },
                                lastName: { type: 'string', example: 'Doe' },
                                role: { type: 'string', example: 'USER' },
                                isActive: { type: 'boolean', example: true },
                                emailVerified: {
                                    type: 'boolean',
                                    example: false,
                                },
                                createdAt: {
                                    type: 'string',
                                    format: 'date-time',
                                },
                            },
                        },
                        tokens: {
                            type: 'object',
                            properties: {
                                accessToken: {
                                    type: 'string',
                                    example: 'jwt-access-token',
                                },
                                refreshToken: {
                                    type: 'string',
                                    example: 'jwt-refresh-token',
                                },
                            },
                        },
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
        description: 'Conflict - email or username already exists',
    })
    @Public()
    @Post('register')
    async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
        return this.authService.register(registerDto, req);
    }

    /**
     * Login user
     */
    @ApiOperation({
        summary: 'Login user',
        description: 'Authenticate user with email and password',
    })
    @ApiResponse({
        status: 200,
        description: 'User successfully logged in',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                statusCode: { type: 'number', example: 200 },
                message: { type: 'string', example: 'Login successful' },
                data: {
                    type: 'object',
                    properties: {
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', example: 'cuid123' },
                                email: {
                                    type: 'string',
                                    example: 'user@example.com',
                                },
                                username: {
                                    type: 'string',
                                    example: 'johndoe123',
                                },
                                firstName: { type: 'string', example: 'John' },
                                lastName: { type: 'string', example: 'Doe' },
                                role: { type: 'string', example: 'USER' },
                            },
                        },
                        tokens: {
                            type: 'object',
                            properties: {
                                accessToken: {
                                    type: 'string',
                                    example: 'jwt-access-token',
                                },
                                refreshToken: {
                                    type: 'string',
                                    example: 'jwt-refresh-token',
                                },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid credentials',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation errors',
    })
    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto, @Req() req: Request) {
        return this.authService.login(loginDto, req);
    }

    /**
     * Refresh access token
     */
    @ApiOperation({
        summary: 'Refresh access token',
        description: 'Get new access token using refresh token',
    })
    @ApiResponse({
        status: 200,
        description: 'Token successfully refreshed',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Token refreshed successfully',
                },
                data: {
                    type: 'object',
                    properties: {
                        accessToken: {
                            type: 'string',
                            example: 'new-jwt-access-token',
                        },
                        refreshToken: {
                            type: 'string',
                            example: 'new-jwt-refresh-token',
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid or expired refresh token',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation errors',
    })
    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Body() refreshTokenDto: RefreshTokenDto,
        @Req() req: Request,
    ) {
        return this.authService.refreshToken(refreshTokenDto.refreshToken, req);
    }

    /**
     * Logout user (revoke refresh token)
     */
    @ApiOperation({
        summary: 'Logout user',
        description: 'Revoke refresh token and logout user',
    })
    @ApiResponse({
        status: 204,
        description: 'User successfully logged out',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid token',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - validation errors',
    })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    async logout(
        @Body() refreshTokenDto: RefreshTokenDto,
        @CurrentUser() user: JwtPayload,
        @Req() req: Request,
    ) {
        await this.authService.logout(
            refreshTokenDto.refreshToken,
            user.sub,
            user.username,
            user.role,
            req,
        );
    }

    /**
     * Logout user from all devices
     */
    @ApiOperation({
        summary: 'Logout from all devices',
        description: 'Revoke all refresh tokens for the user',
    })
    @ApiResponse({
        status: 204,
        description: 'User successfully logged out from all devices',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid token',
    })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post('logout-all')
    @HttpCode(HttpStatus.NO_CONTENT)
    async logoutAll(@CurrentUser() user: JwtPayload, @Req() req: Request) {
        await this.authService.logoutAllDevices(
            user.sub,
            user.username,
            user.role,
            req,
        );
    }

    /**
     * Get current user profile
     */
    @ApiOperation({
        summary: 'Get user profile',
        description: 'Get current authenticated user profile information',
    })
    @ApiResponse({
        status: 200,
        description: 'User profile retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Profile retrieved successfully',
                },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'cuid123' },
                        email: { type: 'string', example: 'user@example.com' },
                        username: { type: 'string', example: 'johndoe123' },
                        firstName: { type: 'string', example: 'John' },
                        lastName: { type: 'string', example: 'Doe' },
                        role: { type: 'string', example: 'USER' },
                        isActive: { type: 'boolean', example: true },
                        emailVerified: { type: 'boolean', example: false },
                        lastLoginAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid token',
    })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(@CurrentUser() user: JwtPayload) {
        return this.authService.getProfile(user.sub);
    }

    /**
     * Change password
     */
    @ApiOperation({
        summary: 'Change user password',
        description: 'Change the password for the authenticated user',
    })
    @ApiResponse({
        status: 204,
        description: 'Password successfully changed',
    })
    @ApiResponse({
        status: 400,
        description:
            'Bad request - validation errors or incorrect current password',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - invalid token',
    })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    @HttpCode(HttpStatus.NO_CONTENT)
    async changePassword(
        @CurrentUser() user: JwtPayload,
        @Body() changePasswordDto: ChangePasswordDto,
        @Req() req: Request,
    ) {
        await this.authService.changePassword(
            user.sub,
            changePasswordDto.currentPassword,
            changePasswordDto.newPassword,
            req,
        );
    }
}
