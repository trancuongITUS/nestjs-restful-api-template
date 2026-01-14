/**
 * Prisma-specific exception handling
 * Converts Prisma errors to application-specific exceptions
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import {
    PrismaClientKnownRequestError,
    PrismaClientUnknownRequestError,
    PrismaClientRustPanicError,
    PrismaClientInitializationError,
    PrismaClientValidationError,
} from '@prisma/client/runtime/library';

export class PrismaException extends HttpException {
    constructor(
        message: string,
        statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
        public readonly prismaError?: PrismaClientKnownRequestError,
    ) {
        super(message, statusCode);
    }
}

export class PrismaUniqueConstraintException extends PrismaException {
    constructor(field: string, value: string) {
        super(
            `Record with ${field} '${value}' already exists`,
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
}

export class PrismaRecordNotFoundException extends PrismaException {
    constructor(model: string, identifier: string) {
        super(
            `${model} with identifier '${identifier}' not found`,
            HttpStatus.NOT_FOUND,
        );
    }
}

export class PrismaForeignKeyConstraintException extends PrismaException {
    constructor(field: string) {
        super(
            `Foreign key constraint failed on field '${field}'`,
            HttpStatus.BAD_REQUEST,
        );
    }
}

export class PrismaValidationException extends PrismaException {
    constructor(message: string) {
        super(`Validation error: ${message}`, HttpStatus.BAD_REQUEST);
    }
}

/**
 * Utility function to convert Prisma errors to application exceptions
 */
export function handlePrismaError(error: unknown, model?: string): never {
    if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002': {
                // Unique constraint violation
                const field = error.meta?.target as string[] | undefined;
                const fieldName = field?.[0] || 'field';
                throw new PrismaUniqueConstraintException(
                    fieldName,
                    'provided value',
                );
            }

            case 'P2025': {
                // Record not found
                const modelName = model || 'Record';
                throw new PrismaRecordNotFoundException(
                    modelName,
                    'provided identifier',
                );
            }

            case 'P2003': {
                // Foreign key constraint violation
                const field = error.meta?.field_name as string | undefined;
                throw new PrismaForeignKeyConstraintException(
                    field || 'unknown field',
                );
            }

            case 'P2011': {
                // Null constraint violation
                const field = error.meta?.target as string | undefined;
                throw new PrismaValidationException(
                    `Required field '${field || 'unknown'}' cannot be null`,
                );
            }

            case 'P2012': {
                // Missing required value
                const field = error.meta?.target as string | undefined;
                throw new PrismaValidationException(
                    `Missing required value for field '${field || 'unknown'}'`,
                );
            }

            case 'P2014': {
                // Invalid ID
                throw new PrismaValidationException('Invalid ID provided');
            }

            case 'P2016': {
                // Query interpretation error
                throw new PrismaValidationException(
                    'Query interpretation error',
                );
            }

            case 'P2021': {
                // Table does not exist
                throw new PrismaException(
                    'Database table does not exist',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    error,
                );
            }

            case 'P2022': {
                // Column does not exist
                throw new PrismaException(
                    'Database column does not exist',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    error,
                );
            }

            default: {
                throw new PrismaException(
                    `Database error: ${error.message}`,
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    error,
                );
            }
        }
    }

    if (error instanceof PrismaClientUnknownRequestError) {
        throw new PrismaException(
            'Unknown database error occurred',
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }

    if (error instanceof PrismaClientRustPanicError) {
        throw new PrismaException(
            'Database engine error',
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }

    if (error instanceof PrismaClientInitializationError) {
        throw new PrismaException(
            'Database connection error',
            HttpStatus.SERVICE_UNAVAILABLE,
        );
    }

    if (error instanceof PrismaClientValidationError) {
        throw new PrismaValidationException(error.message);
    }

    // Re-throw if it's already an HttpException
    if (error instanceof HttpException) {
        throw error;
    }

    // Generic error handling
    throw new PrismaException(
        error instanceof Error ? error.message : 'Unknown database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
    );
}
