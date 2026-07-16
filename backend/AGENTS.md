# Backend AGENTS

## Overview

The backend is a **Deno + Hono** REST API that drives the entire exam-toolbox server side: authentication, data persistence, PDF generation, mass-generation job orchestration, QR code services, and scan ingestion. It is served behind Caddy at the `/api/*` prefix.

## Technology stack

| Concern                 | Technology                                                             |
| ----------------------- | ---------------------------------------------------------------------- |
| Runtime                 | Deno                                                                   |
| HTTP framework          | Hono (`@hono/hono`)                                                    |
| OpenAPI / validation    | `@hono/zod-openapi` + Zod                                              |
| Database                | MongoDB via `@diister/mongodbee` (replica-set, majority write concern) |
| Authentication          | Direct OpenLDAP bind (`ldapts`) + Hono JWT (`HS384`)                   |
| Template rendering      | Eta (for LaTeX templates)                                              |
| LaTeX compilation       | `tectonic` (external binary)                                           |
| PDF merging / post-proc | Ghostscript (`gs`)                                                     |
| QR generation           | `qrencode` + ImageMagick (`magick`)                                    |
| QR scanning             | `zbarimg`                                                              |
| Email                   | SMTP via `nodemailer`-style send (MailCrab in dev)                     |
| ZIP archiving           | Deno standard streams                                                  |
| CI                      | GitLab CI (Deno unit + integration stages)                             |

## Directory layout

```
backend/
├── src/
│   ├── api/            # Hono router factories + OpenAPI route definitions
│   ├── config/         # AppConfig type, YAML loader, env overrides, path constants
│   ├── examManager/    # Handler implementations, generation pipeline, worker pool
│   ├── services/       # Shared services (DB, auth, LaTeX, PDF, QR, mail, ZIP, …)
│   │   └── db/         # MongoDB collection access modules
│   └── types/          # TypeScript types (context, handler, scan, user, shared/)
├── template/           # LaTeX / Eta template sources
│   ├── meta/           # Shared LaTeX macros (background, header/footer, localisation, …)
│   ├── pages/          # Per-page templates (title, info, concept, do-not-touch)
│   └── task_types/     # Per-task-type Eta templates
└── cache/qr/           # Pre-generated per-page QR code PNGs
```

## API structure (`src/api/`)

Routes are defined with `createRoute` (typed OpenAPI 3.1) and wired via `router.openapi()`. All handlers go through the `handle()` helper, which normalises `HandlerResult` into a Hono `Response` and maps `HttpError` to structured JSON error responses.

### Router factories

| Factory                        | Mount path   | Responsibility                                                        |
| ------------------------------ | ------------ | --------------------------------------------------------------------- |
| `configureBaseRouter()`        | `/api`       | Health check (`GET /health`)                                          |
| `configureAuthRouter()`        | `/api/auth`  | Login, logout, validate, list entities                                |
| `configureAdminRouter()`       | `/api/admin` | Config inspection, LDAP sync, user resolution (admin-only middleware) |
| `configureExamManagerRouter()` | `/api`       | All exam/task/tag/job/generation/upload/scan routes                   |

### API Routes

- Rely on the API documentation described in the main file (../AGENTS.md)

### Helper utilities (`src/api/helpers.ts`)

`handle(c, fn)` – wraps a handler function, catches `HttpError` for structured 4xx/5xx responses, and serialises `HandlerResult` as either JSON or a binary file download response.

## Configuration (`src/config/`)

`AppConfig` is loaded at startup from (in order of precedence):

1. `config.yaml` file path from `--conf` flag or `CONFIG` env var (defaults to `../../config.yaml`)
2. Individual environment variable overrides (e.g. `AUTH_LDAP_URL`, `AUTH_JWT_SECRET`, `DB_CONNSTRING`)

Built-in defaults (`DEFAULT_CONFIG`) allow the backend to start without any configuration file.

### Config sections

- Rely on the example config file (./config.yaml) to understand the structure.

Config is a singleton accessed via `getConfig()`.

## Services (`src/services/`)

### Authentication (`auth.ts`)

- `authenticate(username, password)` – sanitises input, binds as service account to find the user, verifies password with a re-bind, upserts the user and last-login in DB, signs and returns a JWT (`HS384`).
- `setupConfiguredGroups()` – validates that LDAP groups in config exist and writes them to the DB on startup.
- `syncLdapUsers()` – bulk-syncs all members of the required group; deactivates removed users.
- `scheduleLdapUserSync()` – runs `syncLdapUsers()` on a recurring 30-minute interval.
- `waitForLdapConnection(timeout)` – polls on startup until LDAP is reachable.
- `JwtPayload` – the shape stored in and decoded from tokens: `{ sub, email, name, groups, iat, exp }`.

### Database (`services/db/`)

`ExamToolboxDatabase` is a singleton (lazy-init via `getOrCreateDb()`) wrapping a MongoDB replica-set connection. It exposes methods from six domain modules:

MongoDB collections are defined using Zod schemas in `src/services/db/db.ts`. They correspond to types defined in `src/types/`.
Application-level validation (`parseExam`, `parseTask`) is done before writes; DB schemas are intentionally loose (`v.any()` for nested structures).

### LaTeX / generation (`latex.ts`, `pdf.ts`)

- `getEta(templateBase)` – returns a configured Eta instance pointing at the template directory.
- `escapeLatex(text)` – escapes special LaTeX characters in user-provided strings.
- `mergePdfs(paths, dest)` – shells out to Ghostscript to concatenate PDFs.

### QR codes (`qr.ts`, `qr_cache_worker.ts`)

- `generateExamQR(path, exam, language, code)` – generates the front-page QR PNG encoding `{v, s, d, l, c, t, r}` (course, semester, date, language, pageCount, points, examCode). Uses `qrencode` at level H, then strips alpha channel via `magick`.
- `generatePageQR(path, examCode, page)` – generates a per-page QR encoding `{p, r}`.
- `parseQR(path)` – decodes a QR from an image via `zbarimg`; returns `ExamQRData` or `ExamPageQRData`.
- `ensureQRCache(students, pages)` – checks if the on-disk cache is sufficient; if not, kicks off `preGeneratePageQRCache`.
- `preGeneratePageQRCache(students, pages)` – spawns `qr_cache_worker.ts` to bulk-generate PNG files; persists cache metadata to MongoDB.
- `getQRCacheStats(cacheDir)` – reads cache dimensions from the filesystem by inspecting filenames.

### Exam codes (`exam_code.ts`)

A checksum-validated, base-36 exam code system:

- `genExamCode(lang, counter)` – produces a 6-character code: language prefix (`1`=DE, `2`=EN) + 4-digit counter + Luhn-style check digit, encoded in base-36.
- `parseExamCode(code)` – decodes and validates; throws `ExamCodeError` on invalid checksum or structure.
- `checksum(value)` / `calcCheckDigit(value)` – raw checksum primitives.

### Email (`mail.ts`)

`sendEmail({ to, subject, html })` – sends transactional email via configured SMTP. In development, MailCrab is the target.

### Log parser (`log_parser.ts`)

`parseLogFileForSubtaskInfo(logContent)` – parses LaTeX `.log` files for `%% MARKER:` comments emitted by the generation pipeline to produce per-subtask info for the frontend.

### ZIP (`zip.ts`)

`createZipArchiveFromDirectory(sourceDir, destPath, patterns)` – packages matching files from a directory into a ZIP archive.

### Image pre-processing (`preprocess.ts`)

ImageMagick-based contrast enhancement for uploaded scan images, used before QR decoding to improve reliability.

## Exam Manager (`src/examManager/`)

### Handler modules

| File                 | Domain                                      |
| -------------------- | ------------------------------------------- |
| `examHandler.ts`     | Exam CRUD + single-exam PDF preview handler |
| `taskPoolHandler.ts` | Task pool CRUD handlers                     |
| `tagHandler.ts`      | Tag CRUD handlers                           |

All handlers receive `ExamManagerDeps` (DB, job map, worker pool, etc.) injected at startup.

### Generation pipeline (`generation.ts`)

Called per student within a worker:

1. `renderMetaExam(exam, workingDir)` – renders `exam.tex` via Eta template.
2. `renderMetaStudent(student, options, workingDir)` – renders `student.tex` with per-student codes, name, seat number, language.
3. `generateTasksLatex(exam, workingDir, dest, options)` – iterates task groups, dispatches to per-type renderer, writes `aufgaben.tex`. Validates page-break rules.
4. `compileExam(workingDir)` – shells out to `tectonic` to produce `exam.pdf` and `exam.log`.
5. `generateSolution(tempDir, exam)` – generates the solution PDF variant (same pipeline, `zeigeloesung: 'yes'`).

### Task renderer (`taskRenderer.ts`)

`getTaskRenderer()` returns a renderer with methods to render LaTeX templates with given data.

### Worker pool runtime (`runtime.ts`)

`createExamManagerRuntime(config, deps)` initialises the runtime:

- Spawns `poolSize = max(1, hardwareConcurrency - 1)` Deno `Worker` instances running `worker.ts`.
- Maintains `jobs: Map<string, ExamGenerationJob>` (in-memory, not persisted).
- `processQueue()` – dispatches the next `GenerationTask` to an idle worker.
- Workers post results back; the runtime tracks `progress.completed` / `progress.failed`.
- When all tasks for a job are done, `finalizeJob()` is called: merge PDFs → write attendance CSV → move solution/log files → create ZIP → send completion email.
- `scheduleDailyCleanup()` removes expired job entries from the in-memory map at 02:00.
- Memory usage is monitored every 5 seconds while workers are active.

### Worker (`worker.ts`)

Runs in a Deno `Worker` context. Receives `GenerationTask` messages (`student`, `solution`, `log`) and calls the generation pipeline. Posts `{ status: 'success' | 'error', jobId, type, … }` back to the main thread.

### Errors (`err.ts`)

Error types shared between multiple parts of the backend.

## Types (`src/types/`)

### Shared types (`types/shared/`) — source of truth

These are the **canonical versions** of types shared with the frontend. After editing, run `tools/copy_shared_types.sh` to sync to `frontend/src/app/types/shared/`.

| File       | Exports                                                             |
| ---------- | ------------------------------------------------------------------- |
| `base.ts`  | Basic types used in the other shared types.                         |
| `exam.ts`  | Definitions for the exam structure.                                 |
| `tasks.ts` | Definitions for task-related types.                                 |
| `tag.ts`   | Types concerning task tags.                                         |
| `stubs.ts` | Stubs of types to reduce data transmitted from backend to frontend. |

### Backend-only types

| File             | Exports                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `user.ts`        | User, groups and rights definitions used in the backend.         |
| `context.ts`     | `AppEnv` – Hono context variable type (`jwtPayload: JwtPayload`) |
| `handler.ts`     | `HandlerResult` union, `HttpError`                               |
| `scan.ts`        | Types used for exam scans (QR codes etc.)                        |
| `fileTracker.ts` | File tracking document shape                                     |

## Template system (`backend/template/`)

Eta templates are used for LaTeX file generation. The Eta instance is configured to use the `template/` directory as its root.

| Directory     | Contents                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `meta/`       | Shared LaTeX macros: background, commands, header/footer, localisation strings, logging, symbols |
| `pages/`      | Full-page LaTeX templates: `title`, `info`, `concept`, `do-not-touch`                            |
| `task_types/` | Per-task-type Eta partials rendered inline during `generateTasksLatex`                           |

The `exam.tex` root template includes all meta/page templates and the generated `aufgaben.tex` (tasks file). This is used to prime the cache during Docker builds.

## Startup sequence

1. Parse CLI flags and load config (`getConfig()`).
2. Wait for LDAP to become reachable (`waitForLdapConnection`).
3. Set up configured LDAP groups in the DB (`setupConfiguredGroups()`).
4. Schedule periodic LDAP user sync (`scheduleLdapUserSync()`).
5. Ensure QR cache has at least `config.qr.minStudents` × `config.qr.minPages` entries (`ensureQRCache`).
6. Create the `ExamManagerRuntime` (initialises worker pool).
7. Mount Hono routers, register JWT middleware for all protected routes.
8. Start the HTTP server on `config.server.port`.

## Conventions

- All handler functions return `HandlerResult` – never call `c.json()` or `c.body()` directly inside a handler. Throw `HttpError(status, message)` for expected error cases.
- Sensitive config fields (`bindPassword`, `jwt.secret`) are never logged or sent to clients. The admin `/config` route redacts them.
- Do not add new persistent state to the job map. `ExamGenerationJob` is ephemeral; the ZIP file on disk is the durable artefact.
- Always edit shared types in `src/types/shared/` (backend) and run the copy script. Never edit the frontend copy directly.
- Create specific error types if they are used multiple times. This helps transmit information from the backend to the frontend.
- Tests live next to the modules they test (e.g. `exam_code_test.ts`, `qr_test.ts`). Follow the same naming convention for new tests.
- Use `Deno.Command` for all external process calls; do not use `Deno.run` (deprecated).
