import { Test, TestingModule } from '@nestjs/testing';
import { AuditQueryService } from './audit-query.service';
import { AuditRepository } from './repositories';
import { AuditAction, AuditResource } from '@prisma/client';
import { AuditQueryDto } from './dto';

describe('AuditQueryService', () => {
    let service: AuditQueryService;
    let repository: AuditRepository;

    const mockRepository = {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
    };

    const mockAuditLog = {
        id: 'log-123',
        timestamp: new Date('2025-12-31T12:00:00Z'),
        userId: 'user-123',
        username: 'john.doe',
        userRole: 'ADMIN',
        action: AuditAction.LOGIN,
        resource: AuditResource.AUTH,
        resourceId: null,
        method: 'POST',
        endpoint: '/auth/login',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-123',
        requestId: 'req-123',
        changesBefore: null,
        changesAfter: null,
        metadata: null,
        statusCode: 200,
        errorMessage: null,
        createdAt: new Date('2025-12-31T12:00:00Z'),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditQueryService,
                {
                    provide: AuditRepository,
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<AuditQueryService>(AuditQueryService);
        repository = module.get<AuditRepository>(AuditRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return paginated results with default params', async () => {
            const queryDto: AuditQueryDto = {};

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            const result = await service.findAll(queryDto);

            expect(result).toEqual({
                items: [mockAuditLog],
                total: 1,
                page: 1,
                limit: 50,
                pages: 1,
            });

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                {},
                expect.objectContaining({
                    skip: 0,
                    take: 50,
                    orderBy: { timestamp: 'desc' },
                }),
            );
        });

        it('should filter by userId', async () => {
            const queryDto: AuditQueryDto = {
                userId: 'user-123',
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            await service.findAll(queryDto);

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'user-123' }),
                expect.any(Object),
            );
        });

        it('should filter by action', async () => {
            const queryDto: AuditQueryDto = {
                action: AuditAction.LOGIN,
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            await service.findAll(queryDto);

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ action: AuditAction.LOGIN }),
                expect.any(Object),
            );
        });

        it('should filter by resource', async () => {
            const queryDto: AuditQueryDto = {
                resource: AuditResource.AUTH,
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            await service.findAll(queryDto);

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ resource: AuditResource.AUTH }),
                expect.any(Object),
            );
        });

        it('should filter by date range', async () => {
            const queryDto: AuditQueryDto = {
                startDate: '2025-12-01T00:00:00Z',
                endDate: '2025-12-31T23:59:59Z',
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            await service.findAll(queryDto);

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    timestamp: {
                        gte: new Date('2025-12-01T00:00:00Z'),
                        lte: new Date('2025-12-31T23:59:59Z'),
                    },
                }),
                expect.any(Object),
            );
        });

        it('should filter by start date only', async () => {
            const queryDto: AuditQueryDto = {
                startDate: '2025-12-01T00:00:00Z',
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            await service.findAll(queryDto);

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    timestamp: {
                        gte: new Date('2025-12-01T00:00:00Z'),
                    },
                }),
                expect.any(Object),
            );
        });

        it('should filter by end date only', async () => {
            const queryDto: AuditQueryDto = {
                endDate: '2025-12-31T23:59:59Z',
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            await service.findAll(queryDto);

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    timestamp: {
                        lte: new Date('2025-12-31T23:59:59Z'),
                    },
                }),
                expect.any(Object),
            );
        });

        it('should support pagination', async () => {
            const queryDto: AuditQueryDto = {
                page: 2,
                limit: 25,
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(50);

            const result = await service.findAll(queryDto);

            expect(result.page).toBe(2);
            expect(result.limit).toBe(25);
            expect(result.pages).toBe(2);

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    skip: 25,
                    take: 25,
                }),
            );
        });

        it('should support sorting by timestamp desc', async () => {
            const queryDto: AuditQueryDto = {
                sortBy: 'timestamp',
                sortOrder: 'desc',
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            await service.findAll(queryDto);

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    orderBy: { timestamp: 'desc' },
                }),
            );
        });

        it('should support sorting by action asc', async () => {
            const queryDto: AuditQueryDto = {
                sortBy: 'action',
                sortOrder: 'asc',
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            await service.findAll(queryDto);

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    orderBy: { action: 'asc' },
                }),
            );
        });

        it('should calculate pages correctly', async () => {
            const queryDto: AuditQueryDto = {
                page: 1,
                limit: 50,
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(125);

            const result = await service.findAll(queryDto);

            expect(result.pages).toBe(3); // Math.ceil(125 / 50) = 3
        });

        it('should combine multiple filters', async () => {
            const queryDto: AuditQueryDto = {
                userId: 'user-123',
                action: AuditAction.UPDATE,
                resource: AuditResource.USER,
                startDate: '2025-12-01T00:00:00Z',
                page: 1,
                limit: 50,
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            await service.findAll(queryDto);

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-123',
                    action: AuditAction.UPDATE,
                    resource: AuditResource.USER,
                    timestamp: {
                        gte: new Date('2025-12-01T00:00:00Z'),
                    },
                }),
                expect.any(Object),
            );
        });
    });

    describe('findById', () => {
        it('should return audit log by ID', async () => {
            mockRepository.findUnique.mockResolvedValue(mockAuditLog);

            const result = await service.findById('log-123');

            expect(result).toEqual(mockAuditLog);
            expect(mockRepository.findUnique).toHaveBeenCalledWith({
                id: 'log-123',
            });
        });

        it('should return null if log not found', async () => {
            mockRepository.findUnique.mockResolvedValue(null);

            const result = await service.findById('invalid-id');

            expect(result).toBeNull();
        });
    });

    describe('exportToCsv', () => {
        it('should export audit logs to CSV format', async () => {
            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            const csv = await service.exportToCsv({});

            expect(csv).toContain(
                'ID,Timestamp,User,Action,Resource,Method,Endpoint,Status,IP Address',
            );
            expect(csv).toContain('log-123');
            expect(csv).toContain('2025-12-31T12:00:00.000Z');
            expect(csv).toContain('john.doe');
            expect(csv).toContain('LOGIN');
            expect(csv).toContain('AUTH');
            expect(csv).toContain('POST');
            expect(csv).toContain('/auth/login');
            expect(csv).toContain('200');
            expect(csv).toContain('192.168.1.1');
        });

        it('should handle anonymous users', async () => {
            const anonymousLog = { ...mockAuditLog, username: null };
            mockRepository.findMany.mockResolvedValue([anonymousLog]);
            mockRepository.count.mockResolvedValue(1);

            const csv = await service.exportToCsv({});

            expect(csv).toContain('Anonymous');
        });

        it('should handle unknown IP addresses', async () => {
            const noIpLog = { ...mockAuditLog, ipAddress: null };
            mockRepository.findMany.mockResolvedValue([noIpLog]);
            mockRepository.count.mockResolvedValue(1);

            const csv = await service.exportToCsv({});

            expect(csv).toContain('Unknown');
        });

        it('should apply filters when exporting', async () => {
            const queryDto: AuditQueryDto = {
                userId: 'user-123',
                action: AuditAction.LOGIN,
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            await service.exportToCsv(queryDto);

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-123',
                    action: AuditAction.LOGIN,
                }),
                expect.objectContaining({
                    take: 10000,
                }),
            );
        });
    });

    describe('exportToJson', () => {
        it('should export audit logs to JSON format', async () => {
            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            const json = await service.exportToJson({});

            expect(json).toEqual([mockAuditLog]);
        });

        it('should apply filters when exporting', async () => {
            const queryDto: AuditQueryDto = {
                resource: AuditResource.USER,
                startDate: '2025-12-01T00:00:00Z',
            };

            mockRepository.findMany.mockResolvedValue([mockAuditLog]);
            mockRepository.count.mockResolvedValue(1);

            await service.exportToJson(queryDto);

            expect(mockRepository.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    resource: AuditResource.USER,
                    timestamp: {
                        gte: new Date('2025-12-01T00:00:00Z'),
                    },
                }),
                expect.objectContaining({
                    take: 10000,
                }),
            );
        });

        it('should export multiple logs', async () => {
            const logs = [mockAuditLog, { ...mockAuditLog, id: 'log-456' }];
            mockRepository.findMany.mockResolvedValue(logs);
            mockRepository.count.mockResolvedValue(2);

            const json = await service.exportToJson({});

            expect(json).toHaveLength(2);
            expect(json).toEqual(logs);
        });
    });
});
