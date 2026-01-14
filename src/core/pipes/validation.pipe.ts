import {
    PipeTransform,
    Injectable,
    ArgumentMetadata,
    BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ERROR_CODE } from '../../common/constants';
import { formatValidationErrors } from '../../common/utils';

/**
 * Custom validation pipe with proper type safety.
 * Uses shared formatValidationErrors utility for consistent error formatting.
 */
@Injectable()
export class ValidationPipe implements PipeTransform<unknown, unknown> {
    async transform(
        value: unknown,
        { metatype }: ArgumentMetadata,
    ): Promise<unknown> {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }

        // Transform plain object to class instance
        const object = plainToInstance(
            metatype,
            value as Record<string, unknown>,
        );

        // Validate with proper typing
        const errors = await validate(object as object, {
            whitelist: true,
            forbidNonWhitelisted: true,
        });

        if (errors.length > 0) {
            throw new BadRequestException({
                message: formatValidationErrors(errors),
                error: ERROR_CODE.VALIDATION_FAILED,
                details:
                    'Request validation failed. Please check your input data.',
            });
        }

        return object;
    }

    /**
     * Type-safe validation check
     */
    private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
        const types: Array<new (...args: unknown[]) => unknown> = [
            String,
            Boolean,
            Number,
            Array,
            Object,
        ];
        return !types.includes(metatype);
    }
}
