import { Language } from '../types/exam.ts';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MODULUS = ALPHABET.length;

export class ExamCodeError extends Error {
  constructor(msg: string, opt?: ErrorOptions) {
    super(msg, opt);
    this.name = 'ExamCodeError';
    Object.setPrototypeOf(this, ExamCodeError.prototype);
  }
}
/**
 * Calculate checksum for a given identifier body.
 * A valid complete number should result in checksum === 1.
 */
export function checksum(value: string): number {
  let check = Math.floor(MODULUS / 2);

  for (const char of value) {
    const charIndex = ALPHABET.indexOf(char);
    if (charIndex === -1) continue;

    const val = check || MODULUS;
    check = (((val * 2) % (MODULUS + 1)) + charIndex) % MODULUS;
  }

  return check;
}

/**
 * Calculate the check digit that must be appended to a value
 * to make it a valid code according to the checksum algorithm.
 */
export function calcCheckDigit(value: string): string {
  const cs = checksum(value) || MODULUS;
  let index = 1 - ((cs * 2) % (MODULUS + 1));
  index = ((index % MODULUS) + MODULUS) % MODULUS;

  return ALPHABET[index];
}

/**
 * Generate a language-specific code.
 * - de => prefix "1"
 * - en => prefix "2"
 */
export function genExamCode(lang: Language, counter: number): string {
  const paddedCount = counter.toString().padStart(4, '0');
  const langPrefix = lang === 'DE' ? '1' : '2';

  const body = parseInt(`${langPrefix}${paddedCount}`, 10)
    .toString(36)
    .toUpperCase();

  const checkDigit = calcCheckDigit(body);
  return `${body}${checkDigit}`;
}

export type ParsedCode = {
  lang: Language;
  counter: number;
};

/**
 * Parses a code produced by {@link genExamCode} back into its language
 * and counter. Returns `null` when the code fails checksum validation or
 * does not match the expected structure (unknown language prefix, counter
 * outside the 1–9999 range).
 */
export function parseExamCode(code: string): ParsedCode {
  // Full code (body + check digit) must satisfy the checksum invariant.
  if (checksum(code) !== 1) {
    throw new ExamCodeError(`Invalid checksum: ${checksum(code)}`);
  }

  // Strip the trailing check digit to recover the base-36 body.
  const body = code.slice(0, -1);
  if (body.length === 0) throw new ExamCodeError(`Invalid body: ${body}`);

  // Decode the body back to its original decimal integer.
  const decimal = parseInt(body, 36);
  if (isNaN(decimal)) throw new ExamCodeError(`Invalid body: ${body}`);

  // Reconstruct the original 5-digit decimal string:
  // digit 0  – language prefix ("1" = DE, "2" = EN)
  // digits 1-4 – zero-padded counter
  const decStr = decimal.toString();
  if (decStr.length !== 5) {
    throw new ExamCodeError(`Invalid code length: ${decStr.length}`);
  }

  const langPrefix = decStr[0];
  const counter = parseInt(decStr.slice(1), 10);

  if (isNaN(counter) || counter < 1 || counter > 9999) {
    throw new ExamCodeError(`Invalid counter: ${counter}`);
  }

  if (langPrefix === '1') return { lang: 'DE', counter };
  if (langPrefix === '2') return { lang: 'EN', counter };
  throw new ExamCodeError(`Invalid language prefix: ${langPrefix}`);
}
