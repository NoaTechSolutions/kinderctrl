/**
 * US phone formatting helpers.
 *
 * Display format: "(555) 123-4567"
 * Transport format (sent to backend): 10 raw digits, e.g. "5551234567".
 *
 * The backend's regex `\+?1?\d{10,14}` accepts the raw digits as-is.
 */

/**
 * Strip all non-digit characters. If the value starts with the US
 * country code "1" and totals 11 digits, drop the leading 1 so we
 * always end up with 10 digits for a well-formed US number.
 *
 * Use this right before submitting to the backend.
 */
export function parsePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Format any input into the US display pattern. Caps the result at 10
 * digits — extra typed/pasted digits are ignored. Handles partial input
 * gracefully for live formatting while the user types.
 */
export function formatPhoneUS(value: string): string {
  const digits = parsePhoneDigits(value).slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
