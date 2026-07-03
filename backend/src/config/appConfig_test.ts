import { assertEquals, assertThrows } from "@std/assert";
import { DEFAULT_CONFIG, loadConfig, mergeObjects } from "./appConfig.ts";

// ---------------------------------------------------------------------------
// mergeObjects
// ---------------------------------------------------------------------------

Deno.test("mergeObjects: scalar values from input overwrite base", () => {
  const base = { a: 1, b: "hello" };
  const result = mergeObjects(base, { a: 99 });
  assertEquals(result.a, 99);
});

Deno.test("mergeObjects: keys present only in base are preserved", () => {
  const base = { a: 1, b: "hello" };
  const result = mergeObjects(base, { a: 2 });
  assertEquals(result.b, "hello");
});

Deno.test("mergeObjects: nested objects are merged recursively", () => {
  const base = { server: { port: 3000, domain: "localhost", https: false } };
  const result = mergeObjects(base, { server: { port: 9090 } });
  assertEquals((result.server as Record<string, unknown>).port, 9090);
  assertEquals((result.server as Record<string, unknown>).domain, "localhost");
});

Deno.test("mergeObjects: deeply nested scalars are overwritten", () => {
  const base = { auth: { ldap: { url: "ldap://old:389", bindDn: "cn=old" } } };
  const result = mergeObjects(base, {
    auth: { ldap: { url: "ldap://new:389" } },
  });
  const ldap = (result.auth as Record<string, unknown>)
    .ldap as Record<string, unknown>;
  assertEquals(ldap.url, "ldap://new:389");
  assertEquals(ldap.bindDn, "cn=old");
});

Deno.test("mergeObjects: null input values overwrite base scalars", () => {
  const base = { a: "value" };
  const result = mergeObjects(base, { a: null });
  assertEquals(result.a, null);
});

Deno.test("mergeObjects: empty input leaves base unchanged", () => {
  const base = { x: 42, y: "hi" };
  const result = mergeObjects(base, {});
  assertEquals(result.x, 42);
  assertEquals(result.y, "hi");
});

// ---------------------------------------------------------------------------
// loadConfig – defaults (empty YAML, no env vars)
// ---------------------------------------------------------------------------

const noEnv = (_key: string) => undefined;

Deno.test("loadConfig: empty YAML returns built-in defaults", () => {
  const cfg = loadConfig("", noEnv);
  assertEquals(cfg.server.port, DEFAULT_CONFIG.server.port);
  assertEquals(cfg.server.domain, DEFAULT_CONFIG.server.domain);
  assertEquals(cfg.server.https, DEFAULT_CONFIG.server.https);
  assertEquals(cfg.auth.ldap.url, DEFAULT_CONFIG.auth.ldap.url);
  assertEquals(cfg.auth.jwt.lifetimeDays, DEFAULT_CONFIG.auth.jwt.lifetimeDays);
  assertEquals(cfg.db.connString, DEFAULT_CONFIG.db.connString);
  assertEquals(cfg.smtp.port, DEFAULT_CONFIG.smtp.port);
  assertEquals(cfg.qr.minStudents, DEFAULT_CONFIG.qr.minStudents);
  assertEquals(cfg.qr.minPages, DEFAULT_CONFIG.qr.minPages);
});

// ---------------------------------------------------------------------------
// loadConfig – YAML overrides defaults
// ---------------------------------------------------------------------------

Deno.test("loadConfig: YAML scalar values override defaults", () => {
  const yaml = `
server:
  port: 8080
  domain: exam.example.com
`;
  const cfg = loadConfig(yaml, noEnv);
  assertEquals(cfg.server.port, 8080);
  assertEquals(cfg.server.domain, "exam.example.com");
  // untouched default
  assertEquals(cfg.server.https, DEFAULT_CONFIG.server.https);
});

Deno.test("loadConfig: YAML nested values override defaults", () => {
  const yaml = `
auth:
  jwt:
    secret: super-secret
    lifetimeDays: 30
`;
  const cfg = loadConfig(yaml, noEnv);
  assertEquals(cfg.auth.jwt.secret, "super-secret");
  assertEquals(cfg.auth.jwt.lifetimeDays, 30);
  // untouched nested default
  assertEquals(cfg.auth.ldap.url, "ldap://ldap:389");
});

// ---------------------------------------------------------------------------
// loadConfig – environment variable overrides
// ---------------------------------------------------------------------------

Deno.test("loadConfig: SERVER_PORT env var overrides YAML/default", () => {
  const cfg = loadConfig(
    "",
    (key) => key === "SERVER_PORT" ? "9000" : undefined,
  );
  assertEquals(cfg.server.port, 9000);
});

Deno.test("loadConfig: SERVER_HTTPS env var parses 'true' as boolean true", () => {
  const cfg = loadConfig(
    "",
    (key) => key === "SERVER_HTTPS" ? "true" : undefined,
  );
  assertEquals(cfg.server.https, true);
});

Deno.test("loadConfig: SERVER_HTTPS env var parses non-'true' string as false", () => {
  const cfg = loadConfig(
    "",
    (key) => key === "SERVER_HTTPS" ? "false" : undefined,
  );
  assertEquals(cfg.server.https, false);
});

Deno.test("loadConfig: AUTH_LDAP_GROUPS_ADMIN splits comma-separated list", () => {
  const cfg = loadConfig(
    "",
    (key) =>
      key === "AUTH_LDAP_GROUPS_ADMIN" ? "admins,superusers,ops" : undefined,
  );
  assertEquals(cfg.auth.ldap.groups.admin, ["admins", "superusers", "ops"]);
});

Deno.test("loadConfig: AUTH_LDAP_GROUPS_FULL splits comma-separated list", () => {
  const cfg = loadConfig(
    "",
    (key) => key === "AUTH_LDAP_GROUPS_FULL" ? "teachers,staff" : undefined,
  );
  assertEquals(cfg.auth.ldap.groups.full, ["teachers", "staff"]);
});

Deno.test("loadConfig: DB_CONNSTRING env var overrides default", () => {
  const cfg = loadConfig(
    "",
    (key) =>
      key === "DB_CONNSTRING" ? "mongodb://myhost:27017/mydb" : undefined,
  );
  assertEquals(cfg.db.connString, "mongodb://myhost:27017/mydb");
});

Deno.test("loadConfig: SMTP_PORT env var is parsed as number", () => {
  const cfg = loadConfig("", (key) => key === "SMTP_PORT" ? "587" : undefined);
  assertEquals(cfg.smtp.port, 587);
});

Deno.test("loadConfig: QR_MIN_STUDENTS and QR_MIN_PAGES env vars are parsed as numbers", () => {
  const cfg = loadConfig("", (key) => {
    if (key === "QR_MIN_STUDENTS") return "50";
    if (key === "QR_MIN_PAGES") return "10";
    return undefined;
  });
  assertEquals(cfg.qr.minStudents, 50);
  assertEquals(cfg.qr.minPages, 10);
});

Deno.test("loadConfig: env var overrides take precedence over YAML values", () => {
  const yaml = `
server:
  port: 8080
`;
  const cfg = loadConfig(
    yaml,
    (key) => key === "SERVER_PORT" ? "9999" : undefined,
  );
  assertEquals(cfg.server.port, 9999);
});

// ---------------------------------------------------------------------------
// loadConfig – error handling
// ---------------------------------------------------------------------------

Deno.test("loadConfig: invalid YAML throws a descriptive error", () => {
  assertThrows(
    () => loadConfig("bad: [unclosed", noEnv),
    Error,
    "Error parsing yaml.",
  );
});
