import { Test, TestingModule } from '@nestjs/testing';
import { AuditRetentionTask } from './audit-retention.task';
import { PrismaService } from '../database';
import { ConfigService } from '../config';

// Mock the utility module
jest.mock('../audit/utils', () => ({
    deleteOldAuditLogs: jest.fn(),
}));

import { deleteOldAuditLogs } from '../audit/utils';

describe('AuditRetentionTask', () => {
    let task: AuditRetentionTask;
    let configService: ConfigService;

    const mockPrismaService = {
        auditLog: {
            count: jest.fn(),
            deleteMany: jest.fn(),
        },
    };

    const mockConfigService = {
        auditRetention: {
            enabled: true,
            days: 90,
            cron: '0 0 * * 0',
        },
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditRetentionTask,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        task = module.get<AuditRetentionTask>(AuditRetentionTask);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(task).toBeDefined();
    });

    describe('handleAuditRetention', () => {
        it('should skip when disabled', async () => {
            (configService as any).auditRetention = {
                enabled: false,
                days: 90,
            };

            await task.handleAuditRetention();

            expect(deleteOldAuditLogs).not.toHaveBeenCalled();
        });

        it('should call deleteOldAuditLogs when enabled', async () => {
            (configService as any).auditRetention = {
                enabled: true,
                days: 90,
            };

            (deleteOldAuditLogs as jest.Mock).mockResolvedValue({
                cutoffDate: new Date(),
                countToDelete: 50,
                deletedCount: 50,
                durationMs: 100,
            });

            await task.handleAuditRetention();

            expect(deleteOldAuditLogs).toHaveBeenCalledWith(
                mockPrismaService,
                expect.objectContaining({
                    retentionDays: 90,
                    dryRun: false,
                }),
            );
        });

        it('should not throw on error', async () => {
            (configService as any).auditRetention = {
                enabled: true,
                days: 90,
            };

            (deleteOldAuditLogs as jest.Mock).mockRejectedValue(
                new Error('Database error'),
            );

            await expect(task.handleAuditRetention()).resolves.not.toThrow();
        });

        it('should use configured retention days', async () => {
            (configService as any).auditRetention = {
                enabled: true,
                days: 30,
            };

            (deleteOldAuditLogs as jest.Mock).mockResolvedValue({
                cutoffDate: new Date(),
                countToDelete: 10,
                deletedCount: 10,
                durationMs: 50,
            });

            await task.handleAuditRetention();

            expect(deleteOldAuditLogs).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    retentionDays: 30,
                }),
            );
        });
    });
});
