# AGENTS

## Project at a glance

`exam-toolbox` is an internal web application for higher education staff to create and maintain exam templates, preview rendered exams, and mass-generate personalized exam PDFs for printing.

The rendering pipeline is LaTeX-based and supports bilingual output (DE/EN). Users can upload participant lists (Excel) to generate individualized exams in bulk.

> **Sub-system details**: see [`frontend/AGENTS.md`](frontend/AGENTS.md) and [`backend/AGENTS.md`](backend/AGENTS.md).

## What this system does

- Edit and manage exam definitions in a browser UI
- Reuse and organize a task pool (question bank) with tags
- Preview generated exam PDFs from the editor
- Upload files used by image-based tasks
- Upload participant lists and generate per-student exam PDFs
- Merge generated PDFs and provide downloadable ZIP artifacts
- Generate attendance CSV data alongside exam outputs
- Restrict access to authenticated LDAP users (Hono JWT + OpenLDAP) with role-based permissions (`teachers`, `admins`)
- Embed QR codes in generated exams (front-page and per-page, with startup cache pre-generation)
- Scan and decode QR codes from exam images, with ImageMagick contrast pre-processing

## Planned next step

The scan ingest pipeline is actively being built. QR detection and exam-code validation (with checksum) are working; the next step is wiring this into a full grading-support workflow.

## Repository structure

```
frontend/          Angular 22 SPA
backend/           Deno + Hono API, generation pipeline, worker pool
backend/template/  LaTeX / Eta template sources and QR cache
caddy/             Reverse proxy config and static file serving
docs/              Documentation + Bruno API collection
ldap/              LDAP bootstrap and test data
periodical/        Cron container for cleaning up old job directories
testdata/          Shared test fixtures (JSON, CSVs, images, scan JPEGs)
docker-compose.yml Local orchestration
tools/             Utility scripts (e.g. copy_shared_types.sh)
```

## Architecture overview

```
Browser → Caddy (/:static, /api/*:proxy) → Deno/Hono backend → MongoDB
                                                             ↘ OpenLDAP
                                                             ↘ tectonic / gs / qrencode / zbarimg
```

- Frontend communicates exclusively through `/api/*` (proxied by Caddy).
- The backend issues Hono JWTs after a direct LDAP credential bind and validates them on every protected request.
- Exam generation uses `tectonic` (LaTeX) and Ghostscript for PDF post-processing.
- Bulk generation runs in a Deno worker pool; job state is kept in memory and artifacts are written to mounted job directories.
- MongoDB stores exams, task pool entries, tags, users, groups, and file-tracking metadata.

## Primary technologies

| Layer             | Stack                                                       |
| ----------------- | ----------------------------------------------------------- |
| Frontend          | Angular 22, Angular Material, RxJS, Prettier, Karma/Cypress |
| Backend           | Deno, Hono, `@hono/zod-openapi`, MongoDB driver             |
| Document pipeline | LaTeX (`tectonic`), Ghostscript, Eta templating, ZIP        |
| Image / QR        | ImageMagick, `qrencode`, `zbarimg`                          |
| Infrastructure    | Docker Compose, Caddy, OpenLDAP, MongoDB, MailCrab          |
| CI                | GitLab CI (Deno unit + integration test stages)             |

## Backend API

- API is described in `docs/exam-toolbox-api` in Bruno format. It is generated from the OpenAPI spec hosted by the backend.

## Shared files

- **Types**: `backend/src/types/shared/` is the source of truth. After editing, run `tools/copy_shared_types.sh` to sync to `frontend/src/app/types/shared/`. Never edit the frontend copy directly.
- **Public assets**: `caddy/public/` and `frontend/public/` are shared (Caddy serves them; Angular declares them). They do not need to be synchronised.

## Local development

The full stack runs via Docker Compose:

```sh
docker compose up --build --watch backend caddy frontend
```

Changes are hot-reloaded into the containers automatically — no manual rebuild is required.

## Conventions

- Always include yourself in the `Co-authored-by` field of commit messages.
- Do not generate output just for indentation. This will be handled by the user using `prettier`.
