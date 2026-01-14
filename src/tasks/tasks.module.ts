import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditRetentionTask } from './audit-retention.task';

/**
 * Tasks Module
 * Centralized module for all scheduled tasks using NestJS Schedule
 *
 * Architecture:
 * - Registers ScheduleModule.forRoot() for cron/interval support
 * - All task providers registered here for centralized management
 * - Easy to add new tasks by adding to providers array
 *
 * @see https://docs.nestjs.com/techniques/task-scheduling
 */
@Module({
    imports: [ScheduleModule.forRoot()],
    providers: [AuditRetentionTask],
    exports: [],
})
export class TasksModule {}
