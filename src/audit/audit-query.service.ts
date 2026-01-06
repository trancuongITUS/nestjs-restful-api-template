import { Injectable } from '@nestjs/common';
import { Prisma, AuditLog } from '@prisma/client';
import { AuditRepository } from './repositories';
import { AuditQueryDto } from './dto';

/**
 * Paginated Result Interface
 */
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

/**
 * Audit Query Service
 * Handles querying and exporting audit logs
 */
@Injectable()
export class AuditQueryService {
    constructor(private readonly auditRepository: AuditRepository) {}

    /**
     * Find all audit logs with filtering and pagination
     */
    async findAll(queryDto: AuditQueryDto): Promise<PaginatedResult<AuditLog>> {
        const {
            page = 1,
            limit = 50,
            userId,
            action,
            resource,
            startDate,
            endDate,
            sortBy = 'timestamp',
            sortOrder = 'desc',
        } = queryDto;

        const skip = (page - 1) * limit;

        const where: Prisma.AuditLogWhereInput = {};

        if (userId) where.userId = userId;
        if (action) where.action = action;
        if (resource) where.resource = resource;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) where.timestamp.lte = new Date(endDate);
        }

        const [items, total] = await Promise.all([
            this.auditRepository.findMany(where, {
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.auditRepository.count(where),
        ]);

        return {
            items,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    }

    /**
     * Find audit log by ID
     */
    async findById(id: string): Promise<AuditLog | null> {
        return this.auditRepository.findUnique({ id });
    }

    /**
     * Export audit logs to CSV format
     */
    async exportToCsv(queryDto: AuditQueryDto): Promise<string> {
        const { items } = await this.findAll({ ...queryDto, limit: 10000 });

        const headers = [
            'ID',
            'Timestamp',
            'User',
            'Action',
            'Resource',
            'Method',
            'Endpoint',
            'Status',
            'IP Address',
        ];

        const rows = items.map((log) => [
            log.id,
            log.timestamp.toISOString(),
            log.username || 'Anonymous',
            log.action,
            log.resource,
            log.method,
            log.endpoint,
            log.statusCode.toString(),
            log.ipAddress || 'Unknown',
        ]);

        return [headers, ...rows].map((row) => row.join(',')).join('\n');
    }

    /**
     * Export audit logs to JSON format
     */
    async exportToJson(queryDto: AuditQueryDto): Promise<AuditLog[]> {
        const { items } = await this.findAll({ ...queryDto, limit: 10000 });
        return items;
    }
}
