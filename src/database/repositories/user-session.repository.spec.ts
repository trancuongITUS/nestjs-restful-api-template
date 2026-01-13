/**
 * UserSessionRepository Unit Tests
 * Tests for atomic session management methods (race condition fix)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UserSessionRepository } from './user-session.repository';
import { PrismaService } from '../prisma.service';
import { Prisma, UserSession } from '@prisma/client';

describe('UserSessionRepository', () => {
    let repository: UserSessionRepository;
    let prismaService: PrismaService;

    const mockSession: UserSession = {
        id: 'session-123',
        userId: 'user-123',
        refreshToken: 'refresh-token-abc',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        revokedAt: null,
        userAgent: 'test-agent',
        ipAddress: '192.168.1.1',
    };

    const mockTransactionClient = {
        $queryRaw: jest.fn(),
        userSession: {
            update: jest.fn(),
            create: jest.fn(),
            findUnique: jest.fn(),
        },
    } as unknown as Prisma.TransactionClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSessionRepository,
                {
                    provide: PrismaService,
                    useValue: {
                        userSession: {
                            findUnique: jest.fn(),
                            findMany: jest.fn(),
                            create: jest.fn(),
                            update: jest.fn(),
                            updateMany: jest.fn(),
                            deleteMany: jest.fn(),
                            count: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        repository = module.get<UserSessionRepository>(UserSessionRepository);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findByRefreshTokenForUpdate', () => {
        it('should return session when found with FOR UPDATE NOWAIT lock', async () => {
            (mockTransactionClient.$queryRaw as jest.Mock).mockResolvedValue([
                mockSession,
            ]);

            const result = await repository.findByRefreshTokenForUpdate(
                'refresh-token-abc',
                mockTransactionClient,
            );

            expect(result).toEqual(mockSession);
            expect(mockTransactionClient.$queryRaw).toHaveBeenCalled();
        });

        it('should return null when session not found', async () => {
            (mockTransactionClient.$queryRaw as jest.Mock).mockResolvedValue(
                [],
            );

            const result = await repository.findByRefreshTokenForUpdate(
                'non-existent-token',
                mockTransactionClient,
            );

            expect(result).toBeNull();
        });

        it('should throw error when row is already locked (concurrent request)', async () => {
            const lockError = new Error(
                'could not obtain lock on row in relation "user_sessions"',
            );
            (mockTransactionClient.$queryRaw as jest.Mock).mockRejectedValue(
                lockError,
            );

            await expect(
                repository.findByRefreshTokenForUpdate(
                    'refresh-token-abc',
                    mockTransactionClient,
                ),
            ).rejects.toThrow('could not obtain lock');
        });
    });

    describe('rotateSession', () => {
        const newSession: UserSession = {
            ...mockSession,
            id: 'session-456',
            refreshToken: 'new-refresh-token',
        };

        it('should revoke old session and create new session atomically', async () => {
            (
                mockTransactionClient.userSession.update as jest.Mock
            ).mockResolvedValue({
                ...mockSession,
                revokedAt: new Date(),
            });
            (
                mockTransactionClient.userSession.create as jest.Mock
            ).mockResolvedValue(newSession);

            const result = await repository.rotateSession(
                'old-token',
                'user-123',
                'new-refresh-token',
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                'test-agent',
                '192.168.1.1',
                mockTransactionClient,
            );

            expect(result).toEqual(newSession);
            expect(
                mockTransactionClient.userSession.update,
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { refreshToken: 'old-token' },
                    data: { revokedAt: expect.any(Date) },
                }),
            );
            expect(
                mockTransactionClient.userSession.create,
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: 'user-123',
                        refreshToken: 'new-refresh-token',
                        userAgent: 'test-agent',
                        ipAddress: '192.168.1.1',
                    }),
                }),
            );
        });

        it('should handle undefined userAgent and ipAddress', async () => {
            (
                mockTransactionClient.userSession.update as jest.Mock
            ).mockResolvedValue({
                ...mockSession,
                revokedAt: new Date(),
            });
            (
                mockTransactionClient.userSession.create as jest.Mock
            ).mockResolvedValue({
                ...newSession,
                userAgent: null,
                ipAddress: null,
            });

            const result = await repository.rotateSession(
                'old-token',
                'user-123',
                'new-refresh-token',
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                undefined,
                undefined,
                mockTransactionClient,
            );

            expect(result).toBeDefined();
            expect(
                mockTransactionClient.userSession.create,
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userAgent: undefined,
                        ipAddress: undefined,
                    }),
                }),
            );
        });

        it('should propagate error if update fails', async () => {
            const updateError = new Error('Record not found');
            (
                mockTransactionClient.userSession.update as jest.Mock
            ).mockRejectedValue(updateError);

            await expect(
                repository.rotateSession(
                    'non-existent-token',
                    'user-123',
                    'new-token',
                    new Date(),
                    undefined,
                    undefined,
                    mockTransactionClient,
                ),
            ).rejects.toThrow('Record not found');
        });
    });

    describe('existing methods (regression tests)', () => {
        it('findByRefreshToken should work without transaction', async () => {
            (
                prismaService.userSession.findUnique as jest.Mock
            ).mockResolvedValue(mockSession);

            const result =
                await repository.findByRefreshToken('refresh-token-abc');

            expect(result).toEqual(mockSession);
            expect(prismaService.userSession.findUnique).toHaveBeenCalledWith({
                where: { refreshToken: 'refresh-token-abc' },
            });
        });

        it('createSession should create session with correct data', async () => {
            (prismaService.userSession.create as jest.Mock).mockResolvedValue(
                mockSession,
            );

            const result = await repository.createSession(
                'user-123',
                'refresh-token-abc',
                mockSession.expiresAt,
            );

            expect(result).toEqual(mockSession);
            expect(prismaService.userSession.create).toHaveBeenCalledWith({
                data: {
                    user: { connect: { id: 'user-123' } },
                    refreshToken: 'refresh-token-abc',
                    expiresAt: mockSession.expiresAt,
                },
            });
        });

        it('revokeSession should set revokedAt timestamp', async () => {
            const revokedSession = { ...mockSession, revokedAt: new Date() };
            (prismaService.userSession.update as jest.Mock).mockResolvedValue(
                revokedSession,
            );

            const result = await repository.revokeSession('refresh-token-abc');

            expect(result.revokedAt).not.toBeNull();
            expect(prismaService.userSession.update).toHaveBeenCalledWith({
                where: { refreshToken: 'refresh-token-abc' },
                data: { revokedAt: expect.any(Date) },
            });
        });

        it('isSessionValid should return true for valid session', async () => {
            (
                prismaService.userSession.findUnique as jest.Mock
            ).mockResolvedValue(mockSession);

            const result = await repository.isSessionValid('refresh-token-abc');

            expect(result).toBe(true);
        });

        it('isSessionValid should return false for revoked session', async () => {
            (
                prismaService.userSession.findUnique as jest.Mock
            ).mockResolvedValue({
                ...mockSession,
                revokedAt: new Date(),
            });

            const result = await repository.isSessionValid('refresh-token-abc');

            expect(result).toBe(false);
        });

        it('isSessionValid should return false for expired session', async () => {
            (
                prismaService.userSession.findUnique as jest.Mock
            ).mockResolvedValue({
                ...mockSession,
                expiresAt: new Date(Date.now() - 1000),
            });

            const result = await repository.isSessionValid('refresh-token-abc');

            expect(result).toBe(false);
        });
    });
});
