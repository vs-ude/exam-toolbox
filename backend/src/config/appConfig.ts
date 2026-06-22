import { parse } from "@std/yaml";

import { flags } from "./args.ts";

interface AppConfig {
  server: {
    domain: string;
    port: number;
  };
  auth: {
    requiredGroup: string;
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

function loadConfig(path: string = "../../config.yaml"): AppConfig {
  // Resolve config file path relative to this file's location (backend root)
  const configPath = new URL(path, import.meta.url);

  let base: AppConfig = {
    server: { port: 3000, domain: "localhost" },
    auth: { requiredGroup: "researcher" },
    db: { connString: "mongodb://mongo:27017/examToolboxDB" },
    paths: {
      templateBase: "/app/template",
      cacheDir: "/app/cache",
      jobsDir: "/app/jobs",
    },
    smtp: { host: "mailcrab", port: 1025, from: "noreply@examtoolbox.local" },
    qr: { minStudents: 100, minPages: 26 },
  };

  try {
    const raw = Deno.readTextFileSync(configPath);
    base = parse(raw) as AppConfig;
  } catch {
    console.info("No config file found, using built-in defaults.");
  }

  // Environment variable overrides (fine-grained, container-friendly)
  const env = Deno.env.get.bind(Deno.env);

  const config = {
    server: {
      port: env("SERVER_PORT") ? Number(env("SERVER_PORT")) : base.server.port,
      domain: env("SERVER_DOMAIN") ?? base.server.domain,
    },
    auth: {
      requiredGroup: env("AUTH_REQUIRED_GROUP") ?? base.auth.requiredGroup,
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

export const appConfig = loadConfig(flags.conf);
