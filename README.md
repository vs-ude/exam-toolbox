# exam-toolbox

An internal web application for higher-education staff to author exam templates, preview rendered PDFs, and mass-generate personalised exam PDFs for printing.

## Features

- **Exam builder** – create and manage bilingual (DE/EN) exam definitions in a browser UI
- **Task pool** – reusable question bank with tagging and search
- **PDF preview** – render a single exam to PDF without leaving the editor
- **File uploads** – attach images for picture-based tasks
- **Mass generation** – upload an Excel participant list and generate per-student exam PDFs in parallel, with a downloadable ZIP artifact and an attendance CSV
- **Email notification** – notifies the requester when a bulk job finishes
- **QR codes** – embeds a front-page exam QR code (encoding course, semester, date, language, page count, points, and a random code) and per-page QR codes with a pre-generated cache
- **QR scanning** – decodes QR codes from uploaded exam images; uses ImageMagick contrast pre-processing to improve scan reliability
- **Exam codes** – generates and validates exam codes with a checksum algorithm
- **Access control** – all routes protected by JWT session tokens. Authenticates directly against LDAP; only members of the configured `toolboxUsers` group may log in, with granular roles for `teachers` and `admins`.
- **API specifications** – dynamically generated OpenAPI 3.1 schemas (accessible at `/api/doc` in development) alongside a fully configured Bruno API client collection.

## Technology stack

| Layer             | Technology                                                   |
| ----------------- | ------------------------------------------------------------ |
| Frontend          | Angular 18, Angular Material, RxJS, Prettier                 |
| Backend           | Deno, Hono, `@hono/zod-openapi`                              |
| Document pipeline | LaTeX (tectonic), Ghostscript, ZIP archiving, Eta templating |
| Image processing  | ImageMagick (contrast adjustment for QR scanning)            |
| Reverse proxy     | Caddy                                                        |
| Authentication    | Native Hono JWT & OpenLDAP client integration                |
| Database          | MongoDB 6                                                    |
| Directory         | OpenLDAP                                                     |
| Dev mail sandbox  | MailCrab                                                     |
| Periodic cleanup  | Deno cron container                                          |
| Orchestration     | Docker Compose                                               |

## Repository layout

```
exam-toolbox/
├── backend/              # Deno/Hono API, LaTeX generation pipeline, worker pool
│   ├── src/
│   │   ├── api/          # Hono router configuration with OpenAPI/Zod specs
│   │   ├── config/       # Runtime configuration constants
│   │   ├── examManager/  # Exam/task/tag/generation handlers
│   │   ├── services/     # DB, QR, native auth (LDAP bind & JWT generation)
│   │   └── types/        # Shared TypeScript types
│   └── template/
│       ├── meta/         # Shared LaTeX macros (background, header/footer, symbols, …)
│       ├── pages/        # Individual page templates (title, info, concept, …)
│       └── task_types/   # Per-task-type Eta templates
├── caddy/                # Caddy reverse proxy + public static asset host
├── docs/                 # OpenAPI specifications and Bruno API client collection
├── frontend/             # Angular 18 application (hot-reloaded in dev container via ng serve)
├── ldap/                 # Bootstrap LDIF data for local/dev LDAP with role mapping
├── periodical/           # Cron container that removes stale job directories
├── testdata/             # Shared test fixtures (exam JSON, CSVs, images, scan JPEGs)
└── docker-compose.yml
```

## Getting started

### Prerequisites

- Docker and Docker Compose

### Start all services

```sh
docker compose up --build
```

> [!NOTE]
> The default `docker-compose.yml` starts the backend in `development` mode.
> It prints additional log output and returns more descriptive HTTP responses that way.
> Disable it in production.

The first build compiles the frontend and backend images. Subsequent starts are faster.

| Service                  | Default address                                       |
| ------------------------ | ----------------------------------------------------- |
| Application              | http://localhost                                      |
| API Specification (JSON) | http://localhost/api/doc _(Only in development mode)_ |
| phpLDAPadmin             | http://localhost:6080                                 |
| MailCrab (dev mail UI)   | http://localhost:1080                                 |
| MongoDB                  | localhost:27017                                       |

### Log in

You'll be redirected to the login page.
Log in with one of the dev accounts below.

## Development

Local development is container-first and leverages Docker Compose's `develop.watch` capabilities. Running in watch mode automatically synchronizes frontend and backend files, hot-reloading changes in real time.

> [!NOTE]
> The backend and frontend share some types in their `types/shared` directories. There are scripts in `tools/` to check and copy these. The backend files are taken as base, changes in the frontend files will be overwritten!

### Starting with watch mode

Simply execute:

```sh
docker compose watch
```

Or, to have less noise (e.g. from LDAP/Mongo):

```sh
docker compose up --build --watch --attach backend caddy frontend
```

> [!NOTE]
> This does not start the `ldap-admin` container. If you need the phpLDAPAdmin UI, include it in the command above.

This will watch and:

- Rebuild containers when `deno.json`, `package.json`, template, or Dockerfile changes.
- Sync backend `.ts`, `.scss` and `.html` files and restart the server automatically.
- This works for both the backend and the frontend.
- Caddy will reload its config when it's changed and Docker syncs changes in the `public/` directory into the container.

### Frontend (standalone)

```sh
cd frontend
npm install
npm start        # dev server on http://localhost:4200
npm test         # Karma unit tests
npm run cy:open  # Cypress e2e tests (interactive)
```

### Backend tests

```sh
cd backend
deno task test                   # unit tests
deno task test:integration       # integration tests (requires additional binaries)
```

### End-to-End Tests

These are run with [Cypress](https://www.cypress.io/) on our GitLab Runner.
The easiest way to run them locally is to set up [GitLab CI Local](https://github.com/firecow/gitlab-ci-local) and run `gitlab-ci-local cypress_e2e --mount-cache`.
This requires Docker.

> [!NOTE]
> When this is done in an unclean git folder,
> be aware that gitlab-ci-local only copies files that are tracked by git.
> You have to `git add` new files if they should be included in the pipeline.

You can then inspect the output in the `.gitlab-ci-local` directory.
There are logs for all services (LDAP, DB, etc.) in the `outputs` folder,
screenshots of failures in `artifacts/cypress_e2e/cypress/screenshots/`
and logs from the frontend and backend in `artifacts/cypress_e2e/.logs/`.

## Dev accounts

These accounts are bootstrapped via `ldap/10-testuser.ldif`.

| Username   | Password   | LDAP groups (mapped roles)           | Access                            |
| ---------- | ---------- | ------------------------------------ | --------------------------------- |
| `test1`    | `testpass` | `toolboxUsers`, `teachers`, `admins` | Admin configuration & full access |
| `test2`    | `testpass` | `toolboxUsers`, `teachers`           | Teacher / full application access |
| `student1` | `testpass` | `toolboxUsers`, `students`           | Student / restricted access       |

LDAP admin account: **`cn=admin,dc=university,dc=example`** / password: `admin`.
