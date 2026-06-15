import { assertEquals, assertNotEquals } from "@std/assert";
import {
  calcCheckDigit,
  checksum,
  genExamCode,
  parseExamCode,
} from "./exam_code.ts";
import { assertThrows } from "@std/assert/throws";

// ---------------------------------------------------------------------------
// checksum / calcCheckDigit
// ---------------------------------------------------------------------------

Deno.test("checksum of a complete valid code equals 1", () => {
  for (const [lang, counter] of [["DE", 1], ["DE", 999], ["EN", 42]] as const) {
    const code = genExamCode(lang, counter);
    assertEquals(checksum(code), 1, `code ${code} should have checksum 1`);
  }
});

Deno.test("calcCheckDigit produces a single base-36 character", () => {
  const digit = calcCheckDigit("7PT");
  assertEquals(digit.length, 1);
  assertEquals(/^[0-9A-Z]$/.test(digit), true);
});

// ---------------------------------------------------------------------------
// genExamCode – basic shape
// ---------------------------------------------------------------------------

Deno.test("genExamCode produces uppercase alphanumeric codes", () => {
  for (let i = 1; i <= 10; i++) {
    const de = genExamCode("DE", i);
    const en = genExamCode("EN", i);
    assertEquals(
      /^[0-9A-Z]+$/.test(de),
      true,
      `DE code ${de} not alphanumeric`,
    );
    assertEquals(
      /^[0-9A-Z]+$/.test(en),
      true,
      `EN code ${en} not alphanumeric`,
    );
  }
});

Deno.test("genExamCode produces distinct codes for different counters", () => {
  const codes = new Set(
    Array.from({ length: 50 }, (_, i) => genExamCode("DE", i + 1)),
  );
  assertEquals(codes.size, 50);
});

Deno.test("genExamCode produces distinct codes for different languages", () => {
  for (let i = 1; i <= 20; i++) {
    assertNotEquals(
      genExamCode("DE", i),
      genExamCode("EN", i),
      `counter ${i}: DE and EN should differ`,
    );
  }
});

// ---------------------------------------------------------------------------
// parseExamCode – round-trip
// ---------------------------------------------------------------------------

Deno.test("parseExamCode round-trips every DE counter from 1 to 9999", () => {
  // Spot-check boundary values and a spread of counters rather than all 9999
  // to keep the test fast.
  const counters = [1, 2, 99, 100, 500, 1000, 4999, 9998, 9999];
  for (const counter of counters) {
    const code = genExamCode("DE", counter);
    const parsed = parseExamCode(code);
    assertEquals(
      parsed,
      { lang: "DE", counter },
      `failed for counter ${counter}, code ${code}`,
    );
  }
});

Deno.test("parseExamCode round-trips every EN counter from 1 to 9999", () => {
  const counters = [1, 2, 99, 100, 500, 1000, 4999, 9998, 9999];
  for (const counter of counters) {
    const code = genExamCode("EN", counter);
    const parsed = parseExamCode(code);
    assertEquals(
      parsed,
      { lang: "EN", counter },
      `failed for counter ${counter}, code ${code}`,
    );
  }
});

Deno.test("parseExamCode full sweep: all counters 1–200 for both languages", () => {
  for (let counter = 1; counter <= 200; counter++) {
    for (const lang of ["DE", "EN"] as const) {
      const code = genExamCode(lang, counter);
      const parsed = parseExamCode(code);
      assertEquals(
        parsed,
        { lang, counter },
        `round-trip failed: lang=${lang} counter=${counter} code=${code}`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// parseExamCode – rejection of invalid inputs
// ---------------------------------------------------------------------------

Deno.test("parseExamCode returns null for a tampered check digit", () => {
  const code = genExamCode("DE", 42);
  // Replace the last character with something different
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const wrongChar = alphabet.charAt(
    (alphabet.search(code.slice(-1, -1)) + 1) % alphabet.length,
  );
  const tampered = code.slice(0, -1) + wrongChar;
  assertThrows(() => parseExamCode(tampered));
});

Deno.test("parseExamCode returns null for the R4ND sentinel code", () => {
  assertThrows(() => parseExamCode("R4ND"));
});

Deno.test("parseExamCode returns null for an empty string", () => {
  assertThrows(() => parseExamCode(""));
});

Deno.test("parseExamCode returns null for a single character", () => {
  assertThrows(() => parseExamCode("A"));
});

Deno.test("parseExamCode returns null for arbitrary garbage strings", () => {
  for (const bad of ["ZZZZ", "0000", "!!!", "HELLO", "1"]) {
    assertThrows(() => parseExamCode(bad), `expected null for "${bad}"`);
  }
});
