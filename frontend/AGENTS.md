# Frontend AGENTS

## Overview

The frontend is an **Angular 22 standalone-component application** that provides the browser UI for managing exams, a task pool, tags, and mass exam generation jobs. It communicates exclusively with the backend through the `/api/*` prefix (proxied by Caddy in all environments). Hash-based routing is used (`withHashLocation()`).

## Technology stack

| Concern             | Technology                                                          |
| ------------------- | ------------------------------------------------------------------- |
| Framework           | Angular 22 (standalone components, no NgModules)                    |
| UI components       | Angular Material (MDC-based) with `material-symbols-outlined` icons |
| HTTP                | `HttpClient` with a functional interceptor (`withInterceptors`)     |
| Reactive primitives | RxJS `BehaviorSubject`, `Observable`, `pipe` operators              |
| Math rendering      | MathJax (via `MathJaxService`)                                      |
| Theming             | CSS custom properties on `body` + `ThemeToggleService`              |
| Testing             | Karma (unit), Cypress (e2e)                                         |
| Code style          | Prettier                                                            |

## Directory layout

```
frontend/src/app/
├── app.component.{ts,html,scss}   # Root shell – renders MainViewComponent
├── app.config.ts                  # ApplicationConfig: providers, router, HTTP, Material
├── app.routes.ts                  # Route table
├── components/                    # Feature & shared UI components (standalone)
├── guards/                        # Route guards
├── interceptors/                  # HTTP interceptors
├── services/                      # Injectable services
└── types/                         # TypeScript types
    └── shared/                    # Types shared with the backend (DO NOT edit directly)
```

## Routing (`app.routes.ts`)

All routes except `/login` are wrapped in a parent route protected by `authGuard`. The root path redirects to `/dashboard`.

| Path                        | Component                           |
| --------------------------- | ----------------------------------- |
| `/login`                    | `LoginComponent`                    |
| `/dashboard`                | `DashboardComponent`                |
| `/create-exam`              | `CreateExamComponent`               |
| `/edit-exam/:id`            | `CreateExamComponent` (update mode) |
| `/task-pool`                | `TaskPoolComponent`                 |
| `/exams-pool`               | `ExamsPoolComponent`                |
| `/search` / `/search/:text` | `SearchComponent`                   |
| `/about`                    | `AboutComponent`                    |
| `/getting-started`          | `GettingStartedComponent`           |
| `/debug`                    | `DebugComponent`                    |

## Application bootstrap (`app.config.ts`)

Key providers registered at the root level:

- `provideRouter(routes, withHashLocation())` – hash-based URL strategy
- `provideHttpClient(withInterceptors([authInterceptor]))` – attaches JWT on every request
- `provideAnimationsAsync()` – asynchronous Material animations
- `MatIconRegistry` initializer – sets `material-symbols-outlined` as the default icon font class
- `provideNativeDateAdapter()` – required by Material date pickers

## Components

Components are standalone (no shared NgModule). Each component self-declares its `imports` array.

### Shell

| Component           | Role                                                                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppComponent`      | Bootstrapped root; simply renders `<app-main-view>`                                                                                                                                                              |
| `MainViewComponent` | Persistent shell with Material sidenav, top toolbar, router outlet, theme toggle, user avatar menu, and logout. Reads current user from `ApiService.getUser()` and sidebar collapse state from `sessionStorage`. |

### Page components

| Component                 | Route                            | Description                                                                                                                                  |
| ------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoginComponent`          | `/login`                         | LDAP credential form; calls `AuthService.login()`, navigates to `/dashboard` on success                                                      |
| `DashboardComponent`      | `/dashboard`                     | Lists recent exams (`ExamCard`) and downloadable mass-generation jobs                                                                        |
| `CreateExamComponent`     | `/create-exam`, `/edit-exam/:id` | Main exam editor – drag-and-drop task groups, task editing, autosave, live PDF preview, mass generation trigger, conflict resolution on load |
| `TaskPoolComponent`       | `/task-pool`                     | Browsable/filterable task pool; supports tag filtering, type filtering, free-text search                                                     |
| `ExamsPoolComponent`      | `/exams-pool`                    | Paginated/searchable table of all exams (`ExamsTable`)                                                                                       |
| `SearchComponent`         | `/search/:text`                  | Global search across exams and tasks                                                                                                         |
| `AboutComponent`          | `/about`                         | Static info page                                                                                                                             |
| `GettingStartedComponent` | `/getting-started`               | Static onboarding page                                                                                                                       |
| `DebugComponent`          | `/debug`                         | Developer/testing utilities                                                                                                                  |

### Shared UI components

| Component                   | Description                                                      |
| --------------------------- | ---------------------------------------------------------------- |
| `ExamCardComponent`         | Card preview for a single exam stub (used on dashboard and pool) |
| `ExamsTableComponent`       | Sortable Material table of exam stubs                            |
| `TaskPoolCardComponent`     | Card representing one task pool entry with tag chips and actions |
| `LoadingIndicatorComponent` | Full-screen overlay; shown/hidden via `LoadingService.loading$`  |
| `MathJaxParagraphComponent` | Renders a string containing LaTeX math via MathJax               |

### Dialog components

All dialogs are opened with `MatDialog` and communicate results via `MatDialogRef`.

| Component                           | Purpose                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `AddTagDialogComponent`             | Create or pick a tag to attach to a task                                                        |
| `ConflictDialogComponent`           | Shown when local autosave and DB version of an exam differ; user picks which to keep            |
| `DeleteConfirmationDialogComponent` | Generic confirmation prompt before destructive actions                                          |
| `MassExamDialogComponent`           | Upload participant Excel list, configure seat numbering, start generation job, poll progress    |
| `UpdateTaskDialogComponent`         | When saving an exam, prompts user whether to update shared pool tasks that were modified inline |

## Guards

### `authGuard` (`guards/auth.guard.ts`)

A functional `CanActivateFn`. Applies to all routes except `/login`.

1. Checks `AuthService.isAuthenticated()` (local token check) – redirects to `/login` if false.
2. Calls `AuthService.validateSession()` – makes a live `GET /api/auth/validate` request to verify the JWT is still accepted by the backend. Redirects to `/login` on failure or error.

## Interceptors

### `authInterceptor` (`interceptors/auth.interceptor.ts`)

A functional `HttpInterceptorFn` registered globally.

- Reads the stored JWT via `AuthService.getToken()` and clones every outgoing request to add an `Authorization: Bearer <token>` header.
- Catches HTTP 401 responses: clears the session and navigates to `/login` (unless already there, to prevent redirect loops).

## Services

All services are `providedIn: 'root'` (application-scoped singletons) unless noted otherwise.

### `ApiService`

Central HTTP facade. All backend calls go through this service.

- **Exam operations**: `getExams()`, `getExam(id)`, `getRecentExams()`, `getExamsWithSearchText()`, `addExam()`, `updateExam()`, `deleteExam()`
- **Exam generation**: `generateExam()` (single PDF preview, returns `Blob`), `startMassExamGeneration()` (multipart form upload)
- **Mass-gen jobs**: `getJobStatus()`, `getActiveJob()`, `getDownloadableJobs()`, `downloadMassExamResult()`, `cancelJob()`
- **Task pool**: `addTaskToPool()`, `getTasksFromPool()`, `getTaskWithIdFromPool()`, `updateTaskInPool()`, `deleteTaskFromPool()`, `getTasksByTagId()`, `getTaskWithTypeFromPool()`, `getTaskWithUserIdFromPool()`, `getTasksWithQuestionTextFromPool()`
- **Tags**: `addTag()`, `getAllTags()`, `getTag()`, `updateTag()`, `deleteAllTags()`
- **Files**: `uploadFile()`, `downloadFile()`
- **User**: `getUser()` – filters `AuthService.currentUser$` to emit only non-null values

### `AuthService`

Manages authentication state.

- Stores the JWT in `localStorage` under key `auth_token`.
- Decodes the JWT payload client-side to populate a `User` object (no library dependency).
- Exposes `currentUser$` (`BehaviorSubject<User | null>`) for reactive consumption.
- Key methods: `login()`, `logout()`, `validateSession()`, `isAuthenticated()`, `getToken()`, `clearSession()`.

### `AutosaveService`

Persists exam drafts to `localStorage` with a timestamp.

- Key pattern: `exam_autosave_<examId>` or `exam_autosave_new_draft` for new exams.
- Methods: `saveLocal()`, `loadLocal()`, `clearLocal()`.
- `CreateExamComponent` triggers autosave on a debounced `Subject` and uses `ConflictDialogComponent` to resolve differences between the local draft and the database version.

### `TaskBuilderService`

Factory service for creating blank `Task` and `TaskGroup` objects. Reads the current user from `ApiService.getUser()` to populate `createdBy` on new tasks. Supports all task types: `multipleChoice`, `shortAnswer`, `pictureTask`, `latex`, `table`, `manualText`, `newPage`.

### `TagHelperService`

Helpers for tag operations on tasks:

- `importTagsToTask()` – hydrates `task.tags[]` from `task.tagIds[]` by calling `ApiService.getTag()`.
- `addTagToTask()` / `removeTagIdFromTask()` – mutates the task and persists the change to the pool.
- `createTagAndAddToTask()` – creates a new tag via the API then attaches it.
- `calcFontColor()` – luminance-based black/white contrast helper for tag chips.

### `LoadingService`

Simple `BehaviorSubject<boolean>` wrapper. Components call `loadingOn()` / `loadingOff()`; `LoadingIndicatorComponent` subscribes to `loading$`.

### `ThemeToggleService`

Toggles `light` / `dark` CSS classes on `document.body`. Initialises from `prefers-color-scheme`. Exposes `themeChanged$` observable so components (e.g. `MainViewComponent`) can update their icons reactively.

### `ColorProviderService`

Maps task type strings to CSS custom-property color values used for task type badges and card borders.

### `LatexPreviewsService`

Static registry of named LaTeX snippet previews (with associated preview image URLs) used in the LaTeX task editor as quick-insert templates.

### `MathJaxService`

Loads the MathJax script dynamically and exposes a `render()` method called by `MathJaxParagraphComponent` to typeset math in the DOM.

## Types

### Shared types (`types/shared/`) — do not edit directly

These files are **mirrored from `backend/src/types/shared/`**. To update them, edit the backend copy and run `tools/copy_shared_types.sh`.

| File       | Exports                                                                            |
| ---------- | ---------------------------------------------------------------------------------- |
| `base.ts`  | `Translation`, `Question`, `Dimension`, `Language`                                 |
| `exam.ts`  | `Exam` class (with `fillPagesAndPoints()`), `parseExam()`, `EXAM_FIELDS`           |
| `tasks.ts` | `Task` union, `BaseTask`, all task-specific interfaces, `TaskGroup`, `parseTask()` |
| `tag.ts`   | `Tag` interface                                                                    |
| `stubs.ts` | `ExamStub` (Exam without `tasks`), `UserStub`                                      |

**Task type discriminant union** – `Task` is a discriminated union on the `type` field:

```
multipleChoice | property | shortAnswer | pictureTask | latex | table | manualText | newPage
```

All task types extend `BaseTask` which carries: `_id`, `type`, `question`, `points`, `tagIds`, `tags`, `createdBy`, `createdAt`, `lastUsed`, `usedIn`, `parent`, `children`.

### Frontend-only types (`types/`)

| File      | Exports                                                                              |
| --------- | ------------------------------------------------------------------------------------ |
| `user.ts` | `User` class – JWT payload shape with legacy `id`/`roles` aliases for `sub`/`groups` |

`ApiService` also exports `JobStatus` and `DownloadableJob` interfaces (defined inline in `api.service.ts`).

## Environments

Angular environments are not used for API URLs. All HTTP calls target `/api` (a relative path), which Caddy proxies to the backend container. Any environment-specific configuration is handled at the infrastructure level (Caddy config, Docker Compose).

If you need to add environment-specific behaviour, use Angular's `src/environments/environment.ts` / `environment.prod.ts` convention and reference it via the `fileReplacements` array in `angular.json`.

## Key interaction flows

### Authentication flow

```
LoginComponent
  → AuthService.login()          POST /api/auth/login
  → stores JWT in localStorage
  → navigates to /dashboard

Every HTTP request
  → authInterceptor appends Bearer token

Route navigation
  → authGuard checks localStorage + GET /api/auth/validate
  → 401 anywhere → authInterceptor clears session, redirects /login
```

### Exam editor flow (`CreateExamComponent`)

1. On init, reads route param (`:id` or empty → new exam).
2. Checks `AutosaveService` for a local draft; if both a DB version and a draft exist and differ, opens `ConflictDialogComponent`.
3. Tasks can be dragged from the task pool sidebar or created inline via `TaskBuilderService`.
4. Changes debounce into `AutosaveService.saveLocal()`.
5. **Preview**: serialises exam, calls `ApiService.generateExam()`, renders the PDF blob in an `<iframe>`.
6. **Save/Update**: if any task was modified and originates from the pool, `UpdateTaskDialogComponent` asks whether to propagate the change back to the pool.
7. **Mass generation**: opens `MassExamDialogComponent`, which uploads the participant list and polls `ApiService.getJobStatus()` until the job completes, then offers a ZIP download.

## Conventions

- Components are **standalone** – always add new imports to the component's `imports` array, not to a module.
- Prefer `inject()` in functional guards/interceptors; use constructor injection in class-based services and components.
- Do not call backend endpoints directly from components – go through `ApiService`.
- Shared types live in `types/shared/`; never edit them manually. Run the copy script after changing the backend originals.
- CSS theming uses custom properties (`--color-primary`, `--color-secondary`, etc.) defined on `:root` / `body.light` / `body.dark`; avoid hardcoded hex values except where a fixed colour is intentionally outside the theme (see `ColorProviderService`).
