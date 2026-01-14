import { Logger } from '@nestjs/common';
import { calculateCutoffDate, deleteOldAuditLogs } from './audit-cleanup.util';

describe('AuditCleanupUtil', () => {
    describe('calculateCutoffDate', () => {
        it('should return date N days ago', () => {
            const result = calculateCutoffDate(90);

            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - 90);

            // Compare dates (ignore time precision)
            expect(result.toDateString()).toBe(expectedDate.toDateString());
        });

        it('should handle 0 days (today)', () => {
            const result = calculateCutoffDate(0);
            expect(result.toDateString()).toBe(new Date().toDateString());
        });

        it('should handle 1 day', () => {
            const result = calculateCutoffDate(1);
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - 1);
            expect(result.toDateString()).toBe(expectedDate.toDateString());
        });
    });

    describe('deleteOldAuditLogs', () => {
        const mockPrisma = {
            auditLog: {
                count: jest.fn(),
                deleteMany: jest.fn(),
            },
        };

        const mockLogger = {
            log: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
        } as unknown as Logger;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return early when no logs to delete', async () => {
            mockPrisma.auditLog.count.mockResolvedValue(0);

            const result = await deleteOldAuditLogs(mockPrisma as any, {
                retentionDays: 90,
                logger: mockLogger,
            });

            expect(result.countToDelete).toBe(0);
            expect(result.deletedCount).toBe(0);
            expect(mockPrisma.auditLog.deleteMany).not.toHaveBeenCalled();
        });

        it('should delete logs older than retention period', async () => {
            mockPrisma.auditLog.count.mockResolvedValue(100);
            mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 100 });

            const result = await deleteOldAuditLogs(mockPrisma as any, {
                retentionDays: 90,
                dryRun: false,
                logger: mockLogger,
            });

            expect(result.countToDelete).toBe(100);
            expect(result.deletedCount).toBe(100);
            expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
                where: {
                    timestamp: { lt: expect.any(Date) },
                },
            });
        });

        it('should not delete in dry run mode', async () => {
            mockPrisma.auditLog.count.mockResolvedValue(50);

            const result = await deleteOldAuditLogs(mockPrisma as any, {
                retentionDays: 90,
                dryRun: true,
                logger: mockLogger,
            });

            expect(result.countToDelete).toBe(50);
            expect(result.deletedCount).toBe(0);
            expect(mockPrisma.auditLog.deleteMany).not.toHaveBeenCalled();
        });

        it('should work without logger', async () => {
            mockPrisma.auditLog.count.mockResolvedValue(0);

            const result = await deleteOldAuditLogs(mockPrisma as any, {
                retentionDays: 90,
            });

            expect(result.countToDelete).toBe(0);
        });

        it('should calculate duration correctly', async () => {
            mockPrisma.auditLog.count.mockResolvedValue(10);
            mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 10 });

            const result = await deleteOldAuditLogs(mockPrisma as any, {
                retentionDays: 90,
            });

            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });

        it('should use correct cutoff date', async () => {
            mockPrisma.auditLog.count.mockResolvedValue(0);

            const result = await deleteOldAuditLogs(mockPrisma as any, {
                retentionDays: 30,
            });

            const expectedCutoff = new Date();
            expectedCutoff.setDate(expectedCutoff.getDate() - 30);

            expect(result.cutoffDate.toDateString()).toBe(
                expectedCutoff.toDateString(),
            );
        });
    });
});
