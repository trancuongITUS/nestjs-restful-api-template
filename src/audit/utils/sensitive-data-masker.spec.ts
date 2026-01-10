import { SensitiveDataMasker } from './sensitive-data-masker';

describe('SensitiveDataMasker', () => {
    describe('maskSensitiveData', () => {
        it('should mask password fields completely', () => {
            const data = {
                username: 'john.doe',
                password: 'SuperSecret123!',
                email: 'john@example.com',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data);

            expect(masked.username).toBe('john.doe');
            expect(masked.password).toBe('***MASKED***');
            expect(masked.email).toMatch(/jo\*+om/); // Partially masked email
        });

        it('should mask authentication tokens', () => {
            const data = {
                accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refreshToken: 'refresh_abc123xyz789',
                apiKey: 'sk-proj-1234567890abcdef',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data);

            expect(masked.accessToken).toBe('***MASKED***');
            expect(masked.refreshToken).toBe('***MASKED***');
            expect(masked.apiKey).toBe('***MASKED***');
        });

        it('should mask PII fields', () => {
            const data = {
                name: 'John Doe',
                ssn: '123-45-6789',
                nationalId: 'ID123456789',
                passport: 'P1234567',
                drivingLicense: 'DL12345678',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data);

            expect(masked.name).toBe('John Doe');
            expect(masked.ssn).toBe('***MASKED***');
            expect(masked.nationalId).toBe('***MASKED***');
            expect(masked.passport).toBe('***MASKED***');
            expect(masked.drivingLicense).toBe('***MASKED***');
        });

        it('should mask financial data', () => {
            const data = {
                salary: 75000,
                creditCard: '4111-1111-1111-1111',
                cvv: '123',
                bankAccount: '1234567890',
                routingNumber: '021000021',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data);

            expect(masked.salary).toBe('***MASKED***');
            expect(masked.creditCard).toBe('***MASKED***');
            expect(masked.cvv).toBe('***MASKED***');
            expect(masked.bankAccount).toBe('***MASKED***');
            expect(masked.routingNumber).toBe('***MASKED***');
        });

        it('should partially mask email and phone', () => {
            const data = {
                email: 'john.doe@example.com',
                phone: '+1234567890',
                phoneNumber: '555-123-4567',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data);

            // Email: show first 2 and last 2 characters
            expect(masked.email).toMatch(/^jo\*+om$/);
            // Phone: show first 2 and last 2 characters
            expect(masked.phone).toMatch(/^\+1\*+90$/);
            expect(masked.phoneNumber).toMatch(/^55\*+67$/);
        });

        it('should partially mask IP address and session ID', () => {
            const data = {
                ipAddress: '192.168.1.100',
                sessionId: 'sess_abc123xyz789',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data);

            expect(masked.ipAddress).toMatch(/^19\*+00$/);
            expect(masked.sessionId).toMatch(/^se\*+89$/);
        });

        it('should handle nested objects', () => {
            const data = {
                user: {
                    username: 'john.doe',
                    password: 'secret123',
                    profile: {
                        email: 'john@example.com',
                        ssn: '123-45-6789',
                    },
                },
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data);

            expect(masked.user.username).toBe('john.doe');
            expect(masked.user.password).toBe('***MASKED***');
            expect(masked.user.profile.email).toMatch(/jo\*+om/);
            expect(masked.user.profile.ssn).toBe('***MASKED***');
        });

        it('should handle arrays of objects', () => {
            const data = {
                users: [
                    { username: 'user1', password: 'pass1' },
                    { username: 'user2', password: 'pass2' },
                ],
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data);

            expect(masked.users[0].username).toBe('user1');
            expect(masked.users[0].password).toBe('***MASKED***');
            expect(masked.users[1].username).toBe('user2');
            expect(masked.users[1].password).toBe('***MASKED***');
        });

        it('should handle null and undefined values', () => {
            const data = {
                username: 'john.doe',
                password: null,
                token: undefined,
                email: 'john@example.com',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data);

            expect(masked.username).toBe('john.doe');
            expect(masked.password).toBe('***MASKED***');
            expect(masked.token).toBe('***MASKED***');
        });

        it('should handle primitive types', () => {
            expect(SensitiveDataMasker.maskSensitiveData('string')).toBe(
                'string',
            );
            expect(SensitiveDataMasker.maskSensitiveData(123)).toBe(123);
            expect(SensitiveDataMasker.maskSensitiveData(true)).toBe(true);
            expect(SensitiveDataMasker.maskSensitiveData(null)).toBe(null);
            expect(SensitiveDataMasker.maskSensitiveData(undefined)).toBe(
                undefined,
            );
        });

        it('should respect custom mask fields', () => {
            const data = {
                username: 'john.doe',
                customSecret: 'my-secret-value',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data, {
                maskFields: ['customSecret'],
            });

            expect(masked.username).toBe('john.doe');
            expect(masked.customSecret).toBe('***MASKED***');
        });

        it('should respect custom partial mask fields', () => {
            const data = {
                username: 'john.doe',
                customId: 'ID123456789',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data, {
                partialMaskFields: ['customId'],
            });

            expect(masked.username).toBe('john.doe');
            expect(masked.customId).toMatch(/^ID\*+89$/);
        });

        it('should handle different partial mask character counts', () => {
            const data = {
                email: 'john.doe@example.com',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data, {
                partialMaskChars: 4,
            });

            // Show first 4 and last 4 characters
            expect(masked.email).toMatch(/^john\*+.com$/);
        });

        it('should completely mask values shorter than partial mask threshold', () => {
            const data = {
                email: 'ab',
                phone: '123',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data);

            expect(masked.email).toBe('***MASKED***');
            expect(masked.phone).toBe('***MASKED***');
        });
    });

    describe('maskAuthData', () => {
        it('should mask authentication-specific fields', () => {
            const data = {
                username: 'john.doe',
                password: 'secret123',
                oldPassword: 'oldsecret',
                newPassword: 'newsecret',
                token: 'jwt-token-123',
                refreshToken: 'refresh-token-456',
                accessToken: 'access-token-789',
                email: 'john@example.com',
            };

            const masked = SensitiveDataMasker.maskAuthData(data);

            expect(masked.username).toBe('john.doe');
            expect(masked.password).toBe('***MASKED***');
            expect(masked.oldPassword).toBe('***MASKED***');
            expect(masked.newPassword).toBe('***MASKED***');
            expect(masked.token).toBe('***MASKED***');
            expect(masked.refreshToken).toBe('***MASKED***');
            expect(masked.accessToken).toBe('***MASKED***');
            expect(masked.email).toMatch(/jo\*+om/); // Partially masked
        });
    });

    describe('maskPIIData', () => {
        it('should mask PII-specific fields', () => {
            const data = {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                phoneNumber: '555-123-4567',
                ssn: '123-45-6789',
                nationalId: 'ID123456789',
                passport: 'P1234567',
                drivingLicense: 'DL12345678',
                taxId: 'TAX123456',
            };

            const masked = SensitiveDataMasker.maskPIIData(data);

            expect(masked.name).toBe('John Doe');
            expect(masked.email).toMatch(/jo\*+om/);
            expect(masked.phone).toMatch(/^\+1\*+90$/);
            expect(masked.phoneNumber).toMatch(/^55\*+67$/);
            expect(masked.ssn).toBe('***MASKED***');
            expect(masked.nationalId).toBe('***MASKED***');
            expect(masked.passport).toBe('***MASKED***');
            expect(masked.drivingLicense).toBe('***MASKED***');
            expect(masked.taxId).toBe('***MASKED***');
        });
    });

    describe('maskFinancialData', () => {
        it('should mask financial-specific fields', () => {
            const data = {
                name: 'John Doe',
                salary: 75000,
                wage: 25.5,
                creditCard: '4111-1111-1111-1111',
                cvv: '123',
                bankAccount: '1234567890',
                accountNumber: '9876543210',
            };

            const masked = SensitiveDataMasker.maskFinancialData(data);

            expect(masked.name).toBe('John Doe');
            expect(masked.salary).toBe('***MASKED***');
            expect(masked.wage).toBe('***MASKED***');
            expect(masked.creditCard).toBe('***MASKED***');
            expect(masked.cvv).toBe('***MASKED***');
            expect(masked.bankAccount).toBe('***MASKED***');
            expect(masked.accountNumber).toBe('***MASKED***');
        });
    });

    describe('case-insensitive field matching', () => {
        it('should mask fields regardless of casing', () => {
            const data = {
                Password: 'secret1',
                PASSWORD: 'secret2',
                PaSsWoRd: 'secret3',
                AccessToken: 'token1',
                accesstoken: 'token2',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data);

            expect(masked.Password).toBe('***MASKED***');
            expect(masked.PASSWORD).toBe('***MASKED***');
            expect(masked.PaSsWoRd).toBe('***MASKED***');
            expect(masked.AccessToken).toBe('***MASKED***');
            expect(masked.accesstoken).toBe('***MASKED***');
        });
    });

    describe('substring field matching', () => {
        it('should mask fields containing sensitive substrings', () => {
            const data = {
                userPassword: 'secret1',
                confirmPassword: 'secret2',
                newPasswordHash: 'secret3',
                apiKeyValue: 'key123',
                secretConfig: 'config456',
            };

            const masked = SensitiveDataMasker.maskSensitiveData(data);

            expect(masked.userPassword).toBe('***MASKED***');
            expect(masked.confirmPassword).toBe('***MASKED***');
            expect(masked.newPasswordHash).toBe('***MASKED***');
            expect(masked.apiKeyValue).toBe('***MASKED***');
            expect(masked.secretConfig).toBe('***MASKED***');
        });
    });
});
