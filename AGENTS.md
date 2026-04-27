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
- Restrict access to authenticated LDAP users with required role membership

## Planned/next product step

The repository is positioned for a later workflow stage where scanned written exams can be ingested after the exam session and used to support semi-automated grading.

## Repository structure

- `frontend/`: Angular 18 application (UI for dashboard, exam builder, task pool, search, exam pool, mass-generation dialog)
- `backend/`: Deno + Oak API, MongoDB integration, LaTeX generation pipeline, worker pool for mass generation
- `backend/template/`: LaTeX template sources, style files, and helper assets/scripts used for exam rendering
- `caddy/`: Caddy reverse proxy + authentication portal integration (LDAP via caddy-security), static frontend serving
- `ldap/`: LDAP bootstrap/test data for local/dev environments
- `periodical/`: cron-based cleanup container for old mass-generation job directories
- `docker-compose.yml`: local orchestration for caddy, backend, mongo, ldap, mail sandbox, and periodic cleanup

## Architecture and runtime model

- Frontend talks to backend through `/api/*`
- Caddy protects frontend and API routes, injects authenticated user claims
- Backend enforces role-based access (`researcher` role) and serves exam/task/job APIs
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

## Operational notes

- Intended for internal institutional use (not public-facing anonymous access)
- Authentication and authorization rely on LDAP + Caddy policy
- Bulk exam output directories are cleaned both in-memory (job map) and by periodic filesystem cleanup
- Local development is container-first via `docker-compose.yml`

## Primary technologies

- Frontend: Angular, Angular Material, RxJS, Cypress/Karma
- Backend: Deno, Oak, MongoDB driver, worker threads
- Document pipeline: LaTeX (tectonic), Ghostscript, ZIP archiving
- Infrastructure: Docker Compose, Caddy, OpenLDAP, MongoDB, MailCrab
