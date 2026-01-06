/**
 * Sensitive Data Masker
 * Masks sensitive fields in audit logs to comply with SOC2 Type II requirements
 *
 * Masked Categories:
 * - Authentication: password, token, refreshToken, accessToken, apiKey, secret
 * - Personal Identifiable Information (PII): ssn, nationalId, passport, drivingLicense
 * - Financial: creditCard, bankAccount, salary, accountNumber, routingNumber
 * - Security: ipAddress (partial), sessionId (partial)
 */

interface MaskOptions {
    /**
     * Fields to completely mask (replaced with '***MASKED***')
     */
    maskFields?: string[];

    /**
     * Fields to partially mask (show first/last characters)
     */
    partialMaskFields?: string[];

    /**
     * Number of characters to show at start/end for partial masking
     */
    partialMaskChars?: number;
}

export class SensitiveDataMasker {
    /**
     * Default fields to completely mask
     */
    private static readonly DEFAULT_MASK_FIELDS = [
        // Authentication
        'password',
        'oldPassword',
        'newPassword',
        'currentPassword',
        'confirmPassword',
        'token',
        'refreshToken',
        'accessToken',
        'idToken',
        'apiKey',
        'secret',
        'secretKey',
        'privateKey',
        'encryptionKey',

        // PII
        'ssn',
        'socialSecurityNumber',
        'nationalId',
        'nationalIdNumber',
        'passport',
        'passportNumber',
        'drivingLicense',
        'driverLicense',
        'taxId',

        // Financial
        'creditCard',
        'creditCardNumber',
        'cvv',
        'cvc',
        'bankAccount',
        'bankAccountNumber',
        'accountNumber',
        'routingNumber',
        'iban',
        'swift',
        'salary',
        'wage',
        'compensation',
    ];

    /**
     * Default fields to partially mask (show first 2 and last 2 characters)
     */
    private static readonly DEFAULT_PARTIAL_MASK_FIELDS = [
        'email',
        'phone',
        'phoneNumber',
        'mobile',
        'ipAddress',
        'sessionId',
    ];

    /**
     * Mask sensitive data in an object recursively
     * @param data - The data object to mask
     * @param options - Masking options
     * @returns Masked copy of the data
     */
    static maskSensitiveData<T = any>(data: T, options?: MaskOptions): T {
        if (data === null || data === undefined) {
            return data;
        }

        // Primitive types - return as-is
        if (typeof data !== 'object') {
            return data;
        }

        // Arrays - recursively mask each element
        if (Array.isArray(data)) {
            return data.map(item => this.maskSensitiveData(item, options)) as any;
        }

        // Objects - create masked copy
        const masked: any = {};
        const maskFields = [
            ...this.DEFAULT_MASK_FIELDS,
            ...(options?.maskFields || []),
        ];
        const partialMaskFields = [
            ...this.DEFAULT_PARTIAL_MASK_FIELDS,
            ...(options?.partialMaskFields || []),
        ];

        for (const [key, value] of Object.entries(data)) {
            // Check if field should be completely masked
            if (this.shouldMaskField(key, maskFields)) {
                masked[key] = '***MASKED***';
                continue;
            }

            // Check if field should be partially masked
            if (this.shouldMaskField(key, partialMaskFields)) {
                masked[key] = this.partialMask(
                    value as string,
                    options?.partialMaskChars || 2,
                );
                continue;
            }

            // Recursively mask nested objects/arrays
            if (typeof value === 'object' && value !== null) {
                masked[key] = this.maskSensitiveData(value, options);
            } else {
                masked[key] = value;
            }
        }

        return masked;
    }

    /**
     * Check if a field name matches any sensitive field pattern
     * @param fieldName - Field name to check
     * @param patterns - Array of field patterns to match against
     * @returns True if field should be masked
     */
    private static shouldMaskField(
        fieldName: string,
        patterns: string[],
    ): boolean {
        const lowerFieldName = fieldName.toLowerCase();
        return patterns.some(pattern =>
            lowerFieldName.includes(pattern.toLowerCase()),
        );
    }

    /**
     * Partially mask a string value (show first N and last N characters)
     * @param value - Value to mask
     * @param showChars - Number of characters to show at start/end
     * @returns Partially masked string
     */
    private static partialMask(value: any, showChars: number): string {
        if (typeof value !== 'string' || !value) {
            return '***MASKED***';
        }

        // If value is too short, completely mask it
        if (value.length <= showChars * 2) {
            return '***MASKED***';
        }

        const start = value.substring(0, showChars);
        const end = value.substring(value.length - showChars);
        const maskedLength = value.length - showChars * 2;

        return `${start}${'*'.repeat(maskedLength)}${end}`;
    }

    /**
     * Mask authentication-related data (passwords, tokens, etc.)
     * @param data - Authentication data to mask
     * @returns Masked copy
     */
    static maskAuthData<T = any>(data: T): T {
        return this.maskSensitiveData(data, {
            maskFields: [
                'password',
                'oldPassword',
                'newPassword',
                'token',
                'refreshToken',
                'accessToken',
            ],
        });
    }

    /**
     * Mask PII data (social security numbers, IDs, etc.)
     * @param data - PII data to mask
     * @returns Masked copy
     */
    static maskPIIData<T = any>(data: T): T {
        return this.maskSensitiveData(data, {
            maskFields: [
                'ssn',
                'nationalId',
                'passport',
                'drivingLicense',
                'taxId',
            ],
            partialMaskFields: ['email', 'phone', 'phoneNumber'],
        });
    }

    /**
     * Mask financial data (credit cards, bank accounts, salary, etc.)
     * @param data - Financial data to mask
     * @returns Masked copy
     */
    static maskFinancialData<T = any>(data: T): T {
        return this.maskSensitiveData(data, {
            maskFields: [
                'creditCard',
                'cvv',
                'bankAccount',
                'accountNumber',
                'salary',
                'wage',
            ],
        });
    }
}
