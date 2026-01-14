/**
 * CSV Sanitizer Utility
 * Prevents CSV injection (formula injection) attacks
 *
 * When CSV files are opened in Excel/LibreOffice, cells starting with
 * certain characters are interpreted as formulas. This can lead to:
 * - Remote code execution via DDE (Dynamic Data Exchange)
 * - Data exfiltration via HYPERLINK formulas
 * - System command execution
 *
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */

/**
 * Characters that trigger formula interpretation in spreadsheet applications
 * - = : Standard formula prefix
 * - + : Alternative formula prefix (Excel)
 * - - : Alternative formula prefix (Excel)
 * - @ : At-sign can trigger functions in some spreadsheets
 * - \t : Tab character can break cell boundaries
 * - \r : Carriage return can break cell boundaries
 */
const FORMULA_TRIGGER_CHARS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitize a single CSV cell value to prevent formula injection
 * Prefixes dangerous characters with a single quote to force text interpretation
 *
 * @param value - The value to sanitize
 * @returns Sanitized value safe for CSV export
 */
export function sanitizeCsvValue(value: string | null | undefined): string {
    if (value === null || value === undefined) {
        return '';
    }

    const stringValue = String(value);

    if (stringValue.length === 0) {
        return '';
    }

    const firstChar = stringValue.charAt(0);

    // Prefix with single quote if starts with formula trigger character
    if (FORMULA_TRIGGER_CHARS.includes(firstChar)) {
        return `'${stringValue}`;
    }

    return stringValue;
}

/**
 * Escape a CSV cell value for proper CSV formatting
 * Handles values containing commas, quotes, or newlines
 *
 * @param value - The value to escape
 * @returns Properly escaped CSV value
 */
export function escapeCsvField(value: string): string {
    // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Sanitize and escape a CSV cell value
 * Combines injection prevention with proper CSV formatting
 *
 * @param value - The value to process
 * @returns Safe, properly formatted CSV value
 */
export function sanitizeAndEscapeCsvField(
    value: string | null | undefined,
): string {
    const sanitized = sanitizeCsvValue(value);
    return escapeCsvField(sanitized);
}
