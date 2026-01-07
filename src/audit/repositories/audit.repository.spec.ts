import { Test, TestingModule } from '@nestjs/testing';
import { AuditRepository } from './audit.repository';
import { PrismaService } from '../../database/prisma.service';
import { AuditAction, AuditResource } from '@prisma/client';

describe('AuditRepository', () => {
    let repository: AuditRepository;
    let prismaService: PrismaService;

    const mockPrismaService = {
        auditLog: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            deleteMany: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditRepository,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        repository = module.get<AuditRepository>(AuditRepository);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('create', () => {
        it('should create an audit log', async () => {
            const auditLogData = {
                action: AuditAction.LOGIN,
                resource: AuditResource.AUTH,
                method: 'POST',
                endpoint: '/auth/login',
                statusCode: 200,
            };

            const createdLog = {
                id: 'test-id',
                timestamp: new Date(),
                ...auditLogData,
                userId: null,
                username: null,
                userRole: null,
                resourceId: null,
                ipAddress: null,
                userAgent: null,
                sessionId: null,
                requestId: null,
                changesBefore: null,
                changesAfter: null,
                metadata: null,
                errorMessage: null,
                createdAt: new Date(),
            };

            mockPrismaService.auditLog.create.mockResolvedValue(createdLog);

            const result = await repository.create(auditLogData);

            expect(result).toEqual(createdLog);
            expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
                data: auditLogData,
            });
        });
    });

    describe('findByUserId', () => {
        it('should find audit logs by user ID', async () => {
            const userId = 'user-123';
            const mockLogs = [
                {
                    id: 'log-1',
                    userId,
                    action: AuditAction.LOGIN,
                    resource: AuditResource.AUTH,
                },
                {
                    id: 'log-2',
                    userId,
                    action: AuditAction.LOGOUT,
                    resource: AuditResource.AUTH,
                },
            ];

            mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

            const result = await repository.findByUserId(userId);

            expect(result).toEqual(mockLogs);
            expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
                where: { userId },
            });
        });
    });

    describe('countWithFilters', () => {
        it('should count audit logs with filters', async () => {
            const where = { action: AuditAction.LOGIN };
            const mockCount = 42;

            mockPrismaService.auditLog.count.mockResolvedValue(mockCount);

            const result = await repository.countWithFilters(where);

            expect(result).toEqual(mockCount);
            expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
                where,
            });
        });
    });

    describe('deleteOlderThan', () => {
        it('should delete old audit logs', async () => {
            const cutoffDate = new Date('2024-01-01');
            const mockResult = { count: 10 };

            mockPrismaService.auditLog.deleteMany.mockResolvedValue(mockResult);

            const result = await repository.deleteOlderThan(cutoffDate);

            expect(result).toEqual(10);
            expect(mockPrismaService.auditLog.deleteMany).toHaveBeenCalledWith({
                where: {
                    timestamp: {
                        lt: cutoffDate,
                    },
                },
            });
        });
    });
});
