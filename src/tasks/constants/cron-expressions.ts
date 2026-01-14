/**
 * Cron Expression Constants
 * Standard patterns for scheduled tasks
 * Format: minute hour day month weekday
 *
 * @see https://crontab.guru for expression help
 */

export const CronExpressions = {
    // Time-based
    EVERY_MINUTE: '* * * * *',
    EVERY_5_MINUTES: '*/5 * * * *',
    EVERY_HOUR: '0 * * * *',

    // Daily
    DAILY_MIDNIGHT: '0 0 * * *',
    DAILY_NOON: '0 12 * * *',

    // Weekly
    WEEKLY_SUNDAY_MIDNIGHT: '0 0 * * 0',
    WEEKLY_MONDAY_MIDNIGHT: '0 0 * * 1',

    // Monthly
    MONTHLY_FIRST_DAY: '0 0 1 * *',
} as const;

export type CronExpression =
    (typeof CronExpressions)[keyof typeof CronExpressions];
