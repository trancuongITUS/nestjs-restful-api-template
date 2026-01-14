import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError as ClassValidatorError } from 'class-validator';
import {
    ErrorResponse,
    ValidationError,
} from '../../common/types/api-response.type';
import { HTTP_STATUS, ENVIRONMENT, ERROR_CODE } from '../../common/constants';
import { formatValidationErrors } from '../../common/utils';

/**
 * Global exception filter that catches all HTTP exceptions and formats them
 * according to the standard API response structure
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const { status, errorResponse } = this.getErrorResponse(
            exception,
            request,
        );

        // Log the error for monitoring
        this.logError(exception, request, status);

        response.status(status).json(errorResponse);
    }

    /**
     * Determines the HTTP status code and formats the error response
     */
    private getErrorResponse(
        exception: unknown,
        request: Request,
    ): {
        status: number;
        errorResponse: ErrorResponse;
    } {
        let status: number;
        let message: string;
        let errorCode: string;
        let details: string | undefined;
        let validationErrors: ValidationError[] | undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
                errorCode = this.getErrorCodeFromStatus(status);
            } else if (
                typeof exceptionResponse === 'object' &&
                exceptionResponse !== null
            ) {
                const responseObj = exceptionResponse as Record<
                    string,
                    unknown
                >;
                message = (responseObj.message as string) || exception.message;
                errorCode =
                    (responseObj.error as string) ||
                    this.getErrorCodeFromStatus(status);
                details = responseObj.details as string | undefined;

                // Handle validation errors from class-validator
                if (responseObj.message && Array.isArray(responseObj.message)) {
                    validationErrors = formatValidationErrors(
                        responseObj.message as ClassValidatorError[],
                    );
                    message = 'Validation failed';
                }
            } else {
                message = exception.message;
                errorCode = this.getErrorCodeFromStatus(status);
            }
        } else if (exception instanceof Error) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            errorCode = ERROR_CODE.INTERNAL_SERVER_ERROR;
            details =
                process.env.NODE_ENV === ENVIRONMENT.DEVELOPMENT
                    ? exception.message
                    : undefined;
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'An unexpected error occurred';
            errorCode = ERROR_CODE.INTERNAL_SERVER_ERROR;
        }

        const errorResponse: ErrorResponse = {
            success: false,
            statusCode: status,
            message,
            error: {
                code: errorCode,
                details,
                validationErrors,
                requestId: this.generateRequestId(),
            },
            timestamp: new Date().toISOString(),
            path: request.url,
        };

        return { status, errorResponse };
    }

    /**
     * Maps HTTP status codes to error codes
     */
    private getErrorCodeFromStatus(status: number): string {
        const statusCodeMap: Record<number, string> = {
            [HttpStatus.BAD_REQUEST]: ERROR_CODE.BAD_REQUEST,
            [HttpStatus.UNAUTHORIZED]: ERROR_CODE.UNAUTHORIZED,
            [HttpStatus.FORBIDDEN]: ERROR_CODE.FORBIDDEN,
            [HttpStatus.NOT_FOUND]: ERROR_CODE.NOT_FOUND,
            [HttpStatus.METHOD_NOT_ALLOWED]: ERROR_CODE.METHOD_NOT_ALLOWED,
            [HttpStatus.CONFLICT]: ERROR_CODE.CONFLICT,
            [HttpStatus.UNPROCESSABLE_ENTITY]: ERROR_CODE.UNPROCESSABLE_ENTITY,
            [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODE.TOO_MANY_REQUESTS,
            [HttpStatus.INTERNAL_SERVER_ERROR]:
                ERROR_CODE.INTERNAL_SERVER_ERROR,
            [HttpStatus.BAD_GATEWAY]: ERROR_CODE.BAD_GATEWAY,
            [HttpStatus.SERVICE_UNAVAILABLE]: ERROR_CODE.SERVICE_UNAVAILABLE,
        };

        return statusCodeMap[status] || ERROR_CODE.UNKNOWN_ERROR;
    }

    /**
     * Logs error details for monitoring and debugging
     */
    private logError(
        exception: unknown,
        request: Request,
        status: number,
    ): void {
        const { method, url, ip, headers } = request;
        const userAgent = headers['user-agent'] || 'Unknown';

        const logContext = {
            method,
            url,
            ip,
            userAgent,
            status,
            timestamp: new Date().toISOString(),
        };

        if (status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
            // Server errors - log as errors
            this.logger.error(
                `${method} ${url} - ${status}`,
                exception instanceof Error ? exception.stack : exception,
                JSON.stringify(logContext),
            );
        } else if (status >= HTTP_STATUS.BAD_REQUEST) {
            // Client errors - log as warnings
            this.logger.warn(
                `${method} ${url} - ${status}`,
                JSON.stringify({
                    ...logContext,
                    error:
                        exception instanceof Error
                            ? exception.message
                            : exception,
                }),
            );
        }
    }

    /**
     * Generates a unique request ID for error tracking
     */
    private generateRequestId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}
