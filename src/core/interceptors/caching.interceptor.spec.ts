import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { CachingInterceptor } from './caching.interceptor';
import { ConfigService } from '../../config/config.service';

describe('CachingInterceptor', () => {
    let interceptor: CachingInterceptor;

    const mockConfigService = {
        performance: {
            cacheTtl: 60000, // 1 minute
        },
    };

    // Helper to create mock ExecutionContext
    const createMockContext = (
        method: string,
        url: string,
        query: Record<string, string> = {},
        headers: Record<string, string> = {},
    ): ExecutionContext =>
        ({
            switchToHttp: () => ({
                getRequest: () => ({ method, url, query, headers }),
            }),
        }) as ExecutionContext;

    // Helper to create mock CallHandler
    const createMockHandler = (response: object): CallHandler => ({
        handle: () => of(response),
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CachingInterceptor,
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        interceptor = module.get<CachingInterceptor>(CachingInterceptor);
    });

    describe('intercept', () => {
        it('should cache GET requests and return cached on subsequent calls', (done) => {
            const context = createMockContext('GET', '/api/users');
            const response = { success: true, data: [{ id: 1 }] };
            const handler = createMockHandler(response);

            // First call - cache miss
            interceptor.intercept(context, handler).subscribe((result) => {
                expect(result).toEqual(response);

                // Second call - cache hit (should return cached, not new handler response)
                const handler2 = createMockHandler({ different: 'response' });
                interceptor
                    .intercept(context, handler2)
                    .subscribe((result2) => {
                        expect(result2).toEqual(response);
                        done();
                    });
            });
        });

        it('should skip caching for non-GET requests', (done) => {
            const context = createMockContext('POST', '/api/users');
            const response = { success: true };
            const handler = createMockHandler(response);

            interceptor.intercept(context, handler).subscribe(() => {
                expect(interceptor.getCacheStats().size).toBe(0);
                done();
            });
        });

        it('should skip caching when no-cache header present', (done) => {
            const context = createMockContext(
                'GET',
                '/api/users',
                {},
                { 'cache-control': 'no-cache' },
            );
            const response = { success: true };
            const handler = createMockHandler(response);

            interceptor.intercept(context, handler).subscribe(() => {
                expect(interceptor.getCacheStats().size).toBe(0);
                done();
            });
        });

        it('should not cache error responses', (done) => {
            const context = createMockContext('GET', '/api/users');
            const errorResponse = { success: false, message: 'Error' };
            const handler = createMockHandler(errorResponse);

            interceptor.intercept(context, handler).subscribe(() => {
                expect(interceptor.getCacheStats().size).toBe(0);
                done();
            });
        });

        it('should generate different cache keys for different query params', (done) => {
            const context1 = createMockContext('GET', '/api/users', {
                page: '1',
            });
            const context2 = createMockContext('GET', '/api/users', {
                page: '2',
            });
            const response1 = { data: 'page1' };
            const response2 = { data: 'page2' };

            interceptor
                .intercept(context1, createMockHandler(response1))
                .subscribe(() => {
                    interceptor
                        .intercept(context2, createMockHandler(response2))
                        .subscribe(() => {
                            expect(interceptor.getCacheStats().size).toBe(2);
                            done();
                        });
                });
        });
    });

    describe('LRU eviction', () => {
        it('should evict oldest entry when max size (500) reached', () => {
            // Access private cache for testing
            const cache = (interceptor as any).cache;

            // Fill cache to max
            for (let i = 0; i < 500; i++) {
                cache.set(`key-${i}`, { data: i });
            }
            expect(cache.size).toBe(500);

            // Add one more - should evict oldest
            cache.set('key-500', { data: 500 });
            expect(cache.size).toBe(500);
            expect(cache.has('key-0')).toBe(false); // First key evicted
            expect(cache.has('key-500')).toBe(true); // New key present
        });

        it('should update LRU order on access', () => {
            const cache = (interceptor as any).cache;

            // Add 3 entries
            cache.set('key-1', { data: 1 });
            cache.set('key-2', { data: 2 });
            cache.set('key-3', { data: 3 });

            // Access key-1 to make it recently used
            cache.get('key-1');

            // Fill up remaining slots
            for (let i = 4; i <= 500; i++) {
                cache.set(`key-${i}`, { data: i });
            }

            // Add one more - should evict key-2 (oldest not-recently-accessed)
            cache.set('key-501', { data: 501 });

            expect(cache.has('key-1')).toBe(true); // Was accessed, should remain
            expect(cache.has('key-2')).toBe(false); // Was oldest unused
        });
    });

    describe('TTL expiration', () => {
        it('should expire entries after TTL', async () => {
            // Access private cache and set with short TTL
            const cache = (interceptor as any).cache;

            // Set entry with very short TTL (50ms)
            cache.set('test-key', { value: 'test-value' }, { ttl: 50 });
            expect(cache.get('test-key')).toEqual({ value: 'test-value' });

            // Wait for TTL to expire
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(cache.get('test-key')).toBeUndefined();
        });
    });

    describe('utilities', () => {
        it('should clear all cache entries', () => {
            const cache = (interceptor as any).cache;
            cache.set('key-1', { value: '1' });
            cache.set('key-2', { value: '2' });

            interceptor.clearCache();

            expect(interceptor.getCacheStats().size).toBe(0);
        });

        it('should return accurate cache statistics', () => {
            const cache = (interceptor as any).cache;
            cache.set('key-1', { value: '1' });
            cache.set('key-2', { value: '2' });

            const stats = interceptor.getCacheStats();

            expect(stats.size).toBe(2);
            expect(stats.keys).toContain('key-1');
            expect(stats.keys).toContain('key-2');
        });
    });
});
