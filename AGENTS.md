# AGENTS

## Project at a glance

`exam-toolbox` is an internal web application for higher education staff to create and maintain exam templates, preview rendered exams, and mass-generate personalized exam PDFs for printing.

The rendering pipeline is LaTeX-based and supports bilingual output (DE/EN). Users can upload participant lists (Excel) to generate individualized exams in bulk.

## What this system currently does

- Edit and manage exam definitions in a browser UI
- Reuse and organize a task pool (question bank) with tags
- Preview generated exam PDFs from the editor
- Upload files used by image-based tasks
- Upload participant lists and generate per-student exam PDFs
- Merge generated PDFs and provide downloadable ZIP artifacts
- Generate attendance CSV data alongside exam outputs
- Restrict access to authenticated LDAP users (using a natively integrated Hono JWT & OpenLDAP client flow) with required role memberships (like `teachers` or `admins`)
- Embed QR codes in generated exams (front-page exam QR and per-page QR codes with page-level cache pre-generation)
- Scan and decode QR codes from exam images, with ImageMagick-based contrast pre-processing to improve reliability

## Planned/next product step

The scan ingest pipeline is actively being built. Scanned written exams can already be decoded (QR detection + exam-code validation with checksum); the next step is wiring this into a full grading-support workflow.

## Repository structure

- `frontend/`: Angular 18 application (UI for dashboard, exam builder, task pool, search, exam pool, mass-generation dialog)
- `backend/`: Deno + Hono API, MongoDB integration, LaTeX generation pipeline, worker pool for mass generation
  - `src/api/`: Hono router configuration with OpenAPI/Zod specs (separated from handler logic)
  - `src/examManager/`: exam/task/tag/generation handlers
  - `src/services/`: shared services – DB access, LDAP/JWT authentication, QR generation/scanning, image pre-processing, exam codes, ZIP
  - `src/types/`: shared TypeScript types (exam, scan, student, tag, …)
  - `src/config/`: runtime configuration constants
- `backend/template/`: LaTeX template sources, split into:
  - `meta/`: shared LaTeX macros (background, commands, header/footer, localisation, logging, symbols)
  - `pages/`: individual page templates (title, info, concept, do-not-touch)
  - `task_types/`: per-task-type Eta templates rendered by the backend before LaTeX compilation
  - `cache/qr/`: pre-generated per-page QR code PNGs
- `caddy/`: Caddy reverse proxy and static frontend file serving with watch support in development
- `docs/`: Documentation
- `docs/exam-toolbox-api/`: Bruno API client collection synced from the auto-generated OpenAPI 3.1 spec
- `ldap/`: LDAP bootstrap/test data with updated structure mapping groups to granular application roles
- `periodical/`: cron-based cleanup container for old mass-generation job directories
- `testdata/`: shared test fixtures (exam JSON, CSVs, images, sample scanned exam JPEGs)
- `docker-compose.yml`: local orchestration for caddy, backend, mongo, ldap, mail sandbox, and periodic cleanup

## Architecture and runtime model

- Frontend talks to backend through `/api/*`
- Caddy acts as a reverse proxy and serves static assets; watch-enabled in development
- Backend implements native authentication via a direct LDAP client connection and issues Hono JWTs for session management
- Backend enforces role-based access (e.g. `teachers` and `admins` permissions derived from LDAP groups) and serves exam, task, job, and authentication APIs
- Exam generation uses LaTeX (`tectonic`) and post-processing (`gs`/Ghostscript)
- Bulk generation is queued and processed in parallel via Deno workers
- Job state is kept in memory; generated artifacts are written to mounted job directories
- MongoDB stores exams, task pool entries, tags, and file-tracking metadata

## Key backend domains

- Exam CRUD and recent/search endpoints
- Task pool CRUD/search/type/tag/user filters
- Tag management endpoints
- Single exam PDF preview generation
- Mass exam generation jobs:
  - parse Excel student list
  - enqueue student + solution + log tasks
  - track progress and expose job status/download endpoints
  - merge outputs and package ZIP deliverables
  - notify requester via SMTP (MailCrab in dev)
- QR code services:
  - generate front-page exam QR (encodes course, semester, date, language, page count, points, random code)
  - pre-generate and cache per-page QR codes at startup
  - decode/scan QR codes from uploaded exam images, with contrast pre-processing via ImageMagick
- Exam code generation and checksum validation (`exam_code` service)
- Dynamic API documentation: OpenAPI 3.1 specification dynamically generated in dev mode and served at `/api/doc`
- Native user authentication and session management using Hono JWT middleware and direct OpenLDAP binds

## Operational notes

- Intended for internal institutional use (not public-facing anonymous access)
- Authentication and authorization rely on LDAP + Caddy policy
- Bulk exam output directories are cleaned both in-memory (job map) and by periodic filesystem cleanup
- Local development is container-first via `docker-compose.yml`

## Primary technologies

- Frontend: Angular, Angular Material, RxJS, Prettier, Cypress/Karma
- Backend: Deno, Hono, `@hono/zod-openapi`, MongoDB driver, worker threads
- Document pipeline: LaTeX (tectonic), Ghostscript, ZIP archiving, Eta templating
- Image processing: ImageMagick (contrast adjustment for QR scanning)
- CI: GitLab CI with Deno unit + integration test stages
- Infrastructure: Docker Compose, Caddy, OpenLDAP, MongoDB, MailCrab
