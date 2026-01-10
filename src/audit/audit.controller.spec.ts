import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { AuditController } from './audit.controller';
import { AuditQueryService } from './audit-query.service';
import { AuditQueryDto } from './dto';
import { AuditAction, AuditResource } from '@prisma/client';

describe('AuditController', () => {
    let controller: AuditController;
    let queryService: AuditQueryService;

    const mockQueryService = {
        findAll: jest.fn(),
        findById: jest.fn(),
        exportToCsv: jest.fn(),
        exportToJson: jest.fn(),
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
            controllers: [AuditController],
            providers: [
                {
                    provide: AuditQueryService,
                    useValue: mockQueryService,
                },
            ],
        }).compile();

        controller = module.get<AuditController>(AuditController);
        queryService = module.get<AuditQueryService>(AuditQueryService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('findAll', () => {
        it('should return paginated audit logs', async () => {
            const queryDto: AuditQueryDto = {
                page: 1,
                limit: 50,
            };

            const paginatedResult = {
                items: [mockAuditLog],
                total: 1,
                page: 1,
                limit: 50,
                pages: 1,
            };

            mockQueryService.findAll.mockResolvedValue(paginatedResult);

            const result = await controller.findAll(queryDto);

            expect(result).toEqual(paginatedResult);
            expect(mockQueryService.findAll).toHaveBeenCalledWith(queryDto);
            expect(mockQueryService.findAll).toHaveBeenCalledTimes(1);
        });

        it('should filter by userId', async () => {
            const queryDto: AuditQueryDto = {
                userId: 'user-123',
                page: 1,
                limit: 50,
            };

            const paginatedResult = {
                items: [mockAuditLog],
                total: 1,
                page: 1,
                limit: 50,
                pages: 1,
            };

            mockQueryService.findAll.mockResolvedValue(paginatedResult);

            await controller.findAll(queryDto);

            expect(mockQueryService.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'user-123' }),
            );
        });

        it('should filter by action', async () => {
            const queryDto: AuditQueryDto = {
                action: AuditAction.LOGIN,
                page: 1,
                limit: 50,
            };

            const paginatedResult = {
                items: [mockAuditLog],
                total: 1,
                page: 1,
                limit: 50,
                pages: 1,
            };

            mockQueryService.findAll.mockResolvedValue(paginatedResult);

            await controller.findAll(queryDto);

            expect(mockQueryService.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ action: AuditAction.LOGIN }),
            );
        });

        it('should filter by resource', async () => {
            const queryDto: AuditQueryDto = {
                resource: AuditResource.AUTH,
                page: 1,
                limit: 50,
            };

            const paginatedResult = {
                items: [mockAuditLog],
                total: 1,
                page: 1,
                limit: 50,
                pages: 1,
            };

            mockQueryService.findAll.mockResolvedValue(paginatedResult);

            await controller.findAll(queryDto);

            expect(mockQueryService.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ resource: AuditResource.AUTH }),
            );
        });

        it('should filter by date range', async () => {
            const queryDto: AuditQueryDto = {
                startDate: '2025-12-01T00:00:00Z',
                endDate: '2025-12-31T23:59:59Z',
                page: 1,
                limit: 50,
            };

            const paginatedResult = {
                items: [mockAuditLog],
                total: 1,
                page: 1,
                limit: 50,
                pages: 1,
            };

            mockQueryService.findAll.mockResolvedValue(paginatedResult);

            await controller.findAll(queryDto);

            expect(mockQueryService.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    startDate: '2025-12-01T00:00:00Z',
                    endDate: '2025-12-31T23:59:59Z',
                }),
            );
        });

        it('should support sorting', async () => {
            const queryDto: AuditQueryDto = {
                sortBy: 'timestamp',
                sortOrder: 'desc',
                page: 1,
                limit: 50,
            };

            const paginatedResult = {
                items: [mockAuditLog],
                total: 1,
                page: 1,
                limit: 50,
                pages: 1,
            };

            mockQueryService.findAll.mockResolvedValue(paginatedResult);

            await controller.findAll(queryDto);

            expect(mockQueryService.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    sortBy: 'timestamp',
                    sortOrder: 'desc',
                }),
            );
        });

        it('should support pagination', async () => {
            const queryDto: AuditQueryDto = {
                page: 2,
                limit: 25,
            };

            const paginatedResult = {
                items: [mockAuditLog],
                total: 50,
                page: 2,
                limit: 25,
                pages: 2,
            };

            mockQueryService.findAll.mockResolvedValue(paginatedResult);

            await controller.findAll(queryDto);

            expect(mockQueryService.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    page: 2,
                    limit: 25,
                }),
            );
        });
    });

    describe('findById', () => {
        it('should return audit log by ID', async () => {
            mockQueryService.findById.mockResolvedValue(mockAuditLog);

            const result = await controller.findById('log-123');

            expect(result).toEqual(mockAuditLog);
            expect(mockQueryService.findById).toHaveBeenCalledWith('log-123');
            expect(mockQueryService.findById).toHaveBeenCalledTimes(1);
        });

        it('should throw NotFoundException if log not found', async () => {
            mockQueryService.findById.mockResolvedValue(null);

            await expect(controller.findById('invalid-id')).rejects.toThrow(
                NotFoundException,
            );
            await expect(controller.findById('invalid-id')).rejects.toThrow(
                'Audit log not found',
            );
        });
    });

    describe('exportCsv', () => {
        it('should export audit logs to CSV', async () => {
            const queryDto: AuditQueryDto = {
                page: 1,
                limit: 50,
            };

            const csvData =
                'ID,Timestamp,User,Action,Resource,Method,Endpoint,Status,IP Address\nlog-123,2025-12-31T12:00:00.000Z,john.doe,LOGIN,AUTH,POST,/auth/login,200,192.168.1.1';

            mockQueryService.exportToCsv.mockResolvedValue(csvData);

            const mockResponse = {
                header: jest.fn(),
                send: jest.fn(),
            } as unknown as Response;

            await controller.exportCsv(queryDto, mockResponse);

            expect(mockQueryService.exportToCsv).toHaveBeenCalledWith(queryDto);
            expect(mockResponse.header).toHaveBeenCalledWith(
                'Content-Type',
                'text/csv',
            );
            expect(mockResponse.header).toHaveBeenCalledWith(
                'Content-Disposition',
                expect.stringContaining('attachment; filename="audit-logs-'),
            );
            expect(mockResponse.send).toHaveBeenCalledWith(csvData);
        });

        it('should export with filters applied', async () => {
            const queryDto: AuditQueryDto = {
                userId: 'user-123',
                action: AuditAction.LOGIN,
                page: 1,
                limit: 50,
            };

            const csvData =
                'ID,Timestamp,User,Action,Resource,Method,Endpoint,Status,IP Address\n';

            mockQueryService.exportToCsv.mockResolvedValue(csvData);

            const mockResponse = {
                header: jest.fn(),
                send: jest.fn(),
            } as unknown as Response;

            await controller.exportCsv(queryDto, mockResponse);

            expect(mockQueryService.exportToCsv).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-123',
                    action: AuditAction.LOGIN,
                }),
            );
        });
    });

    describe('exportJson', () => {
        it('should export audit logs to JSON', async () => {
            const queryDto: AuditQueryDto = {
                page: 1,
                limit: 50,
            };

            const jsonData = [mockAuditLog];

            mockQueryService.exportToJson.mockResolvedValue(jsonData);

            const result = await controller.exportJson(queryDto);

            expect(result).toEqual(jsonData);
            expect(mockQueryService.exportToJson).toHaveBeenCalledWith(
                queryDto,
            );
            expect(mockQueryService.exportToJson).toHaveBeenCalledTimes(1);
        });

        it('should export with filters applied', async () => {
            const queryDto: AuditQueryDto = {
                resource: AuditResource.USER,
                startDate: '2025-12-01T00:00:00Z',
                endDate: '2025-12-31T23:59:59Z',
                page: 1,
                limit: 50,
            };

            const jsonData = [mockAuditLog];

            mockQueryService.exportToJson.mockResolvedValue(jsonData);

            await controller.exportJson(queryDto);

            expect(mockQueryService.exportToJson).toHaveBeenCalledWith(
                expect.objectContaining({
                    resource: AuditResource.USER,
                    startDate: '2025-12-01T00:00:00Z',
                    endDate: '2025-12-31T23:59:59Z',
                }),
            );
        });
    });
});
