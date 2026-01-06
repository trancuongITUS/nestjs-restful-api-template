import {
    IsOptional,
    IsInt,
    Min,
    Max,
    IsString,
    IsEnum,
    IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction, AuditResource } from '../enums';

/**
 * DTO for querying audit logs with filtering and pagination
 */
export class AuditQueryDto {
    @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Items per page',
        minimum: 1,
        maximum: 100,
        default: 50,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 50;

    @ApiPropertyOptional({ description: 'Filter by user ID' })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiPropertyOptional({
        enum: AuditAction,
        description: 'Filter by action type',
    })
    @IsOptional()
    @IsEnum(AuditAction)
    action?: AuditAction;

    @ApiPropertyOptional({
        enum: AuditResource,
        description: 'Filter by resource type',
    })
    @IsOptional()
    @IsEnum(AuditResource)
    resource?: AuditResource;

    @ApiPropertyOptional({
        description: 'Filter by start date (ISO 8601 format)',
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'Filter by end date (ISO 8601 format)',
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({
        enum: ['timestamp', 'action', 'resource'],
        description: 'Sort by field',
        default: 'timestamp',
    })
    @IsOptional()
    @IsEnum(['timestamp', 'action', 'resource'])
    sortBy?: string = 'timestamp';

    @ApiPropertyOptional({
        enum: ['asc', 'desc'],
        description: 'Sort order',
        default: 'desc',
    })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'desc';
}
