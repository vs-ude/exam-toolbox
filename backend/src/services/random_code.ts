const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MODULUS = ALPHABET.length;

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
 * Generate a language-specific random code.
 * - de => prefix "1"
 * - en => prefix "2"
 */
export function genRandomNumber(lang: "de" | "en", counter: number): string {
  const paddedCount = counter.toString().padStart(4, "0");
  const langPrefix = lang === "de" ? "1" : "2";

  const body = parseInt(`${langPrefix}${paddedCount}`, 10)
    .toString(36)
    .toUpperCase();

  const checkDigit = calcCheckDigit(body);
  return `${body}${checkDigit}`;
}
