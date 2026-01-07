import { Injectable } from '@nestjs/common';
import { Prisma, AuditLog } from '@prisma/client';
import { BaseRepository } from '../../database/base.repository';
import { PrismaService } from '../../database/prisma.service';

/**
 * Audit Repository
 * Handles database operations for audit logs
 */
@Injectable()
export class AuditRepository extends BaseRepository<
    AuditLog,
    Prisma.AuditLogCreateInput,
    Prisma.AuditLogUpdateInput,
    Prisma.AuditLogWhereInput,
    Prisma.AuditLogWhereUniqueInput,
    Prisma.AuditLogOrderByWithRelationInput
> {
    protected readonly modelName = 'AuditLog';

    constructor(prisma: PrismaService) {
        super(prisma);
    }

    protected getModel() {
        return this.prisma.auditLog;
    }

    /**
     * Find audit logs with advanced filtering
     */
    async findWithFilters(
        where: Prisma.AuditLogWhereInput,
        options?: {
            skip?: number;
            take?: number;
            orderBy?: Prisma.AuditLogOrderByWithRelationInput;
        },
    ): Promise<AuditLog[]> {
        return this.findMany(where, options);
    }

    /**
     * Count audit logs matching criteria
     */
    async countWithFilters(where: Prisma.AuditLogWhereInput): Promise<number> {
        return this.count(where);
    }

    /**
     * Find audit logs by user ID
     */
    async findByUserId(
        userId: string,
        options?: {
            skip?: number;
            take?: number;
            orderBy?: Prisma.AuditLogOrderByWithRelationInput;
        },
    ): Promise<AuditLog[]> {
        return this.findMany({ userId }, options);
    }

    /**
     * Find audit logs by session ID
     */
    async findBySessionId(
        sessionId: string,
        options?: {
            skip?: number;
            take?: number;
            orderBy?: Prisma.AuditLogOrderByWithRelationInput;
        },
    ): Promise<AuditLog[]> {
        return this.findMany({ sessionId }, options);
    }

    /**
     * Find audit logs within date range
     */
    async findByDateRange(
        startDate: Date,
        endDate: Date,
        options?: {
            skip?: number;
            take?: number;
            orderBy?: Prisma.AuditLogOrderByWithRelationInput;
        },
    ): Promise<AuditLog[]> {
        return this.findMany(
            {
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            options,
        );
    }

    /**
     * Delete old audit logs (for retention policy)
     */
    async deleteOlderThan(date: Date): Promise<number> {
        const result = await this.deleteMany({
            timestamp: {
                lt: date,
            },
        });
        return result.count;
    }
}
