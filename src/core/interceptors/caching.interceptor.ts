import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { LRUCache } from 'lru-cache';
import { HTTP_METHOD, VALIDATION } from '../../common/constants';
import { ConfigService } from '../../config/config.service';

/** Max cache entries to prevent unbounded memory growth */
const MAX_CACHE_ENTRIES = 500;

/**
 * Caching interceptor that caches GET requests for improved performance.
 * Uses LRU (Least Recently Used) cache with bounded size and TTL support.
 */
@Injectable()
export class CachingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(CachingInterceptor.name);
    private readonly cache: LRUCache<string, object>;
    private readonly defaultTtl: number;

    constructor(private readonly configService: ConfigService) {
        this.defaultTtl = this.configService.performance.cacheTtl;
        this.cache = new LRUCache<string, object>({
            max: MAX_CACHE_ENTRIES,
            ttl: this.defaultTtl,
        });
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const { method, url } = request;

        // Only cache GET requests
        if (method !== HTTP_METHOD.GET) {
            return next.handle();
        }

        // Check for cache-control headers
        const cacheControl = request.headers['cache-control'] as string;
        if (cacheControl && cacheControl.includes('no-cache')) {
            return next.handle();
        }

        const cacheKey = this.generateCacheKey(request);
        const cachedResponse = this.getCachedResponse(cacheKey);

        if (cachedResponse) {
            this.logger.debug(`Cache HIT for ${method} ${url}`);
            return of(cachedResponse);
        }

        this.logger.debug(`Cache MISS for ${method} ${url}`);

        return next.handle().pipe(
            tap((response) => {
                // Only cache successful responses
                if (response && !this.isErrorResponse(response)) {
                    const ttl =
                        this.getTtlFromHeaders(request) || this.defaultTtl;
                    this.setCachedResponse(cacheKey, response, ttl);
                    this.logger.debug(
                        `Cached response for ${method} ${url} with TTL ${ttl}ms`,
                    );
                }
            }),
        );
    }

    /**
     * Generates a unique cache key for the request
     */
    private generateCacheKey(request: Request): string {
        const { method, url, query } = request;
        const queryString = Object.keys(query)
            .sort()
            .map((key) => {
                const value = query[key];
                return `${key}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`;
            })
            .join('&');

        return `${method}:${url}${queryString ? `?${queryString}` : ''}`;
    }

    /**
     * Gets cached response if it exists and is not expired.
     * LRUCache automatically handles TTL expiration.
     */
    private getCachedResponse(cacheKey: string): unknown {
        return this.cache.get(cacheKey) ?? null;
    }

    /**
     * Sets cached response with TTL.
     * LRUCache automatically handles LRU eviction when max size reached.
     */
    private setCachedResponse(
        cacheKey: string,
        data: object,
        ttl: number,
    ): void {
        this.cache.set(cacheKey, data, { ttl });
    }

    /**
     * Gets TTL from request headers
     */
    private getTtlFromHeaders(request: Request): number | null {
        const cacheControl = request.headers['cache-control'] as string;
        if (!cacheControl) {
            return null;
        }

        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
            return parseInt(maxAgeMatch[1], VALIDATION.DECIMAL_RADIX) * 1000; // Convert seconds to milliseconds
        }

        return null;
    }

    /**
     * Checks if response indicates an error
     */
    private isErrorResponse(response: unknown): boolean {
        return Boolean(
            response &&
                typeof response === 'object' &&
                response !== null &&
                'success' in response &&
                (response as { success: boolean }).success === false,
        );
    }

    /**
     * Clears all cached entries
     */
    clearCache(): void {
        this.cache.clear();
        this.logger.log('Cache cleared');
    }

    /**
     * Gets cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: [...this.cache.keys()],
        };
    }
}
