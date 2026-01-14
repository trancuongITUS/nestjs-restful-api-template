import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import {
    FILE_LIMITS,
    VALIDATION,
    METHODS_WITH_BODY,
    ALLOWED_CONTENT_TYPES,
    ERROR_CODE,
    SENSITIVE_FIELDS,
    REQUIRED_HEADERS,
    REGEX_PATTERN,
    CONTENT_TYPE,
} from '../../common/constants';

/**
 * Validation interceptor for request/response validation
 * Provides additional validation beyond standard NestJS pipes
 */
@Injectable()
export class ValidationInterceptor implements NestInterceptor {
    private readonly logger = new Logger(ValidationInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();

        // Validate request
        this.validateRequest(request);

        return next.handle().pipe(
            map((response) => {
                // Validate response if needed
                this.validateResponse(response, request);
                return response;
            }),
        );
    }

    /**
     * Validates incoming request data
     */
    private validateRequest(request: Request): void {
        // Validate request size
        this.validateRequestSize(request);

        // Validate content type for POST/PUT/PATCH requests
        this.validateContentType(request);

        // Validate required headers
        this.validateRequiredHeaders(request);

        // Validate query parameters
        this.validateQueryParameters(request);
    }

    /**
     * Validates request size to prevent oversized payloads
     */
    private validateRequestSize(request: Request): void {
        const contentLength = request.headers['content-length'];
        if (contentLength) {
            const size = parseInt(contentLength, VALIDATION.DECIMAL_RADIX);
            const maxSize = FILE_LIMITS.MAX_REQUEST_PAYLOAD;

            if (size > maxSize) {
                throw new BadRequestException({
                    message: 'Request payload too large',
                    error: ERROR_CODE.PAYLOAD_TOO_LARGE,
                    maxSize: `${maxSize} bytes`,
                    receivedSize: `${size} bytes`,
                });
            }
        }
    }

    /**
     * Validates content type for requests with body
     */
    private validateContentType(request: Request): void {
        const { method } = request;
        const hasBody = METHODS_WITH_BODY.includes(method.toUpperCase() as any);

        if (hasBody) {
            const contentType = request.headers['content-type'];
            if (!contentType) {
                throw new BadRequestException({
                    message: 'Content-Type header is required',
                    error: ERROR_CODE.MISSING_CONTENT_TYPE,
                });
            }

            const allowedTypes = ALLOWED_CONTENT_TYPES;

            const isValidType = allowedTypes.some((type) =>
                contentType.toLowerCase().includes(type),
            );

            if (!isValidType) {
                throw new BadRequestException({
                    message: 'Invalid Content-Type',
                    error: ERROR_CODE.INVALID_CONTENT_TYPE,
                    allowedTypes,
                    receivedType: contentType,
                });
            }
        }
    }

    /**
     * Validates required headers
     */
    private validateRequiredHeaders(request: Request): void {
        const requiredHeaders = REQUIRED_HEADERS;

        for (const header of requiredHeaders) {
            if (!request.headers[header]) {
                this.logger.warn(`Missing required header: ${header}`, {
                    url: request.url,
                    method: request.method,
                    ip: request.ip,
                });
            }
        }
    }

    /**
     * Validates query parameters
     */
    private validateQueryParameters(request: Request): void {
        const { query } = request;

        // Validate pagination parameters
        if (query.page) {
            const page = parseInt(
                query.page as string,
                VALIDATION.DECIMAL_RADIX,
            );
            if (isNaN(page) || page < VALIDATION.MIN_PAGE_NUMBER) {
                throw new BadRequestException({
                    message: 'Invalid page parameter',
                    error: ERROR_CODE.INVALID_PAGE,
                    details: 'Page must be a positive integer',
                });
            }
        }

        if (query.limit) {
            const limit = parseInt(
                query.limit as string,
                VALIDATION.DECIMAL_RADIX,
            );
            if (
                isNaN(limit) ||
                limit < VALIDATION.MIN_PAGINATION_LIMIT ||
                limit > VALIDATION.MAX_PAGINATION_LIMIT
            ) {
                throw new BadRequestException({
                    message: 'Invalid limit parameter',
                    error: ERROR_CODE.INVALID_LIMIT,
                    details: `Limit must be between ${VALIDATION.MIN_PAGINATION_LIMIT} and ${VALIDATION.MAX_PAGINATION_LIMIT}`,
                });
            }
        }

        // Validate sort parameters
        if (query.sort) {
            const sort = query.sort as string;
            const validSortPattern = REGEX_PATTERN.SORT_PARAMETER;

            if (!validSortPattern.test(sort)) {
                throw new BadRequestException({
                    message: 'Invalid sort parameter format',
                    error: ERROR_CODE.INVALID_SORT_FORMAT,
                    details: 'Sort must be in format: field or field:asc/desc',
                    example: 'createdAt:desc',
                });
            }
        }

        // Validate search parameters
        if (query.search) {
            const search = query.search as string;
            if (search.length < VALIDATION.MIN_SEARCH_LENGTH) {
                throw new BadRequestException({
                    message: 'Search query too short',
                    error: ERROR_CODE.SEARCH_TOO_SHORT,
                    details: `Search query must be at least ${VALIDATION.MIN_SEARCH_LENGTH} characters long`,
                });
            }

            if (search.length > VALIDATION.MAX_SEARCH_LENGTH) {
                throw new BadRequestException({
                    message: 'Search query too long',
                    error: ERROR_CODE.SEARCH_TOO_LONG,
                    details: `Search query must be less than ${VALIDATION.MAX_SEARCH_LENGTH} characters`,
                });
            }
        }
    }

    /**
     * Validates response data
     */
    private validateResponse(response: any, request: Request): void {
        // Skip validation for certain content types
        const contentType = request.headers['accept'];
        if (contentType && !contentType.includes(CONTENT_TYPE.JSON)) {
            return;
        }

        // Validate response structure
        this.validateResponseStructure(response);

        // Check for sensitive data in response
        this.checkSensitiveData(response, request);
    }

    /**
     * Validates response structure
     */
    private validateResponseStructure(response: any): void {
        if (!response) {
            return;
        }

        // Check if response follows standard format
        if (
            typeof response === 'object' &&
            response !== null &&
            'success' in response
        ) {
            const requiredFields = ['success', 'statusCode', 'timestamp'];

            for (const field of requiredFields) {
                if (!(field in response)) {
                    this.logger.warn(
                        `Response missing required field: ${field}`,
                    );
                }
            }
        }
    }

    /**
     * Checks for sensitive data in response
     */
    private checkSensitiveData(response: unknown, request: Request): void {
        if (!response || typeof response !== 'object') {
            return;
        }

        const sensitiveFields = SENSITIVE_FIELDS;

        const responseStr = JSON.stringify(response).toLowerCase();

        for (const field of sensitiveFields) {
            if (responseStr.includes(`"${field}"`)) {
                this.logger.error(
                    `Potential sensitive data leak in response: ${field}`,
                    {
                        url: request.url,
                        method: request.method,
                        field,
                    },
                );
            }
        }
    }
}
