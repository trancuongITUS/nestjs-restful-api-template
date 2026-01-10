/**
 * Audit Log Retention Cleanup Script
 * Removes audit logs older than the specified retention period (default: 90 days)
 *
 * Usage:
 *   npm run audit:cleanup
 *   npm run audit:cleanup -- --retention-days=30
 *   npm run audit:cleanup -- --dry-run
 *
 * Cron Schedule (weekly on Sunday midnight):
 *   0 0 * * 0 npm run audit:cleanup
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CleanupOptions {
    retentionDays: number;
    dryRun: boolean;
}

/**
 * Parse command-line arguments
 */
function parseArgs(): CleanupOptions {
    const args = process.argv.slice(2);
    const options: CleanupOptions = {
        retentionDays: 90,
        dryRun: false,
    };

    args.forEach((arg) => {
        if (arg.startsWith('--retention-days=')) {
            options.retentionDays = parseInt(arg.split('=')[1], 10);
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        }
    });

    return options;
}

/**
 * Calculate cutoff date based on retention policy
 */
function calculateCutoffDate(retentionDays: number): Date {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    return cutoffDate;
}

/**
 * Clean up old audit logs
 */
async function cleanupOldAuditLogs(): Promise<void> {
    const options = parseArgs();
    const cutoffDate = calculateCutoffDate(options.retentionDays);

    console.log('='.repeat(60));
    console.log('Audit Log Retention Cleanup');
    console.log('='.repeat(60));
    console.log(`Retention policy: ${options.retentionDays} days`);
    console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
    console.log(`Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
    console.log('='.repeat(60));

    try {
        // Count audit logs to be deleted
        const countToDelete = await prisma.auditLog.count({
            where: {
                timestamp: {
                    lt: cutoffDate,
                },
            },
        });

        console.log(
            `\nAudit logs to delete: ${countToDelete.toLocaleString()}`,
        );

        if (countToDelete === 0) {
            console.log('\n✅ No audit logs to delete.');
            return;
        }

        // Get sample of oldest logs
        const oldestLogs = await prisma.auditLog.findMany({
            where: {
                timestamp: {
                    lt: cutoffDate,
                },
            },
            orderBy: {
                timestamp: 'asc',
            },
            take: 5,
            select: {
                id: true,
                timestamp: true,
                action: true,
                resource: true,
                username: true,
            },
        });

        console.log('\nSample of oldest logs to be deleted:');
        oldestLogs.forEach((log) => {
            console.log(
                `  - ${log.timestamp.toISOString()} | ${log.action} | ${log.resource} | ${log.username || 'Anonymous'}`,
            );
        });

        if (options.dryRun) {
            console.log('\n⚠️  DRY RUN MODE - No logs were deleted.');
            console.log(
                `   Run without --dry-run flag to delete ${countToDelete} logs.`,
            );
            return;
        }

        // Confirm deletion
        console.log('\n⚠️  WARNING: This action is irreversible!');
        console.log(
            `   ${countToDelete} audit logs will be permanently deleted.`,
        );

        // Delete old audit logs
        const startTime = Date.now();
        const result = await prisma.auditLog.deleteMany({
            where: {
                timestamp: {
                    lt: cutoffDate,
                },
            },
        });
        const duration = Date.now() - startTime;

        console.log('\n='.repeat(60));
        console.log(
            `✅ Successfully deleted ${result.count.toLocaleString()} audit logs`,
        );
        console.log(`   Duration: ${duration}ms`);
        console.log('='.repeat(60));

        // Show remaining audit logs
        const remainingCount = await prisma.auditLog.count();
        console.log(
            `\nRemaining audit logs: ${remainingCount.toLocaleString()}`,
        );

        // Show oldest remaining log
        const oldestRemaining = await prisma.auditLog.findFirst({
            orderBy: {
                timestamp: 'asc',
            },
            select: {
                timestamp: true,
            },
        });

        if (oldestRemaining) {
            const ageInDays = Math.floor(
                (Date.now() - oldestRemaining.timestamp.getTime()) /
                    (1000 * 60 * 60 * 24),
            );
            console.log(
                `Oldest remaining log: ${oldestRemaining.timestamp.toISOString()} (${ageInDays} days old)`,
            );
        }
    } catch (error) {
        console.error('\n❌ Error during cleanup:', error);
        throw error;
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        await cleanupOldAuditLogs();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

export { cleanupOldAuditLogs, calculateCutoffDate };
