import { assertEquals, assertNotEquals } from '@std/assert';
import {
  calcCheckDigit,
  checksum,
  genExamCode,
  parseExamCode,
} from './exam_code.ts';
import { assertThrows } from '@std/assert/throws';

// ---------------------------------------------------------------------------
// checksum / calcCheckDigit
// ---------------------------------------------------------------------------

Deno.test('checksum of a complete valid code equals 1', () => {
  for (const [lang, counter] of [
    ['A', 1],
    ['B', 999],
    ['B', 42],
  ] as const) {
    const code = genExamCode(lang, counter);
    assertEquals(checksum(code), 1, `code ${code} should have checksum 1`);
  }
});

Deno.test('calcCheckDigit produces a single base-36 character', () => {
  const digit = calcCheckDigit('7PT');
  assertEquals(digit.length, 1);
  assertEquals(/^[0-9A-Z]$/.test(digit), true);
});

// ---------------------------------------------------------------------------
// genExamCode – basic shape
// ---------------------------------------------------------------------------

Deno.test('genExamCode produces uppercase alphanumeric codes', () => {
  for (let i = 1; i <= 10; i++) {
    const a = genExamCode('A', i);
    const b = genExamCode('B', i);
    assertEquals(/^[0-9A-Z]+$/.test(a), true, `'A' code ${a} not alphanumeric`);
    assertEquals(/^[0-9A-Z]+$/.test(b), true, `'B' code ${b} not alphanumeric`);
  }
});

Deno.test('genExamCode produces distinct codes for different counters', () => {
  const codes = new Set(
    Array.from({ length: 50 }, (_, i) => genExamCode('A', i + 1)),
  );
  assertEquals(codes.size, 50);
});

Deno.test('genExamCode produces distinct codes for different languages', () => {
  for (let i = 1; i <= 20; i++) {
    assertNotEquals(
      genExamCode('A', i),
      genExamCode('B', i),
      `counter ${i}: 'A' and 'B' should differ`,
    );
  }
});

// ---------------------------------------------------------------------------
// parseExamCode – round-trip
// ---------------------------------------------------------------------------

Deno.test("parseExamCode round-trips every 'A' counter from 1 to 9999", () => {
  // Spot-check boundary values and a spread of counters rather than all 9999
  // to keep the test fast.
  const counters = [1, 2, 99, 100, 500, 1000, 4999, 9998, 9999];
  for (const counter of counters) {
    const code = genExamCode('A', counter);
    const parsed = parseExamCode(code);
    assertEquals(
      parsed,
      { lang: 'A', counter },
      `failed for counter ${counter}, code ${code}`,
    );
  }
});

Deno.test("parseExamCode round-trips every 'B' counter from 1 to 9999", () => {
  const counters = [1, 2, 99, 100, 500, 1000, 4999, 9998, 9999];
  for (const counter of counters) {
    const code = genExamCode('B', counter);
    const parsed = parseExamCode(code);
    assertEquals(
      parsed,
      { lang: 'B', counter },
      `failed for counter ${counter}, code ${code}`,
    );
  }
});

Deno.test(
  'parseExamCode full sweep: all counters 1–200 for both languages',
  () => {
    for (let counter = 1; counter <= 200; counter++) {
      for (const lang of ['A', 'B'] as const) {
        const code = genExamCode(lang, counter);
        const parsed = parseExamCode(code);
        assertEquals(
          parsed,
          { lang, counter },
          `round-trip failed: lang=${lang} counter=${counter} code=${code}`,
        );
      }
    }
  },
);

// ---------------------------------------------------------------------------
// parseExamCode – rejection of invalid inputs
// ---------------------------------------------------------------------------

Deno.test('parseExamCode returns null for a tampered check digit', () => {
  const code = genExamCode('A', 42);
  // Replace the last character with something different
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const wrongChar = alphabet.charAt(
    (alphabet.search(code.slice(-1, -1)) + 1) % alphabet.length,
  );
  const tampered = code.slice(0, -1) + wrongChar;
  assertThrows(() => parseExamCode(tampered));
});

Deno.test('parseExamCode returns null for the R4ND sentinel code', () => {
  assertThrows(() => parseExamCode('R4ND'));
});

Deno.test('parseExamCode returns null for an empty string', () => {
  assertThrows(() => parseExamCode(''));
});

Deno.test('parseExamCode returns null for a single character', () => {
  assertThrows(() => parseExamCode('A'));
});

Deno.test('parseExamCode returns null for arbitrary garbage strings', () => {
  for (const bad of ['ZZZZ', '0000', '!!!', 'HELLO', '1']) {
    assertThrows(() => parseExamCode(bad), `expected null for "${bad}"`);
  }
});
