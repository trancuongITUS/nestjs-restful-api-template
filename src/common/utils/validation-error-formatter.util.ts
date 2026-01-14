import { ValidationError as ClassValidatorError } from 'class-validator';
import { ValidationError } from '../types/api-response.type';

/**
 * Formats class-validator validation errors into a flat array structure.
 * Recursively processes nested validation errors, building dot-notation field paths.
 *
 * @param errors - Array of class-validator ValidationError objects
 * @returns Flattened array of ValidationError with dot-notation field paths
 *
 * @example
 * // Input: nested error { property: 'user', children: [{ property: 'email', constraints: {...} }] }
 * // Output: [{ field: 'user.email', value: '...', constraints: {...} }]
 */
export function formatValidationErrors(
    errors: ClassValidatorError[],
): ValidationError[] {
    const validationErrors: ValidationError[] = [];

    const processError = (
        error: ClassValidatorError,
        parentPath = '',
    ): void => {
        const field = parentPath
            ? `${parentPath}.${error.property}`
            : error.property;

        if (error.constraints) {
            validationErrors.push({
                field,
                value: error.value as unknown,
                constraints: error.constraints,
            });
        }

        if (error.children && error.children.length > 0) {
            error.children.forEach((child: ClassValidatorError) =>
                processError(child, field),
            );
        }
    };

    errors.forEach((error) => processError(error));
    return validationErrors;
}
