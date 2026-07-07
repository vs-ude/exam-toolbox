import { parse } from "@std/yaml";

import { flags } from "./args.ts";

interface AppConfig extends Record<string, unknown> {
  server: {
    publicUrl: string;
    port: number;
  };
  auth: {
    ldap: {
      url: string;
      bindDn: string;
      bindPassword: string;
      searchBase: string;
      searchFilter: string;
      groupDnBase: string;
      groups: {
        required: string;
        admin: string[];
        full: string[];
      };
    };
    jwt: {
      secret: string;
      lifetimeDays: number;
    };
  };
  db: {
    connString: string;
  };
  paths: {
    templateBase: string;
    cacheDir: string;
    jobsDir: string;
  };
  smtp: {
    host: string;
    port: number;
    from: string;
  };
  qr: {
    minStudents: number;
    minPages: number;
  };
}

export const DEFAULT_CONFIG = {
  server: { port: 3000, publicUrl: "http://localhost:3000" },
  auth: {
    ldap: {
      url: "ldap://ldap:389",
      bindDn: "cn=admin,dc=example,dc=org",
      bindPassword: "admin",
      searchBase: "dc=example,dc=org",
      searchFilter: "(|(uid=%s)(mail=%s))",
      groupDnBase: "cn=%s,ou=groups,dc=example,dc=org",
      groups: {
        required: "toolboxUsers",
        admin: ["admins"],
        full: ["teachers"],
      },
    },
    jwt: {
      secret: "change-me-in-production",
      lifetimeDays: 7,
    },
  },
  db: { connString: "mongodb://mongo:27017/examToolboxDB" },
  paths: {
    templateBase: "/app/template",
    cacheDir: "/app/cache",
    jobsDir: "/app/jobs",
  },
  smtp: { host: "mailcrab", port: 1025, from: "noreply@examtoolbox.local" },
  qr: { minStudents: 100, minPages: 26 },
};

export function loadConfig(
  loadedRaw: string,
  env: typeof Deno.env.get,
): AppConfig {
  const base: AppConfig = structuredClone(DEFAULT_CONFIG);

  let loaded: AppConfig | null | undefined;
  try {
    loaded = parse(loadedRaw) as AppConfig | null | undefined;
  } catch {
    throw new Error("Error parsing yaml.");
  }
  if (loaded != null) {
    mergeObjects(
      base,
      loaded,
    );
  }

  // Environment variable overrides (fine-grained, container-friendly)
  const config = {
    server: {
      port: env("SERVER_PORT") ? Number(env("SERVER_PORT")) : base.server.port,
      publicUrl: env("SERVER_PUBLIC_URL") ?? base.server.publicUrl,
    },
    auth: {
      ldap: {
        url: env("AUTH_LDAP_URL") ?? base.auth.ldap.url,
        bindDn: env("AUTH_LDAP_BIND_DN") ?? base.auth.ldap.bindDn,
        bindPassword: env("AUTH_LDAP_BIND_PASSWORD") ??
          base.auth.ldap.bindPassword,
        searchBase: env("AUTH_LDAP_SEARCH_BASE") ?? base.auth.ldap.searchBase,
        searchFilter: env("AUTH_LDAP_SEARCH_FILTER") ??
          base.auth.ldap.searchFilter,
        groupDnBase: env("AUTH_LDAP_GROUP_DN_BASE") ??
          base.auth.ldap.groupDnBase,
        groups: {
          required: env("AUTH_LDAP_GROUPS_REQUIRED") ??
            base.auth.ldap.groups.required,
          admin: env("AUTH_LDAP_GROUPS_ADMIN")
            ? env("AUTH_LDAP_GROUPS_ADMIN")!.split(",")
            : base.auth.ldap.groups.admin,
          full: env("AUTH_LDAP_GROUPS_FULL")
            ? env("AUTH_LDAP_GROUPS_FULL")!.split(",")
            : base.auth.ldap.groups.full,
        },
      },
      jwt: {
        secret: env("AUTH_JWT_SECRET") ?? base.auth.jwt.secret,
        lifetimeDays: env("AUTH_JWT_LIFETIME_DAYS")
          ? Number(env("AUTH_JWT_LIFETIME_DAYS"))
          : base.auth.jwt.lifetimeDays,
      },
    },
    db: {
      connString: env("DB_CONNSTRING") ?? base.db.connString,
    },
    paths: {
      templateBase: env("PATHS_TEMPLATE_BASE_PATH") ??
        base.paths.templateBase,
      cacheDir: env("PATHS_CACHE_DIR") ?? base.paths.cacheDir,
      jobsDir: env("PATHS_JOBS_DIR") ?? base.paths.jobsDir,
    },
    smtp: {
      host: env("SMTP_HOST") ?? base.smtp.host,
      port: env("SMTP_PORT") ? Number(env("SMTP_PORT")) : base.smtp.port,
      from: env("SMTP_FROM") ?? base.smtp.from,
    },
    qr: {
      minStudents: env("QR_MIN_STUDENTS")
        ? Number(env("QR_MIN_STUDENTS"))
        : base.qr.minStudents,
      minPages: env("QR_MIN_PAGES")
        ? Number(env("QR_MIN_PAGES"))
        : base.qr.minPages,
    },
  };
  return config;
}

let appConfig: AppConfig;
export function getConfig() {
  if (appConfig) {
    return appConfig;
  }

  if (!appConfig) {
    const configPath = Deno.env.get("CONFIG") || flags.conf ||
      "../../config.yaml";
    let raw = "";
    try {
      raw = Deno.readTextFileSync(new URL(configPath, import.meta.url));
    } catch {
      console.info("No config file found, using built-in defaults.");
    }
    const env = Deno.env.get.bind(Deno.env);
    appConfig = loadConfig(raw, env);
  }
  return appConfig;
}

/**
 * Recursively traverses the given base object and merges it into the input object.
 */
export function mergeObjects(
  base: Record<string, unknown>,
  input: Record<string, unknown>,
): Record<string, unknown> {
  return Object.keys(input).reduce(
    (acc: Record<string, unknown>, key: string) => {
      if (typeof input[key] === "object" && input[key] !== null) {
        acc[key] = mergeObjects(
          (base[key] ?? {}) as Record<string, unknown>,
          input[key] as Record<string, unknown>,
        );
      } else {
        acc[key] = input[key];
      }
      return acc;
    },
    base,
  );
}
