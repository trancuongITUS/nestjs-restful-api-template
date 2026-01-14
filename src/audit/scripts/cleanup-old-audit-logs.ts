/**
 * Audit Log Retention Cleanup Script
 * CLI script for manual audit log cleanup using shared utility
 *
 * Usage:
 *   npm run audit:cleanup
 *   npm run audit:cleanup -- --retention-days=30
 *   npm run audit:cleanup -- --dry-run
 *
 * Note: Automated cleanup is handled by AuditRetentionTask scheduled task.
 * This script is for manual/one-off cleanups.
 */

import { PrismaClient } from '@prisma/client';
import {
    deleteOldAuditLogs,
    calculateCutoffDate,
} from '../utils/audit-cleanup.util';

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
        retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10),
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
 * Main execution function
 */
async function main(): Promise<void> {
    const options = parseArgs();
    const cutoffDate = calculateCutoffDate(options.retentionDays);

    console.log('='.repeat(60));
    console.log('Audit Log Retention Cleanup (CLI)');
    console.log('='.repeat(60));
    console.log(`Retention policy: ${options.retentionDays} days`);
    console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
    console.log(`Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
    console.log('='.repeat(60));

    try {
        const result = await deleteOldAuditLogs(prisma, {
            retentionDays: options.retentionDays,
            dryRun: options.dryRun,
        });

        console.log('\n' + '='.repeat(60));
        if (options.dryRun) {
            console.log(
                `DRY RUN: Would delete ${result.countToDelete.toLocaleString()} audit logs`,
            );
        } else if (result.deletedCount > 0) {
            console.log(
                `✅ Deleted ${result.deletedCount.toLocaleString()} audit logs`,
            );
        } else {
            console.log('✅ No audit logs to delete');
        }
        console.log(`Duration: ${result.durationMs}ms`);
        console.log('='.repeat(60));

        // Show remaining count
        const remainingCount = await prisma.auditLog.count();
        console.log(
            `\nRemaining audit logs: ${remainingCount.toLocaleString()}`,
        );
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run if executed directly
if (require.main === module) {
    void main();
}

// Re-export from shared utility for backwards compatibility
export {
    deleteOldAuditLogs,
    calculateCutoffDate,
} from '../utils/audit-cleanup.util';
