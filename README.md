# exam-toolbox

An internal web application for higher-education staff to author exam templates, preview rendered PDFs, and mass-generate personalised exam PDFs for printing.

## Features

- **Exam builder** – create and manage bilingual (DE/EN) exam definitions in a browser UI
- **Task pool** – reusable question bank with tagging and search
- **PDF preview** – render a single exam to PDF without leaving the editor
- **File uploads** – attach images for picture-based tasks
- **Mass generation** – upload an Excel participant list and generate per-student exam PDFs in parallel, with a downloadable ZIP artifact and an attendance CSV
- **Email notification** – notifies the requester when a bulk job finishes
- **Access control** – all routes protected by LDAP authentication; only members of the `researcher` group may use the application

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | Angular 18, Angular Material, RxJS |
| Backend | Deno, Oak, MongoDB |
| Document pipeline | LaTeX (tectonic), Ghostscript, ZIP archiving |
| Reverse proxy / auth | Caddy + caddy-security (LDAP/JWT) |
| Database | MongoDB 6 |
| Directory | OpenLDAP |
| Dev mail sandbox | MailCrab |
| Periodic cleanup | Deno cron container |
| Orchestration | Docker Compose |

## Repository layout

```
exam-toolbox/
├── backend/          # Deno/Oak API, LaTeX generation pipeline, worker pool
│   ├── src/          # Route handlers, services, generation logic
│   └── template/     # LaTeX template sources and style assets
├── caddy/            # Caddy reverse proxy + caddy-security config
├── frontend/         # Angular 18 application
├── ldap/             # Bootstrap LDIF data for local/dev LDAP
├── periodical/       # Cron container that removes stale job directories
└── docker-compose.yml
```

## Getting started

### Prerequisites

- Docker and Docker Compose

### 1. Configure environment variables

The `docker-compose.yml` reads a few variables from the environment (or an `.env` file in the project root):

| Variable | Default / notes |
|---|---|
| `LDAP_ADMIN_SECRET` | Password for the LDAP `admin` account. Set this before first run. |
| `CADDY_DOMAIN` | Hostname Caddy listens on. Defaults to `localhost` in `docker-compose.yml`. |

Create an `.env` file:

```env
LDAP_ADMIN_SECRET=admin
CADDY_DOMAIN=localhost
```

### 2. Start all services

```sh
docker compose up --build
```

The first build compiles the frontend and backend images. Subsequent starts are faster.

| Service | Default address |
|---|---|
| Application | https://localhost |
| Auth portal | https://localhost/auth/ |
| phpLDAPadmin | http://localhost:6080 |
| MailCrab (dev mail UI) | http://localhost:1080 |
| MongoDB | localhost:27017 |

### 3. Log in

Use the auth portal at `/auth/` with one of the dev accounts below.

## Development

### Hot-reload (backend)

Docker Compose's `develop.watch` block syncs `.ts` files from `backend/` into the running container automatically:

```sh
docker compose watch
```

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

## Dev accounts

These accounts are bootstrapped via `ldap/10-testuser.ldif`.

| Username | Password | LDAP group | Access |
|---|---|---|---|
| `test` | `test` | `researcher` | Full application access |
| `student` | `test` | `noGroup` | Blocked (403) |

LDAP admin account: **`cn=admin,dc=exascan,dc=com`** / password set via `LDAP_ADMIN_SECRET` (default `admin` in dev).
