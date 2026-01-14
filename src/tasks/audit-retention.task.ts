import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database';
import { ConfigService } from '../config';
import { deleteOldAuditLogs } from '../audit/utils';

/**
 * Audit Retention Task
 * Automatically deletes audit logs older than configured retention period
 *
 * Schedule: Configurable via AUDIT_RETENTION_CRON (default: weekly Sunday midnight)
 * Enable/Disable: AUDIT_RETENTION_ENABLED environment variable
 * Retention Period: AUDIT_RETENTION_DAYS (default: 90 days)
 */
@Injectable()
export class AuditRetentionTask {
    private readonly logger = new Logger(AuditRetentionTask.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Handle audit log retention cleanup
     * Runs on configured cron schedule (default: weekly Sunday midnight)
     *
     * Note: Using static env var for cron expression at module load time.
     * For dynamic cron, use SchedulerRegistry with onModuleInit pattern.
     */
    @Cron(process.env.AUDIT_RETENTION_CRON || '0 0 * * 0', {
        name: 'audit-retention-cleanup',
    })
    async handleAuditRetention(): Promise<void> {
        const { enabled, days } = this.configService.auditRetention;

        if (!enabled) {
            this.logger.debug('Audit retention task disabled');
            return;
        }

        this.logger.log('Starting audit retention cleanup...');

        try {
            const result = await deleteOldAuditLogs(this.prisma, {
                retentionDays: days,
                dryRun: false,
                logger: this.logger,
            });

            this.logger.log(
                `Audit retention complete: deleted=${result.deletedCount}, duration=${result.durationMs}ms`,
            );
        } catch (error) {
            // Log error but don't rethrow - let scheduler continue
            this.logger.error(
                'Audit retention cleanup failed',
                error instanceof Error ? error.stack : error,
            );
        }
    }
}
