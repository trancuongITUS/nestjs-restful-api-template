import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import * as os from 'os';
import {
    HTTP_STATUS,
    PERFORMANCE,
    HEALTH_STATUS,
    VALIDATION,
} from '../../common/constants';

interface RequestMetrics {
    count: number;
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    successCount: number;
    errorCount: number;
    statusCodes: Record<number, number>;
}

interface EndpointMetrics {
    [endpoint: string]: RequestMetrics;
}

interface SystemMetrics {
    memory: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
        external: number;
        heapUsedPercent: number;
    };
    cpu: {
        user: number;
        system: number;
        percentUsed: number;
    };
    eventLoop: {
        lag: number;
        lagMs: number;
    };
    uptime: number;
    timestamp: number;
}

/**
 * Performance metrics interceptor for monitoring API performance
 * Tracks request counts, response times, error rates, and system metrics
 * (memory, CPU, event loop lag)
 */
@Injectable()
export class MetricsInterceptor
    implements NestInterceptor, OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(MetricsInterceptor.name);
    private readonly metrics: EndpointMetrics = {};
    private readonly globalMetrics: RequestMetrics = {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Number.MAX_SAFE_INTEGER,
        maxDuration: 0,
        successCount: 0,
        errorCount: 0,
        statusCodes: {},
    };

    // System metrics tracking
    private systemMetrics: SystemMetrics = this.createEmptySystemMetrics();
    private lastCpuUsage = process.cpuUsage();
    private lastCpuTime = Date.now();
    private eventLoopLagTimer: ReturnType<typeof setInterval> | null = null;
    private systemMetricsTimer: ReturnType<typeof setInterval> | null = null;

    private createEmptySystemMetrics(): SystemMetrics {
        return {
            memory: {
                heapUsed: 0,
                heapTotal: 0,
                rss: 0,
                external: 0,
                heapUsedPercent: 0,
            },
            cpu: { user: 0, system: 0, percentUsed: 0 },
            eventLoop: { lag: 0, lagMs: 0 },
            uptime: 0,
            timestamp: Date.now(),
        };
    }

    onModuleInit(): void {
        this.startSystemMetricsCollection();
        this.logger.log('System metrics collection started');
    }

    onModuleDestroy(): void {
        this.stopSystemMetricsCollection();
        this.logger.log('System metrics collection stopped');
    }

    private startSystemMetricsCollection(): void {
        // Collect system metrics at configured interval
        this.systemMetricsTimer = setInterval(() => {
            this.collectSystemMetrics();
        }, PERFORMANCE.SYSTEM_METRICS_INTERVAL);

        // Measure event loop lag at configured interval
        this.eventLoopLagTimer = setInterval(() => {
            this.measureEventLoopLag();
        }, PERFORMANCE.EVENT_LOOP_LAG_INTERVAL);

        // Initial collection
        this.collectSystemMetrics();
    }

    private stopSystemMetricsCollection(): void {
        if (this.systemMetricsTimer) {
            clearInterval(this.systemMetricsTimer);
            this.systemMetricsTimer = null;
        }
        if (this.eventLoopLagTimer) {
            clearInterval(this.eventLoopLagTimer);
            this.eventLoopLagTimer = null;
        }
    }

    private collectSystemMetrics(): void {
        // Memory metrics
        const memUsage = process.memoryUsage();
        this.systemMetrics.memory = {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            rss: memUsage.rss,
            external: memUsage.external,
            heapUsedPercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        };

        // CPU metrics
        const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
        const currentTime = Date.now();
        const elapsedMs = currentTime - this.lastCpuTime;

        if (elapsedMs > 0) {
            // Convert microseconds to milliseconds and calculate percentage
            const userMs = currentCpuUsage.user / 1000;
            const systemMs = currentCpuUsage.system / 1000;
            const totalCpuMs = userMs + systemMs;
            // Calculate CPU percentage relative to elapsed time and number of CPUs
            const numCpus = os.cpus().length;
            const percentUsed = (totalCpuMs / (elapsedMs * numCpus)) * 100;

            this.systemMetrics.cpu = {
                user: userMs,
                system: systemMs,
                percentUsed: Math.min(percentUsed, 100),
            };
        }

        this.lastCpuUsage = process.cpuUsage();
        this.lastCpuTime = currentTime;

        // Uptime
        this.systemMetrics.uptime = process.uptime();
        this.systemMetrics.timestamp = Date.now();
    }

    private measureEventLoopLag(): void {
        const start = process.hrtime.bigint();
        setImmediate(() => {
            const lag = process.hrtime.bigint() - start;
            const lagNs = Number(lag);
            this.systemMetrics.eventLoop = {
                lag: lagNs,
                lagMs: lagNs / 1_000_000,
            };
        });
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const startTime = Date.now();
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const endpoint = this.getEndpointKey(request);

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - startTime;
                this.recordMetrics(
                    endpoint,
                    duration,
                    response.statusCode,
                    false,
                );
            }),
            catchError((error) => {
                const duration = Date.now() - startTime;
                const statusCode =
                    (error as { status?: number }).status ||
                    HTTP_STATUS.INTERNAL_SERVER_ERROR;
                this.recordMetrics(endpoint, duration, statusCode, true);
                throw error;
            }),
        );
    }

    /**
     * Records metrics for a request
     */
    private recordMetrics(
        endpoint: string,
        duration: number,
        statusCode: number,
        isError: boolean,
    ): void {
        // Update endpoint-specific metrics
        if (!this.metrics[endpoint]) {
            this.metrics[endpoint] = {
                count: 0,
                totalDuration: 0,
                averageDuration: 0,
                minDuration: Number.MAX_SAFE_INTEGER,
                maxDuration: 0,
                successCount: 0,
                errorCount: 0,
                statusCodes: {},
            };
        }

        const endpointMetrics = this.metrics[endpoint];
        this.updateMetrics(endpointMetrics, duration, statusCode, isError);

        // Update global metrics
        this.updateMetrics(this.globalMetrics, duration, statusCode, isError);

        // Log slow requests
        if (duration > PERFORMANCE.SLOW_REQUEST_THRESHOLD) {
            this.logger.warn(
                `Slow request detected: ${endpoint} took ${duration}ms`,
            );
        }

        // Log metrics periodically
        if (this.globalMetrics.count % PERFORMANCE.METRICS_LOG_INTERVAL === 0) {
            this.logPerformanceMetrics();
        }
    }

    /**
     * Updates metrics object with new request data
     */
    private updateMetrics(
        metrics: RequestMetrics,
        duration: number,
        statusCode: number,
        isError: boolean,
    ): void {
        metrics.count++;
        metrics.totalDuration += duration;
        metrics.averageDuration = metrics.totalDuration / metrics.count;
        metrics.minDuration = Math.min(metrics.minDuration, duration);
        metrics.maxDuration = Math.max(metrics.maxDuration, duration);

        if (isError) {
            metrics.errorCount++;
        } else {
            metrics.successCount++;
        }

        // Track status codes
        metrics.statusCodes[statusCode] =
            (metrics.statusCodes[statusCode] || 0) + 1;
    }

    /**
     * Generates endpoint key for metrics tracking
     */
    private getEndpointKey(request: Request): string {
        const { method } = request;
        const route = (request as Request & { route?: { path: string } }).route;
        const path = route?.path || request.url.split('?')[0];
        return `${method.toUpperCase()} ${path}`;
    }

    /**
     * Logs performance metrics summary including system metrics
     */
    private logPerformanceMetrics(): void {
        const errorRate =
            (this.globalMetrics.errorCount / this.globalMetrics.count) * 100;

        this.logger.log('Performance Metrics Summary', {
            totalRequests: this.globalMetrics.count,
            averageResponseTime: `${this.globalMetrics.averageDuration.toFixed(2)}ms`,
            minResponseTime: `${this.globalMetrics.minDuration}ms`,
            maxResponseTime: `${this.globalMetrics.maxDuration}ms`,
            successRate: `${((this.globalMetrics.successCount / this.globalMetrics.count) * 100).toFixed(2)}%`,
            errorRate: `${errorRate.toFixed(2)}%`,
            topStatusCodes: this.getTopStatusCodes(
                this.globalMetrics.statusCodes,
            ),
            system: {
                memoryHeapUsedMB: (
                    this.systemMetrics.memory.heapUsed /
                    1024 /
                    1024
                ).toFixed(2),
                memoryHeapPercent:
                    this.systemMetrics.memory.heapUsedPercent.toFixed(2),
                cpuPercent: this.systemMetrics.cpu.percentUsed.toFixed(2),
                eventLoopLagMs: this.systemMetrics.eventLoop.lagMs.toFixed(2),
                uptimeSeconds: Math.floor(this.systemMetrics.uptime),
            },
        });
    }

    /**
     * Gets top status codes by frequency
     */
    private getTopStatusCodes(
        statusCodes: Record<number, number>,
    ): Record<number, number> {
        return Object.entries(statusCodes)
            .sort(([, a], [, b]) => b - a)
            .slice(0, PERFORMANCE.TOP_STATUS_CODES_LIMIT)
            .reduce(
                (acc, [code, count]) => {
                    acc[parseInt(code, VALIDATION.DECIMAL_RADIX)] = count;
                    return acc;
                },
                {} as Record<number, number>,
            );
    }

    /**
     * Gets current metrics for all endpoints including system metrics
     */
    getMetrics(): {
        global: RequestMetrics;
        endpoints: EndpointMetrics;
        system: SystemMetrics;
    } {
        return {
            global: { ...this.globalMetrics },
            endpoints: { ...this.metrics },
            system: { ...this.systemMetrics },
        };
    }

    /**
     * Gets current system metrics (memory, CPU, event loop lag)
     */
    getSystemMetrics(): SystemMetrics {
        return { ...this.systemMetrics };
    }

    /**
     * Gets metrics for a specific endpoint
     */
    getEndpointMetrics(endpoint: string): RequestMetrics | null {
        return this.metrics[endpoint] ? { ...this.metrics[endpoint] } : null;
    }

    /**
     * Resets all metrics
     */
    resetMetrics(): void {
        Object.keys(this.metrics).forEach((key) => delete this.metrics[key]);

        this.globalMetrics.count = 0;
        this.globalMetrics.totalDuration = 0;
        this.globalMetrics.averageDuration = 0;
        this.globalMetrics.minDuration = Number.MAX_SAFE_INTEGER;
        this.globalMetrics.maxDuration = 0;
        this.globalMetrics.successCount = 0;
        this.globalMetrics.errorCount = 0;
        this.globalMetrics.statusCodes = {};

        this.logger.log('Metrics reset');
    }

    /**
     * Gets health check based on metrics including system resource usage
     */
    getHealthStatus(): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        metrics: {
            errorRate: number;
            averageResponseTime: number;
            totalRequests: number;
        };
        system: {
            memoryHeapPercent: number;
            cpuPercent: number;
            eventLoopLagMs: number;
        };
    } {
        const errorRate =
            this.globalMetrics.count > 0
                ? (this.globalMetrics.errorCount / this.globalMetrics.count) *
                  100
                : 0;
        const avgResponseTime = this.globalMetrics.averageDuration;

        let status: 'healthy' | 'degraded' | 'unhealthy' =
            HEALTH_STATUS.HEALTHY;

        // Check request metrics
        if (
            errorRate > PERFORMANCE.UNHEALTHY_ERROR_RATE ||
            avgResponseTime > PERFORMANCE.SLOW_REQUEST_THRESHOLD
        ) {
            status = HEALTH_STATUS.UNHEALTHY;
        } else if (
            errorRate > PERFORMANCE.DEGRADED_ERROR_RATE ||
            avgResponseTime > PERFORMANCE.DEGRADED_RESPONSE_TIME
        ) {
            status = HEALTH_STATUS.DEGRADED;
        }

        // Check system metrics for degradation
        const memPercent = this.systemMetrics.memory.heapUsedPercent;
        const cpuPercent = this.systemMetrics.cpu.percentUsed;
        const eventLoopLag = this.systemMetrics.eventLoop.lagMs;

        // Check unhealthy thresholds
        if (
            memPercent > PERFORMANCE.UNHEALTHY_MEMORY_PERCENT ||
            cpuPercent > PERFORMANCE.UNHEALTHY_CPU_PERCENT ||
            eventLoopLag > PERFORMANCE.UNHEALTHY_EVENT_LOOP_LAG_MS
        ) {
            status = HEALTH_STATUS.UNHEALTHY;
        }
        // Check degraded thresholds
        else if (
            status === HEALTH_STATUS.HEALTHY &&
            (memPercent > PERFORMANCE.DEGRADED_MEMORY_PERCENT ||
                cpuPercent > PERFORMANCE.DEGRADED_CPU_PERCENT ||
                eventLoopLag > PERFORMANCE.DEGRADED_EVENT_LOOP_LAG_MS)
        ) {
            status = HEALTH_STATUS.DEGRADED;
        }

        return {
            status,
            metrics: {
                errorRate,
                averageResponseTime: avgResponseTime,
                totalRequests: this.globalMetrics.count,
            },
            system: {
                memoryHeapPercent: memPercent,
                cpuPercent: cpuPercent,
                eventLoopLagMs: eventLoopLag,
            },
        };
    }
}
