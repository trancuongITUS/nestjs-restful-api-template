import { Logger } from '@nestjs/common';

/**
 * Prisma client type for audit log operations
 * Using minimal interface to avoid tight coupling
 */
interface PrismaAuditClient {
    auditLog: {
        count: (args: {
            where: { timestamp: { lt: Date } };
        }) => Promise<number>;
        deleteMany: (args: {
            where: { timestamp: { lt: Date } };
        }) => Promise<{ count: number }>;
    };
}

export interface AuditCleanupOptions {
    retentionDays: number;
    dryRun?: boolean;
    logger?: Logger;
}

export interface AuditCleanupResult {
    cutoffDate: Date;
    countToDelete: number;
    deletedCount: number;
    durationMs: number;
}

/**
 * Calculate cutoff date based on retention days
 * @param retentionDays - Number of days to retain audit logs
 * @returns Date representing the cutoff point
 */
export function calculateCutoffDate(retentionDays: number): Date {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    return cutoffDate;
}

/**
 * Delete audit logs older than retention period
 * Shared logic used by both scheduled task and CLI script
 *
 * @param prisma - Prisma client instance
 * @param options - Cleanup options including retention days and dry run flag
 * @returns Result containing counts and timing information
 */
export async function deleteOldAuditLogs(
    prisma: PrismaAuditClient,
    options: AuditCleanupOptions,
): Promise<AuditCleanupResult> {
    const { retentionDays, dryRun = false, logger } = options;
    const cutoffDate = calculateCutoffDate(retentionDays);
    const startTime = Date.now();

    logger?.log(
        `Audit cleanup: retention=${retentionDays}d, cutoff=${cutoffDate.toISOString()}, dryRun=${dryRun}`,
    );

    // Count logs to delete
    const countToDelete = await prisma.auditLog.count({
        where: {
            timestamp: { lt: cutoffDate },
        },
    });

    if (countToDelete === 0) {
        logger?.log('Audit cleanup: No logs to delete');
        return {
            cutoffDate,
            countToDelete: 0,
            deletedCount: 0,
            durationMs: Date.now() - startTime,
        };
    }

    logger?.log(`Audit cleanup: ${countToDelete} logs eligible for deletion`);

    if (dryRun) {
        logger?.log('Audit cleanup: Dry run - no logs deleted');
        return {
            cutoffDate,
            countToDelete,
            deletedCount: 0,
            durationMs: Date.now() - startTime,
        };
    }

    // Delete old logs
    const result = await prisma.auditLog.deleteMany({
        where: {
            timestamp: { lt: cutoffDate },
        },
    });

    const durationMs = Date.now() - startTime;
    logger?.log(
        `Audit cleanup: Deleted ${result.count} logs in ${durationMs}ms`,
    );

    return {
        cutoffDate,
        countToDelete,
        deletedCount: result.count,
        durationMs,
    };
}
